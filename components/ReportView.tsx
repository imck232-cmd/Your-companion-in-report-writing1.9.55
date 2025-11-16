import React, { useState, useEffect } from 'react';
import { Teacher, Report, EvaluationType, GeneralEvaluationReport, ClassSessionEvaluationReport, CustomCriterion, GeneralCriterion, SpecialReportTemplate, SpecialReport, SyllabusPlan, ClassSessionCriterionGroup } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import GeneralEvaluationForm from './GeneralEvaluationForm';
import ClassSessionEvaluationForm from './ClassSessionEvaluationForm';
import { GENERAL_EVALUATION_CRITERIA_TEMPLATE, CLASS_SESSION_BRIEF_TEMPLATE } from '../constants';
import SpecialReportForm from './SpecialReportForm';

interface ReportViewProps {
  teacher: Teacher;
  reports: Report[];
  customCriteria: CustomCriterion[];
  specialReportTemplates: SpecialReportTemplate[];
  syllabusPlans: SyllabusPlan[];
  onBack: () => void;
  saveReport: (report: Report) => void;
  deleteReport: (reportId: string) => void;
  updateTeacher: (teacher: Teacher) => void;
  saveCustomCriterion: (criterion: CustomCriterion) => void;
  hiddenCriteria: { [teacherIdOrAll: string]: string[] };
  // --- New global props ---
  supervisorName: string;
  semester: 'الأول' | 'الثاني';
  academicYear: string;
  initiallyOpenReportId: string | null;
}

