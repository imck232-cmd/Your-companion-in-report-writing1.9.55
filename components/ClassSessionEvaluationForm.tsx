import React, { useState, useMemo, useEffect } from 'react';
import { ClassSessionEvaluationReport, Teacher, ClassSessionCriterionGroup, ClassSessionCriterion, CustomCriterion, SyllabusPlan } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { exportToTxt, exportToPdf, exportToExcel, sendToWhatsApp } from '../lib/exportUtils';
import { CLASS_SESSION_BRIEF_TEMPLATE, CLASS_SESSION_EXTENDED_TEMPLATE, CLASS_SESSION_SUBJECT_SPECIFIC_TEMPLATE, COMMON_STRATEGIES, COMMON_TOOLS, COMMON_SOURCES } from '../constants';
import { verbToMasdar } from '../lib/nlp_ar';
import CustomizableInputSection from './CustomizableInputSection';
import ImportDataSection from './ImportDataSection';

// --- Syllabus Status Component ---
interface SyllabusStatusDisplayProps {
  syllabusPlans: SyllabusPlan[];
  reportDate: string;
  reportSemester: 'الأول' | 'الثاني';
  reportSubject: string;
  reportGrade: string;
  lessonName: string; // The actual lesson taught
  onStatusChange: (status: ClassSessionEvaluationReport['syllabusProgress']) => void;
}

const SyllabusStatusDisplay: React.FC<SyllabusStatusDisplayProps> = ({ syllabusPlans, reportDate, reportSubject, reportGrade, lessonName, onStatusChange }) => {
    const { t } = useLanguage();
    
    const statusInfo = useMemo(() => {
        if (!lessonName.trim() || !reportDate || !reportSubject || !reportGrade) {
            return null;
        }

        const plan = syllabusPlans.find(p => p.subject === reportSubject && p.grade === reportGrade);
        if (!plan || plan.lessons.length === 0) {
            return { display: null, data: undefined };
        }
        
        const reportDateObj = new Date(reportDate);
        if (isNaN(reportDateObj.getTime())) return { display: null, data: undefined };

        // Find the latest lesson that should have been taught by the report date
        const lessonsBefore = plan.lessons
            .filter(l => l.plannedDate && new Date(l.plannedDate) <= reportDateObj)
            .sort((a, b) => new Date(b.plannedDate).getTime() - new Date(a.plannedDate).getTime());
        
        const plannedLesson = lessonsBefore.length > 0 ? lessonsBefore[0] : null;

        if (!plannedLesson) {
             return { display: null, data: undefined };
        }

        const plannedIndex = plan.lessons.findIndex(l => l.id === plannedLesson.id);
        const currentIndex = plan.lessons.findIndex(l => l.title.trim() === lessonName.trim());

        if (currentIndex === -1 || plannedIndex === -1) {
            return { display: <span className="text-gray-500">{t('syllabusProgress')}: {plannedLesson.title}</span>, data: { plannedLesson: plannedLesson.title, status: 'on_track' } };
        }
        
        const difference = currentIndex - plannedIndex;
        let status: 'ahead' | 'on_track' | 'behind';
        let display: React.ReactNode;

        if (difference === 0) {
            status = 'on_track';
            display = <span className="text-green-600 font-semibold">{t('syllabusStatus_match')}</span>;
        } else if (difference > 0) {
            status = 'ahead';
            const unit = difference === 1 ? t('syllabusStatus_unit') : t('syllabusStatus_units');
            display = <span className="text-blue-600 font-semibold">{t('syllabusStatus_ahead')} {difference} {unit}</span>;
        } else {
            status = 'behind';
            const absDifference = Math.abs(difference);
            const unit = absDifference === 1 ? t('syllabusStatus_unit') : t('syllabusStatus_units');
            display = <span className="text-red-600 font-semibold">{t('syllabusStatus_behind')} {absDifference} {unit}</span>;
        }

        return {
            display: <>{display} <span className="text-gray-600 text-xs">({t('lessonTitle')}: {plannedLesson.title})</span></>,
            data: { plannedLesson: plannedLesson.title, status }
        };

    }, [lessonName, reportDate, reportSubject, reportGrade, syllabusPlans, t]);

    useEffect(() => {
        if (statusInfo?.data) {
            onStatusChange(statusInfo.data);
        }
    }, [statusInfo, onStatusChange]);

    if (!statusInfo?.display) return null;

    return (
        <div className="text-sm text-center bg-gray-100 p-1 rounded-md">
           {statusInfo.display}
        </div>
    );
};
// --- End Syllabus Status Component ---


