import React, { useMemo, useState, useCallback } from 'react';
import { Report, Teacher, GeneralEvaluationReport, ClassSessionEvaluationReport, SpecialReport, Task, Meeting, PeerVisit, DeliverySheet, SyllabusCoverageReport, GeneralCriterion, ClassSessionCriterionGroup, MeetingOutcome } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { GENERAL_EVALUATION_CRITERIA_TEMPLATE, CLASS_SESSION_BRIEF_TEMPLATE, CLASS_SESSION_EXTENDED_TEMPLATE, CLASS_SESSION_SUBJECT_SPECIFIC_TEMPLATE, GRADES, SUBJECTS } from '../constants';
import { exportKeyMetrics, exportEvaluationAnalysis, exportSupervisorySummary as exportSupervisorySummaryUtil, exportMeetingSummary as exportMeetingSummaryUtil } from '../lib/exportUtils';

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

const ProgressBar: React.FC<{ label: string; percentage: number }> = ({ label, percentage }) => {
    const getProgressBarColor = (p: number) => {
        if (p < 26) return 'bg-red-500';
        if (p < 51) return 'bg-yellow-500';
        if (p < 76) return 'bg-orange-500';
        if (p < 90) return 'bg-blue-500';
        return 'bg-green-500';
    };
    const color = getProgressBarColor(percentage);
    return (
        <div className="text-center">
            <p className="font-semibold text-gray-700">{label}</p>
            <div className="w-full bg-gray-200 rounded-full h-4 my-2">
                <div className={`${color} h-4 rounded-full`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
            </div>
            <p className="font-bold text-lg">{percentage.toFixed(1)}%</p>
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


// --- Key Metrics Tab ---
const KeyMetricsView: React.FC<{ reports: Report[], teachers: Teacher[] }> = ({ reports, teachers }) => {
    const { t } = useLanguage();
    const [targets, setTargets] = useState({ strategies: '10', tools: '10', sources: '5', programs: '2' });
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [calculatedStats, setCalculatedStats] = useState<any>(null);

    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);

    const handleCalculate = useCallback(() => {
        const { start, end } = dateRange;
        if (!start || !end) {
            alert(t('selectDateRange'));
            return;
        }

        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const weeks = Math.max(1, diffDays / 7);

        const filteredReports = reports.filter(r => {
            const reportDate = new Date(r.date);
            return reportDate >= startDate && reportDate <= endDate;
        });

        const usageCounts = { strategies: 0, tools: 0, sources: 0, programs: 0 };
        const usageDetails: { [key: string]: { [item: string]: { [teacherName: string]: number } } } = {
            strategies: {}, tools: {}, sources: {}, programs: {}
        };
        const itemTypes: (keyof typeof usageCounts)[] = ['strategies', 'tools', 'sources', 'programs'];

        filteredReports.forEach(report => {
            const teacherName = teacherMap.get(report.teacherId) || 'Unknown';
            itemTypes.forEach(type => {
                const itemsStr = (report as GeneralEvaluationReport | ClassSessionEvaluationReport)[type];
                if (itemsStr) {
                    const items = itemsStr.split(/[,،]\s*/).filter(Boolean);
                    usageCounts[type] += items.length;
                    items.forEach(item => {
                        if (!usageDetails[type][item]) usageDetails[type][item] = {};
                        if (!usageDetails[type][item][teacherName]) usageDetails[type][item][teacherName] = 0;
                        usageDetails[type][item][teacherName]++;
                    });
                }
            });
        });
        
        setCalculatedStats({
            percentages: {
                strategies: (usageCounts.strategies / (parseInt(targets.strategies) * weeks)) * 100,
                tools: (usageCounts.tools / (parseInt(targets.tools) * weeks)) * 100,
                sources: (usageCounts.sources / (parseInt(targets.sources) * weeks)) * 100,
                programs: (usageCounts.programs / (parseInt(targets.programs) * weeks)) * 100,
            },
            details: usageDetails,
        });

    }, [dateRange, reports, targets, teacherMap, t]);

    const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTargets(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleExport = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp') => {
        if (calculatedStats) {
            exportKeyMetrics(format, calculatedStats, t);
        }
    };

    return (
        <div className="space-y-6">
            <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                <h3 className="text-xl font-semibold text-center">{t('usageStatistics')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div><label className="text-sm font-medium">{t('requiredStrategies')}</label><input type="number" name="strategies" value={targets.strategies} onChange={handleTargetChange} className="w-full p-2 border rounded" /></div>
                    <div><label className="text-sm font-medium">{t('requiredTools')}</label><input type="number" name="tools" value={targets.tools} onChange={handleTargetChange} className="w-full p-2 border rounded" /></div>
                    <div><label className="text-sm font-medium">{t('requiredSources')}</label><input type="number" name="sources" value={targets.sources} onChange={handleTargetChange} className="w-full p-2 border rounded" /></div>
                    <div><label className="text-sm font-medium">{t('requiredPrograms')}</label><input type="number" name="programs" value={targets.programs} onChange={handleTargetChange} className="w-full p-2 border rounded" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div><label className="text-sm font-medium">{t('from_date')}</label><input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} className="w-full p-2 border rounded" /></div>
                    <div><label className="text-sm font-medium">{t('to_date')}</label><input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} className="w-full p-2 border rounded" /></div>
                    <button onClick={handleCalculate} className="w-full px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90">{t('calculate')}</button>
                </div>
            </div>

            {calculatedStats && (
                <div className="p-4 border rounded-lg space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <ProgressBar label={t('strategiesUsed')} percentage={calculatedStats.percentages.strategies || 0} />
                        <ProgressBar label={t('toolsUsed')} percentage={calculatedStats.percentages.tools || 0} />
                        <ProgressBar label={t('sourcesUsed')} percentage={calculatedStats.percentages.sources || 0} />
                        <ProgressBar label={t('programsUsed')} percentage={calculatedStats.percentages.programs || 0} />
                    </div>
                    
                    <div className="space-y-4">
                        <Section title={t('strategiesUsed')}>
                            <UsageDetailsTable data={calculatedStats.details.strategies} />
                        </Section>
                        <Section title={t('toolsUsed')}>
                            <UsageDetailsTable data={calculatedStats.details.tools} />
                        </Section>
                        <Section title={t('sourcesUsed')}>
                             <UsageDetailsTable data={calculatedStats.details.sources} />
                        </Section>
                        <Section title={t('programsUsed')}>
                             <UsageDetailsTable data={calculatedStats.details.programs} />
                        </Section>
                    </div>
                    <ExportButtons onExport={handleExport} />
                </div>
            )}
        </div>
    );
};

const UsageDetailsTable: React.FC<{data: {[item: string]: {[teacher: string]: number}}}> = ({data}) => {
    if(Object.keys(data).length === 0) return <p>لا توجد بيانات.</p>;
    return (
        <div className="space-y-3">
            {Object.entries(data).map(([item, teachers]) => (
                <div key={item}>
                    <p className="font-bold text-primary">{item}</p>
                    <ul className="list-disc ps-6">
                        {Object.entries(teachers).sort(([,a],[,b]) => b - a).map(([teacher, count]) => (
                            <li key={teacher}>{teacher} ({count})</li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    )
};

// --- Evaluation Analysis Tab ---
const EvaluationAnalysisView: React.FC<{ reports: Report[], teachers: Teacher[] }> = ({ reports, teachers }) => {
    const { t } = useLanguage();
    const [view, setView] = useState<string | null>(null);

    const analysisData = useMemo(() => {
        const templates = {
            general: { title: t('generalEvaluationElements'), criteria: GENERAL_EVALUATION_CRITERIA_TEMPLATE.map(c => c.label) },
            brief: { title: t('briefEvaluationElements'), criteria: CLASS_SESSION_BRIEF_TEMPLATE.flatMap(g => g.criteria.map(c => c.label)) },
            extended: { title: t('extendedEvaluationElements'), criteria: CLASS_SESSION_EXTENDED_TEMPLATE.flatMap(g => g.criteria.map(c => c.label)) },
            subject_specific: { title: t('subjectSpecificEvaluationElements'), criteria: CLASS_SESSION_SUBJECT_SPECIFIC_TEMPLATE.flatMap(g => g.criteria.map(c => c.label)) },
        };
        
        const results: { [key: string]: any } = {};

        Object.entries(templates).forEach(([key, template]) => {
            const relevantReports = reports.filter(r => {
                if (key === 'general') return r.evaluationType === 'general';
                if (key === 'brief' || key === 'extended' || key === 'subject_specific') {
                    return r.evaluationType === 'class_session' && r.subType === key;
                }
                return false;
            });

            const criterionData: { [label: string]: { total: number, count: number, teacherScores: {[id: string]: number[]} } } = {};
            template.criteria.forEach(label => {
                criterionData[label] = { total: 0, count: 0, teacherScores: {} };
            });

            relevantReports.forEach(report => {
                const allCriteria = (report.evaluationType === 'general')
                    ? (report as GeneralEvaluationReport).criteria
                    : (report as ClassSessionEvaluationReport).criterionGroups.flatMap(g => g.criteria);
                
                allCriteria.forEach(c => {
                    if(criterionData[c.label]) {
                        criterionData[c.label].total += c.score;
                        criterionData[c.label].count++;
                        if (!criterionData[c.label].teacherScores[report.teacherId]) {
                            criterionData[c.label].teacherScores[report.teacherId] = [];
                        }
                        criterionData[c.label].teacherScores[report.teacherId].push(c.score);
                    }
                });
            });

            const processedCriteria = Object.entries(criterionData).map(([label, data]) => {
                const overallAverage = data.count > 0 ? (data.total / (data.count * 4)) * 100 : 0;
                const teacherAvgs = Object.entries(data.teacherScores).map(([teacherId, scores]) => {
                    const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / (scores.length * 4)) * 100 : 0;
                    return { teacherId, name: teachers.find(t => t.id === teacherId)?.name || 'Unknown', avg };
                }).sort((a,b) => b.avg - a.avg);
                return { label, overallAverage, teacherAvgs };
            });

            results[key] = {
                title: template.title,
                excellent: processedCriteria.filter(c => c.overallAverage >= 90).sort((a,b) => b.overallAverage - a.overallAverage),
                good: processedCriteria.filter(c => c.overallAverage >= 75 && c.overallAverage < 90).sort((a,b) => b.overallAverage - a.overallAverage),
                average: processedCriteria.filter(c => c.overallAverage >= 50 && c.overallAverage < 75).sort((a,b) => b.overallAverage - a.overallAverage),
                needsImprovement: processedCriteria.filter(c => c.overallAverage < 50).sort((a,b) => b.overallAverage - a.overallAverage),
            };
        });

        return results;
    }, [reports, teachers, t]);

    const handleExport = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp') => {
        if (view && analysisData[view]) {
            exportEvaluationAnalysis(format, analysisData[view], t);
        }
    };

    if(view && analysisData[view]) {
        const data = analysisData[view];
        return (
            <div>
                <button onClick={() => setView(null)} className="mb-4 text-sky-600 hover:underline">&larr; {t('back')}</button>
                <h3 className="text-2xl font-bold text-center mb-4">{data.title}</h3>
                <div className="space-y-6">
                    <PerformanceLevelSection title={t('performanceLevelExcellent')} criteria={data.excellent} />
                    <PerformanceLevelSection title={t('performanceLevelGood')} criteria={data.good} />
                    <PerformanceLevelSection title={t('performanceLevelAverage')} criteria={data.average} />
                    <PerformanceLevelSection title={t('performanceLevelNeedsImprovement')} criteria={data.needsImprovement} />
                </div>
                <ExportButtons onExport={handleExport} />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => setView('general')} className="p-4 bg-blue-100 text-blue-800 font-semibold rounded-lg hover:bg-blue-200 transition">{t('generalEvaluationElements')}</button>
            <button onClick={() => setView('brief')} className="p-4 bg-purple-100 text-purple-800 font-semibold rounded-lg hover:bg-purple-200 transition">{t('briefEvaluationElements')}</button>
            <button onClick={() => setView('extended')} className="p-4 bg-teal-100 text-teal-800 font-semibold rounded-lg hover:bg-teal-200 transition">{t('extendedEvaluationElements')}</button>
            <button onClick={() => setView('subject_specific')} className="p-4 bg-indigo-100 text-indigo-800 font-semibold rounded-lg hover:bg-indigo-200 transition">{t('subjectSpecificEvaluationElements')}</button>
        </div>
    );
};

const PerformanceLevelSection: React.FC<{title: string, criteria: any[]}> = ({title, criteria}) => {
    const { t } = useLanguage();
    if(criteria.length === 0) return null;
    return (
        <Section title={title} defaultOpen>
            <div className="space-y-4">
                {criteria.map((c: any) => (
                    <div key={c.label}>
                        <div className="flex justify-between items-center font-semibold bg-gray-50 p-2 rounded">
                            <span>{c.label}</span>
                            <span className="text-primary">{t('overallAverage')}: {c.overallAverage.toFixed(1)}%</span>
                        </div>
                        <ul className="list-decimal list-inside ps-4 mt-2">
                           {c.teacherAvgs.map((t: any) => <li key={t.teacherId}>{t.name} ({t.avg.toFixed(1)}%)</li>)}
                        </ul>
                    </div>
                ))}
            </div>
        </Section>
    );
};


// --- Supervisory Reports Tab ---
const SupervisoryReportsView: React.FC<PerformanceDashboardProps> = (props) => {
    const { t } = useLanguage();
    
    const handleSyllabusProgressExport = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp') => {
        const classSessionReports = props.reports.filter(r => r.evaluationType === 'class_session' && r.syllabusProgress);
        const ahead = classSessionReports.filter(r => r.syllabusProgress?.status === 'ahead');
        const onTrack = classSessionReports.filter(r => r.syllabusProgress?.status === 'on_track');
        const behind = classSessionReports.filter(r => r.syllabusProgress?.status === 'behind');
        const teacherMap = new Map(props.teachers.map(t => [t.id, t.name]));

        const data = [
            `${t('aheadOfSyllabus')} (${ahead.length})`,
            ...ahead.map(r => `  - ${teacherMap.get(r.teacherId)} (${r.subject} - ${r.grades})`),
            '',
            `${t('onTrackWithSyllabus')} (${onTrack.length})`,
            ...onTrack.map(r => `  - ${teacherMap.get(r.teacherId)} (${r.subject} - ${r.grades})`),
            '',
            `${t('behindSyllabus')} (${behind.length})`,
            ...behind.map(r => `  - ${teacherMap.get(r.teacherId)} (${r.subject} - ${r.grades})`),
        ];
        exportSupervisorySummaryUtil({ format, title: t('syllabusProgress'), data, t });
    };

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
        const details = Object.entries(visitsByTeacher).map(([teacher, count]) => `${teacher}: ${count}`);
        
        const data = [
            `${t('totalVisits')}: ${total}`,
            `تمت الزيارة: ${completed}`,
            `قيد التنفيذ: ${inProgress}`,
            `لم تتم: ${notCompleted}`,
            '',
            t('visitsConductedBy') + ':', 
            ...details
        ];
        exportSupervisorySummaryUtil({ format, title: t('peerVisitsReport'), data, t });
    };

    return (
        <div className="space-y-6">
             <Section title={t('syllabusProgress')} onExport={handleSyllabusProgressExport}>
                <SyllabusDashboardReport reports={props.reports} teachers={props.teachers} />
            </Section>
            <Section title={t('meetingOutcomesReport')}>
                <MeetingOutcomesReport meetings={props.meetings} />
            </Section>
             <Section title={t('peerVisitsReport')} onExport={handlePeerVisitExport}>
                <PeerVisitsReport {...props} />
            </Section>
            <Section title={t('deliveryRecordsReport')}><DeliveryRecordsReport {...props} /></Section>
            <Section title={t('syllabusCoverageReport')}><SyllabusCoverageProgressReport {...props} /></Section>
        </div>
    );
};

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
                    `${t('delivered')}: ${delivered.length} / ${total} (${(delivered.length / total * 100).toFixed(1)}%)`,
                    `(${delivered.map(r => r.teacherName).join(', ')})`,
                    `${t('notDelivered')}: ${notDelivered.length} / ${total} (${(notDelivered.length / total * 100).toFixed(1)}%)`,
                    `(${notDelivered.map(r => r.teacherName).join(', ')})`
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

// Renamed for clarity
const SyllabusCoverageProgressReport: React.FC<{ syllabusCoverageReports: SyllabusCoverageReport[], teachers: Teacher[] }> = ({ syllabusCoverageReports, teachers }) => {
    const { t } = useLanguage();
    const [filter, setFilter] = useState('all');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);

    const filteredAndGrouped = useMemo(() => {
        let filtered = syllabusCoverageReports;
        if (filter === 'grade' && selectedGrade) {
            filtered = filtered.filter(r => r.grade === selectedGrade);
        }
        if (filter === 'subject' && selectedSubject) {
            filtered = filtered.filter(r => r.subject === selectedSubject);
        }
        
        const ahead = filtered.filter(r => r.branches.some(b => b.status === 'ahead'));
        const onTrack = filtered.filter(r => r.branches.every(b => b.status === 'on_track'));
        const behind = filtered.filter(r => r.branches.some(b => b.status === 'behind') && !r.branches.some(b => b.status === 'ahead'));

        const sortFn = (a: SyllabusCoverageReport, b: SyllabusCoverageReport) => {
            if (filter === 'grade') return a.subject.localeCompare(b.subject);
            if (filter === 'subject') return GRADES.indexOf(a.grade) - GRADES.indexOf(b.grade);
            // Default: all
            const subjectCompare = a.subject.localeCompare(b.subject);
            return subjectCompare === 0 ? GRADES.indexOf(a.grade) - GRADES.indexOf(b.grade) : subjectCompare;
        };

        return {
            ahead: ahead.sort(sortFn),
            onTrack: onTrack.sort(sortFn),
            behind: behind.sort(sortFn)
        };

    }, [syllabusCoverageReports, filter, selectedGrade, selectedSubject]);

    const handleExport = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp') => {
        const title = t('syllabusCoverageReport');
        const data = [
            `${t('aheadOfSyllabus')} (${filteredAndGrouped.ahead.length})`,
            ...filteredAndGrouped.ahead.map(r => `  - ${r.subject} - ${r.grade} (${teacherMap.get(r.teacherId)})`),
            '',
            `${t('onTrackWithSyllabus')} (${filteredAndGrouped.onTrack.length})`,
            ...filteredAndGrouped.onTrack.map(r => `  - ${r.subject} - ${r.grade} (${teacherMap.get(r.teacherId)})`),
            '',
            `${t('behindSyllabus')} (${filteredAndGrouped.behind.length})`,
            ...filteredAndGrouped.behind.map(r => `  - ${r.subject} - ${r.grade} (${teacherMap.get(r.teacherId)})`)
        ];
        exportSupervisorySummaryUtil({ format, title, data, t });
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-4 p-2 bg-gray-100 rounded">
                <select value={filter} onChange={e => setFilter(e.target.value)} className="p-2 border rounded">
                    <option value="all">{t('allSubjectsAndGrades')}</option>
                    <option value="grade">{t('byGrade')}</option>
                    <option value="subject">{t('bySubject')}</option>
                </select>
                {filter === 'grade' && <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)} className="p-2 border rounded">{GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select>}
                {filter === 'subject' && <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="p-2 border rounded">{SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}</select>}
            </div>
            <SyllabusGroup title={t('aheadOfSyllabus')} reports={filteredAndGrouped.ahead} teacherMap={teacherMap} />
            <SyllabusGroup title={t('onTrackWithSyllabus')} reports={filteredAndGrouped.onTrack} teacherMap={teacherMap} />
            <SyllabusGroup title={t('behindSyllabus')} reports={filteredAndGrouped.behind} teacherMap={teacherMap} />
            <ExportButtons onExport={handleExport} />
        </div>
    );
};

