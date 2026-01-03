
import React, { useState, useMemo } from 'react';
import { Report, Teacher, EvaluationType, GeneralEvaluationReport, ClassSessionEvaluationReport, SpecialReport, ClassSessionCriterion, GeneralCriterion, Task, Meeting, PeerVisit, DeliverySheet, VisitType } from '../types';
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
import { CLASS_SESSION_BRIEF_TEMPLATE, CLASS_SESSION_EXTENDED_TEMPLATE, CLASS_SESSION_SUBJECT_SPECIFIC_TEMPLATE } from '../constants';

declare const XLSX: any;

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

type AggregatedView = 'teacher_reports' | 'task_report' | 'meeting_report' | 'peer_visit_report' | 'delivery_record_report' | 'final_reports';

// Helper components
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
            {label && <p className="font-semibold text-gray-700">{label}</p>}
            <div className="w-full bg-gray-200 rounded-full h-4 my-2">
                <div className={`${color} h-4 rounded-full transition-all duration-500`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
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
  const { academicYear, selectedSchool } = useAuth();
  const [filterType, setFilterType] = useState<EvaluationType | 'all'>('all');
  const [filterTeacher, setFilterTeacher] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<AggregatedView>('teacher_reports');

  // --- Final Reports Specific State ---
  const [finalFilter, setFinalFilter] = useState({
      branch: 'all',
      teacher: 'all',
      subject: 'all',
      evalSubType: 'brief' as 'brief' | 'extended' | 'subject_specific',
      visitType: 'all' as VisitType | 'all',
      semester: 'all' as 'الأول' | 'الثاني' | 'all',
      useColor: true,
      startDate: '',
      endDate: ''
  });
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedTeachersForWA, setSelectedTeachersForWA] = useState<Set<string>>(new Set());
  const [selectedCriteriaForWA, setSelectedCriteriaForWA] = useState<Set<string>>(new Set());

  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);

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

  const getReportTypeLabel = (report: Report) => {
      switch (report.evaluationType) {
          case 'general': return t('generalEvaluation');
          case 'class_session': return t('classSessionEvaluation');
          case 'special': return (report as SpecialReport).templateName;
          default: return 'تقرير';
      }
  }
  
  const getViewButtonClass = (view: AggregatedView) => `px-3 py-2 rounded-lg font-semibold transition-all text-sm transform hover:scale-105 ${activeView === view ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'}`;

  // --- Final Reports Logic ---

  const finalAnalysis = useMemo(() => {
      // 1. Filter reports for the current school and specific filters
      const relevantReports = reports.filter(r => {
          if (r.school !== selectedSchool) return false;
          if (r.evaluationType !== 'class_session') return false;
          const classReport = r as ClassSessionEvaluationReport;
          if (classReport.subType !== finalFilter.evalSubType) return false;
          
          const teacher = teacherMap.get(r.teacherId);
          if (finalFilter.branch !== 'all' && teacher?.branch !== finalFilter.branch) return false;
          if (finalFilter.teacher !== 'all' && r.teacherId !== finalFilter.teacher) return false;
          if (finalFilter.subject !== 'all' && r.subject !== finalFilter.subject) return false;
          if (finalFilter.visitType !== 'all' && classReport.visitType !== finalFilter.visitType) return false;
          if (finalFilter.semester !== 'all' && r.semester !== finalFilter.semester) return false;
          if (finalFilter.startDate && new Date(r.date) < new Date(finalFilter.startDate)) return false;
          if (finalFilter.endDate && new Date(r.date) > new Date(finalFilter.endDate)) return false;

          return true;
      });

      // 2. Identify all criteria for this evaluation type
      let template: any[] = [];
      if (finalFilter.evalSubType === 'brief') template = CLASS_SESSION_BRIEF_TEMPLATE;
      else if (finalFilter.evalSubType === 'extended') template = CLASS_SESSION_EXTENDED_TEMPLATE;
      else template = CLASS_SESSION_SUBJECT_SPECIFIC_TEMPLATE;

      const allCriteriaLabels = Array.from(new Set(template.flatMap(g => g.criteria.map((c: any) => c.label))));

      // 3. Group by teacher and calculate averages for each criterion
      const teacherGroups: Record<string, { teacher: Teacher, criteriaScores: Record<string, { sum: number, count: number }>, visitCount: number }> = {};

      relevantReports.forEach(r => {
          if (!teacherGroups[r.teacherId]) {
              const teacher = teacherMap.get(r.teacherId);
              if (!teacher) return;
              teacherGroups[r.teacherId] = { teacher, criteriaScores: {}, visitCount: 0 };
              allCriteriaLabels.forEach(label => {
                  teacherGroups[r.teacherId].criteriaScores[label] = { sum: 0, count: 0 };
              });
          }
          
          const classReport = r as ClassSessionEvaluationReport;
          const reportCriteria = classReport.criterionGroups.flatMap(g => g.criteria);
          
          reportCriteria.forEach(c => {
              if (teacherGroups[r.teacherId].criteriaScores[c.label]) {
                  teacherGroups[r.teacherId].criteriaScores[c.label].sum += c.score;
                  teacherGroups[r.teacherId].criteriaScores[c.label].count += 1;
              }
          });
          teacherGroups[r.teacherId].visitCount += 1;
      });

      // 4. Transform to row format
      const rows = Object.values(teacherGroups).map(group => {
          const criteriaAverages: Record<string, number> = {};
          // Track which criteria are actually present for this teacher to avoid scope errors in footer calculation
          const criteriaActive: Record<string, boolean> = {}; 
          let totalSum = 0;
          let activeCriteriaCount = 0;

          allCriteriaLabels.forEach(label => {
              const data = group.criteriaScores[label];
              const avg = data.count > 0 ? data.sum / data.count : 0;
              criteriaAverages[label] = avg;
              criteriaActive[label] = data.count > 0;
              totalSum += avg;
              if (data.count > 0) activeCriteriaCount++;
          });

          const percentage = activeCriteriaCount > 0 ? (totalSum / (activeCriteriaCount * 4)) * 100 : 0;

          return {
              id: group.teacher.id,
              name: group.teacher.name,
              subject: group.teacher.subjects || '---',
              grade: group.teacher.gradesTaught || '---',
              branch: group.teacher.branch === 'boys' ? 'طلاب' : group.teacher.branch === 'girls' ? 'طالبات' : 'رئيسي',
              criteriaAverages,
              criteriaActive, // Fixed scope issue for footer
              totalScore: totalSum,
              percentage: percentage,
              supervisor: relevantReports.find(rr => rr.teacherId === group.teacher.id)?.supervisorName || '---'
          };
      });

      // 5. Calculate column sums and percentages for the footer
      const columnStats: Record<string, { sum: number, count: number }> = {};
      allCriteriaLabels.forEach(label => {
          columnStats[label] = { sum: 0, count: 0 };
          rows.forEach(row => {
              const score = row.criteriaAverages[label];
              // Fix: reference row.criteriaActive[label] instead of the out-of-scope 'group' variable
              if (row.criteriaActive[label]) {
                  columnStats[label].sum += score;
                  columnStats[label].count += 1;
              }
          });
      });

      return { rows, criteriaLabels: allCriteriaLabels, columnStats };
  }, [reports, finalFilter, selectedSchool, teacherMap]);

  const getColorForScore = (score: number) => {
    if (!finalFilter.useColor) return "";
    if (score >= 3.6) return "bg-green-50 text-green-900"; // متميز
    if (score >= 3.0) return "bg-yellow-50 text-yellow-900"; // جيد
    if (score >= 2.0) return "bg-blue-50 text-blue-900"; // متوسط
    if (score >= 1.0) return "bg-orange-50 text-orange-900"; // ضعيف
    return "bg-red-50 text-red-900"; // قصور
  };

  const handleExportFinalExcel = () => {
    const data = finalAnalysis.rows.map((row, idx) => {
        const obj: any = {
            'الرقم': idx + 1,
            'اسم المعلم': row.name,
            'المادة': row.subject,
            'الصف': row.grade,
            'الفرع': row.branch
        };
        finalAnalysis.criteriaLabels.forEach(label => {
            obj[label] = row.criteriaAverages[label].toFixed(1);
        });
        obj['المجموع'] = row.totalScore.toFixed(1);
        obj['النسبة'] = `${row.percentage.toFixed(1)}%`;
        return obj;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التقرير الختامي");
    XLSX.writeFile(wb, `Final_Report_${selectedSchool}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleSendFinalWhatsApp = () => {
    let msg = `*📊 التقرير الختامي للأداء: ${selectedSchool}*\n`;
    msg += `*🕒 النطاق:* ${finalFilter.startDate || 'البداية'} إلى ${finalFilter.endDate || 'الآن'}\n\n`;

    const filteredRows = finalAnalysis.rows.filter(r => selectedTeachersForWA.size === 0 || selectedTeachersForWA.has(r.id));
    const filteredLabels = finalAnalysis.criteriaLabels.filter(l => selectedCriteriaForWA.size === 0 || selectedCriteriaForWA.has(l));

    filteredRows.forEach(row => {
        msg += `👤 *المعلم:* ${row.name}\n`;
        msg += `📖 *المادة:* ${row.subject} | *📈 النسبة:* ${row.percentage.toFixed(1)}%\n`;
        filteredLabels.forEach(label => {
            msg += `▫️ ${label}: ${row.criteriaAverages[label].toFixed(1)}/4\n`;
        });
        msg += `------------------\n`;
    });

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
    setShowWhatsAppModal(false);
  };

  // --- Rendering ---

  const renderFinalReports = () => {
      const { rows, criteriaLabels, columnStats } = finalAnalysis;
      const supervisorsSet = new Set(rows.map(r => r.supervisor));
      const firstSupervisor = Array.from(supervisorsSet)[0] || '---';

      return (
          <div className="space-y-6">
              {/* WhatsApp Selection Modal */}
              {showWhatsAppModal && (
                  <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center p-4 backdrop-blur-sm">
                      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[85vh] flex flex-col border-t-8 border-green-500">
                          <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">اختيار بيانات الإرسال للواتساب</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-2">
                              {/* Teacher Selector */}
                              <div className="border rounded-xl p-4 bg-gray-50">
                                  <h4 className="font-bold text-primary border-b pb-2 mb-3">اختر المعلمين (الكل إذا لم يختر أحد):</h4>
                                  <div className="space-y-1">
                                      {rows.map(row => (
                                          <label key={row.id} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer transition-colors">
                                              <input type="checkbox" checked={selectedTeachersForWA.has(row.id)} onChange={e => {
                                                  const newSet = new Set(selectedTeachersForWA);
                                                  if (e.target.checked) newSet.add(row.id); else newSet.delete(row.id);
                                                  setSelectedTeachersForWA(newSet);
                                              }} className="w-4 h-4 text-primary rounded" />
                                              <span className="text-sm">{row.name}</span>
                                          </label>
                                      ))}
                                  </div>
                              </div>
                              {/* Criteria Selector */}
                              <div className="border rounded-xl p-4 bg-gray-50">
                                  <h4 className="font-bold text-primary border-b pb-2 mb-3">اختر المعايير المراد إرسالها:</h4>
                                  <div className="space-y-1">
                                      {criteriaLabels.map(label => (
                                          <label key={label} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer transition-colors">
                                              <input type="checkbox" checked={selectedCriteriaForWA.has(label)} onChange={e => {
                                                  const newSet = new Set(selectedCriteriaForWA);
                                                  if (e.target.checked) newSet.add(label); else newSet.delete(label);
                                                  setSelectedCriteriaForWA(newSet);
                                              }} className="w-4 h-4 text-primary rounded" />
                                              <span className="text-sm">{label}</span>
                                          </label>
                                      ))}
                                  </div>
                              </div>
                          </div>

                          <div className="flex gap-4 mt-6 pt-4 border-t">
                              <button onClick={handleSendFinalWhatsApp} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 shadow-lg shadow-green-100 transition-all transform hover:scale-[1.02]">إرسال البيانات المختارة</button>
                              <button onClick={() => setShowWhatsAppModal(false)} className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-300">إلغاء</button>
                          </div>
                      </div>
                  </div>
              )}

              {/* Filters Toolbar */}
              <div className="bg-white p-5 rounded-2xl border-2 border-gray-100 shadow-sm space-y-5">
                  <div className="flex items-center gap-3 border-b pb-3 border-gray-50">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">فلترة التقارير الختامية</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400">الفرع</label>
                          <select value={finalFilter.branch} onChange={e => setFinalFilter({...finalFilter, branch: e.target.value})} className="w-full p-2.5 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-bold">
                              <option value="all">جميع الفروع</option>
                              <option value="main">رئيسي</option>
                              <option value="boys">طلاب</option>
                              <option value="girls">طالبات</option>
                          </select>
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400">المعلم</label>
                          <select value={finalFilter.teacher} onChange={e => setFinalFilter({...finalFilter, teacher: e.target.value})} className="w-full p-2.5 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-bold">
                              <option value="all">جميع المعلمين</option>
                              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400">نوع التقييم</label>
                          <select value={finalFilter.evalSubType} onChange={e => setFinalFilter({...finalFilter, evalSubType: e.target.value as any})} className="w-full p-2.5 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-bold text-primary">
                              <option value="brief">التقييم المختصر</option>
                              <option value="extended">التقييم الموسع</option>
                              <option value="subject_specific">التقييم حسب المادة</option>
                          </select>
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400">درجة الزيارة</label>
                          <select value={finalFilter.visitType} onChange={e => setFinalFilter({...finalFilter, visitType: e.target.value as any})} className="w-full p-2.5 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-bold">
                              <option value="all">جميع الزيارات</option>
                              <option value="تقييمية 1">تقييمية 1</option>
                              <option value="تقييمية 2">تقييمية 2</option>
                              <option value="تطويرية">تطويرية</option>
                              <option value="فنية إشرافية">إشرافية</option>
                              <option value="استطلاعية">استطلاعية</option>
                          </select>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-end">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400">الفصل الدراسي</label>
                          <select value={finalFilter.semester} onChange={e => setFinalFilter({...finalFilter, semester: e.target.value as any})} className="w-full p-2.5 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-bold">
                              <option value="all">الأول والثاني</option>
                              <option value="الأول">الفصل الأول</option>
                              <option value="الثاني">الفصل الثاني</option>
                          </select>
                      </div>
                      <div className="space-y-1 col-span-1 lg:col-span-2">
                          <label className="text-xs font-bold text-gray-400">الفترة الزمنية</label>
                          <div className="flex gap-2">
                              <input type="date" value={finalFilter.startDate} onChange={e => setFinalFilter({...finalFilter, startDate: e.target.value})} className="flex-1 p-2 bg-gray-50 border-0 rounded-xl text-sm" />
                              <span className="self-center font-bold text-gray-300">إلى</span>
                              <input type="date" value={finalFilter.endDate} onChange={e => setFinalFilter({...finalFilter, endDate: e.target.value})} className="flex-1 p-2 bg-gray-50 border-0 rounded-xl text-sm" />
                          </div>
                      </div>
                      <div className="flex items-center gap-3 h-full">
                          <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" checked={finalFilter.useColor} onChange={e => setFinalFilter({...finalFilter, useColor: e.target.checked})} className="sr-only peer" />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                              <span className="ms-3 text-sm font-bold text-gray-600">تلوين بصري</span>
                          </label>
                      </div>
                  </div>
              </div>

              {/* Data Table */}
              <div className="relative bg-white rounded-2xl border-2 border-gray-100 shadow-lg overflow-hidden group">
                  <div className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-primary/20">
                      <table className="w-full text-sm text-right">
                          <thead className="bg-primary text-white sticky top-0 z-20">
                              <tr className="divide-x divide-x-reverse divide-white/20">
                                  <th className="p-4 border-b whitespace-nowrap">الرقم</th>
                                  <th className="p-4 border-b whitespace-nowrap sticky right-0 bg-primary z-30 shadow-[4px_0_10px_rgba(0,0,0,0.1)]">اسم المعلم</th>
                                  <th className="p-4 border-b whitespace-nowrap">المادة</th>
                                  <th className="p-4 border-b whitespace-nowrap">الصف</th>
                                  <th className="p-4 border-b whitespace-nowrap">الفرع</th>
                                  {criteriaLabels.map((label, idx) => (
                                      <th key={idx} className="p-4 border-b min-w-[140px] text-center leading-tight">
                                          <div className="max-w-[120px] mx-auto overflow-hidden text-ellipsis">{label}</div>
                                      </th>
                                  ))}
                                  <th className="p-4 border-b whitespace-nowrap bg-blood-red text-center">المجموع</th>
                                  <th className="p-4 border-b whitespace-nowrap bg-blood-red text-center">النسبة</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {rows.length > 0 ? rows.map((row, idx) => (
                                  <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                                      <td className="p-3 text-center text-gray-400">{idx + 1}</td>
                                      <td className="p-3 font-bold text-gray-900 sticky right-0 bg-white group-hover:bg-gray-50/80 z-10 shadow-[4px_0_10px_rgba(0,0,0,0.05)]">{row.name}</td>
                                      <td className="p-3 text-gray-600">{row.subject}</td>
                                      <td className="p-3 text-gray-600">{row.grade}</td>
                                      <td className="p-3">
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.branch === 'طلاب' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                              {row.branch}
                                          </span>
                                      </td>
                                      {criteriaLabels.map((label, lIdx) => (
                                          <td key={lIdx} className={`p-3 text-center font-bold ${getColorForScore(row.criteriaAverages[label])}`}>
                                              {row.criteriaAverages[label] > 0 ? row.criteriaAverages[label].toFixed(1) : '-'}
                                          </td>
                                      ))}
                                      <td className="p-3 text-center font-extrabold text-blood-red bg-red-50/30">{row.totalScore.toFixed(1)}</td>
                                      <td className="p-3 text-center font-extrabold text-blood-red bg-red-50/50">{row.percentage.toFixed(1)}%</td>
                                  </tr>
                              )) : (
                                  <tr><td colSpan={criteriaLabels.length + 7} className="p-12 text-center text-gray-400 italic">لا توجد بيانات تطابق الفلاتر المحددة.</td></tr>
                              )}
                          </tbody>
                          {rows.length > 0 && (
                              <tfoot className="bg-gray-100 font-bold sticky bottom-0 z-20 border-t-4 border-primary/20">
                                  <tr className="divide-x divide-x-reverse divide-gray-200">
                                      <td colSpan={5} className="p-4 text-center text-primary text-lg">خلاصة الأداء العام للمدرسة</td>
                                      {criteriaLabels.map((label, idx) => {
                                          const stats = columnStats[label];
                                          const avg = stats.count > 0 ? stats.sum / stats.count : 0;
                                          return (
                                              <td key={idx} className="p-4 text-center">
                                                  <div className="text-primary">{avg.toFixed(1)}</div>
                                                  <div className="text-[10px] text-gray-400 font-normal">{(avg/4*100).toFixed(0)}%</div>
                                              </td>
                                          );
                                      })}
                                      <td colSpan={2} className="p-4 bg-primary text-white text-center">
                                          <div className="text-xl">
                                              {(rows.reduce((s, r) => s + r.percentage, 0) / rows.length).toFixed(1)}%
                                          </div>
                                          <div className="text-xs opacity-75 font-normal">متوسط المدرسة</div>
                                      </td>
                                  </tr>
                              </tfoot>
                          )}
                      </table>
                  </div>

                  {/* Footer Signatures */}
                  {rows.length > 0 && (
                      <div className="p-8 grid grid-cols-2 gap-12 bg-gray-50/50 border-t print:p-4">
                          <div className="text-center space-y-2">
                              <p className="font-bold text-gray-700">المشرف التربوي</p>
                              <p className="text-xl font- Cairo text-primary underline underline-offset-8 decoration-dotted decoration-primary/30">{firstSupervisor}</p>
                          </div>
                          <div className="text-center space-y-2">
                              <p className="font-bold text-gray-700">إدارة المدرسة</p>
                              <p className="text-xl font- Cairo text-primary">................................................</p>
                          </div>
                      </div>
                  )}
              </div>

              <div className="flex gap-4">
                  <button onClick={handleExportFinalExcel} className="flex-1 p-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      تصدير إكسل للجدول الختامي
                  </button>
                  <button onClick={() => setShowWhatsAppModal(true)} className="flex-1 p-4 bg-green-500 text-white font-bold rounded-2xl shadow-xl shadow-green-100 hover:bg-green-600 transition-all flex items-center justify-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.267.651 4.383 1.905 6.25l-.275 1.002 1.03 1.018zM8.718 7.243c.133-.336.434-.543.818-.576.43-.034.636.101.804.312.189.231.631 1.52.663 1.623.032.102.05.213-.016.344-.065.131-.229.213-.401.325-.202.129-.41.26-.552.404-.16.161-.318.35-.165.608.175.292.747 1.229 1.624 2.016.994.881 1.866 1.158 2.149 1.24.31.09.462.046.63-.122.19-.184.82-1.022.952-1.229.132-.206.264-.238.44-.152.195.094 1.306.685 1.518.79.212.105.356.161.404.248.048.088.028.471-.124.922-.152.452-.947.881-1.306.922-.32.034-1.127.02-1.748-.227-.753-.3-1.859-1.158-3.041-2.451-1.37-1.52-2.316-3.213-2.316-3.213s-.165-.286-.318-.553c-.152-.267-.32-.287-.462-.287-.132 0-.304.01-.462.01z"/></svg>
                      مشاركة واتساب مخصصة
                  </button>
              </div>
          </div>
      );
  };

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
                  <p className="font-bold">{teacherMap.get(report.teacherId)?.name || 'Unknown Teacher'}</p>
                  <p className="text-sm">{getReportTypeLabel(report)}</p>
                  <p className="text-xs text-gray-500">{new Date(report.date).toLocaleDateString()}</p>
                </div>
                <div className="text-lg font-bold text-primary">
                  {calculateReportPercentage(report).toFixed(2)}%
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
                    متوسط النسبة المئوية للتقارير المعروضة: <span className="text-2xl">{(filteredReports.reduce((s, r) => s + calculateReportPercentage(r), 0) / filteredReports.length).toFixed(2)}%</span>
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

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const typeMatch = filterType === 'all' || report.evaluationType === filterType;
      const teacherMatch = filterTeacher === 'all' || report.teacherId === filterTeacher;
      const teacherName = teacherMap.get(report.teacherId)?.name.toLowerCase() || '';
      const searchMatch = !searchTerm || teacherName.includes(searchTerm.toLowerCase());
      const schoolMatch = report.school === selectedSchool;
      return typeMatch && teacherMatch && searchMatch && schoolMatch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reports, filterType, filterTeacher, searchTerm, teacherMap, selectedSchool]);


  const renderView = () => {
      switch(activeView) {
          case 'teacher_reports':
              return renderTeacherReports();
          case 'final_reports':
              return renderFinalReports();
          case 'task_report': {
                const completedTasks = tasks.filter(t => t.status === 'تم التنفيذ').length;
                const notCompletedTasks = tasks.length - completedTasks;
                const completionPercentage = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
                return (
                    <div className="p-4 space-y-4 text-center">
                        <h3 className="text-lg font-semibold">خلاصة خطة المهام</h3>
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
                return (
                    <div className="p-4 space-y-4 text-center">
                        <h3 className="text-lg font-semibold">{t('meetingOutcomesReport')}</h3>
                        <p>إجمالي المخرجات: {stats.total}</p>
                        <ProgressBar label={t('executed')} percentage={stats.percentages.executed} />
                        <ProgressBar label={t('inProgress')} percentage={stats.percentages.inProgress} />
                        <ProgressBar label={t('notExecuted')} percentage={stats.percentages.notExecuted} />
                        <ExportButtons onExport={(format) => exportMeetingSummaryUtil({ format, stats, dateRange: {start: '', end: ''}, t })} />
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
            <button onClick={() => setActiveView('final_reports')} className={getViewButtonClass('final_reports')}>التقارير الختامية</button>
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
