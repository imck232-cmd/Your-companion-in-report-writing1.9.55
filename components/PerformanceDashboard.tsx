
import React, { useMemo, useState, useCallback } from 'react';
import { Report, Teacher, GeneralEvaluationReport, ClassSessionEvaluationReport, SpecialReport, Task, Meeting, PeerVisit, DeliverySheet, SyllabusCoverageReport, GeneralCriterion, ClassSessionCriterionGroup, MeetingOutcome } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { GENERAL_EVALUATION_CRITERIA_TEMPLATE, CLASS_SESSION_BRIEF_TEMPLATE, CLASS_SESSION_EXTENDED_TEMPLATE, CLASS_SESSION_SUBJECT_SPECIFIC_TEMPLATE, GRADES, SUBJECTS } from '../constants';
import { exportKeyMetrics, exportEvaluationAnalysis, exportSupervisorySummary as exportSupervisorySummaryUtil, exportMeetingSummary as exportMeetingSummaryUtil } from '../lib/exportUtils';
import { calculateReportPercentage } from '../lib/exportUtils';

// Declare XLSX locally to avoid type errors if not globally declared in types
declare const XLSX: any;

interface PerformanceDashboardProps {
  reports: Report[];
  teachers: Teacher[];
  tasks: Task[];
  meetings: Meeting[];
  peerVisits: PeerVisit[];
  deliverySheets: DeliverySheet[];
  syllabusCoverageReports: SyllabusCoverageReport[];
}

// --- Helper Components ---

const Section: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean; onExport?: (format: 'txt' | 'pdf' | 'excel' | 'whatsapp') => void }> = ({ title, children, defaultOpen = false, onExport }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border border-gray-200 rounded-lg">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full p-3 text-lg font-semibold text-left bg-gray-100 hover:bg-gray-200 flex justify-between items-center transition">
                <span>{title}</span>
                <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {isOpen && <div className="p-4 bg-white">
                {children}
                {onExport && <ExportButtons onExport={onExport} />}
            </div>}
        </div>
    );
};

const ProgressBar: React.FC<{ label: string; percentage: number; customColors?: boolean }> = ({ label, percentage, customColors = false }) => {
    const getProgressBarColor = (p: number) => {
        if (customColors) {
            // New logic based on user request
            if (p <= 25) return 'bg-red-500';
            if (p <= 50) return 'bg-yellow-500';
            if (p <= 75) return 'bg-orange-500';
            if (p <= 89) return 'bg-blue-600'; // Using blue-600 for better visibility
            return 'bg-green-500';
        }
        // Default logic
        if (p < 26) return 'bg-red-500';
        if (p < 51) return 'bg-yellow-500';
        if (p < 76) return 'bg-orange-500';
        if (p < 90) return 'bg-blue-500';
        return 'bg-green-500';
    };
    const color = getProgressBarColor(percentage);
    return (
        <div className="text-center w-full">
            {label && <p className="font-semibold text-gray-700 text-sm mb-1">{label}</p>}
            <div className={`w-full bg-gray-200 rounded-full ${customColors ? 'h-4' : 'h-3'} mb-1`}>
                <div className={`${color} ${customColors ? 'h-4' : 'h-3'} rounded-full transition-all duration-500`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
            </div>
            <p className="font-bold text-sm">{percentage.toFixed(1)}%</p>
        </div>
    );
};

const ExportButtons: React.FC<{ onExport: (format: 'txt' | 'pdf' | 'excel' | 'whatsapp') => void }> = ({ onExport }) => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-4 p-2 bg-gray-100 rounded">
      <button onClick={() => onExport('txt')} className="px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-800">{t('exportTxt')}</button>
      <button onClick={() => onExport('pdf')} className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">{t('exportPdf')}</button>
      <button onClick={() => onExport('excel')} className="px-3 py-1 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700">{t('exportExcel')}</button>
      <button onClick={() => onExport('whatsapp')} className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600">{t('sendToWhatsApp')}</button>
    </div>
  );
};