const SyllabusGroup: React.FC<{title: string, reports: (SyllabusCoverageReport | Report)[], teacherMap: Map<string, string>}> = ({title, reports, teacherMap}) => {
    if(reports.length === 0) return null;
    return (
        <div>
            <h4 className="font-bold text-lg text-primary">{title} ({reports.length})</h4>
            <ul className="list-disc ps-6">
                {reports.map(r => <li key={r.id}>{r.subject} - {r.grades} ({teacherMap.get(r.teacherId)})</li>)}
            </ul>
        </div>
    )
}

const SyllabusDashboardReport: React.FC<{ reports: Report[], teachers: Teacher[] }> = ({ reports, teachers }) => {
    const { t } = useLanguage();
    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);

    const progressData = useMemo(() => {
        const classSessionReports = reports.filter(r => r.evaluationType === 'class_session' && r.syllabusProgress);
        
        const ahead = classSessionReports.filter(r => r.syllabusProgress?.status === 'ahead');
        const onTrack = classSessionReports.filter(r => r.syllabusProgress?.status === 'on_track');
        const behind = classSessionReports.filter(r => r.syllabusProgress?.status === 'behind');
        
        return (
            <div className="space-y-4">
                <SyllabusGroup title={t('aheadOfSyllabus')} reports={ahead} teacherMap={teacherMap} />
                <SyllabusGroup title={t('onTrackWithSyllabus')} reports={onTrack} teacherMap={teacherMap} />
                <SyllabusGroup title={t('behindSyllabus')} reports={behind} teacherMap={teacherMap} />
            </div>
        )
    }, [reports, teacherMap, t]);

    return progressData;
};

// FIX: Add the missing default export for the component.
export default PerformanceDashboard;