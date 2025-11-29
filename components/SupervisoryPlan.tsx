
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { SupervisoryPlan, SupervisoryPlanEntry, SupervisoryPlanWrapper, OffPlanItem, StrengthItem, ProblemItem, RecommendationItem } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { INITIAL_SUPERVISORY_PLAN } from '../constants';
import { exportSupervisoryPlan } from '../lib/exportUtils';
import CustomizableInputSection from './CustomizableInputSection';

// --- Props for the main component ---
interface SupervisoryPlanProps {
    plans: SupervisoryPlanWrapper[];
    setPlans: React.Dispatch<React.SetStateAction<SupervisoryPlanWrapper[]>>;
}

// --- Props for the single plan view component ---
interface SinglePlanViewProps {
    planWrapper: SupervisoryPlanWrapper;
    onUpdate: (updatedWrapper: SupervisoryPlanWrapper) => void;
    onToggleCollapse: () => void;
    onDelete: () => void;
}

const monthKeys = ["dhu_al_hijjah", "muharram", "safar", "rabi_al_awwal", "rabi_al_thani", "jumada_al_ula", "jumada_al_thani", "rajab", "shaban"];
const monthNames = ["ذو الحجة", "محرم", "صفر", "ربيع الاول", "ربيع الأخر", "جمادى الاولى", "جمادى الأخر", "رجب", "شعبان"];

const InputHeader: React.FC<{ value: string; onChange: (value: string) => void; className?: string }> = ({ value, onChange, className }) => (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} className={`w-full bg-transparent text-center font-bold p-1 ${className}`} />
);

// --- Generic Dynamic Table Component ---
interface DynamicTableColumn {
    key: string;
    header: string;
    width?: string;
    type?: 'text' | 'number';
}

interface DynamicTableProps<T> {
    title: string;
    data: T[];
    columns: DynamicTableColumn[];
    onAddRow: () => void;
    onUpdateRow: (id: string, field: keyof T, value: string) => void;
    onDeleteRow: (id: string) => void;
}