// --- Main Dashboard Component ---

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = (props) => {
  const { reports, teachers, tasks, meetings, peerVisits, deliverySheets, syllabusCoverageReports } = props;
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('keyMetrics');

  const renderContent = () => {
      switch(activeTab) {
          case 'keyMetrics': return <KeyMetricsView reports={reports} teachers={teachers} />;
          case 'evaluationAnalysis': return <EvaluationAnalysisView reports={reports} teachers={teachers} />;
          case 'supervisoryReports': return <SupervisoryReportsView {...props} />;
          default: return null;
      }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
        <h2 className="text-3xl font-bold text-center text-primary">{t('performanceIndicators')}</h2>
        <div className="flex flex-wrap justify-center gap-3 border-b pb-4">
            <button onClick={() => setActiveTab('keyMetrics')} className={`px-4 py-2 rounded-md font-semibold transition-colors ${activeTab === 'keyMetrics' ? 'bg-primary text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>{t('keyMetrics')}</button>
            <button onClick={() => setActiveTab('evaluationAnalysis')} className={`px-4 py-2 rounded-md font-semibold transition-colors ${activeTab === 'evaluationAnalysis' ? 'bg-primary text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>{t('evaluationElementAnalysis')}</button>
            <button onClick={() => setActiveTab('supervisoryReports')} className={`px-4 py-2 rounded-md font-semibold transition-colors ${activeTab === 'supervisoryReports' ? 'bg-primary text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>{t('supervisoryReports')}</button>
        </div>
        <div>{renderContent()}</div>
    </div>
  );
};


// --- Key Metrics Tab (Simplified for brevity, but kept functional) ---
const KeyMetricsView: React.FC<{ reports: Report[], teachers: Teacher[] }> = ({ reports, teachers }) => {
    const { t } = useLanguage();
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const stats = useMemo(() => {
        const totalReports = reports.length;
        const totalTeachers = teachers.length;
        let totalScoreSum = 0;
        reports.forEach(r => { totalScoreSum += calculateReportPercentage(r); });
        const overallAverage = totalReports > 0 ? totalScoreSum / totalReports : 0;
        return { totalTeachers, totalReports, overallAverage };
    }, [reports, teachers]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg text-center border border-blue-200 shadow-sm">
                    <h3 className="text-gray-600 font-semibold mb-2">{t('totalTeachers')}</h3>
                    <p className="text-4xl font-bold text-blue-600">{stats.totalTeachers.toString()}</p>
                </div>
                <div className="bg-green-50 p-6 rounded-lg text-center border border-green-200 shadow-sm">
                    <h3 className="text-gray-600 font-semibold mb-2">{t('totalReports')}</h3>
                    <p className="text-4xl font-bold text-green-600">{stats.totalReports.toString()}</p>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg text-center border border-purple-200 shadow-sm">
                    <h3 className="text-gray-600 font-semibold mb-2">{t('overallAveragePerformance')}</h3>
                    <p className="text-4xl font-bold text-purple-600">{stats.overallAverage.toFixed(1)}%</p>
                </div>
            </div>
            <ExportButtons onExport={(format) => exportKeyMetrics(format, stats, t)} />
        </div>
    );
};

// --- Evaluation Analysis Tab (REWRITTEN with Advanced Filters) ---
const EvaluationAnalysisView: React.FC<{ reports: Report[], teachers: Teacher[] }> = ({ reports, teachers }) => {
    const { t } = useLanguage();
    const [subTypeFilter, setSubTypeFilter] = useState<'all' | 'general' | 'brief' | 'extended' | 'subject_specific'>('all');
    
    // New Advanced Filters
    const [branchFilter, setBranchFilter] = useState<'all' | 'boys' | 'girls'>('all');
    const [deficiencyOnly, setDeficiencyOnly] = useState(false);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // WhatsApp Selection State
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());

    const teacherDataMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);

    const analysis = useMemo(() => {
        // 1. Filter reports first
        const filteredReports = reports.filter(r => {
            // Type Filter
            if (subTypeFilter !== 'all') {
                if (subTypeFilter === 'general' && r.evaluationType !== 'general') return false;
                if (r.evaluationType === 'class_session' && (r as ClassSessionEvaluationReport).subType !== subTypeFilter) return false;
                if (r.evaluationType !== 'general' && r.evaluationType !== 'class_session') return false;
            }

            // Date Range Filter
            if (dateRange.start) {
                if (new Date(r.date) < new Date(dateRange.start)) return false;
            }
            if (dateRange.end) {
                if (new Date(r.date) > new Date(dateRange.end)) return false;
            }

            // Branch Filter
            const teacher = teacherDataMap.get(r.teacherId);
            if (branchFilter !== 'all') {
                if (teacher?.branch !== branchFilter) return false;
            }

            return true;
        });

        // 2. Map: CriterionLabel -> { totalSum, totalCount, teachers: { teacherId: { sum, count, name } } }
        const criteriaMap: Record<string, { 
            sum: number; 
            count: number; 
            teachers: Record<string, { sum: number; count: number; name: string, branch: string }> 
        }> = {};

        filteredReports.forEach(report => {
            let criteria: any[] = [];
            if (report.evaluationType === 'general' || report.evaluationType === 'special') {
                criteria = (report as GeneralEvaluationReport | SpecialReport).criteria;
            } else if (report.evaluationType === 'class_session') {
                criteria = (report as ClassSessionEvaluationReport).criterionGroups.flatMap(g => g.criteria);
            }

            const teacher = teacherDataMap.get(report.teacherId);
            const teacherName = teacher?.name || 'Unknown';
            const teacherBranch = teacher?.branch || '';

            criteria.forEach(c => {
                if (!criteriaMap[c.label]) {
                    criteriaMap[c.label] = { sum: 0, count: 0, teachers: {} };
                }
                
                criteriaMap[c.label].sum += c.score;
                criteriaMap[c.label].count += 1;

                if (!criteriaMap[c.label].teachers[report.teacherId]) {
                    criteriaMap[c.label].teachers[report.teacherId] = { sum: 0, count: 0, name: teacherName, branch: teacherBranch };
                }
                criteriaMap[c.label].teachers[report.teacherId].sum += c.score;
                criteriaMap[c.label].teachers[report.teacherId].count += 1;
            });
        });

        // 3. Process into items and apply Deficiency filter to teachers
        const result = Object.entries(criteriaMap).map(([label, data]) => {
            const overallPercentage = (data.sum / (data.count * 4)) * 100;
            
            let teacherDetails = Object.values(data.teachers).map(tData => ({
                name: tData.name,
                percentage: (tData.sum / (tData.count * 4)) * 100,
                count: tData.count,
                branch: tData.branch
            }));

            // Filter teachers by Deficiency if active (only those < 50%)
            if (deficiencyOnly) {
                teacherDetails = teacherDetails.filter(t => t.percentage < 50);
            }

            // Internal Sort for teachers: Always ascending (lowest first) as per screenshot style
            teacherDetails.sort((a, b) => a.percentage - b.percentage);

            return {
                label,
                percentage: overallPercentage,
                count: data.count,
                teacherDetails
            };
        });

        // 4. Filter out criteria that have no teachers left (e.g., if deficiency only is checked and everyone passed)
        const finalResult = deficiencyOnly ? result.filter(item => item.teacherDetails.length > 0) : result;

        // 5. Final Sort by overall percentage (User selected direction)
        return finalResult.sort((a, b) => sortOrder === 'asc' ? a.percentage - b.percentage : b.percentage - a.percentage);
    }, [reports, subTypeFilter, teacherDataMap, branchFilter, deficiencyOnly, sortOrder, dateRange]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setSelectedLabels(new Set(analysis.map(a => a.label)));
        else setSelectedLabels(new Set());
    };

    const handleSendWhatsApp = () => {
        let msg = `*📊 ${t('evaluationElementAnalysis')}*\n`;
        const itemsToSend = analysis.filter(item => selectedLabels.has(item.label));

        if (itemsToSend.length === 0) {
            alert('يرجى اختيار عنصر واحد على الأقل.');
            return;
        }

        itemsToSend.forEach(item => {
            msg += `📌 *${item.label}*\n`;
            msg += `   المتوسط: ${item.percentage.toFixed(1)}% (${item.count} تكرار)\n`;
            msg += `   🔻 *تفصيل المعلمين (تصاعدياً):*\n`;
            item.teacherDetails.forEach(t => {
                let icon = '🟢';
                if (t.percentage < 50) icon = '🔴';
                else if (t.percentage <= 75) icon = '🟡';
                else if (t.percentage <= 89) icon = '🔵';
                msg += `   ${icon} ${t.name} (${t.percentage.toFixed(0)}%)\n`;
            });
            msg += `\n`;
        });

        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
        setShowWhatsAppModal(false);
    };

    const toggleLabel = (label: string) => {
        const newSet = new Set(selectedLabels);
        if (newSet.has(label)) newSet.delete(label);
        else newSet.add(label);
        setSelectedLabels(newSet);
    };

    return (
        <div className="space-y-6">
            {/* --- WhatsApp Modal --- */}
            {showWhatsAppModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
                        <h3 className="text-xl font-bold text-primary mb-4 text-center">اختر العناصر للإرسال</h3>
                        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded border-b">
                            <input type="checkbox" id="selectAllAnalysis" checked={selectedLabels.size === analysis.length && analysis.length > 0} onChange={handleSelectAll} className="w-5 h-5 text-primary" />
                            <label htmlFor="selectAllAnalysis" className="font-bold cursor-pointer">تحديد الكل</label>
                        </div>
                        <div className="flex-grow overflow-y-auto space-y-2 p-2 border rounded mb-4">
                            {analysis.map((item, idx) => (
                                <label key={idx} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer border-b last:border-0">
                                    <input type="checkbox" checked={selectedLabels.has(item.label)} onChange={() => toggleLabel(item.label)} className="w-5 h-5 text-primary mt-1" />
                                    <div><span className="font-semibold block">{item.label}</span><span className="text-xs text-gray-500">المتوسط: {item.percentage.toFixed(1)}%</span></div>
                                </label>
                            ))}
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={handleSendWhatsApp} className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 font-bold">{t('send')}</button>
                            <button onClick={() => setShowWhatsAppModal(false)} className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600">{t('cancel')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Advanced Filter Toolbar --- */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-inner space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>
                    <span>فلترة مخصصة للتحليل:</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Branch Filter */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 block">حسب الفرع:</label>
                        <select 
                            value={branchFilter} 
                            onChange={e => setBranchFilter(e.target.value as any)}
                            className="w-full p-2 border rounded-lg bg-white shadow-sm text-sm"
                        >
                            <option value="all">كل الفروع</option>
                            <option value="main">رئيسي</option>
                            <option value="boys">طلاب</option>
                            <option value="girls">طالبات</option>
                        </select>
                    </div>

                    {/* Date Range Filter */}
                    <div className="space-y-1 col-span-1 md:col-span-1">
                        <label className="text-xs font-bold text-gray-600 block">الفترة الزمنية:</label>
                        <div className="flex gap-1">
                            <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-full p-1.5 border rounded-lg text-xs" />
                            <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="w-full p-1.5 border rounded-lg text-xs" />
                        </div>
                    </div>

                    {/* Sort Order */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 block">ترتيب النتائج:</label>
                        <button 
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="w-full p-2 border rounded-lg bg-white shadow-sm flex justify-between items-center text-sm font-semibold hover:bg-gray-50"
                        >
                            <span>{sortOrder === 'asc' ? 'الأقل أداءً أولاً' : 'الأعلى أداءً أولاً'}</span>
                            <span>{sortOrder === 'asc' ? '⬇️' : '⬆️'}</span>
                        </button>
                    </div>

                    {/* Quick Filters: Deficiency */}
                    <div className="flex items-end h-full">
                        <label className={`w-full flex items-center justify-center gap-2 p-2 border-2 rounded-lg cursor-pointer transition-all ${deficiencyOnly ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                            <input type="checkbox" checked={deficiencyOnly} onChange={e => setDeficiencyOnly(e.target.checked)} className="hidden" />
                            <span className="font-bold text-sm">{deficiencyOnly ? '⚠️ عرض الضعف فقط' : 'إظهار الضعف والقصور (<50%)'}</span>
                        </label>
                    </div>
                </div>

                {/* Subtype Filter - Now integrated better */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                    {[
                        { id: 'all', label: 'كل التقييمات' },
                        { id: 'general', label: 'تقييم عام' },
                        { id: 'brief', label: 'مختصر' },
                        { id: 'extended', label: 'موسع' },
                        { id: 'subject_specific', label: 'حسب المادة' }
                    ].map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => setSubTypeFilter(opt.id as any)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${subTypeFilter === opt.id ? 'bg-primary text-white scale-105' : 'bg-white text-gray-600 border'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- Results Display --- */}
            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
                {analysis.length > 0 ? analysis.map((item, index) => (
                    <div key={index} className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row items-center gap-6 mb-4">
                            <div className="w-full md:w-1/3 lg:w-1/4 font-extrabold text-gray-800 text-lg leading-tight">{item.label}</div>
                            <div className="w-full flex-grow">
                                <ProgressBar label="" percentage={item.percentage} />
                            </div>
                            <div className="flex-shrink-0 text-center text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                                {item.count} تكرار
                            </div>
                        </div>
                        
                        <div className="mt-4 bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200">
                            <p className="font-bold text-gray-500 text-xs mb-3 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                أداء المعلمين في هذا المعيار (تصاعدياً):
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {item.teacherDetails.map((t, idx) => {
                                    let colorClass = 'text-green-600 border-green-200';
                                    let icon = '🟢';
                                    if (t.percentage < 50) { colorClass = 'text-red-600 border-red-200'; icon = '🔴'; }
                                    else if (t.percentage <= 75) { colorClass = 'text-orange-600 border-orange-200'; icon = '🟠'; }
                                    else if (t.percentage <= 89) { colorClass = 'text-blue-600 border-blue-200'; icon = '🔵'; }

                                    return (
                                        <div key={idx} className={`inline-flex items-center gap-2 ${colorClass} font-bold bg-white px-3 py-1.5 rounded-lg border shadow-sm text-sm transform hover:scale-105 transition-transform`}>
                                            <span className="text-xs">{icon}</span>
                                            <span>{t.name}</span>
                                            <span className="text-[10px] opacity-70 bg-gray-100 px-1.5 rounded-full">{t.percentage.toFixed(0)}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <div className="text-5xl mb-4 opacity-20">🔍</div>
                        <p className="text-gray-400 font-bold">لا توجد بيانات تطابق الفلاتر المحددة.</p>
                        <button onClick={() => {setBranchFilter('all'); setDeficiencyOnly(false); setDateRange({start:'', end:''});}} className="mt-4 text-primary font-bold hover:underline">إعادة ضبط الفلاتر</button>
                    </div>
                )}
            </div>

            {analysis.length > 0 && <ExportButtons onExport={(f) => f === 'whatsapp' ? setShowWhatsAppModal(true) : exportEvaluationAnalysis(f, analysis, t)} />}
        </div>
    );
};


// --- Supervisory Reports Tab (Remains Stable) ---
const SupervisoryReportsView: React.FC<PerformanceDashboardProps> = (props) => {
    const { t } = useLanguage();
    
    const handlePeerVisitExport = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp') => {
        const visits = props.peerVisits.filter(v => v.visitingTeacher);
        const total = visits.length;
        const completed = visits.filter(v => v.status === 'تمت الزيارة').length;
        const inProgress = visits.filter(v => v.status === 'قيد التنفيذ').length;
        const notCompleted = visits.filter(v => v.status === 'لم تتم' || !v.status).length;
        const visitsByTeacher = visits.reduce((acc, visit) => { acc[visit.visitingTeacher] = (acc[visit.visitingTeacher] || 0) + 1; return acc; }, {} as Record<string, number>);
        const data = [ `📌 ${t('totalVisits')}: ${total}`, `✅ تمت الزيارة: ${completed}`, `⏳ قيد التنفيذ: ${inProgress}`, `❌ لم تتم: ${notCompleted}`, '', `📋 ${t('visitsConductedBy')}:`, ...Object.entries(visitsByTeacher).map(([teacher, count]) => `🔹 ${teacher}: ${count}`) ];
        exportSupervisorySummaryUtil({ format, title: t('peerVisitsReport'), data, t });
    };

    return (
        <div className="space-y-6">
             <Section title={t('syllabusProgress')}>
                <SyllabusDashboardReport reports={props.syllabusCoverageReports} teachers={props.teachers} t={t} />
            </Section>
            <Section title={t('meetingOutcomesReport')}>
                <MeetingOutcomesReport meetings={props.meetings} />
            </Section>
             <Section title={t('peerVisitsReport')} onExport={handlePeerVisitExport}>
                <PeerVisitsReport {...props} />
            </Section>
            <Section title={t('deliveryRecordsReport')}><DeliveryRecordsReport {...props} /></Section>
        </div>
    );
};

// ... (Rest of the component remains unchanged for stability)
const SyllabusDashboardReport: React.FC<{ reports: SyllabusCoverageReport[], teachers: Teacher[], t: any }> = ({ reports, teachers, t }) => {
    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);
    const aggregatedData = useMemo(() => {
        const stats: Record<string, any> = {};
        reports.forEach(r => {
            const tid = r.teacherId;
            if (!stats[tid]) stats[tid] = { name: teacherMap.get(tid) || 'Unknown', reportsCount: 0, statusAhead: 0, statusBehind: 0, statusOnTrack: 0 };
            const s = stats[tid]; s.reportsCount++;
            r.branches.forEach(b => { if (b.status === 'ahead') s.statusAhead++; else if (b.status === 'behind') s.statusBehind++; else s.statusOnTrack++; });
        });
        return Object.values(stats);
    }, [reports, teacherMap]);

    return (
        <div className="space-y-4">
            <div className="max-h-64 overflow-y-auto space-y-2">
                {aggregatedData.map((teacher: any) => (
                    <div key={teacher.name} className="p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm">
                        <span className="font-bold text-primary">{teacher.name}</span>
                        <div className="flex gap-2 text-xs">
                            <span className="text-red-500 font-bold">متأخر: {teacher.statusBehind}</span>
                            <span className="text-blue-500 font-bold">متقدم: {teacher.statusAhead}</span>
                        </div>
                    </div>
                ))}
            </div>
            <ExportButtons onExport={(f) => exportSupervisorySummaryUtil({ format: f, title: t('syllabusProgress'), data: aggregatedData.map(a => `${a.name}: متأخر(${a.statusBehind}) متقدم(${a.statusAhead})`), t })} />
        </div>
    );
};

const MeetingOutcomesReport: React.FC<{ meetings: Meeting[] }> = ({ meetings }) => {
    const { t } = useLanguage();
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [stats, setStats] = useState<any>(null);

    const handleCalculate = useCallback(() => {
        const relevantMeetings = meetings.filter(m => (!dateRange.start || new Date(m.date) >= new Date(dateRange.start)) && (!dateRange.end || new Date(m.date) <= new Date(dateRange.end)));
        const allOutcomes = relevantMeetings.flatMap(m => m.outcomes.filter(o => o.outcome));
        const total = allOutcomes.length;
        if (total === 0) { setStats({ total: 0, executed: 0, inProgress: 0, notExecuted: 0, percentages: { executed: 0, inProgress: 0, notExecuted: 0 } }); return; }
        const executed = allOutcomes.filter(o => o.status === 'تم التنفيذ').length;
        const inProgress = allOutcomes.filter(o => o.status === 'قيد التنفيذ').length;
        const notExecuted = total - executed - inProgress;
        setStats({ total, executed, inProgress, notExecuted, percentages: { executed: (executed / total) * 100, inProgress: (inProgress / total) * 100, notExecuted: (notExecuted / total) * 100 } });
    }, [meetings, dateRange]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end p-2 bg-gray-50 rounded">
                <div><label className="text-sm font-medium">{t('from_date')}</label><input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} className="w-full p-2 border rounded" /></div>
                <div><label className="text-sm font-medium">{t('to_date')}</label><input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} className="w-full p-2 border rounded" /></div>
                <button onClick={handleCalculate} className="w-full px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90">{t('calculate')}</button>
            </div>
            {stats && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-green-100 rounded-lg"><p className="font-bold text-xl">{stats.executed} ({stats.percentages.executed.toFixed(0)}%)</p><p>{t('executed')}</p></div>
                        <div className="p-3 bg-yellow-100 rounded-lg"><p className="font-bold text-xl">{stats.inProgress} ({stats.percentages.inProgress.toFixed(0)}%)</p><p>{t('inProgress')}</p></div>
                         <div className="p-3 bg-red-100 rounded-lg"><p className="font-bold text-xl">{stats.notExecuted} ({stats.percentages.notExecuted.toFixed(0)}%)</p><p>{t('notExecuted')}</p></div>
                    </div>
                    <ExportButtons onExport={(f) => exportMeetingSummaryUtil({ format: f, stats, dateRange, t })} />
                </>
            )}
        </div>
    );
};

const PeerVisitsReport: React.FC<{ peerVisits: PeerVisit[] }> = ({ peerVisits }) => {
    const { t } = useLanguage();
    const stats = useMemo(() => {
        const visits = peerVisits.filter(v => v.visitingTeacher.trim() !== '');
        const visitsByTeacher = visits.reduce((acc, visit) => { acc[visit.visitingTeacher] = (acc[visit.visitingTeacher] || 0) + 1; return acc; }, {} as Record<string, number>);
        const completed = visits.filter(v => v.status === 'تمت الزيارة').length;
        const inProgress = visits.filter(v => v.status === 'قيد التنفيذ').length;
        const notCompleted = visits.length - completed - inProgress;
        return { total: visits.length, visitsByTeacher, completed, inProgress, notCompleted };
    }, [peerVisits]);
    return (
        <div>
            <p><strong>{t('totalVisits')}:</strong> {stats.total}</p>
            <div className="grid grid-cols-3 gap-2 my-2 text-center text-xs">
                <div className="p-2 bg-green-100 rounded font-bold">تمت: {stats.completed}</div>
                <div className="p-2 bg-yellow-100 rounded font-bold">قيد التنفيذ: {stats.inProgress}</div>
                <div className="p-2 bg-red-100 rounded font-bold">لم تتم: {stats.notCompleted}</div>
            </div>
            <h4 className="font-semibold mt-2">{t('visitsConductedBy')}:</h4>
            <ul className="list-disc ps-6 text-sm"> {Object.entries(stats.visitsByTeacher).map(([teacher, count]) => <li key={teacher}>{teacher}: {count}</li>)} </ul>
        </div>
    );
};

const DeliveryRecordsReport: React.FC<{ deliverySheets: DeliverySheet[], teachers: Teacher[] }> = ({ deliverySheets, teachers }) => {
    const { t } = useLanguage();
    return (
        <div className="space-y-4">
            {deliverySheets.map(sheet => {
                const total = sheet.records.length;
                const delivered = sheet.records.filter(r => r.deliveryDate).length;
                if (total === 0) return null;
                return (
                    <div key={sheet.id} className="p-3 border rounded-lg bg-gray-50">
                        <h4 className="font-bold text-primary">{sheet.name}</h4>
                        <p className="text-sm"><strong>{t('delivered')}:</strong> {delivered} من {total} ({(delivered / total * 100).toFixed(1)}%)</p>
                        <ExportButtons onExport={(f) => exportSupervisorySummaryUtil({ format: f, title: sheet.name, data: [`تم التسليم: ${delivered} / ${total}`], t })} />
                    </div>
                )
            })}
        </div>
    );
};

export default PerformanceDashboard;