const ReportView: React.FC<ReportViewProps> = ({ teacher, reports, customCriteria, specialReportTemplates, syllabusPlans, onBack, saveReport, deleteReport, updateTeacher, saveCustomCriterion, hiddenCriteria, supervisorName, semester, academicYear, initiallyOpenReportId }) => {
  const { t } = useLanguage();
  const { hasPermission } = useAuth();
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    if (initiallyOpenReportId) {
        const reportToOpen = reports.find(r => r.id === initiallyOpenReportId);
        if (reportToOpen) {
            setEditingReport(reportToOpen);
            setIsCreatingNew(false);
        }
    }
  }, [initiallyOpenReportId, reports]);

  const handleNewReport = (type: EvaluationType, template?: SpecialReportTemplate) => {
    // Find the most recent report of the same type for this teacher to pre-fill data
    const latestReportOfSameType = [...reports]
        .filter(r => r.evaluationType === type)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    // Fallback to any latest report if no report of the same type is found
    const latestReportOverall = [...reports]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    const latestReport = latestReportOfSameType || latestReportOverall;

    const baseReport = {
      id: `report-${Date.now()}`,
      teacherId: teacher.id,
      date: new Date().toISOString().split('T')[0],
      school: teacher.schoolName,
      subject: latestReport?.subject || teacher.subjects?.split(',')[0] || '',
      grades: latestReport?.grades || teacher.gradesTaught?.split(',')[0] || '',
      branch: teacher.branch || 'main',
      // Add global settings
      supervisorName: supervisorName,
      semester: semester,
      academicYear: academicYear,
    };
    
    const allHiddenIds = new Set([
      ...(hiddenCriteria['all'] || []),
      ...(hiddenCriteria[teacher.id] || [])
    ]);

    if (type === 'general') {
        // Filter criteria specific to this teacher or general for all
        const applicableCustomCriteria = customCriteria.filter(c => 
            c.school === baseReport.school && 
            c.evaluationType === 'general' &&
            (!c.teacherIds || c.teacherIds.length === 0 || c.teacherIds.includes(teacher.id))
        );

        const schoolCustomCriteria = applicableCustomCriteria.map(c => ({ ...(c.criterion as Omit<GeneralCriterion, 'score'>), score: 0 as const }));

        const newReport: GeneralEvaluationReport = {
            ...baseReport,
            evaluationType: 'general',
            criteria: [
                ...GENERAL_EVALUATION_CRITERIA_TEMPLATE
                    .filter(c => !allHiddenIds.has(c.id))
                    .map(c => ({...c, score: 0 as const})),
                ...schoolCustomCriteria
                    .filter(c => !allHiddenIds.has(c.id))
            ],
            strategies: '',
            tools: '',
            programs: '',
            sources: '',
        };
        setEditingReport(newReport);
    } else if (type === 'class_session') {
        const latestClassReport = latestReport as ClassSessionEvaluationReport | undefined;
        
        const filterTemplate = (template: ClassSessionCriterionGroup[]): ClassSessionCriterionGroup[] => {
            return JSON.parse(JSON.stringify(template)) // deep copy
                .map((group: ClassSessionCriterionGroup) => {
                    group.criteria = group.criteria.filter(c => !allHiddenIds.has(c.id));
                    return group;
                })
                .filter((group: ClassSessionCriterionGroup) => group.criteria.length > 0); // Remove empty groups
        };
        
        const newReport: ClassSessionEvaluationReport = {
          ...baseReport,
          evaluationType: 'class_session',
          subType: 'brief',
          criterionGroups: filterTemplate(CLASS_SESSION_BRIEF_TEMPLATE),
          visitType: latestClassReport?.visitType || 'استطلاعية', 
          class: latestClassReport?.class || (teacher.gradesTaught?.split(',')[0] as any) || 'الأول', 
          section: (teacher.sectionsTaught?.split(',')[0] as any) || 'أ',
          lessonNumber: latestClassReport?.lessonNumber || '', 
          lessonName: latestClassReport?.lessonName || '', 
          positives: '', 
          notesForImprovement: '', 
          recommendations: '', 
          employeeComment: '',
          strategies: '',
          tools: '',
          programs: '',
          sources: '',
        }
        setEditingReport(newReport);
    } else if (type === 'special' && template) {
        const newReport: SpecialReport = {
            ...baseReport,
            evaluationType: 'special',
            templateId: template.id,
            templateName: template.name,
            criteria: template.criteria
                .filter(c => !allHiddenIds.has(c.id))
                .map(c => ({ ...c, score: 0 as const }))
        };
        setEditingReport(newReport);
    }
    setIsCreatingNew(true);
  };
  
  const cancelEdit = () => {
    setEditingReport(null);
    setIsCreatingNew(false);
    if (initiallyOpenReportId) {
        onBack();
    }
  }

  const handleSaveReport = (report: Report) => {
    // Persist teacher info is now handled in the TeacherList modal
    saveReport(report);
    cancelEdit();
  };
  
  const handleDelete = (reportId: string) => {
      if(window.confirm(t('confirmDelete'))) {
          deleteReport(reportId);
      }
  }

  if (editingReport) {
      if (editingReport.evaluationType === 'general') {
        return <GeneralEvaluationForm report={editingReport as GeneralEvaluationReport} teacher={teacher} onSave={handleSaveReport} onCancel={cancelEdit} addCustomCriterion={saveCustomCriterion} syllabusPlans={syllabusPlans} isCreatingNew={isCreatingNew} />;
      }
      if (editingReport.evaluationType === 'class_session') {
        return <ClassSessionEvaluationForm report={editingReport as ClassSessionEvaluationReport} teacher={teacher} onSave={handleSaveReport} onCancel={cancelEdit} isNewReport={isCreatingNew} addCustomCriterion={saveCustomCriterion} syllabusPlans={syllabusPlans} hiddenCriteria={hiddenCriteria} />;
      }
       if (editingReport.evaluationType === 'special') {
        return <SpecialReportForm report={editingReport as SpecialReport} teacher={teacher} onSave={handleSaveReport} onCancel={cancelEdit} syllabusPlans={syllabusPlans} isCreatingNew={isCreatingNew} />;
      }
  }


  return (
    <div>
      <button onClick={onBack} className="mb-4 text-sky-600 hover:underline transition-all">&larr; {t('teachersList')}</button>
      <h2 className="text-2xl font-bold mb-4">{t('reportsFor')} {teacher.name}</h2>

      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 border rounded-lg justify-center">
        {hasPermission('create_general_report') && (
            <button onClick={() => handleNewReport('general')} className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all transform hover:scale-105 font-semibold">{t('generalEvaluation')}</button>
        )}
        {hasPermission('create_class_session_report') && (
            <button onClick={() => handleNewReport('class_session')} className="px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all transform hover:scale-105 font-semibold">{t('classSessionEvaluation')} </button>
        )}
        {hasPermission('create_special_report') && specialReportTemplates.map(template => (
            <button key={template.id} onClick={() => handleNewReport('special', template)} className="px-4 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all transform hover:scale-105 font-semibold">{template.name}</button>
        ))}
      </div>

      <div className="space-y-4">
        {reports.length > 0 ? (
          [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(report => {
            let reportTitle = '';
            if (report.evaluationType === 'general') {
                reportTitle = t('generalEvaluation');
            } else if (report.evaluationType === 'class_session') {
                reportTitle = `${t('classSessionEvaluation')} (${(report as ClassSessionEvaluationReport).subType})`;
            } else if (report.evaluationType === 'special') {
                reportTitle = (report as SpecialReport).templateName;
            }

            return (
                 <div key={report.id} className="p-4 border rounded-lg flex justify-between items-center bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <p className="font-semibold">{reportTitle}</p>
                    <p className="text-sm text-gray-500">{new Date(report.date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingReport(report); setIsCreatingNew(false); }} className="px-3 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500 transition-colors transform hover:scale-105">{t('edit')}</button>
                    {hasPermission('delete_report') && (
                        <button onClick={() => handleDelete(report.id)} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors transform hover:scale-105">{t('delete')}</button>
                    )}
                  </div>
                </div>
            )
          })
        ) : (
          <p className="text-gray-500 text-center py-8">{t('noReportsYet')}</p>
        )}
      </div>
    </div>
  );
};

export default ReportView;