interface ClassSessionEvaluationFormProps {
  report: ClassSessionEvaluationReport;
  teacher: Teacher;
  onSave: (report: ClassSessionEvaluationReport) => void;
  onCancel: () => void;
  isNewReport: boolean;
  addCustomCriterion: (criterion: CustomCriterion) => void;
  syllabusPlans: SyllabusPlan[];
  hiddenCriteria: { [teacherIdOrAll: string]: string[] };
}

const LabeledInputWrapper: React.FC<{label: string, children: React.ReactNode, className?: string}> = ({ label, children, className }) => (
    <div className={`flex items-center w-full p-2 border rounded focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition bg-inherit ${className}`}>
        <span className="pl-2 rtl:pr-0 rtl:pl-2 text-gray-500 text-sm whitespace-nowrap">{label}</span>
        {children}
    </div>
);
const inputClass = "w-full bg-transparent outline-none border-none p-0";


const ClassSessionEvaluationForm: React.FC<ClassSessionEvaluationFormProps> = ({ report, teacher, onSave, onCancel, isNewReport, addCustomCriterion, syllabusPlans, hiddenCriteria }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<ClassSessionEvaluationReport>(report);
  const [activeSubType, setActiveSubType] = useState<'brief' | 'extended' | 'subject_specific'>(report.subType);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    let template: ClassSessionCriterionGroup[];
    switch(activeSubType){
      case 'brief': template = CLASS_SESSION_BRIEF_TEMPLATE; break;
      case 'extended': template = CLASS_SESSION_EXTENDED_TEMPLATE; break;
      case 'subject_specific': template = CLASS_SESSION_SUBJECT_SPECIFIC_TEMPLATE; break;
      default: template = [];
    }

    const allHiddenIds = new Set([
        ...(hiddenCriteria['all'] || []),
        ...(hiddenCriteria[teacher.id] || [])
    ]);

    const filterTemplate = (templateToFilter: ClassSessionCriterionGroup[]): ClassSessionCriterionGroup[] => {
        return JSON.parse(JSON.stringify(templateToFilter)) // deep copy
            .map((group: ClassSessionCriterionGroup) => {
                group.criteria = group.criteria.filter(c => !allHiddenIds.has(c.id));
                return group;
            })
            .filter((group: ClassSessionCriterionGroup) => group.criteria.length > 0); // Remove empty groups
    };
    
    if (isNewReport || formData.subType !== activeSubType) {
       setFormData(prev => ({
          ...prev,
          subType: activeSubType,
          criterionGroups: filterTemplate(template)
       }));
    }
  }, [activeSubType, isNewReport, formData.subType, hiddenCriteria, teacher.id]);

  useEffect(() => {
    if (isNewReport && !formData.plannedSyllabusLesson) {
      const { date, subject, grades } = formData;
      if (!date || !subject || !grades) return;

      const plan = syllabusPlans.find(p => p.subject === subject && p.grade === grades);
      if (!plan || plan.lessons.length === 0) return;

      const reportDateObj = new Date(date);
      if (isNaN(reportDateObj.getTime())) return;
      
      const lessonForDate = plan.lessons.find(l => l.plannedDate === date);

      if (lessonForDate) {
          setFormData(prev => ({...prev, plannedSyllabusLesson: lessonForDate.title}));
      } else {
          const lessonsBefore = plan.lessons
              .filter(l => l.plannedDate && new Date(l.plannedDate) <= reportDateObj)
              .sort((a, b) => new Date(b.plannedDate).getTime() - new Date(a.plannedDate).getTime());
          
          if (lessonsBefore.length > 0) {
              setFormData(prev => ({...prev, plannedSyllabusLesson: lessonsBefore[0].title}));
          }
      }
    }
}, [isNewReport, formData.date, formData.subject, formData.grades, syllabusPlans]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleComboBoxChange = (name: string, value: string) => {
     setFormData(prev => ({ ...prev, [name]: value }));
  }

  const handleCustomSectionChange = (fieldName: keyof ClassSessionEvaluationReport, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleScoreChange = (groupIndex: number, criterionIndex: number, score: 0 | 1 | 2 | 3 | 4) => {
    const newGroups = [...formData.criterionGroups];
    newGroups[groupIndex].criteria[criterionIndex].score = score;
    setFormData(prev => ({ ...prev, criterionGroups: newGroups }));
  };
  
  const addCriterion = (groupIndex: number) => {
    const newCriterionName = window.prompt(t('criterionName'));
    if (!newCriterionName || !newCriterionName.trim()) return;

    const isGeneral = window.confirm('هل تريد إضافة هذا المعيار كـ "عام" لجميع المعلمين في هذه المدرسة؟\nاضغط "OK" لعام، أو "Cancel" لخاص بهذا التقرير فقط.');
    
    const newCriterion: ClassSessionCriterion = { id: `custom-${Date.now()}`, label: newCriterionName.trim(), score: 0 };
    const newGroups = [...formData.criterionGroups];
    newGroups[groupIndex].criteria.push(newCriterion);
    setFormData(prev => ({ ...prev, criterionGroups: newGroups }));

    if (isGeneral && formData.school) {
        const customCriterion: CustomCriterion = {
            id: `custom-g-${Date.now()}`,
            school: formData.school,
            evaluationType: 'class_session',
            subType: formData.subType,
            groupTitle: newGroups[groupIndex].title,
            criterion: { id: newCriterion.id, label: newCriterion.label }
        };
        addCustomCriterion(customCriterion);
    }
  };
  
  const removeCriterion = (groupIndex: number, criterionIndex: number) => {
     if (window.confirm(t('confirmDelete'))) {
      const newGroups = [...formData.criterionGroups];
      newGroups[groupIndex].criteria.splice(criterionIndex, 1);
      setFormData(prev => ({ ...prev, criterionGroups: newGroups }));
    }
  };


  const getScoreColor = (score: number) => {
    switch(score) {
      case 0: return 'bg-red-800 text-white border-red-800';
      case 1: return 'bg-warning text-white border-warning';
      case 2: return 'bg-light-yellow text-gray-800 border-light-yellow';
      case 3: return 'bg-blue-500 text-white border-blue-500';
      case 4: return 'bg-green-500 text-white border-green-500';
      default: return 'bg-gray-200 border-gray-300 hover:bg-gray-300';
    }
  };

  const getScoreFeedback = (score: number): string => {
    const key = `score_${score}` as keyof ReturnType<typeof useLanguage>['t'];
    return t(key as any);
  };
  
  const generateFeedback = () => {
    let positives4: string[] = [];
    let positives3: string[] = [];
    let notes: string[] = [];
    let recommendations: string[] = [];

    formData.criterionGroups.forEach(group => {
        group.criteria.forEach(criterion => {
            const masdar = verbToMasdar(criterion.label);
            switch(criterion.score) {
                case 4:
                    positives4.push(criterion.label);
                    break;
                case 3:
                    positives3.push(criterion.label);
                    break;
                case 2:
                    notes.push(`نطمح إلى الارتقاء أكثر في ${masdar} بحيث يرتقي إلى أعلى المستويات.`);
                    break;
                case 1:
                case 0:
                    recommendations.push(`نرجو التحسن بشكل أفضل في ${masdar} بحيث يرتقي إلى أعلى المستويات.`);
                    break;
            }
        });
    });

    let finalPositives = '';
    if (positives4.length > 0) {
        finalPositives += 'لقد تميزت ووصلت إلى أعلى المستويات في المعايير الآتية:\n' + positives4.map(label => `- ${label}`).join('\n');
    }
    if (positives3.length > 0) {
        if (finalPositives.length > 0) finalPositives += '\n\n';
        finalPositives += 'الأداء كان قوياً ونطمح أن يرتقي إلى أعلى المستويات في المعايير الآتية:\n' + positives3.map(label => `- ${label}`).join('\n');
    }

    setFormData(prev => ({
        ...prev,
        positives: finalPositives,
        notesForImprovement: notes.join('\n'),
        recommendations: recommendations.join('\n')
    }));
  };

  const totalPercentage = useMemo(() => {
    const allCriteria = formData.criterionGroups.flatMap(g => g.criteria);
    if (allCriteria.length === 0) return 0;
    const totalScore = allCriteria.reduce((sum, c) => sum + c.score, 0);
    const maxScore = allCriteria.length * 4;
    if (maxScore === 0) return 0;
    return (totalScore / maxScore) * 100;
  }, [formData.criterionGroups]);

  const getPerformanceStyles = (percentage: number): { className: string, text: string } => {
    if (percentage <= 30) return { className: 'bg-red-800 text-white', text: t('percentage_0_30') };
    if (percentage <= 40) return { className: 'bg-red-500 text-white', text: t('percentage_31_40') };
    if (percentage <= 60) return { className: 'bg-yellow-300 text-gray-800', text: t('percentage_41_60') };
    if (percentage <= 74) return { className: 'bg-yellow-500 text-white', text: t('percentage_61_74') };
    if (percentage <= 80) return { className: 'bg-sky-400 text-white', text: t('percentage_75_80') };
    if (percentage <= 89) return { className: 'bg-sky-600 text-white', text: t('percentage_81_89') };
    return { className: 'bg-green-500 text-white', text: t('percentage_90_100') };
  };

  const getEmployeeCommentForPercentage = (percentage: number): string => {
    if (percentage <= 40) return "تم الاطلاع على التقييم كاملاً بما في ذلك جميع الإيجابيات وملاحظات التحسين، والتوصيات، وأتعهد بالمتابعة لكل ما ذكر";
    if (percentage <= 80) return "تم الاطلاع على التقييم كاملاً بما في ذلك جميع الإيجابيات وملاحظات التحسين، والتوصيات، وسأعمل على الأخذ بكافة ما تم ذكره.";
    return "تم الاطلاع على التقييم كاملاً بما في ذلك جميع الإيجابيات وملاحظات التحسين، والتوصيات، وسأعمل على الاستمرار في الصدارة و الأخذ بكافة ما تم ذكره.";
  };

  const handleGenerateComment = () => {
    const comment = getEmployeeCommentForPercentage(totalPercentage);
    setFormData(prev => ({ ...prev, employeeComment: comment }));
  };

  const performanceStyle = getPerformanceStyles(totalPercentage);

  const subTypeButtonClass = (type: 'brief' | 'extended' | 'subject_specific') => 
    `px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105 ${activeSubType === type ? 'bg-primary text-white shadow-md' : 'bg-gray-200 hover:bg-gray-300'}`;
  
  const teacherSubjects = useMemo(() => teacher.subjects?.split(',').map(s => s.trim()).filter(Boolean) || [], [teacher.subjects]);
  const teacherGrades = useMemo(() => teacher.gradesTaught?.split(',').map(g => g.trim()).filter(Boolean) || [], [teacher.gradesTaught]);
  const teacherSections = useMemo(() => teacher.sectionsTaught?.split(',').map(s => s.trim()).filter(Boolean) || [], [teacher.sectionsTaught]);
  
    const handleDataParsed = (parsedData: Partial<ClassSessionEvaluationReport>) => {
        const updatedFormData = { ...formData };

        for (const key of ['subject', 'grades', 'date', 'branch', 'strategies', 'tools', 'sources', 'programs', 'positives', 'notesForImprovement', 'recommendations', 'employeeComment', 'visitType', 'class', 'section', 'lessonNumber', 'lessonName', 'plannedSyllabusLesson']) {
            if (parsedData[key as keyof typeof parsedData]) {
                (updatedFormData as any)[key] = parsedData[key as keyof typeof parsedData];
            }
        }
        
        if (parsedData.criterionGroups && Array.isArray(parsedData.criterionGroups)) {
            const newGroups = [...updatedFormData.criterionGroups];
            parsedData.criterionGroups.forEach(parsedGroup => {
                const groupIndex = newGroups.findIndex(g => g.title === parsedGroup.title);
                if (groupIndex !== -1 && parsedGroup.criteria && Array.isArray(parsedGroup.criteria)) {
                    parsedGroup.criteria.forEach(parsedCrit => {
                        if (parsedCrit.label && typeof parsedCrit.score === 'number') {
                            const critIndex = newGroups[groupIndex].criteria.findIndex(c => c.label === parsedCrit.label);
                            if (critIndex !== -1) {
                                newGroups[groupIndex].criteria[critIndex].score = Math.max(0, Math.min(4, parsedCrit.score)) as 0|1|2|3|4;
                            }
                        }
                    });
                }
            });
            updatedFormData.criterionGroups = newGroups;
        }
        
        setFormData(updatedFormData);
        setShowImport(false);
    };

    const formStructureForAI = useMemo(() => ({
        evaluationType: 'class_session',
        subType: formData.subType,
        subject: '', grades: '', section: '', date: 'YYYY-MM-DD',
        visitType: '', lessonNumber: '', lessonName: '', plannedSyllabusLesson: '',
        criterionGroups: formData.criterionGroups.map(g => ({
            title: g.title,
            criteria: g.criteria.map(c => ({ label: c.label, score: 0 }))
        })),
        strategies: '', tools: '', sources: '', programs: '',
        positives: '', notesForImprovement: '', recommendations: '', employeeComment: ''
    }), [formData.criterionGroups, formData.subType]);


  return (
    <div className="p-4 md:p-6 rounded-lg shadow-md space-y-6" style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary">{t('classSessionEvaluation')} - {teacher.name}</h2>
        <button onClick={onCancel} className="flex items-center gap-2 text-sky-600 hover:underline transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rtl:rotate-180" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
            {t('back')}
        </button>
      </div>
       
       {/* --- Reordered fields --- */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg" style={{backgroundColor: 'rgba(128,128,128,0.05)', borderColor: 'var(--color-card-border)'}}>
            <LabeledInputWrapper label={t('schoolNameLabel')}>
                <input type="text" name="school" value={formData.school} onChange={handleInputChange} className={inputClass} readOnly />
            </LabeledInputWrapper>
            <LabeledInputWrapper label={t('supervisorNameLabel')}>
                <input type="text" name="supervisorName" value={formData.supervisorName || ''} onChange={handleInputChange} className={inputClass} />
            </LabeledInputWrapper>
            <LabeledInputWrapper label={t('semesterLabel')}>
                <select name="semester" value={formData.semester} onChange={handleInputChange} className={`${inputClass} appearance-none`}>
                    <option value="الأول">{t('semester1')}</option>
                    <option value="الثاني">{t('semester2')}</option>
                </select>
            </LabeledInputWrapper>
            <LabeledInputWrapper label={t('dateLabel')}>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} className={inputClass} />
            </LabeledInputWrapper>
            
            <LabeledInputWrapper label={t('subjectLabel')}>
                <input type="text" name="subject" value={formData.subject} onChange={(e) => handleComboBoxChange('subject', e.target.value)} list="subject-datalist" className={inputClass} />
                <datalist id="subject-datalist">
                    {teacherSubjects.map(opt => <option key={opt} value={opt} />)}
                </datalist>
            </LabeledInputWrapper>
            <LabeledInputWrapper label={t('gradesLabel')}>
                <input type="text" name="grades" value={formData.grades} onChange={(e) => handleComboBoxChange('grades', e.target.value)} list="grades-datalist" className={inputClass} />
                <datalist id="grades-datalist">
                    {teacherGrades.map(opt => <option key={opt} value={opt} />)}
                </datalist>
            </LabeledInputWrapper>
            <LabeledInputWrapper label={t('sectionLabel')}>
                <input type="text" name="section" value={formData.section} onChange={(e) => handleComboBoxChange('section', e.target.value)} list="section-datalist" className={inputClass} />
                <datalist id="section-datalist">
                    {teacherSections.map(opt => <option key={opt} value={opt} />)}
                </datalist>
            </LabeledInputWrapper>
            
            <LabeledInputWrapper label={t('visitTypeLabel')}>
                <select name="visitType" value={formData.visitType} onChange={handleInputChange} className={`${inputClass} appearance-none`}>
                    {['استطلاعية', 'تقييمية 1', 'تقييمية 2', 'فنية إشرافية', 'تطويرية', 'تبادلية', 'تشخيصية', 'علاجية'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </LabeledInputWrapper>
            <LabeledInputWrapper label={t('lessonNumberLabel')}>
                <input type="text" name="lessonNumber" value={formData.lessonNumber} onChange={handleInputChange} className={inputClass} />
            </LabeledInputWrapper>
            <div className="space-y-1 md:col-span-2 lg:col-span-1">
                <LabeledInputWrapper label={t('lessonTitleLabel')}>
                    <input type="text" name="lessonName" value={formData.lessonName} onChange={handleInputChange} className={inputClass} />
                </LabeledInputWrapper>
                <div className="flex items-center w-full p-2 border rounded focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition bg-inherit">
                    <span className="pl-2 rtl:pr-0 rtl:pl-2 text-gray-500 text-sm whitespace-nowrap">
                        {t('lessonAccordingToPlan')}:
                    </span>
                    <input 
                        type="text" 
                        name="plannedSyllabusLesson"
                        value={formData.plannedSyllabusLesson || ''} 
                        onChange={handleInputChange} 
                        className="w-full bg-transparent outline-none border-none p-0"
                    />
                </div>
                <SyllabusStatusDisplay
                    syllabusPlans={syllabusPlans}
                    reportDate={formData.date}
                    reportSemester={formData.semester!}
                    reportSubject={formData.subject}
                    reportGrade={formData.grades}
                    lessonName={formData.lessonName}
                    onStatusChange={(status) => setFormData(prev => ({...prev, syllabusProgress: status}))}
                />
            </div>
      </div>


      <div className="flex justify-center gap-4 py-4">
        <button onClick={() => setActiveSubType('brief')} className={subTypeButtonClass('brief')}>التقييم المختصر</button>
        <button onClick={() => setActiveSubType('extended')} className={subTypeButtonClass('extended')}>التقييم الموسع</button>
        <button onClick={() => setActiveSubType('subject_specific')} className={subTypeButtonClass('subject_specific')}>التقييم حسب المادة</button>
      </div>

      <div className="space-y-6">
        {formData.criterionGroups.map((group, groupIndex) => (
          <div key={group.id} className="border rounded-lg" style={{borderColor: 'var(--color-primary-light)'}}>
            <div className="flex justify-between items-center p-3 rounded-t-lg" style={{backgroundColor: 'var(--color-primary-light)', color: 'white'}}>
                <h4 className="text-lg font-bold">{group.title}</h4>
                 <button onClick={() => addCriterion(groupIndex)} className="hover:text-gray-200 p-1 rounded-full hover:bg-black/20 transition-colors transform hover:scale-110" title={t('addNewCriterion')}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
            </div>
            <div className="p-4 space-y-3">
              {group.criteria.map((criterion, critIndex) => (
                 <div key={criterion.id} className="flex flex-col md:flex-row items-center gap-4 border-b py-2" style={{borderColor: 'var(--color-card-border)'}}>
                    <div className="flex-grow flex items-center">
                        <button onClick={() => removeCriterion(groupIndex, critIndex)} className="text-red-500 hover:text-red-700 p-1 me-2 rtl:ms-2 rounded-full hover:bg-red-100 transition-colors transform hover:scale-110">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                        <label className="font-medium">{criterion.label}</label>
                        <span className="text-sm text-gray-500 ms-2 rtl:me-2">({getScoreFeedback(criterion.score)})</span>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                        {[0, 1, 2, 3, 4].map(score => (
                            <button key={score} onClick={() => handleScoreChange(groupIndex, critIndex, score as 0|1|2|3|4)} className={`w-10 h-10 rounded-full font-bold border-2 transition-transform transform hover:scale-110 ${criterion.score === score ? getScoreColor(score) : 'bg-gray-200 border-gray-300'}`}>
                                {score}
                            </button>
                        ))}
                    </div>
                 </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
       <div className={`text-center p-4 rounded-lg transition-colors duration-500 ${performanceStyle.className}`}>
        <h4 className="text-lg font-bold">{t('totalPercentage')}: <span className="text-2xl">{totalPercentage.toFixed(2)}%</span></h4>
        <p className="font-semibold mt-1">{performanceStyle.text}</p>
      </div>

       <div className="space-y-6">
          <CustomizableInputSection
            title={t('implementedStrategies')}
            value={formData.strategies}
            onChange={(value) => handleCustomSectionChange('strategies', value)}
            defaultItems={COMMON_STRATEGIES}
            localStorageKey="customStrategies"
          />
          <CustomizableInputSection
            title={t('usedTools')}
            value={formData.tools}
            onChange={(value) => handleCustomSectionChange('tools', value)}
            defaultItems={COMMON_TOOLS}
            localStorageKey="customTools"
          />
          <CustomizableInputSection
            title={t('usedSources')}
            value={formData.sources}
            onChange={(value) => handleCustomSectionChange('sources', value)}
            defaultItems={COMMON_SOURCES}
            localStorageKey="customSources"
          />
           <CustomizableInputSection
            title={t('implementedPrograms')}
            value={formData.programs}
            onChange={(value) => handleCustomSectionChange('programs', value)}
            defaultItems={[]}
            localStorageKey="customPrograms"
          />
      </div>


      <div className="space-y-4">
        <div className="text-center">
             <button onClick={generateFeedback} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 font-semibold">{t('generateFeedback')}</button>
        </div>
        <textarea name="positives" placeholder={t('positives')} value={formData.positives} onChange={handleInputChange} className="w-full p-2 border rounded h-24 focus:ring-primary focus:border-primary transition bg-inherit" />
        <textarea name="notesForImprovement" placeholder={t('notesForImprovement')} value={formData.notesForImprovement} onChange={handleInputChange} className="w-full p-2 border rounded h-24 focus:ring-primary focus:border-primary transition bg-inherit" />
        <textarea name="recommendations" placeholder={t('recommendations')} value={formData.recommendations} onChange={handleInputChange} className="w-full p-2 border rounded h-24 focus:ring-primary focus:border-primary transition bg-inherit" />
        <div>
            <div className="flex justify-between items-center mb-1">
                <label htmlFor="employeeComment" className="font-semibold">{t('employeeComment')}</label>
                <button type="button" onClick={handleGenerateComment} className="text-sm bg-primary-light text-white px-3 py-1 rounded-md hover:bg-opacity-80 transition">{t('generateEmployeeComment')}</button>
            </div>
            <textarea id="employeeComment" name="employeeComment" value={formData.employeeComment} onChange={handleInputChange} className="w-full p-2 border rounded h-24 focus:ring-primary focus:border-primary transition bg-inherit" />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-card-border)' }}>
        <button onClick={() => onSave(formData)} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all transform hover:scale-105">{t('save')}</button>
        <button onClick={onCancel} className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all transform hover:scale-105">{t('cancel')}</button>
        <button onClick={() => exportToTxt(formData, teacher)} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all transform hover:scale-105">{t('exportTxt')}</button>
        <button onClick={() => exportToPdf(formData, teacher)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all transform hover:scale-105">{t('exportPdf')}</button>
        <button onClick={() => exportToExcel(formData, teacher)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all transform hover:scale-105">{t('exportExcel')}</button>
        <button onClick={() => sendToWhatsApp(formData, teacher)} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all transform hover:scale-105">{t('sendToWhatsApp')}</button>
      </div>

      <div className="border-t pt-4 mt-4">
            <button onClick={() => setShowImport(!showImport)} className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all transform hover:scale-105">
                {t('importData')}
            </button>
            {showImport && (
                <ImportDataSection 
                    onDataParsed={handleDataParsed}
                    formStructure={formStructureForAI}
                />
            )}
        </div>

    </div>
  );
};

export default ClassSessionEvaluationForm;