const DynamicTable = <T extends { id: string }>({ title, data, columns, onAddRow, onUpdateRow, onDeleteRow }: DynamicTableProps<T>) => {
    return (
        <div className="border rounded-lg mb-6 overflow-hidden">
            <div className="bg-gray-100 p-3 flex justify-between items-center border-b">
                <h4 className="font-bold text-lg text-primary">{title}</h4>
                <button onClick={onAddRow} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-bold">
                    + إضافة عنصر
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-200">
                        <tr>
                            <th className="p-2 border w-12 text-center">م</th>
                            {columns.map(col => (
                                <th key={col.key} className={`p-2 border text-center ${col.width || ''}`}>{col.header}</th>
                            ))}
                            <th className="p-2 border w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, index) => (
                            <tr key={row.id} className="hover:bg-gray-50">
                                <td className="p-2 border text-center font-semibold">{index + 1}</td>
                                {columns.map(col => (
                                    <td key={col.key} className="p-0 border">
                                        <textarea 
                                            value={(row as any)[col.key] || ''} 
                                            onChange={e => onUpdateRow(row.id, col.key as keyof T, e.target.value)}
                                            className="w-full h-full p-2 bg-transparent resize-none focus:bg-white min-h-[40px]"
                                            rows={1}
                                        />
                                    </td>
                                ))}
                                <td className="p-2 border text-center">
                                    <button onClick={() => onDeleteRow(row.id)} className="text-red-500 hover:text-red-700 font-bold">X</button>
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={columns.length + 2} className="p-4 text-center text-gray-500">لا توجد بيانات. اضغط "إضافة عنصر" للبدء.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const PlanPerformanceDashboard: React.FC<{ planData: SupervisoryPlan }> = ({ planData }) => {
    const { t } = useLanguage();

    const performanceData = useMemo(() => {
        const tasks = planData.filter(entry => !entry.isSummaryRow && !entry.isGroupHeader && entry.activityText);
        
        // 1. Overall Status Summary
        const doneCount = tasks.filter(t => t.status === 'تم التنفيذ').length;
        const inProgressCount = tasks.filter(t => t.status === 'قيد التنفيذ').length;
        const notDoneCount = tasks.filter(t => t.status === 'لم يتم').length;

        // 2. Performance by Domain
        const initialDomains: {[domain: string]: { planned: number; executed: number }} = {};
        
        // FIX: Removed generic from reduce call and explicitly typed accumulator argument 'acc' to avoid "Untyped function calls" error.
        const domains = tasks.reduce((acc: {[key: string]: { planned: number; executed: number }}, task) => {
            const domainKey = task.domain;
            if (!acc[domainKey]) {
                acc[domainKey] = { planned: 0, executed: 0 };
            }
            acc[domainKey].planned += Number(task.activityPlanned) || 0;
            acc[domainKey].executed += Number(task.executed) || 0;
            return acc;
        }, initialDomains);

        const domainPerformance = Object.entries(domains).map(([name, data]) => {
            // FIX: Explicitly cast data to the expected type to resolve 'unknown' type errors.
            const d = data as { planned: number; executed: number };
            const percentage = d.planned > 0 ? (d.executed / d.planned) * 100 : 0;
            return { name, percentage };
        }).filter(d => d.name); // Filter out empty domain names

        return {
            doneCount,
            inProgressCount,
            notDoneCount,
            domainPerformance,
        };
    }, [planData]);

    const getBarColor = (percentage: number) => {
        if (percentage < 50) return 'bg-red-500';
        if (percentage < 80) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div className="mt-8 p-4 border-t-2 border-primary">
            <h3 className="text-2xl font-bold text-primary mb-4 text-center">مؤشرات الأداء حسب مجال الخطة</h3>
            
            {/* Overall Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
                <div className="p-4 bg-green-100 text-green-800 rounded-lg shadow">
                    <div className="text-3xl font-bold">{performanceData.doneCount}</div>
                    <div>{t('status_done')}</div>
                </div>
                <div className="p-4 bg-yellow-100 text-yellow-800 rounded-lg shadow">
                    <div className="text-3xl font-bold">{performanceData.inProgressCount}</div>
                    <div>{t('status_in_progress')}</div>
                </div>
                <div className="p-4 bg-red-100 text-red-800 rounded-lg shadow">
                    <div className="text-3xl font-bold">{performanceData.notDoneCount}</div>
                    <div>{t('status_not_done')}</div>
                </div>
            </div>

            {/* Performance by Domain */}
            <div className="space-y-4 mb-8">
                <h4 className="text-xl font-semibold text-gray-700">{t('executionByDomain')}</h4>
                {performanceData.domainPerformance.map(domain => (
                    <div key={domain.name}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold">{domain.name}</span>
                            <span className="font-bold text-primary">{domain.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                            <div 
                                className={`h-4 rounded-full ${getBarColor(domain.percentage)}`}
                                style={{ width: `${Math.min(domain.percentage, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div>
                <h4 className="text-xl font-semibold text-gray-700 mb-4">مخططات بيانية توضيحية</h4>
                
                {/* Individual Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {performanceData.domainPerformance.map(domain => (
                        <div key={domain.name} className="p-3 border rounded-lg">
                            <h5 className="font-semibold text-center mb-2">{domain.name}</h5>
                            <div className="w-full bg-gray-200 rounded-full h-6">
                                <div 
                                    className={`h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${getBarColor(domain.percentage)}`}
                                    style={{ width: `${Math.min(domain.percentage, 100)}%` }}
                                >
                                    {domain.percentage.toFixed(0)}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Combined Chart */}
                <div className="p-4 border rounded-lg">
                    <h5 className="font-semibold text-center mb-4">مقارنة بين المجالات</h5>
                    <div className="flex justify-between items-end gap-2 h-64 border-l-2 border-b-2 border-gray-300 p-2">
                        {performanceData.domainPerformance.map(domain => (
                            <div key={domain.name} className="flex-1 flex flex-col items-center justify-end h-full">
                                <div className="text-xs font-bold">{domain.percentage.toFixed(0)}%</div>
                                <div 
                                    className={`w-3/4 rounded-t-md ${getBarColor(domain.percentage)}`}
                                    style={{ height: `${Math.min(domain.percentage, 100)}%` }}
                                    title={`${domain.name}: ${domain.percentage.toFixed(1)}%`}
                                ></div>
                                <div className="text-xs text-center mt-1" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>{domain.name}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


const SinglePlanView: React.FC<SinglePlanViewProps> = ({ planWrapper, onUpdate, onToggleCollapse, onDelete }) => {
    const { t } = useLanguage();
    const { planData, isCollapsed } = planWrapper;

    // State for all new features
    const [showImport, setShowImport] = useState(false);
    const [importText, setImportText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [matchMonths, setMatchMonths] = useState<string[]>([]);
    const [taskFilterMonths, setTaskFilterMonths] = useState<string[]>([]);
    const [reasonInputs, setReasonInputs] = useState<{ [taskId: string]: { text: string; visible: boolean } }>({});

    const [editableHeaders, setEditableHeaders] = useState({
        domain: 'المجال',
        objective: 'الأهداف',
        indicator: 'المؤشرات',
        indicatorText: 'المؤشرات',
        indicatorCount: 'عدد المؤشرات',
        evidence: 'الشواهد والأدلة',
        activity: 'الأنشطة',
        activityText: 'الأنشطة',
        activityPlanned: 'المخطط',
        executed: 'المنفذ',
        cost: 'التكلفة',
        reasonsForNonExecution: 'اسباب عدم التنفيذ',
        notes: 'الملاحظات',
    });

    const handleHeaderChange = (field: keyof typeof editableHeaders, value: string) => {
        setEditableHeaders(prev => ({ ...prev, [field]: value }));
    };

    const handleUpdate = useCallback((id: string, field: keyof SupervisoryPlanEntry, value: any) => {
        const newPlanData = planData.map(entry => entry.id === id ? { ...entry, [field]: value } : entry);
        onUpdate({ ...planWrapper, planData: newPlanData });
    }, [planData, onUpdate, planWrapper]);

    const handleTaskUpdate = useCallback((taskId: string, updates: Partial<SupervisoryPlanEntry>) => {
        const newPlanData = planData.map(entry => 
            entry.id === taskId ? { ...entry, ...updates } : entry
        );
        onUpdate({ ...planWrapper, planData: newPlanData });
    }, [planData, onUpdate, planWrapper]);

    const handleMonthlyChange = useCallback((id: string, month: string, value: string) => {
        const newPlanData = planData.map(entry => {
            if (entry.id === id) {
                const newMonthlyPlanned = { ...entry.monthlyPlanned, [month]: value };
                return { ...entry, monthlyPlanned: newMonthlyPlanned };
            }
            return entry;
        });
        onUpdate({ ...planWrapper, planData: newPlanData });
    }, [planData, onUpdate, planWrapper]);

    const handleWrapperChange = (field: keyof Omit<SupervisoryPlanWrapper, 'planData' | 'id' | 'createdAt' | 'isCollapsed'>, value: any) => {
        onUpdate({ ...planWrapper, [field]: value });
    };

    const dynamicTitle = useMemo(() => 
        `خطة الإشراف التربوي للفصل الدراسي ${planWrapper.semester} للعام ${planWrapper.academicYear}`
    , [planWrapper.semester, planWrapper.academicYear]);

    const getStatusFromExecutedCount = (executed: string | number): SupervisoryPlanEntry['status'] => {
        const countStr = String(executed).trim();
        if (countStr === '') {
            return 'قيد التنفيذ';
        }
        
        const normalizedCount = countStr.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
        
        if (normalizedCount === '0') {
            return 'لم يتم';
        }
        
        if (Number(normalizedCount) > 0) {
            return 'تم التنفيذ';
        }

        return 'قيد التنفيذ'; // Fallback for invalid input
    };

    const handleAnalyzePlan = async () => {
        if (!importText.trim()) return;
        setIsAnalyzing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `
                Analyze the following supervisory plan text. Extract the data and map it to a JSON array with objects matching this structure.
                For each row in the plan, create one JSON object.
                The structure is: { "domain": "...", "objective": "...", "indicatorText": "...", "indicatorCount": "...", "evidence": "...", "activityText": "...", "activityPlanned": "...", "monthlyPlanned": { "muharram": 1, ... } }.
                Fill the 'monthlyPlanned' object based on the timeline information in the text.
                Infer values as best as you can. Respond ONLY with the JSON array.

                Text to analyze:
                ---
                ${importText}
                ---
            `;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' }});
            const parsedData = JSON.parse(response.text);
            
            if (Array.isArray(parsedData)) {
                const newPlanData: SupervisoryPlan = planData.map((existingEntry, index) => {
                    const newData = parsedData[index];
                    if (newData && !existingEntry.isSummaryRow && !existingEntry.isGroupHeader) {
                        return {
                            ...existingEntry,
                            domain: newData.domain || existingEntry.domain,
                            objective: newData.objective || existingEntry.objective,
                            indicatorText: newData.indicatorText || existingEntry.indicatorText,
                            indicatorCount: newData.indicatorCount || existingEntry.indicatorCount,
                            evidence: newData.evidence || existingEntry.evidence,
                            activityText: newData.activityText || existingEntry.activityText,
                            activityPlanned: newData.activityPlanned || existingEntry.activityPlanned,
                            monthlyPlanned: { ...existingEntry.monthlyPlanned, ...newData.monthlyPlanned },
                        };
                    }
                    return existingEntry;
                });
                onUpdate({ ...planWrapper, planData: newPlanData });
            }
        } catch (e) {
            console.error("AI analysis failed", e);
        } finally {
            setIsAnalyzing(false);
            setShowImport(false);
            setImportText('');
        }
    };
    
    const handleMatchIndicator = () => {
        if (matchMonths.length === 0) return;
        const newPlanData = planData.map(entry => {
            if (entry.isGroupHeader || entry.isSummaryRow) return entry;
            const executedCount = matchMonths.reduce((sum, month) => sum + (Number((entry.monthlyPlanned as any)[month]) || 0), 0);
            const newStatus = getStatusFromExecutedCount(executedCount);
            return { ...entry, executed: executedCount, status: newStatus };
        });
        onUpdate({ ...planWrapper, planData: newPlanData });
    };

    const handleCancelMatch = () => {
        const newPlanData = planData.map(entry => {
            const newStatus = getStatusFromExecutedCount('');
            return { ...entry, executed: '', status: newStatus };
        });
        onUpdate({ ...planWrapper, planData: newPlanData });
    };

    const handleCycleStatus = (id: string, currentStatus: SupervisoryPlanEntry['status']) => {
        const statuses: SupervisoryPlanEntry['status'][] = ['قيد التنفيذ', 'تم التنفيذ', 'لم يتم'];
        const nextIndex = (statuses.indexOf(currentStatus) + 1) % statuses.length;
        handleUpdate(id, 'status', statuses[nextIndex]);
    };

    const generatedTasks = useMemo(() => {
        return planData.filter(entry => !entry.isGroupHeader && !entry.isSummaryRow && entry.activityText)
    }, [planData]);
    
    const getStatus3DStyle = (status: SupervisoryPlanEntry['status']) => {
        if (status === 'تم التنفيذ') return 'shadow-lg border-b-4 border-green-400 bg-green-100';
        if (status === 'لم يتم') return 'shadow-lg border-b-4 border-red-400 bg-red-100';
        return 'shadow-lg border-b-4 border-yellow-400 bg-yellow-100';
    };
    
    const handleExport = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp') => {
        // Pass taskFilterMonths as selectedMonths for filtering
        exportSupervisoryPlan(format, planWrapper, editableHeaders, t, taskFilterMonths);
    };

    const toggleReasonInput = (taskId: string) => {
        setReasonInputs(prev => ({
            ...prev,
            [taskId]: { text: prev[taskId]?.text || '', visible: !prev[taskId]?.visible }
        }));
    };

    const handleReasonTextChange = (taskId: string, text: string) => {
        setReasonInputs(prev => ({
            ...prev,
            [taskId]: { ...prev[taskId], text }
        }));
    };

    const addReasonToPlan = (taskId: string) => {
        const reasonText = reasonInputs[taskId]?.text;
        if (!reasonText) return;
        
        const currentEntry = planData.find(e => e.id === taskId);
        const existingReasons = currentEntry?.reasonsForNonExecution || '';
        const newReasons = existingReasons ? `${existingReasons}; ${reasonText}` : reasonText;

        handleUpdate(taskId, 'reasonsForNonExecution', newReasons);
        
        setReasonInputs(prev => ({
            ...prev,
            [taskId]: { text: '', visible: false }
        }));
    };

    // --- Specific Handlers for the 4 New Tables ---

    // 1. Off-Plan
    const handleAddOffPlan = () => {
        const newItem: OffPlanItem = { id: `op-${Date.now()}`, domain: '', activity: '', reason: '', notes: '' };
        onUpdate({ ...planWrapper, offPlanItems: [...(planWrapper.offPlanItems || []), newItem] });
    };
    const handleUpdateOffPlan = (id: string, field: keyof OffPlanItem, value: string) => {
        const newItems = (planWrapper.offPlanItems || []).map(i => i.id === id ? { ...i, [field]: value } : i);
        onUpdate({ ...planWrapper, offPlanItems: newItems });
    };
    const handleDeleteOffPlan = (id: string) => {
        onUpdate({ ...planWrapper, offPlanItems: (planWrapper.offPlanItems || []).filter(i => i.id !== id) });
    };

    // 2. Strengths
    const handleAddStrength = () => {
        const newItem: StrengthItem = { id: `st-${Date.now()}`, strength: '', reinforcement: '', notes: '' };
        onUpdate({ ...planWrapper, strengthItems: [...(planWrapper.strengthItems || []), newItem] });
    };
    const handleUpdateStrength = (id: string, field: keyof StrengthItem, value: string) => {
        const newItems = (planWrapper.strengthItems || []).map(i => i.id === id ? { ...i, [field]: value } : i);
        onUpdate({ ...planWrapper, strengthItems: newItems });
    };
    const handleDeleteStrength = (id: string) => {
        onUpdate({ ...planWrapper, strengthItems: (planWrapper.strengthItems || []).filter(i => i.id !== id) });
    };

    // 3. Problems
    const handleAddProblem = () => {
        const newItem: ProblemItem = { id: `pr-${Date.now()}`, problem: '', solution: '', notes: '' };
        onUpdate({ ...planWrapper, problemItems: [...(planWrapper.problemItems || []), newItem] });
    };
    const handleUpdateProblem = (id: string, field: keyof ProblemItem, value: string) => {
        const newItems = (planWrapper.problemItems || []).map(i => i.id === id ? { ...i, [field]: value } : i);
        onUpdate({ ...planWrapper, problemItems: newItems });
    };
    const handleDeleteProblem = (id: string) => {
        onUpdate({ ...planWrapper, problemItems: (planWrapper.problemItems || []).filter(i => i.id !== id) });
    };

    // 4. Recommendations
    const handleAddRecommendation = () => {
        const newItem: RecommendationItem = { id: `rec-${Date.now()}`, recommendation: '' };
        onUpdate({ ...planWrapper, recommendationItems: [...(planWrapper.recommendationItems || []), newItem] });
    };
    const handleUpdateRecommendation = (id: string, field: keyof RecommendationItem, value: string) => {
        const newItems = (planWrapper.recommendationItems || []).map(i => i.id === id ? { ...i, [field]: value } : i);
        onUpdate({ ...planWrapper, recommendationItems: newItems });
    };
    const handleDeleteRecommendation = (id: string) => {
        onUpdate({ ...planWrapper, recommendationItems: (planWrapper.recommendationItems || []).filter(i => i.id !== id) });
    };


    return (
        <div className="border-2 border-primary rounded-lg mb-8">
            <div className="p-3 bg-primary text-white rounded-t-lg flex justify-between items-center cursor-pointer" onClick={onToggleCollapse}>
                <div>
                    <h3 className="text-xl font-bold">{dynamicTitle}</h3>
                    <p className="text-xs opacity-80">تاريخ الإنشاء: {new Date(planWrapper.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4">
                     <button onClick={(e) => { e.stopPropagation(); if(window.confirm(t('confirmDelete'))) onDelete(); }} className="text-red-300 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
                    <span className={`transform transition-transform text-2xl ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}>▼</span>
                </div>
            </div>
            {!isCollapsed && (
                 <div className="p-4 bg-white rounded-b-lg space-y-8">
                    <div className="p-4 border rounded-lg bg-gray-50 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-semibold">الفصل الدراسي</label>
                            <select value={planWrapper.semester} onChange={e => handleWrapperChange('semester', e.target.value)} className="w-full p-2 border rounded">
                                <option value="الأول">الأول</option>
                                <option value="الثاني">الثاني</option>
                                <option value="الأول والثاني">الأول والثاني</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-semibold">العام الدراسي</label>
                            <input type="text" value={planWrapper.academicYear} onChange={e => handleWrapperChange('academicYear', e.target.value)} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="text-sm font-semibold">إعداد المشرف التربوي</label>
                            <input type="text" value={planWrapper.supervisorName} onChange={e => handleWrapperChange('supervisorName', e.target.value)} className="w-full p-2 border rounded" />
                        </div>
                    </div>
                    
                    {/* --- New Sections Tables --- */}
                    <div className="space-y-6">
                        <DynamicTable<OffPlanItem> 
                            title="أولاً: أنشطة خارج الخطة"
                            data={planWrapper.offPlanItems || []}
                            columns={[
                                { key: 'domain', header: 'المجال', width: 'w-1/6' },
                                { key: 'activity', header: 'النشاط', width: 'w-1/3' },
                                { key: 'reason', header: 'أسباب التنفيذ', width: 'w-1/4' },
                                { key: 'notes', header: 'ملاحظات', width: 'w-1/6' }
                            ]}
                            onAddRow={handleAddOffPlan}
                            onUpdateRow={handleUpdateOffPlan}
                            onDeleteRow={handleDeleteOffPlan}
                        />

                        <DynamicTable<StrengthItem> 
                            title="ثانياً: نقاط القوة وآلية تعزيزها"
                            data={planWrapper.strengthItems || []}
                            columns={[
                                { key: 'strength', header: 'نقاط القوة', width: 'w-1/3' },
                                { key: 'reinforcement', header: 'آلية تعزيزها', width: 'w-1/3' },
                                { key: 'notes', header: 'ملاحظات', width: 'w-1/3' }
                            ]}
                            onAddRow={handleAddStrength}
                            onUpdateRow={handleUpdateStrength}
                            onDeleteRow={handleDeleteStrength}
                        />

                        <DynamicTable<ProblemItem> 
                            title="ثالثاً: أبرز المشكلات وكيف تم التغلب عليها"
                            data={planWrapper.problemItems || []}
                            columns={[
                                { key: 'problem', header: 'المشكلة', width: 'w-1/3' },
                                { key: 'solution', header: 'التعامل معها', width: 'w-1/3' },
                                { key: 'notes', header: 'ملاحظات', width: 'w-1/3' }
                            ]}
                            onAddRow={handleAddProblem}
                            onUpdateRow={handleUpdateProblem}
                            onDeleteRow={handleDeleteProblem}
                        />

                        <DynamicTable<RecommendationItem> 
                            title="رابعاً: التوصيات والمقترحات"
                            data={planWrapper.recommendationItems || []}
                            columns={[
                                { key: 'recommendation', header: 'التوصيات والمقترحات', width: 'w-full' }
                            ]}
                            onAddRow={handleAddRecommendation}
                            onUpdateRow={handleUpdateRecommendation}
                            onDeleteRow={handleDeleteRecommendation}
                        />
                    </div>

                    <div className="border-t-4 border-gray-300 my-8"></div>
                    <h3 className="text-xl font-bold text-center bg-gray-200 p-2 rounded">خامساً: خطة الإشراف ومؤشرات الأداء</h3>

                    <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                        <div className="flex flex-wrap gap-4">
                            <button onClick={() => setShowImport(prev => !prev)} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">استيراد خطة</button>
                        </div>
                        {showImport && (
                            <div className="p-3 border-t space-y-2">
                                <textarea value={importText} onChange={e => setImportText(e.target.value)} className="w-full p-2 border rounded h-24" placeholder="ألصق نص الخطة هنا أو قم بتحميل ملف..."></textarea>
                                <input type="file" accept=".txt,.pdf,.doc,.docx,.xls,.xlsx" className="text-sm" />
                                <button onClick={handleAnalyzePlan} disabled={isAnalyzing} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400">
                                    {isAnalyzing ? 'جاري التحليل...' : 'تحليل الخطة'}
                                </button>
                            </div>
                        )}
                         <div className="border-t pt-4">
                            <h4 className="font-semibold mb-2">تعبئة المنفذ سريعاً:</h4>
                             <div className="flex flex-wrap items-center gap-2">
                                <label className="flex items-center gap-1 text-sm font-bold">
                                    <input 
                                        type="checkbox"
                                        checked={matchMonths.length === monthKeys.length}
                                        onChange={e => setMatchMonths(e.target.checked ? monthKeys : [])}
                                    />
                                    تحديد الكل
                                </label>
                                {monthKeys.map((key, i) => (
                                    <label key={key} className="flex items-center gap-1 text-sm">
                                        <input type="checkbox" value={key} checked={matchMonths.includes(key)} onChange={e => setMatchMonths(p => e.target.checked ? [...p, key] : p.filter(m => m !== key))} /> {monthNames[i]}</label>
                                ))}
                                <button onClick={handleMatchIndicator} className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">مطابقة المؤشر</button>
                                <button onClick={handleCancelMatch} className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">إلغاء المطابقة</button>
                             </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto border rounded-lg" style={{ maxHeight: '70vh' }}>
                        <table className="min-w-full border-collapse text-xs">
                            <thead className="bg-primary-light text-white text-center sticky top-0 z-10">
                                <tr>
                                    <th rowSpan={2} className="border p-1 min-w-[120px]"><InputHeader value={editableHeaders.domain} onChange={v => handleHeaderChange('domain', v)} /></th>
                                    <th rowSpan={2} className="border p-1 min-w-[150px]"><InputHeader value={editableHeaders.objective} onChange={v => handleHeaderChange('objective', v)} /></th>
                                    <th colSpan={3} className="border p-1"><InputHeader value={editableHeaders.indicator} onChange={v => handleHeaderChange('indicator', v)} /></th>
                                    <th colSpan={2} className="border p-1"><InputHeader value={editableHeaders.activity} onChange={v => handleHeaderChange('activity', v)} /></th>
                                    <th colSpan={monthKeys.length} className="border p-1">التوزيع الزمني</th>
                                    <th rowSpan={2} className="border p-1 min-w-[50px]"><InputHeader value={editableHeaders.executed} onChange={v => handleHeaderChange('executed', v)} /></th>
                                    <th rowSpan={2} className="border p-1 min-w-[50px]"><InputHeader value={editableHeaders.cost} onChange={v => handleHeaderChange('cost', v)} /></th>
                                    <th rowSpan={2} className="border p-1 min-w-[150px]"><InputHeader value={editableHeaders.reasonsForNonExecution} onChange={v => handleHeaderChange('reasonsForNonExecution', v)} /></th>
                                    <th rowSpan={2} className="border p-1 min-w-[150px]"><InputHeader value={editableHeaders.notes} onChange={v => handleHeaderChange('notes', v)} /></th>
                                </tr>
                                <tr>
                                    <th className="border p-1 min-w-[200px]"><InputHeader value={editableHeaders.indicatorText} onChange={v => handleHeaderChange('indicatorText', v)} /></th>
                                    <th className="border p-1 min-w-[50px]"><InputHeader value={editableHeaders.indicatorCount} onChange={v => handleHeaderChange('indicatorCount', v)} /></th>
                                    <th className="border p-1 min-w-[120px]"><InputHeader value={editableHeaders.evidence} onChange={v => handleHeaderChange('evidence', v)} /></th>
                                    <th className="border p-1 min-w-[250px]"><InputHeader value={editableHeaders.activityText} onChange={v => handleHeaderChange('activityText', v)} /></th>
                                    <th className="border p-1 min-w-[50px]"><InputHeader value={editableHeaders.activityPlanned} onChange={v => handleHeaderChange('activityPlanned', v)} /></th>
                                    {monthNames.map(name => <th key={name} className="border p-1 min-w-[50px]">{name}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {planData.map((entry) => (
                                    <tr key={entry.id} className={entry.isSummaryRow ? 'bg-yellow-100 font-bold' : 'hover:bg-gray-50'}>
                                        <td className="border p-0"><input type="text" value={entry.domain} onChange={e => handleUpdate(entry.id, 'domain', e.target.value)} className="w-full bg-transparent p-1" /></td>
                                        <td className="border p-0"><textarea value={entry.objective} onChange={e => handleUpdate(entry.id, 'objective', e.target.value)} className="w-full bg-transparent p-1 min-h-[40px] resize-none" /></td>
                                        <td className="border p-0"><textarea value={entry.indicatorText || entry.indicator || ''} onChange={e => handleUpdate(entry.id, 'indicatorText', e.target.value)} className="w-full bg-transparent p-1 min-h-[40px] resize-none" /></td>
                                        <td className="border p-0"><input type="text" value={entry.indicatorCount || ''} onChange={e => handleUpdate(entry.id, 'indicatorCount', e.target.value)} className="w-full bg-transparent p-1 text-center" /></td>
                                        <td className="border p-0"><input type="text" value={entry.evidence || ''} onChange={e => handleUpdate(entry.id, 'evidence', e.target.value)} className="w-full bg-transparent p-1" /></td>
                                        <td className="border p-0"><textarea value={entry.activityText || entry.activity || ''} onChange={e => handleUpdate(entry.id, 'activityText', e.target.value)} className="w-full bg-transparent p-1 min-h-[40px] resize-none" /></td>
                                        <td className="border p-0"><input type="text" value={entry.activityPlanned || ''} readOnly className="w-full bg-gray-100 p-1 text-center font-semibold" /></td>
                                        {monthKeys.map(month => (
                                            <td key={month} className="border p-0"><input type="text" value={(entry.monthlyPlanned as any)[month] || ''} onChange={e => handleMonthlyChange(entry.id, month, e.target.value)} className="w-full bg-transparent p-1 text-center" /></td>
                                        ))}
                                        <td className="border p-0"><input type="text" value={entry.executed} onChange={e => handleUpdate(entry.id, 'executed', e.target.value)} className="w-full bg-transparent p-1 text-center" /></td>
                                        <td className="border p-0"><input type="text" value={entry.cost} onChange={e => handleUpdate(entry.id, 'cost', e.target.value)} className="w-full bg-transparent p-1 text-center" /></td>
                                        <td className="border p-0"><textarea value={entry.reasonsForNonExecution} onChange={e => handleUpdate(entry.id, 'reasonsForNonExecution', e.target.value)} className="w-full bg-transparent p-1 min-h-[40px] resize-none" /></td>
                                        <td className="border p-0"><input type="text" value={entry.notes} onChange={e => handleUpdate(entry.id, 'notes', e.target.value)} className="w-full bg-transparent p-1" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                     {/* Generated Tasks Section */}
                    <div className="p-4 border rounded-lg">
                        <h3 className="text-xl font-bold text-primary mb-4">{t('generatedTasks')}</h3>
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            <span className="font-semibold">تصفية التصدير والعرض حسب الشهر:</span>
                            <label className="flex items-center gap-1 text-sm font-bold">
                                <input 
                                    type="checkbox"
                                    checked={taskFilterMonths.length === monthKeys.length}
                                    onChange={e => setTaskFilterMonths(e.target.checked ? monthKeys : [])}
                                />
                                تحديد الكل
                            </label>
                            {monthKeys.map((key, i) => (
                                <label key={key} className="flex items-center gap-1 text-sm"><input type="checkbox" value={key} checked={taskFilterMonths.includes(key)} onChange={e => setTaskFilterMonths(p => e.target.checked ? [...p, key] : p.filter(m => m !== key))} /> {monthNames[i]}</label>
                            ))}
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {generatedTasks.map(task => {
                                const totalPlanned = taskFilterMonths.length > 0
                                    ? taskFilterMonths.reduce((sum, month) => sum + (Number((task.monthlyPlanned as any)[month]) || 0), 0)
                                    : Number(task.activityPlanned) || 0;
                                const executed = Number(String(task.executed).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())) || 0;
                                const percentage = totalPlanned > 0 ? (executed / totalPlanned) * 100 : 0;
                                
                                return (
                                    <div key={task.id} className={`p-3 border rounded-md transition-shadow ${getStatus3DStyle(task.status)}`}>
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-3">
                                            <div className="flex-grow">
                                                <p className="font-semibold">{task.activityText}</p>
                                                <p className="text-xs text-gray-600">{task.domain}</p>
                                            </div>
                                            <div className="flex items-center gap-4 flex-wrap">
                                                <div className="text-sm font-bold">منفذ: {executed} / {totalPlanned}</div>
                                                <button onClick={() => handleCycleStatus(task.id, task.status)} className="p-1 px-3 border rounded-full text-xs bg-white">{task.status}</button>
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <label className="text-sm font-semibold">عدد المنفذ</label>
                                                    <input 
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9٠]*"
                                                        value={task.executed}
                                                        onChange={(e) => {
                                                            const newCount = e.target.value.replace(/[^0-9٠]/g, '');
                                                            const newStatus = getStatusFromExecutedCount(newCount);
                                                            handleTaskUpdate(task.id, { executed: newCount, status: newStatus });
                                                        }}
                                                        className="p-1 border rounded text-sm w-20 text-center"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <div className="progress-bar">
                                                <div className="progress-bar-fill" style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                                                <div className="progress-bar-text">{percentage.toFixed(0)}%</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 text-left">
                                            <button onClick={() => toggleReasonInput(task.id)} className="text-xs text-blue-600 hover:underline">أسباب عدم التنفيذ</button>
                                            {reasonInputs[task.id]?.visible && (
                                                <div className="mt-2 flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        value={reasonInputs[task.id]?.text || ''} 
                                                        onChange={e => handleReasonTextChange(task.id, e.target.value)} 
                                                        className="flex-grow p-1 border rounded text-sm"
                                                        placeholder="اكتب السبب هنا..."
                                                    />
                                                    <button onClick={() => addReasonToPlan(task.id)} className="px-3 py-1 bg-blue-500 text-white text-xs rounded">إضافة</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Plan Performance Dashboard Section */}
                    <PlanPerformanceDashboard planData={planData} />

                    <div className="flex flex-wrap justify-center gap-3 pt-4 border-t">
                        <button onClick={() => handleExport('txt')} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800">{t('exportTxt')}</button>
                        <button onClick={() => handleExport('pdf')} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('exportPdf')}</button>
                        <button onClick={() => handleExport('excel')} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{t('exportExcel')}</button>
                        <button onClick={() => handleExport('whatsapp')} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">{t('sendToWhatsApp')}</button>
                    </div>
                 </div>
            )}
        </div>
    );
};

const SupervisoryPlanComponent: React.FC<SupervisoryPlanProps> = ({ plans, setPlans }) => {
    const { t } = useLanguage();
    
    const handleAddNewPlan = () => {
        const newPlan: SupervisoryPlanWrapper = {
            id: `spw-${Date.now()}`,
            createdAt: new Date().toISOString(),
            semester: 'الأول',
            academicYear: '1447هـ / 2025-2026م',
            supervisorName: '',
            semesterDates: {
                start1: "2025-07-28", end1: "2025-10-18",
                start2: "2025-10-23", end2: "2026-02-07"
            },
            planData: JSON.parse(JSON.stringify(INITIAL_SUPERVISORY_PLAN)),
            isCollapsed: false,
            title: '', 
            offPlanItems: [],
            strengthItems: [],
            problemItems: [],
            recommendationItems: [],
            // Legacy
            offPlanActivities: [],
        };
        setPlans(prev => [newPlan, ...prev.map(p => ({...p, isCollapsed: true}))]);
    };

    const handleUpdatePlan = (updatedWrapper: SupervisoryPlanWrapper) => {
        setPlans(prev => prev.map(p => p.id === updatedWrapper.id ? updatedWrapper : p));
    };

    const handleToggleCollapse = (id: string) => {
        setPlans(prev => prev.map(p => p.id === id ? {...p, isCollapsed: !p.isCollapsed} : p));
    };
    
    const handleDeletePlan = (id: string) => {
        setPlans(prev => prev.filter(p => p.id !== id));
    }

    return (
        <div className="p-4 bg-gray-50 rounded-lg shadow-lg space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-center text-primary">{t('supervisoryPlan')}</h2>
                <button onClick={handleAddNewPlan} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors">
                    + إنشاء خطة جديدة
                </button>
            </div>
            
            {plans.map(planWrapper => (
                <SinglePlanView 
                    key={planWrapper.id}
                    planWrapper={planWrapper}
                    onUpdate={handleUpdatePlan}
                    onToggleCollapse={() => handleToggleCollapse(planWrapper.id)}
                    onDelete={() => handleDeletePlan(planWrapper.id)}
                />
            ))}
        </div>
    );
};

export default SupervisoryPlanComponent;
