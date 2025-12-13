
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
            <p className="font-semibold text-gray-700 text-sm mb-1">{label}</p>
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


// --- Key Metrics Tab (Updated) ---
const KeyMetricsView: React.FC<{ reports: Report[], teachers: Teacher[] }> = ({ reports, teachers }) => {
    const { t } = useLanguage();
    
    // State for Date Range and Goals
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [goals, setGoals] = useState({
        strategies: 0,
        tools: 0,
        sources: 0,
        programs: 0
    });

    // State for WhatsApp Selection Modal
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [whatsAppSelection, setWhatsAppSelection] = useState({
        stats: true,
        goals: true,
        strategies: true,
        tools: true,
        sources: true,
        programs: true
    });

    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);

    // Stats Calculation
    const { basicStats, detailedStats } = useMemo(() => {
        // 1. Basic Stats (Existing)
        const totalReports = reports.length;
        const totalTeachers = teachers.length;
        let totalScoreSum = 0;
        const typeCounts = { general: 0, class_session: 0, special: 0 };
        
        reports.forEach(r => {
            totalScoreSum += calculateReportPercentage(r);
            if (r.evaluationType === 'general') typeCounts.general++;
            else if (r.evaluationType === 'class_session') typeCounts.class_session++;
            else if (r.evaluationType === 'special') typeCounts.special++;
        });
        const overallAverage = totalReports > 0 ? totalScoreSum / totalReports : 0;

        // 2. Detailed Stats (New) based on Date Range
        const filteredReports = reports.filter(r => {
            if (!dateRange.start && !dateRange.end) return true;
            const rDate = new Date(r.date);
            const start = dateRange.start ? new Date(dateRange.start) : new Date('2000-01-01');
            const end = dateRange.end ? new Date(dateRange.end) : new Date('2100-01-01');
            return rDate >= start && rDate <= end;
        });

        const usageCounts = { strategies: 0, tools: 0, sources: 0, programs: 0 };
        const usageDetails = {
            strategies: {} as Record<string, Record<string, number>>,
            tools: {} as Record<string, Record<string, number>>,
            sources: {} as Record<string, Record<string, number>>,
            programs: {} as Record<string, Record<string, number>>
        };

        const processField = (report: Report, fieldName: keyof typeof usageCounts, reportField: string) => {
            if (!reportField) return;
            const items = reportField.split(/[,،\n]+/).map(s => s.trim().replace(/^- /, '')).filter(Boolean);
            
            items.forEach(item => {
                usageCounts[fieldName]++; // Increment total count
                
                // Track detail per item per teacher
                if (!usageDetails[fieldName][item]) {
                    usageDetails[fieldName][item] = {};
                }
                const teacherName = teacherMap.get(report.teacherId) || 'Unknown';
                usageDetails[fieldName][item][teacherName] = (usageDetails[fieldName][item][teacherName] || 0) + 1;
            });
        };

        filteredReports.forEach(r => {
            let strats = '', tools = '', sources = '', progs = '';
            
            if (r.evaluationType === 'general') {
                strats = (r as GeneralEvaluationReport).strategies;
                tools = (r as GeneralEvaluationReport).tools;
                sources = (r as GeneralEvaluationReport).sources;
                progs = (r as GeneralEvaluationReport).programs;
            } else if (r.evaluationType === 'class_session') {
                strats = (r as ClassSessionEvaluationReport).strategies;
                tools = (r as ClassSessionEvaluationReport).tools;
                sources = (r as ClassSessionEvaluationReport).sources;
                progs = (r as ClassSessionEvaluationReport).programs;
            }

            processField(r, 'strategies', strats);
            processField(r, 'tools', tools);
            processField(r, 'sources', sources);
            processField(r, 'programs', progs);
        });

        return {
            basicStats: { totalTeachers, totalReports, overallAverage, typeCounts },
            detailedStats: { usageCounts, usageDetails }
        };

    }, [reports, teachers, dateRange, teacherMap]);

    // Custom Excel Export for Key Metrics (Detailed)
    const exportKeyMetricsToExcel = () => {
        const wb = XLSX.utils.book_new();

        // Sheet 1: General Stats
        // Use any[][] to avoid type errors with mixed string/number arrays
        const statsData: any[][] = [
            ['المقياس', 'القيمة'],
            [t('totalTeachers'), basicStats.totalTeachers],
            [t('totalReports'), basicStats.totalReports],
            [t('overallAveragePerformance'), basicStats.overallAverage.toFixed(2) + '%'],
            ['', ''],
            ['نوع التقرير', 'العدد'],
            [t('generalEvaluation'), basicStats.typeCounts.general],
            [t('classSessionEvaluation'), basicStats.typeCounts.class_session],
            [t('specialReports'), basicStats.typeCounts.special],
            ['', ''],
            ['المجال', 'العدد المحقق', 'العدد المطلوب', 'النسبة'],
            ['الاستراتيجيات', detailedStats.usageCounts.strategies, goals.strategies, goals.strategies > 0 ? (detailedStats.usageCounts.strategies/goals.strategies*100).toFixed(1)+'%' : '0%'],
            ['الوسائل', detailedStats.usageCounts.tools, goals.tools, goals.tools > 0 ? (detailedStats.usageCounts.tools/goals.tools*100).toFixed(1)+'%' : '0%'],
            ['المصادر', detailedStats.usageCounts.sources, goals.sources, goals.sources > 0 ? (detailedStats.usageCounts.sources/goals.sources*100).toFixed(1)+'%' : '0%'],
            ['البرامج', detailedStats.usageCounts.programs, goals.programs, goals.programs > 0 ? (detailedStats.usageCounts.programs/goals.programs*100).toFixed(1)+'%' : '0%'],
        ];
        const wsStats = XLSX.utils.aoa_to_sheet(statsData);
        XLSX.utils.book_append_sheet(wb, wsStats, "الإحصائيات العامة");

        // Helper for details sheet
        const addDetailSheet = (title: string, dataMap: Record<string, Record<string, number>>) => {
            const rows = [['العنصر', 'المعلم', 'عدد مرات الاستخدام']];
            Object.entries(dataMap).forEach(([itemName, teachers]) => {
                Object.entries(teachers).forEach(([teacherName, count]) => {
                    rows.push([itemName, teacherName, count.toString()]);
                });
            });
            const ws = XLSX.utils.aoa_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, title);
        };

        addDetailSheet('تفاصيل الاستراتيجيات', detailedStats.usageDetails.strategies);
        addDetailSheet('تفاصيل الوسائل', detailedStats.usageDetails.tools);
        addDetailSheet('تفاصيل المصادر', detailedStats.usageDetails.sources);
        addDetailSheet('تفاصيل البرامج', detailedStats.usageDetails.programs);

        XLSX.writeFile(wb, `key_metrics_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleSendWhatsApp = () => {
        let msg = `*📊 ${t('keyMetrics')}*\n\n`;
        
        if (whatsAppSelection.stats) {
            msg += `👥 ${t('totalTeachers')}: ${basicStats.totalTeachers}\n`;
            msg += `📝 ${t('totalReports')}: ${basicStats.totalReports}\n`;
            msg += `📈 ${t('overallAveragePerformance')}: ${basicStats.overallAverage.toFixed(1)}%\n`;
            msg += `------------------\n`;
        }
        
        if (whatsAppSelection.goals) {
            msg += `\n*🎯 تحليل الأهداف:*\n`;
            const goalKeys = [
                { k: 'strategies', l: 'الاستراتيجيات' }, 
                { k: 'tools', l: 'الوسائل' }, 
                { k: 'sources', l: 'المصادر' }, 
                { k: 'programs', l: 'البرامج' }
            ];
            
            goalKeys.forEach(({k, l}) => {
                const count = detailedStats.usageCounts[k as keyof typeof detailedStats.usageCounts];
                const goal = goals[k as keyof typeof goals];
                const pct = goal > 0 ? (count / goal) * 100 : 0;
                msg += `🔹 *${l}:* ${count} / ${goal} (${pct.toFixed(1)}%)\n`;
            });
            msg += `------------------\n`;
        }

        // Detailed Breakdown
        const generateDetailSection = (title: string, dataMap: Record<string, Record<string, number>>) => {
            let sectionMsg = `\n*📌 ${title}:*\n`;
            const items = Object.entries(dataMap);
            if (items.length === 0) return sectionMsg + "   (لا توجد بيانات)\n";
            
            items.forEach(([itemName, teacherCounts]) => {
                sectionMsg += `🔸 *${itemName}:*\n`;
                Object.entries(teacherCounts)
                    .sort(([, a], [, b]) => b - a) // Sort desc
                    .forEach(([name, count]) => {
                        // Modified format: Removed number icon, just Name (Count)
                        sectionMsg += `   👤 ${name} (${count})\n`;
                    });
            });
            return sectionMsg;
        };

        if (whatsAppSelection.strategies) msg += generateDetailSection('الاستراتيجيات المستخدمة', detailedStats.usageDetails.strategies);
        if (whatsAppSelection.tools) msg += generateDetailSection('الوسائل المستخدمة', detailedStats.usageDetails.tools);
        if (whatsAppSelection.sources) msg += generateDetailSection('المصادر المستخدمة', detailedStats.usageDetails.sources);
        if (whatsAppSelection.programs) msg += generateDetailSection('البرامج المنفذة', detailedStats.usageDetails.programs);

        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
        setShowWhatsAppModal(false);
    };

    const handleExportClick = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp') => {
        if (format === 'whatsapp') {
            setShowWhatsAppModal(true);
        } else if (format === 'excel') {
            exportKeyMetricsToExcel();
        } else {
            // Default export for other formats
            exportKeyMetrics(format, basicStats, t);
        }
    };

    // Helper to format detailed list with icons
    const renderDetailsList = (detailsMap: Record<string, Record<string, number>>, title: string) => {
        const items = Object.entries(detailsMap);
        if (items.length === 0) return null;

        return (
            <div className="border rounded-lg overflow-hidden bg-white shadow-sm mb-4">
                <div className="bg-gray-100 p-3 font-bold text-lg text-primary border-b">{title}</div>
                <div className="p-4 max-h-60 overflow-y-auto space-y-3">
                    {items.map(([itemName, teacherCounts]) => {
                        // Sort teachers by count descending
                        const sortedTeachers = Object.entries(teacherCounts)
                            .sort(([, a], [, b]) => b - a)
                            .map(([name, count]) => `👤 ${name} (${count})`) // Removed 🔢 icon
                            .join(' ،  ');
                        
                        return (
                            <div key={itemName} className="text-sm border-b pb-2 last:border-0">
                                <span className="font-bold text-gray-800 block mb-1">🔸 {itemName}: </span>
                                <span className="text-gray-600 leading-relaxed">{sortedTeachers}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 relative">
            {/* WhatsApp Filter Modal */}
            {showWhatsAppModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold text-primary mb-4 text-center">اختر البيانات للإرسال</h3>
                        <div className="space-y-3 mb-6">
                            <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded border cursor-pointer">
                                <input type="checkbox" checked={whatsAppSelection.stats} onChange={e => setWhatsAppSelection({...whatsAppSelection, stats: e.target.checked})} className="w-5 h-5 text-primary" />
                                <span className="font-semibold">الإحصائيات العامة</span>
                            </label>
                            <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded border cursor-pointer">
                                <input type="checkbox" checked={whatsAppSelection.goals} onChange={e => setWhatsAppSelection({...whatsAppSelection, goals: e.target.checked})} className="w-5 h-5 text-primary" />
                                <span className="font-semibold">تحليل الأهداف (النسب)</span>
                            </label>
                            <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded border cursor-pointer">
                                <input type="checkbox" checked={whatsAppSelection.strategies} onChange={e => setWhatsAppSelection({...whatsAppSelection, strategies: e.target.checked})} className="w-5 h-5 text-primary" />
                                <span className="font-semibold">تفاصيل الاستراتيجيات</span>
                            </label>
                            <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded border cursor-pointer">
                                <input type="checkbox" checked={whatsAppSelection.tools} onChange={e => setWhatsAppSelection({...whatsAppSelection, tools: e.target.checked})} className="w-5 h-5 text-primary" />
                                <span className="font-semibold">تفاصيل الوسائل</span>
                            </label>
                            <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded border cursor-pointer">
                                <input type="checkbox" checked={whatsAppSelection.sources} onChange={e => setWhatsAppSelection({...whatsAppSelection, sources: e.target.checked})} className="w-5 h-5 text-primary" />
                                <span className="font-semibold">تفاصيل المصادر</span>
                            </label>
                            <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded border cursor-pointer">
                                <input type="checkbox" checked={whatsAppSelection.programs} onChange={e => setWhatsAppSelection({...whatsAppSelection, programs: e.target.checked})} className="w-5 h-5 text-primary" />
                                <span className="font-semibold">تفاصيل البرامج</span>
                            </label>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleSendWhatsApp} className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 font-bold">{t('send')}</button>
                            <button onClick={() => setShowWhatsAppModal(false)} className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600">{t('cancel')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. Existing Basic Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg text-center border border-blue-200 shadow-sm">
                    <h3 className="text-gray-600 font-semibold mb-2">{t('totalTeachers')}</h3>
                    <p className="text-4xl font-bold text-blue-600">{basicStats.totalTeachers.toString()}</p>
                </div>
                <div className="bg-green-50 p-6 rounded-lg text-center border border-green-200 shadow-sm">
                    <h3 className="text-gray-600 font-semibold mb-2">{t('totalReports')}</h3>
                    <p className="text-4xl font-bold text-green-600">{basicStats.totalReports.toString()}</p>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg text-center border border-purple-200 shadow-sm">
                    <h3 className="text-gray-600 font-semibold mb-2">{t('overallAveragePerformance')}</h3>
                    <p className="text-4xl font-bold text-purple-600">{basicStats.overallAverage.toFixed(1)}%</p>
                </div>
            </div>

            <div className="p-6 border rounded-lg bg-gray-50">
                <h4 className="text-xl font-bold mb-4 text-center text-primary">توزيع التقارير حسب النوع</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex flex-col items-center">
                        <span className="font-bold mb-2">{t('generalEvaluation')}</span>
                        <div className="relative w-32 h-32">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth={3} />
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#3b82f6" strokeWidth={3} strokeDasharray={`${basicStats.totalReports ? (basicStats.typeCounts.general / basicStats.totalReports) * 100 : 0}, 100`} />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center font-bold text-lg text-blue-600">{basicStats.typeCounts.general}</div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="font-bold mb-2">{t('classSessionEvaluation')}</span>
                        <div className="relative w-32 h-32">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth={3} />
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth={3} strokeDasharray={`${basicStats.totalReports ? (basicStats.typeCounts.class_session / basicStats.totalReports) * 100 : 0}, 100`} />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center font-bold text-lg text-green-600">{basicStats.typeCounts.class_session}</div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="font-bold mb-2">{t('specialReports')}</span>
                        <div className="relative w-32 h-32">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth={3} />
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f59e0b" strokeWidth={3} strokeDasharray={`${basicStats.totalReports ? (basicStats.typeCounts.special / basicStats.totalReports) * 100 : 0}, 100`} />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center font-bold text-lg text-yellow-600">{basicStats.typeCounts.special}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. New Goals & Analysis Section */}
            <div className="border-t-4 border-primary pt-6">
                <h3 className="text-2xl font-bold text-center text-primary mb-6">تحليل الاستخدام والأهداف</h3>
                
                {/* Controls: Dates and Goals */}
                <div className="bg-gray-100 p-4 rounded-lg mb-6 shadow-inner">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-bold mb-1">{t('from_date')}</label>
                            <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({...p, start: e.target.value}))} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">{t('to_date')}</label>
                            <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({...p, end: e.target.value}))} className="w-full p-2 border rounded" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold mb-1">الاستراتيجيات المطلوبة</label>
                            <input type="number" value={goals.strategies || ''} onChange={e => setGoals(p => ({...p, strategies: parseInt(e.target.value) || 0}))} className="w-full p-2 border rounded" placeholder="0" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">الوسائل المطلوبة</label>
                            <input type="number" value={goals.tools || ''} onChange={e => setGoals(p => ({...p, tools: parseInt(e.target.value) || 0}))} className="w-full p-2 border rounded" placeholder="0" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">المصادر المطلوبة</label>
                            <input type="number" value={goals.sources || ''} onChange={e => setGoals(p => ({...p, sources: parseInt(e.target.value) || 0}))} className="w-full p-2 border rounded" placeholder="0" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">البرامج المطلوبة</label>
                            <input type="number" value={goals.programs || ''} onChange={e => setGoals(p => ({...p, programs: parseInt(e.target.value) || 0}))} className="w-full p-2 border rounded" placeholder="0" />
                        </div>
                    </div>
                </div>

                {/* Progress Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {['strategies', 'tools', 'sources', 'programs'].map((key) => {
                        const count = detailedStats.usageCounts[key as keyof typeof detailedStats.usageCounts];
                        const goal = goals[key as keyof typeof goals];
                        const percentage = goal > 0 ? (count / goal) * 100 : 0;
                        const labels = { strategies: 'الاستراتيجيات', tools: 'الوسائل', sources: 'المصادر', programs: 'البرامج' };
                        
                        return (
                            <div key={key} className="bg-white p-4 rounded-xl border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <h4 className="text-center font-bold text-gray-700 mb-2">{labels[key as keyof typeof labels]}</h4>
                                <div className="text-center text-3xl font-bold text-primary mb-1">{count} <span className="text-sm text-gray-400 font-normal">/ {goal}</span></div>
                                <ProgressBar label="نسبة الإنجاز" percentage={percentage} customColors={true} />
                            </div>
                        )
                    })}
                </div>

                {/* Detailed Breakdown */}
                <div className="space-y-4">
                    {renderDetailsList(detailedStats.usageDetails.strategies, 'ب‌- أسماء الاستراتيجيات المستخدمة والمعلمين المنفذين')}
                    {renderDetailsList(detailedStats.usageDetails.tools, 'ت‌- أسماء الوسائل المستخدمة والمعلمين المنفذين')}
                    {renderDetailsList(detailedStats.usageDetails.sources, 'ث‌- أسماء المصادر المستخدمة والمعلمين المنفذين')}
                    {renderDetailsList(detailedStats.usageDetails.programs, 'ج‌- أسماء البرامج المنفذة والمعلمين المنفذين')}
                </div>
            </div>
            
            <ExportButtons onExport={handleExportClick} />
        </div>
    )
};

// --- Evaluation Analysis Tab (Fully Implemented) ---
const EvaluationAnalysisView: React.FC<{ reports: Report[], teachers: Teacher[] }> = ({ reports, teachers }) => {
    const { t } = useLanguage();
    const [subTypeFilter, setSubTypeFilter] = useState<'all' | 'general' | 'brief' | 'extended' | 'subject_specific'>('all');
    
    // New states for WhatsApp filtering
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());

    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);

    const analysis = useMemo(() => {
        // Filter reports based on selected subtype
        const filteredReports = reports.filter(r => {
            if (subTypeFilter === 'all') return true;
            if (subTypeFilter === 'general') return r.evaluationType === 'general';
            if (r.evaluationType === 'class_session') {
                return (r as ClassSessionEvaluationReport).subType === subTypeFilter;
            }
            return false; // Should not happen for class session subtype filter if report is not class session
        });

        // Map: CriterionLabel -> { totalSum, totalCount, teachers: { teacherId: { sum, count, name } } }
        const criteriaMap: Record<string, { 
            sum: number; 
            count: number; 
            teachers: Record<string, { sum: number; count: number; name: string }> 
        }> = {};

        filteredReports.forEach(report => {
            let criteria: any[] = [];
            if (report.evaluationType === 'general' || report.evaluationType === 'special') {
                criteria = (report as GeneralEvaluationReport | SpecialReport).criteria;
            } else if (report.evaluationType === 'class_session') {
                criteria = (report as ClassSessionEvaluationReport).criterionGroups.flatMap(g => g.criteria);
            }

            const teacherName = teacherMap.get(report.teacherId) || 'Unknown';

            criteria.forEach(c => {
                if (!criteriaMap[c.label]) {
                    criteriaMap[c.label] = { sum: 0, count: 0, teachers: {} };
                }
                
                // Aggregate total
                criteriaMap[c.label].sum += c.score;
                criteriaMap[c.label].count += 1;

                // Aggregate per teacher
                if (!criteriaMap[c.label].teachers[report.teacherId]) {
                    criteriaMap[c.label].teachers[report.teacherId] = { sum: 0, count: 0, name: teacherName };
                }
                criteriaMap[c.label].teachers[report.teacherId].sum += c.score;
                criteriaMap[c.label].teachers[report.teacherId].count += 1;
            });
        });

        // Convert to array and calculate averages
        const result = Object.entries(criteriaMap).map(([label, data]) => {
            const overallPercentage = (data.sum / (data.count * 4)) * 100;
            
            // Process teachers list
            const teacherDetails = Object.values(data.teachers).map(tData => ({
                name: tData.name,
                percentage: (tData.sum / (tData.count * 4)) * 100,
                count: tData.count
            }));

            // Sort teachers ascending (lowest percentage first) as requested
            teacherDetails.sort((a, b) => a.percentage - b.percentage);

            return {
                label,
                percentage: overallPercentage,
                count: data.count,
                teacherDetails
            };
        });

        // Sort by lowest overall percentage first
        return result.sort((a, b) => a.percentage - b.percentage);
    }, [reports, subTypeFilter, teacherMap]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedLabels(new Set(analysis.map(a => a.label)));
        } else {
            setSelectedLabels(new Set());
        }
    };

    const toggleLabel = (label: string) => {
        const newSet = new Set(selectedLabels);
        if (newSet.has(label)) newSet.delete(label);
        else newSet.add(label);
        setSelectedLabels(newSet);
    };

    const handleSendWhatsApp = () => {
        let msg = `*📊 ${t('evaluationElementAnalysis')}*\n`;
        msg += `نوع التقرير: ${
            subTypeFilter === 'all' ? 'الكل' : 
            subTypeFilter === 'general' ? 'عام' :
            subTypeFilter === 'brief' ? 'مختصر' :
            subTypeFilter === 'extended' ? 'موسع' : 'حسب المادة'
        }\n\n`;

        const itemsToSend = analysis.filter(item => selectedLabels.has(item.label));

        if (itemsToSend.length === 0) {
            alert('يرجى اختيار عنصر واحد على الأقل.');
            return;
        }

        itemsToSend.forEach(item => {
            msg += `📌 *${item.label}*\n`;
            msg += `   المتوسط العام: ${item.percentage.toFixed(1)}% (تكرار: ${item.count})\n`;
            msg += `   🔻 *تفصيل المعلمين (من الأقل للأعلى):*\n`;
            item.teacherDetails.forEach(t => {
                let icon = '🟢';
                if (t.percentage <= 50) icon = '🔴';
                else if (t.percentage <= 75) icon = '🟡';
                else if (t.percentage <= 89) icon = '🔵';
                
                msg += `   ${icon} ${t.name} (${t.percentage.toFixed(0)}%)\n`;
            });
            msg += `\n`;
        });

        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
        setShowWhatsAppModal(false);
    };

    const handleExportClick = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp') => {
        if (format === 'whatsapp') {
            setSelectedLabels(new Set(analysis.map(a => a.label))); // Default select all
            setShowWhatsAppModal(true);
        } else {
            // This function from exportUtils already handles excel if format is passed correctly
            exportEvaluationAnalysis(format, analysis, t);
        }
    };

    return (
        <div className="space-y-6 relative">
            {/* WhatsApp Selection Modal */}
            {showWhatsAppModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
                        <h3 className="text-xl font-bold text-primary mb-4 text-center">اختر العناصر للإرسال</h3>
                        
                        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded border-b">
                            <input 
                                type="checkbox" 
                                id="selectAllAnalysis" 
                                checked={selectedLabels.size === analysis.length && analysis.length > 0} 
                                onChange={handleSelectAll} 
                                className="w-5 h-5 text-primary" 
                            />
                            <label htmlFor="selectAllAnalysis" className="font-bold cursor-pointer">تحديد الكل</label>
                        </div>

                        <div className="flex-grow overflow-y-auto space-y-2 p-2 border rounded mb-4">
                            {analysis.map((item, idx) => (
                                <label key={idx} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer border-b last:border-0">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedLabels.has(item.label)} 
                                        onChange={() => toggleLabel(item.label)} 
                                        className="w-5 h-5 text-primary mt-1" 
                                    />
                                    <div>
                                        <span className="font-semibold block">{item.label}</span>
                                        <span className="text-xs text-gray-500">المتوسط: {item.percentage.toFixed(1)}%</span>
                                    </div>
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

            {/* Filter Buttons */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
                {[
                    { id: 'all', label: 'الكل' },
                    { id: 'general', label: t('generalEvaluation') },
                    { id: 'brief', label: t('briefClassSessionEvaluation') },
                    { id: 'extended', label: t('extendedClassSessionEvaluation') },
                    { id: 'subject_specific', label: t('subjectSpecificClassSessionEvaluation') }
                ].map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => setSubTypeFilter(opt.id as any)}
                        className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${subTypeFilter === opt.id ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <p>ملاحظة: يتم ترتيب المعايير والمعلمين من الأقل أداءً إلى الأعلى، لتسليط الضوء على جوانب التطوير المطلوبة.</p>
            </div>

            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                {analysis.length > 0 ? analysis.map((item, index) => (
                    <div key={index} className="bg-white border rounded-lg p-3 shadow-sm">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-1/3 md:w-1/4 font-bold text-gray-800">{item.label}</div>
                            <div className="flex-grow">
                                <ProgressBar label="" percentage={item.percentage} />
                            </div>
                            <div className="w-16 text-center text-xs text-gray-500">
                                ({item.count} تكرار)
                            </div>
                        </div>
                        
                        {/* Teacher Breakdown */}
                        <div className="mt-3 bg-gray-50 p-2 rounded text-sm">
                            <p className="font-semibold text-gray-600 mb-1 border-b pb-1">أداء المعلمين في هذا المعيار (تصاعدياً):</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-2">
                                {item.teacherDetails.map((t, idx) => {
                                    let colorClass = 'text-green-600';
                                    let icon = '🟢';
                                    if (t.percentage <= 25) { colorClass = 'text-red-600'; icon = '🔴'; }
                                    else if (t.percentage <= 50) { colorClass = 'text-orange-600'; icon = '🟠'; }
                                    else if (t.percentage <= 75) { colorClass = 'text-yellow-600'; icon = '🟡'; }
                                    else if (t.percentage <= 89) { colorClass = 'text-blue-600'; icon = '🔵'; }

                                    return (
                                        <span key={idx} className={`inline-flex items-center gap-1 ${colorClass} font-medium bg-white px-2 py-1 rounded border shadow-sm`}>
                                            <span>{icon}</span>
                                            <span>{t.name}</span>
                                            <span className="text-xs text-gray-500">({t.percentage.toFixed(0)}%)</span>
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )) : <p className="text-center py-8 text-gray-500">لا توجد بيانات كافية للتحليل.</p>}
            </div>

            {analysis.length > 0 && <ExportButtons onExport={handleExportClick} />}
        </div>
    );
};


// --- Supervisory Reports Tab (Updated) ---
const SupervisoryReportsView: React.FC<PerformanceDashboardProps> = (props) => {
    const { t } = useLanguage();
    
    // ... (Keep existing export handlers if needed, but SyllabusDashboardReport now handles its own export)

    const handlePeerVisitExport = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp') => {
        const visits = props.peerVisits.filter(v => v.visitingTeacher);
        const total = visits.length;
        const completed = visits.filter(v => v.status === 'تمت الزيارة').length;
        const inProgress = visits.filter(v => v.status === 'قيد التنفيذ').length;
        const notCompleted = visits.filter(v => v.status === 'لم تتم' || !v.status).length;
        
        const visitsByTeacher = visits.reduce((acc, visit) => {
            acc[visit.visitingTeacher] = (acc[visit.visitingTeacher] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const details = Object.entries(visitsByTeacher).map(([teacher, count]) => `🔹 ${teacher}: ${count}`);
        
        const data = [
            `📌 ${t('totalVisits')}: ${total}`,
            `✅ تمت الزيارة: ${completed}`,
            `⏳ قيد التنفيذ: ${inProgress}`,
            `❌ لم تتم: ${notCompleted}`,
            '',
            `📋 ${t('visitsConductedBy')}:`, 
            ...details
        ];
        
        if (format === 'excel') {
             const wb = XLSX.utils.book_new();
             const ws = XLSX.utils.json_to_sheet([
                 { 'المقياس': 'إجمالي الزيارات', 'القيمة': total },
                 { 'المقياس': 'تمت', 'القيمة': completed },
                 { 'المقياس': 'قيد التنفيذ', 'القيمة': inProgress },
                 { 'المقياس': 'لم تتم', 'القيمة': notCompleted },
                 ...Object.entries(visitsByTeacher).map(([teacher, count]) => ({ 'المقياس': `زيارات ${teacher}`, 'القيمة': count }))
             ]);
             XLSX.utils.book_append_sheet(wb, ws, "الزيارات التبادلية");
             XLSX.writeFile(wb, "peer_visits.xlsx");
             return;
        }

        exportSupervisorySummaryUtil({ format, title: t('peerVisitsReport'), data, t });
    };

    return (
        <div className="space-y-6">
             <Section title={t('syllabusProgress')}>
                <SyllabusDashboardReport 
                    reports={props.syllabusCoverageReports} 
                    teachers={props.teachers} 
                    t={t}
                />
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

// --- Updated Syllabus Dashboard Report with Aggregation ---
const SyllabusDashboardReport: React.FC<{ reports: SyllabusCoverageReport[], teachers: Teacher[], t: any }> = ({ reports, teachers, t }) => {
    const [filterMetric, setFilterMetric] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);

    const aggregatedData = useMemo(() => {
        // 1. Filter by Date
        const filteredReports = reports.filter(r => {
            if (!startDate || !endDate) return true;
            const rDate = new Date(r.date);
            return rDate >= new Date(startDate) && rDate <= new Date(endDate);
        });

        // 2. Aggregate Data per Teacher
        const teacherStats: Record<string, any> = {};

        filteredReports.forEach(r => {
            const tid = r.teacherId;
            if (!teacherStats[tid]) {
                teacherStats[tid] = {
                    name: teacherMap.get(tid) || 'Unknown',
                    reportsCount: 0,
                    meetings: 0,
                    visits: 0, // Peer Visits
                    notebookSum: 0, notebookCount: 0,
                    prepSum: 0, prepCount: 0,
                    glossarySum: 0, glossaryCount: 0,
                    strategies: new Set(),
                    tools: new Set(),
                    sources: new Set(),
                    programs: new Set(),
                    tasks: new Set(),
                    tests: new Set(),
                    statusAhead: 0,
                    statusBehind: 0,
                    statusOnTrack: 0,
                    // Store detailed status per branch
                    branchDetails: [] as string[]
                };
            }
            const s = teacherStats[tid];
            s.reportsCount++;
            s.meetings += Number(r.meetingsAttended) || 0;
            
            // Text based numbers need extraction or simple length check if list
            // Assuming peer visits is a list or number. If string list, count items.
            if(r.peerVisitsDone) s.visits += r.peerVisitsDone.split('\n').length;

            if (r.notebookCorrection) { s.notebookSum += Number(r.notebookCorrection) || 0; s.notebookCount++; }
            if (r.preparationBook) { s.prepSum += Number(r.preparationBook) || 0; s.prepCount++; }
            if (r.questionsGlossary) { s.glossarySum += Number(r.questionsGlossary) || 0; s.glossaryCount++; }

            // Merge Sets
            const addToSet = (set: Set<string>, val?: string) => {
                if(!val) return;
                val.split(/[\n,،]+/).forEach(line => {
                    const clean = line.replace(/^- /, '').trim();
                    if(clean) set.add(clean);
                });
            };
            addToSet(s.strategies, r.strategiesImplemented);
            addToSet(s.tools, r.toolsUsed);
            addToSet(s.sources, r.sourcesUsed);
            addToSet(s.programs, r.programsImplemented);
            addToSet(s.tasks, r.tasksDone);
            addToSet(s.tests, r.testsDelivered);

            // Syllabus Status
            r.branches.forEach(b => {
                if (b.status === 'ahead') {
                    s.statusAhead++;
                    s.branchDetails.push(`📈 ${b.branchName}: متقدم (${b.lessonDifference} درس)`);
                }
                else if (b.status === 'behind') {
                    s.statusBehind++;
                    s.branchDetails.push(`📉 ${b.branchName}: متأخر (${b.lessonDifference} درس)`);
                }
                else if (b.status === 'on_track') {
                    s.statusOnTrack++;
                    s.branchDetails.push(`✅ ${b.branchName}: مطابق`);
                }
            });
        });

        return Object.values(teacherStats).map((s: any) => ({
            ...s,
            notebookAvg: s.notebookCount ? (s.notebookSum / s.notebookCount).toFixed(1) : 0,
            prepAvg: s.prepCount ? (s.prepSum / s.prepCount).toFixed(1) : 0,
            glossaryAvg: s.glossaryCount ? (s.glossarySum / s.glossaryCount).toFixed(1) : 0,
            strategiesList: Array.from(s.strategies).join('، '),
            toolsList: Array.from(s.tools).join('، '),
            sourcesList: Array.from(s.sources).join('، '),
            programsList: Array.from(s.programs).join('، '),
            tasksList: Array.from(s.tasks).join('، '),
            testsList: Array.from(s.tests).join('، '),
        }));

    }, [reports, startDate, endDate, teacherMap]);

    const displayData = useMemo(() => {
        if (filterMetric === 'all') return aggregatedData;
        
        // Sort/Filter logic
        return [...aggregatedData].sort((a, b) => {
            switch(filterMetric) {
                case 'meetings': return b.meetings - a.meetings;
                case 'notebooks': return b.notebookAvg - a.notebookAvg;
                case 'prep': return b.prepAvg - a.prepAvg;
                case 'ahead': return b.statusAhead - a.statusAhead;
                case 'behind': return b.statusBehind - a.statusBehind;
                default: return 0;
            }
        });
    }, [aggregatedData, filterMetric]);

    const handleExport = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp') => {
        if (format === 'excel') {
            const wb = XLSX.utils.book_new();
            const dataForExcel = displayData.map((t: any) => ({
                'المعلم': t.name,
                'عدد التقارير': t.reportsCount,
                'عدد الفروع المتأخرة': t.statusBehind,
                'عدد الفروع المتقدمة': t.statusAhead,
                'اللقاءات': t.meetings,
                'تصحيح الدفاتر %': t.notebookAvg,
                'دفتر التحضير %': t.prepAvg,
                'الاستراتيجيات': t.strategiesList,
                'الوسائل': t.toolsList
            }));
            const ws = XLSX.utils.json_to_sheet(dataForExcel);
            XLSX.utils.book_append_sheet(wb, ws, "تقرير السير في المنهج");
            XLSX.writeFile(wb, `syllabus_dashboard_${new Date().toISOString().split('T')[0]}.xlsx`);
            return;
        }

        const title = t('syllabusCoverageReport') + ` (${startDate || 'الكل'} - ${endDate || 'الكل'})`;
        const dataLines: string[] = [];
        
        displayData.forEach((teacher: any) => {
            dataLines.push(`👤 *${teacher.name}*`);
            
            // Detailed Status
            if (teacher.statusBehind > 0) {
                dataLines.push(`🔴 *الحالة العامة:* متأخر عن الخطة`);
            } else if (teacher.statusAhead > 0) {
                dataLines.push(`🔵 *الحالة العامة:* متقدم عن الخطة`);
            } else {
                dataLines.push(`🟢 *الحالة العامة:* مطابق للخطة`);
            }
            
            // Branch Details for Whatsapp
            if(teacher.branchDetails.length > 0) {
                 dataLines.push(`   📌 *تفاصيل الفروع:*`);
                 teacher.branchDetails.forEach((d: string) => dataLines.push(`   ${d}`));
            }

            dataLines.push(`📊 *الإحصائيات:*`);
            dataLines.push(`   🤝 اللقاءات: ${teacher.meetings}`);
            dataLines.push(`   📚 تصحيح الدفاتر: ${teacher.notebookAvg}%`);
            dataLines.push(`   📝 دفتر التحضير: ${teacher.prepAvg}%`);
            dataLines.push(`   📖 مسرد الأسئلة: ${teacher.glossaryAvg}%`);
            
            if (teacher.strategiesList) dataLines.push(`💡 *الاستراتيجيات:* ${teacher.strategiesList}`);
            if (teacher.toolsList) dataLines.push(`🛠️ *الوسائل:* ${teacher.toolsList}`);
            if (teacher.sourcesList) dataLines.push(`📚 *المصادر:* ${teacher.sourcesList}`);
            if (teacher.programsList) dataLines.push(`💻 *البرامج:* ${teacher.programsList}`);
            if (teacher.tasksList) dataLines.push(`✅ *التكاليف:* ${teacher.tasksList}`);
            if (teacher.testsList) dataLines.push(`📄 *الاختبارات:* ${teacher.testsList}`);
            
            dataLines.push('━━━━━━━━━━━━━━━━');
        });

        exportSupervisorySummaryUtil({ format, title, data: dataLines, t });
    };

    return (
        <div className="space-y-4">
            {/* Filter Controls */}
            <div className="bg-gray-50 p-4 rounded-lg flex flex-wrap items-end gap-4">
                <div>
                    <label className="text-sm font-semibold block mb-1">فلترة حسب الفترة الزمنية</label>
                    <div className="flex gap-2">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded" />
                        <span className="self-center">-</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded" />
                    </div>
                </div>
                <div>
                    <label className="text-sm font-semibold block mb-1">عرض حسب المعيار</label>
                    <select value={filterMetric} onChange={e => setFilterMetric(e.target.value)} className="p-2 border rounded w-64">
                        <option value="all">كل المعايير (مجمع للمعلم)</option>
                        <option value="ahead">{t('statusAhead')}</option>
                        <option value="behind">{t('statusBehind')}</option>
                        <option value="meetings">{t('meetingsAttended')}</option>
                        <option value="notebooks">{t('notebookCorrection')}</option>
                        <option value="prep">{t('preparationBook')}</option>
                    </select>
                </div>
            </div>

            {/* Content Display */}
            <div className="max-h-96 overflow-y-auto space-y-3">
                {displayData.map((teacher: any) => (
                    <div key={teacher.name} className="p-4 border-2 border-gray-100 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3 border-b pb-2">
                            <div>
                                <h4 className="font-bold text-lg text-primary">{teacher.name}</h4>
                                <div className="text-sm mt-1">
                                    {teacher.statusBehind > 0 ? 
                                        <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded">🔴 متأخر عن المنهج ({teacher.statusBehind} فروع)</span> :
                                     teacher.statusAhead > 0 ? 
                                        <span className="text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">🔵 متقدم عن المنهج ({teacher.statusAhead} فروع)</span> :
                                        <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded">🟢 مطابق للمنهج</span>
                                    }
                                </div>
                            </div>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">عدد التقارير: {teacher.reportsCount}</span>
                        </div>
                        
                        {/* Summary Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm mb-4">
                            <div className="bg-blue-50 p-2 rounded flex flex-col justify-center">
                                <span className="font-bold text-blue-800">{t('meetingsAttended')}</span >
                                <span className="text-xl font-bold">{teacher.meetings}</span>
                            </div>
                            <div className="bg-purple-50 p-2 rounded flex flex-col justify-center">
                                <span className="font-bold text-purple-800">{t('notebookCorrection')}</span>
                                <span className="text-xl font-bold">{teacher.notebookAvg}%</span>
                            </div>
                            <div className="bg-pink-50 p-2 rounded flex flex-col justify-center">
                                <span className="font-bold text-pink-800">{t('preparationBook')}</span>
                                <span className="text-xl font-bold">{teacher.prepAvg}%</span>
                            </div>
                             <div className="bg-indigo-50 p-2 rounded flex flex-col justify-center">
                                <span className="font-bold text-indigo-800">{t('questionsGlossary')}</span>
                                <span className="text-xl font-bold">{teacher.glossaryAvg}%</span>
                            </div>
                        </div>

                        {/* Qualitative Lists */}
                        {filterMetric === 'all' && (
                            <div className="text-sm text-gray-700 space-y-2 bg-gray-50 p-3 rounded">
                                {teacher.strategiesList && <p className="leading-relaxed"><strong className="text-primary">💡 الاستراتيجيات:</strong> {teacher.strategiesList}</p>}
                                {teacher.toolsList && <p className="leading-relaxed"><strong className="text-primary">🛠️ الوسائل:</strong> {teacher.toolsList}</p>}
                                {teacher.programsList && <p className="leading-relaxed"><strong className="text-primary">💻 البرامج:</strong> {teacher.programsList}</p>}
                                {teacher.tasksList && <p className="leading-relaxed"><strong className="text-primary">✅ التكاليف:</strong> {teacher.tasksList}</p>}
                                {teacher.testsList && <p className="leading-relaxed"><strong className="text-primary">📄 الاختبارات:</strong> {teacher.testsList}</p>}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            <ExportButtons onExport={handleExport} />
        </div>
    );
};

// ... (Other components like MeetingOutcomesReport remain unchanged or placeholders)
const MeetingOutcomesReport: React.FC<{ meetings: Meeting[] }> = ({ meetings }) => {
    const { t } = useLanguage();
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [stats, setStats] = useState<any>(null);

    const handleCalculate = useCallback(() => {
        const { start, end } = dateRange;
        if (!start || !end) return;
        const startDate = new Date(start);
        const endDate = new Date(end);

        const relevantMeetings = meetings.filter(m => {
            const meetingDate = new Date(m.date);
            return meetingDate >= startDate && meetingDate <= endDate;
        });
        
        const allOutcomes = relevantMeetings.flatMap(m => m.outcomes.filter(o => o.outcome));
        
        const total = allOutcomes.length;
        if (total === 0) {
            setStats({ total: 0, executed: 0, inProgress: 0, notExecuted: 0, percentages: { executed: 0, inProgress: 0, notExecuted: 0 } });
            return;
        }
        
        const executed = allOutcomes.filter(o => o.status === 'تم التنفيذ').length;
        const inProgress = allOutcomes.filter(o => o.status === 'قيد التنفيذ').length;
        const notExecuted = allOutcomes.filter(o => o.status === 'لم يتم').length;

        setStats({
            total,
            executed,
            inProgress,
            notExecuted,
            percentages: {
                executed: (executed / total) * 100,
                inProgress: (inProgress / total) * 100,
                notExecuted: (notExecuted / total) * 100
            }
        });
    }, [meetings, dateRange]);

    const handleExport = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp') => {
        if (!stats) return;
        if (format === 'excel') {
             const wb = XLSX.utils.book_new();
             const ws = XLSX.utils.json_to_sheet([
                 { 'المقياس': 'إجمالي المخرجات', 'القيمة': stats.total },
                 { 'المقياس': 'تم التنفيذ', 'القيمة': stats.executed },
                 { 'المقياس': 'قيد التنفيذ', 'القيمة': stats.inProgress },
                 { 'المقياس': 'لم يتم', 'القيمة': stats.notExecuted },
                 { 'المقياس': 'نسبة الإنجاز', 'القيمة': stats.percentages.executed.toFixed(1) + '%' }
             ]);
             XLSX.utils.book_append_sheet(wb, ws, "مخرجات الاجتماعات");
             XLSX.writeFile(wb, "meeting_outcomes.xlsx");
             return;
        }
        exportMeetingSummaryUtil({ format, stats, dateRange, t });
    };

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
                        <div className="p-3 bg-green-100 rounded-lg">
                            <p className="font-bold text-xl">{stats.executed} <span className="text-sm">({stats.percentages.executed.toFixed(0)}%)</span></p>
                            <p>{t('executed')}</p>
                        </div>
                        <div className="p-3 bg-yellow-100 rounded-lg">
                             <p className="font-bold text-xl">{stats.inProgress} <span className="text-sm">({stats.percentages.inProgress.toFixed(0)}%)</span></p>
                             <p>{t('inProgress')}</p>
                        </div>
                         <div className="p-3 bg-red-100 rounded-lg">
                             <p className="font-bold text-xl">{stats.notExecuted} <span className="text-sm">({stats.percentages.notExecuted.toFixed(0)}%)</span></p>
                             <p>{t('notExecuted')}</p>
                        </div>
                    </div>
                    <ExportButtons onExport={handleExport} />
                </>
            )}
        </div>
    );
};

const PeerVisitsReport: React.FC<{ peerVisits: PeerVisit[] }> = ({ peerVisits }) => {
    const { t } = useLanguage();
    const stats = useMemo(() => {
        const visits = peerVisits.filter(v => v.visitingTeacher.trim() !== '');
        const total = visits.length;

        const visitsByTeacher = visits.reduce((acc, visit) => {
            acc[visit.visitingTeacher] = (acc[visit.visitingTeacher] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        if (total === 0) return { total: 0, visitsByTeacher, completed: 0, inProgress: 0, notCompleted: 0 };
        
        const completed = visits.filter(v => v.status === 'تمت الزيارة').length;
        const inProgress = visits.filter(v => v.status === 'قيد التنفيذ').length;
        const notCompleted = visits.filter(v => v.status === 'لم تتم' || !v.status).length;

        return { total, visitsByTeacher, completed, inProgress, notCompleted };
    }, [peerVisits]);

    return (
        <div>
            <p><strong>{t('totalVisits')}:</strong> {stats.total}</p>
            <div className="grid grid-cols-3 gap-2 my-2 text-center">
                <div className="p-2 bg-green-100 rounded"><strong>تمت:</strong> {stats.completed}</div>
                <div className="p-2 bg-yellow-100 rounded"><strong>قيد التنفيذ:</strong> {stats.inProgress}</div>
                <div className="p-2 bg-red-100 rounded"><strong>لم تتم:</strong> {stats.notCompleted}</div>
            </div>
            <h4 className="font-semibold mt-2">{t('visitsConductedBy')}:</h4>
            <ul className="list-disc ps-6">
                {Object.entries(stats.visitsByTeacher).map(([teacher, count]) => (
                    <li key={teacher}>{teacher}: {count}</li>
                ))}
            </ul>
        </div>
    );
};

const DeliveryRecordsReport: React.FC<{ deliverySheets: DeliverySheet[], teachers: Teacher[] }> = ({ deliverySheets, teachers }) => {
    const { t } = useLanguage();
    const handleExport = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp', title: string, data: any[]) => {
        if (format === 'excel') {
             const wb = XLSX.utils.book_new();
             const sheetData = data.filter(d => d.startsWith('🔹') || d.startsWith('📦') || d.startsWith('⚠️')).map(d => ({ 'البيان': d }));
             const ws = XLSX.utils.json_to_sheet(sheetData);
             XLSX.utils.book_append_sheet(wb, ws, title);
             XLSX.writeFile(wb, `${title}.xlsx`);
             return;
        }
        exportSupervisorySummaryUtil({ format, title, data, t });
    };

    return (
        <div className="space-y-4">
            {deliverySheets.map(sheet => {
                const total = sheet.records.length;
                const delivered = sheet.records.filter(r => r.deliveryDate);
                const notDelivered = sheet.records.filter(r => !r.deliveryDate);
                if (total === 0) return null;

                const exportData = [
                    `📊 *${sheet.name}*`,
                    `📦 ${t('delivered')}: ${delivered.length} / ${total} (${(delivered.length / total * 100).toFixed(1)}%)`,
                    ...delivered.map(r => `  🔹 ${r.teacherName}`),
                    '',
                    `⚠️ ${t('notDelivered')}: ${notDelivered.length} / ${total} (${(notDelivered.length / total * 100).toFixed(1)}%)`,
                    ...notDelivered.map(r => `  🔸 ${r.teacherName}`)
                ];

                return (
                    <div key={sheet.id}>
                        <h4 className="font-bold text-primary">{sheet.name}</h4>
                        <p><strong>{t('delivered')}:</strong> {delivered.length} من {total} ({(delivered.length / total * 100).toFixed(1)}%)</p>
                        <p className="text-sm">({delivered.map(r => r.teacherName).join(', ')})</p>
                        <p className="mt-1"><strong>{t('notDelivered')}:</strong> {notDelivered.length} من {total} ({(notDelivered.length / total * 100).toFixed(1)}%)</p>
                         <p className="text-sm">({notDelivered.map(r => r.teacherName).join(', ')})</p>
                         <ExportButtons onExport={(format) => handleExport(format, sheet.name, exportData)} />
                    </div>
                )
            })}
        </div>
    );
};

export default PerformanceDashboard;
