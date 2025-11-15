import React, { useState, useMemo } from 'react';
import { Report, Teacher, EvaluationType, GeneralEvaluationReport, ClassSessionEvaluationReport, SpecialReport, ClassSessionCriterion, GeneralCriterion, Task, Meeting, PeerVisit, DeliverySheet } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { 
    exportAggregatedToTxt, 
    exportAggregatedToPdf, 
    exportAggregatedToExcel, 
    sendAggregatedToWhatsApp,
    exportTasks,
    exportMeetingSummary as exportMeetingSummaryUtil,
    exportPeerVisits,
    exportSupervisorySummary
} from '../lib/exportUtils';

interface AggregatedReportsProps {
  reports: Report[];
  teachers: Teacher[];
  tasks: Task[];
  meetings: Meeting[];
  peerVisits: PeerVisit[];
  deliverySheets: DeliverySheet[];
}

type ReportWithPercentage = Report & {
    percentage: number;
};

type AggregatedView = 'teacher_reports' | 'task_report' | 'meeting_report' | 'peer_visit_report' | 'delivery_record_report';

// Helper components copied from PerformanceDashboard
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


const AggregatedReports: React.FC<AggregatedReportsProps> = (props) => {
  const { reports, teachers, tasks, meetings, peerVisits, deliverySheets } = props;
  const { t, language } = useLanguage();
  const { academicYear } = useAuth();
  const [filterType, setFilterType] = useState<EvaluationType | 'all'>('all');
  const [filterTeacher, setFilterTeacher] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openStatus, setOpenStatus] = useState<string | null>(null);
  const [openCriterion, setOpenCriterion] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<AggregatedView>('teacher_reports');

  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);

  const calculateReportPercentage = (report: Report): number => {
    let allScores: number[] = [];
    if (report.evaluationType === 'general' || report.evaluationType === 'special') {
        const criteria = (report as GeneralEvaluationReport | SpecialReport).criteria;
        if (!criteria || criteria.length === 0) return 0;
        allScores = criteria.map(c => c.score);
    } else if (report.evaluationType === 'class_session') {
        const groups = (report as ClassSessionEvaluationReport).criterionGroups;
        if (!groups || groups.length === 0) return 0;
        allScores = groups.flatMap(g => g.criteria).map(c => c.score);
    }
    if (allScores.length === 0) return 0;
    const totalScore = allScores.reduce((sum, score) => sum + score, 0);
    const maxPossibleScore = allScores.length * 4;
    if (maxPossibleScore === 0) return 0;
    return (totalScore / maxPossibleScore) * 100;
  };
  
  const getPerformanceStatus = (percentage: number): { key: string, label: string } => {
    if (percentage <= 30) return { key: 'status_0_30', label: t('percentage_0_30') };
    if (percentage <= 40) return { key: 'status_31_40', label: t('percentage_31_40') };
    if (percentage <= 60) return { key: 'status_41_60', label: t('percentage_41_60') };
    if (percentage <= 74) return { key: 'status_61_74', label: t('percentage_61_74') };
    if (percentage <= 80) return { key: 'status_75_80', label: t('percentage_75_80') };
    if (percentage <= 89) return { key: 'status_81_89', label: t('percentage_81_89') };
    return { key: 'status_90_100', label: t('percentage_90_100') };
  };

  const reportsWithPercentage = useMemo(() => {
    return reports.map(r => ({ ...r, percentage: calculateReportPercentage(r) }));
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reportsWithPercentage.filter(report => {
      const typeMatch = filterType === 'all' || report.evaluationType === filterType;
      const teacherMatch = filterTeacher === 'all' || report.teacherId === filterTeacher;
      const teacherName = teacherMap.get(report.teacherId)?.toLowerCase() || '';
      const searchMatch = !searchTerm || teacherName.includes(searchTerm.toLowerCase());
      return typeMatch && teacherMatch && searchMatch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reportsWithPercentage, filterType, filterTeacher, searchTerm, teacherMap]);
  
  const reportsByCriterion = useMemo(() => {
    const grouped: { [key: string]: { scores: number[], count: number } } = {};
    filteredReports.forEach(report => {
        let allCriteria: (GeneralCriterion | ClassSessionCriterion)[] = [];
        if (report.evaluationType === 'general' || report.evaluationType === 'special') {
            const currentReport = (report as GeneralEvaluationReport | SpecialReport);
            if (currentReport.criteria) allCriteria = currentReport.criteria;
        } else if (report.evaluationType === 'class_session') {
            const currentReport = (report as ClassSessionEvaluationReport);
            if (currentReport.criterionGroups) allCriteria = currentReport.criterionGroups.flatMap(g => g.criteria);
        }
        
        allCriteria.forEach(criterion => {
            if (!grouped[criterion.label]) {
                grouped[criterion.label] = { scores: [], count: 0 };
            }
            grouped[criterion.label].scores.push(criterion.score);
            grouped[criterion.label].count++;
        });
    });
    return Object.entries(grouped).map(([label, data]) => {
        const totalScore = data.scores.reduce((sum, s) => sum + s, 0);
        const average = data.count > 0 ? (totalScore / (data.count * 4)) * 100 : 0;
        const scoreDistribution = data.scores.reduce((acc, score) => {
            acc[score] = (acc[score] || 0) + 1;
            return acc;
        }, {} as {[key: number]: number});
        return { label, average, count: data.count, scoreDistribution };
    }).sort((a, b) => b.average - a.average);
  }, [filteredReports]);

  const reportsByStatus = useMemo(() => {
    const grouped: { [key: string]: { label: string; reports: ReportWithPercentage[] } } = {};
    reportsWithPercentage.forEach(report => {
        const status = getPerformanceStatus(report.percentage);
        if (!grouped[status.key]) {
            grouped[status.key] = { label: status.label, reports: [] };
        }
        grouped[status.key].reports.push(report);
    });
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0])); // Sort by key
  }, [reportsWithPercentage, language]);


  const overallAverage = useMemo(() => {
    if (filteredReports.length === 0) return 0;
    const totalPercentage = filteredReports.reduce((sum, report) => sum + report.percentage, 0);
    return totalPercentage / filteredReports.length;
  }, [filteredReports]);
  
  const getReportTypeLabel = (report: Report) => {
      switch (report.evaluationType) {
          case 'general': return t('generalEvaluation');
          case 'class_session': return t('classSessionEvaluation');
          case 'special': return (report as SpecialReport).templateName;
          default: return 'تقرير';
      }
  }
  
  const getViewButtonClass = (view: AggregatedView) => `px-3 py-2 rounded-lg font-semibold transition-all text-sm transform hover:scale-105 ${activeView === view ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'}`;

  const renderTeacherReports = () => (
     <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg border" style={{backgroundColor: 'rgba(128,128,128,0.05)', borderColor: 'var(--color-card-border)'}}>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="w-full p-2 border rounded-md focus:ring-primary focus:border-primary transition bg-inherit">
          <option value="all">جميع أنواع التقارير</option>
          <option value="general">{t('generalEvaluation')}</option>
          <option value="class_session">{t('classSessionEvaluation')}</option>
          <option value="special">{t('specialReports')}</option>
        </select>
        <select value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)} className="w-full p-2 border rounded-md focus:ring-primary focus:border-primary transition bg-inherit">
          <option value="all">جميع المعلمين</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input
            type="text"
            placeholder="ابحث بالاسم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded-md focus:ring-primary focus:border-primary transition bg-inherit"
        />
      </div>

      <div className="space-y-4 max-h-[50vh] overflow-y-auto p-2">
        {filteredReports.map(report => (
            <div key={report.id} className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow" style={{backgroundColor: 'var(--color-background)', borderColor: 'var(--color-card-border)'}}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold">{teacherMap.get(report.teacherId) || 'Unknown Teacher'}</p>
                  <p className="text-sm">{getReportTypeLabel(report)}</p>
                  <p className="text-xs text-gray-500">{new Date(report.date).toLocaleDateString()}</p>
                </div>
                <div className="text-lg font-bold text-primary">
                  {report.percentage.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
         {filteredReports.length === 0 && <p className="text-center py-8">لا توجد تقارير تطابق الفلاتر المحددة.</p>}
      </div>

      {filteredReports.length > 0 && (
         <>
            <div className="mt-6 p-4 bg-primary-light/20 rounded-lg text-center">
                <h3 className="text-xl font-bold text-primary">
                    متوسط النسبة المئوية للتقارير المعروضة: <span className="text-2xl">{overallAverage.toFixed(2)}%</span>
                </h3>
            </div>
            <ExportButtons onExport={(format) => {
                if (format === 'txt') exportAggregatedToTxt(filteredReports, teachers);
                if (format === 'pdf') exportAggregatedToPdf(filteredReports, teachers);
                if (format === 'excel') exportAggregatedToExcel(filteredReports, teachers);
                if (format === 'whatsapp') sendAggregatedToWhatsApp(filteredReports, teachers);
            }} />
         </>
      )}
    </>
  );

  const renderView = () => {
      switch(activeView) {
          case 'teacher_reports':
              return renderTeacherReports();
          case 'task_report': {
                const completedTasks = tasks.filter(t => t.status === 'تم التنفيذ').length;
                const notCompletedTasks = tasks.length - completedTasks;
                const completionPercentage = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
                return (
                    <div className="p-4 space-y-4 text-center">
                        <h3 className="text-lg font-semibold">{t('taskReport')}</h3>
                        <p>إجمالي المهام: {tasks.length}</p>
                        <p className="text-green-600">المنفذ: {completedTasks}</p>
                        <p className="text-red-600">غير المنفذ: {notCompletedTasks}</p>
                        <ProgressBar label="نسبة الإنجاز" percentage={completionPercentage} />
                        <ExportButtons onExport={(format) => exportTasks(format, tasks, academicYear)} />
                    </div>
                );
            }
          case 'meeting_report': {
                const allOutcomes = meetings.flatMap(m => m.outcomes.filter(o => o.outcome));
                const total = allOutcomes.length;
                const executed = allOutcomes.filter(o => o.status === 'تم التنفيذ').length;
                const inProgress = allOutcomes.filter(o => o.status === 'قيد التنفيذ').length;
                const notExecuted = total - executed - inProgress;
                const stats = {
                    total, executed, inProgress, notExecuted,
                    percentages: {
                        executed: total > 0 ? (executed / total) * 100 : 0,
                        inProgress: total > 0 ? (inProgress / total) * 100 : 0,
                        notExecuted: total > 0 ? (notExecuted / total) * 100 : 0,
                    }
                };
                const meetingDates = meetings.map(m => new Date(m.date).getTime()).filter(d => !isNaN(d));
                const startDate = meetingDates.length > 0 ? new Date(Math.min(...meetingDates)).toLocaleDateString() : 'غير محدد';
                const endDate = meetingDates.length > 0 ? new Date(Math.max(...meetingDates)).toLocaleDateString() : 'غير محدد';

                return (
                    <div className="p-4 space-y-4 text-center">
                        <h3 className="text-lg font-semibold">{t('meetingOutcomesReport')}</h3>
                        <p>إجمالي المخرجات: {stats.total}</p>
                        <ProgressBar label={t('executed')} percentage={stats.percentages.executed} />
                        <ProgressBar label={t('inProgress')} percentage={stats.percentages.inProgress} />
                        <ProgressBar label={t('notExecuted')} percentage={stats.percentages.notExecuted} />
                        <ExportButtons onExport={(format) => exportMeetingSummaryUtil({ format, stats, dateRange: {start: startDate, end: endDate}, t })} />
                    </div>
                );
            }
          case 'peer_visit_report': {
                const visits = peerVisits.filter(v => v.visitingTeacher);
                const total = visits.length;
                const completed = visits.filter(v => v.status === 'تمت الزيارة').length;
                return (
                    <div className="p-4 space-y-4 text-center">
                        <h3 className="text-lg font-semibold">{t('peerVisitsReport')}</h3>
                        <p>إجمالي الزيارات: {total}</p>
                        <ProgressBar label="الزيارات المكتملة" percentage={total > 0 ? (completed/total)*100 : 0} />
                        <ExportButtons onExport={(format) => exportPeerVisits({format, visits, academicYear})} />
                    </div>
                );
            }
          case 'delivery_record_report': {
                const handleDeliveryExport = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp') => {
                    let content = `${t('deliveryRecordsReport')}\n\n`;
                    deliverySheets.forEach(sheet => {
                        content += `--- ${sheet.name} ---\n`;
                        const total = sheet.records.length;
                        const delivered = sheet.records.filter(r => r.deliveryDate).length;
                        content += `تم التسليم: ${delivered} / ${total} (${total > 0 ? (delivered/total*100).toFixed(1) : 0}%)\n\n`;
                    });
                    exportSupervisorySummary({format, title: t('deliveryRecordsReport'), data: content.split('\n'), t});
                }
                const allRecords = deliverySheets.flatMap(s => s.records);
                const total = allRecords.length;
                const delivered = allRecords.filter(r => r.deliveryDate).length;
                return (
                    <div className="p-4 space-y-4 text-center">
                        <h3 className="text-lg font-semibold">{t('deliveryRecordsReport')}</h3>
                        <p>إجمالي السجلات عبر كل الكشوفات: {total}</p>
                        <ProgressBar label="تم التسليم" percentage={total > 0 ? (delivered/total)*100 : 0} />
                        <ExportButtons onExport={handleDeliveryExport} />
                    </div>
                );
            }
          default:
              return renderTeacherReports();
      }
  };

  return (
    <div className="space-y-6 p-6 rounded-xl shadow-lg" style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}>
      <h2 className="text-2xl font-bold text-primary text-center">{t('aggregatedReports')}</h2>
      
       <div className="flex flex-wrap justify-center gap-2 border-b pb-4 mb-4">
            <button onClick={() => setActiveView('teacher_reports')} className={getViewButtonClass('teacher_reports')}>{t('specialReports')}</button>
            <button onClick={() => setActiveView('task_report')} className={getViewButtonClass('task_report')}>{t('taskReport')}</button>
            <button onClick={() => setActiveView('meeting_report')} className={getViewButtonClass('meeting_report')}>{t('meetingReport')}</button>
            <button onClick={() => setActiveView('peer_visit_report')} className={getViewButtonClass('peer_visit_report')}>{t('peerVisitsReport')}</button>
            <button onClick={() => setActiveView('delivery_record_report')} className={getViewButtonClass('delivery_record_report')}>{t('deliveryRecordsReport')}</button>
      </div>

      {renderView()}

    </div>
  );
};

export default AggregatedReports;