
import React, { useMemo, useState, useCallback } from 'react';
import { Report, Teacher, GeneralEvaluationReport, ClassSessionEvaluationReport, SpecialReport, Task, Meeting, PeerVisit, DeliverySheet, SyllabusCoverageReport, GeneralCriterion, ClassSessionCriterionGroup, MeetingOutcome } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { GENERAL_EVALUATION_CRITERIA_TEMPLATE, CLASS_SESSION_BRIEF_TEMPLATE, CLASS_SESSION_EXTENDED_TEMPLATE, CLASS_SESSION_SUBJECT_SPECIFIC_TEMPLATE, GRADES, SUBJECTS } from '../constants';
import { exportKeyMetrics, exportEvaluationAnalysis, exportSupervisorySummary as exportSupervisorySummaryUtil, exportMeetingSummary as exportMeetingSummaryUtil } from '../lib/exportUtils';
import { calculateReportPercentage } from '../lib/exportUtils';

declare const XLSX: any;

interface PerformanceDashboardProps {
  reports: Report[];
  teachers: Teacher[];
  tasks: Task[];
  meetings: Meeting[];
  peerVisits: PeerVisit[];
  deliverySheets: DeliverySheet[];
  syllabusCoverageReports: SyllabusCoverageReport[];
  selectedSchool: string;
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
            if (p <= 25) return 'bg-red-500';
            if (p <= 50) return 'bg-yellow-500';
            if (p <= 75) return 'bg-orange-500';
            if (p <= 89) return 'bg-blue-600';
            return 'bg-green-500';
        }
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

const KeyMetricsView: React.FC<{ props: PerformanceDashboardProps }> = ({ props }) => {
    const { t } = useLanguage();
    const { reports, teachers, tasks, deliverySheets, selectedSchool } = props;

    const stats = useMemo(() => {
        const totalReports = reports.length;
        const totalTeachers = teachers.length;
        let totalScoreSum = 0;
        reports.forEach(r => { totalScoreSum += calculateReportPercentage(r); });
        const overallAverage = totalReports > 0 ? totalScoreSum / totalReports : 0;

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'تم التنفيذ').length;
        const taskCompletion = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        const allDeliveryRecords = deliverySheets.flatMap(s => s.records);
        const deliveredCount = allDeliveryRecords.filter(r => r.deliveryDate).length;
        const deliveryCompletion = allDeliveryRecords.length > 0 ? (deliveredCount / allDeliveryRecords.length) * 100 : 0;

        return { totalTeachers, totalReports, overallAverage, taskCompletion, deliveryCompletion };
    }, [reports, teachers, tasks, deliverySheets]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 p-6 rounded-2xl text-center border border-blue-200 shadow-sm transition-transform hover:scale-105">
                    <h3 className="text-gray-600 font-semibold mb-2">{t('totalTeachers')}</h3>
                    <p className="text-4xl font-bold text-blue-600">{stats.totalTeachers}</p>
                </div>
                <div className="bg-green-50 p-6 rounded-2xl text-center border border-green-200 shadow-sm transition-transform hover:scale-105">
                    <h3 className="text-gray-600 font-semibold mb-2">{t('totalReports')}</h3>
                    <p className="text-4xl font-bold text-green-600">{stats.totalReports}</p>
                </div>
                <div className="bg-purple-50 p-6 rounded-2xl text-center border border-purple-200 shadow-sm transition-transform hover:scale-105">
                    <h3 className="text-gray-600 font-semibold mb-2">{t('overallAveragePerformance')}</h3>
                    <p className="text-4xl font-bold text-purple-600">{stats.overallAverage.toFixed(1)}%</p>
                </div>
                <div className="bg-amber-50 p-6 rounded-2xl text-center border border-amber-200 shadow-sm transition-transform hover:scale-105">
                    <h3 className="text-gray-600 font-semibold mb-2">إنجاز المهام</h3>
                    <p className="text-4xl font-bold text-amber-600">{stats.taskCompletion.toFixed(0)}%</p>
                </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 shadow-inner space-y-4">
                <ProgressBar label="كفاءة تسليم الكشوفات" percentage={stats.deliveryCompletion} customColors={true} />
                <ProgressBar label="متوسط الأداء العام للمعلمين" percentage={stats.overallAverage} customColors={true} />
            </div>

            <ExportButtons onExport={(format) => exportKeyMetrics(format, stats, selectedSchool)} />
        </div>
    );
};

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = (props) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('keyMetrics');

  const renderContent = () => {
      switch(activeTab) {
          case 'keyMetrics': return <KeyMetricsView props={props} />;
          case 'evaluationAnalysis': return <div>Evaluation Analysis Placeholder</div>; // (Simplified)
          case 'supervisoryReports': return <div>Supervisory Reports Placeholder</div>; // (Simplified)
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

export default PerformanceDashboard;
