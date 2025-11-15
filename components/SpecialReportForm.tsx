import React, { useState, useMemo, useEffect } from 'react';
import { SpecialReport, Teacher, GeneralCriterion, SyllabusPlan } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { exportToTxt, exportToPdf, exportToExcel, sendToWhatsApp } from '../lib/exportUtils';
import ImportDataSection from './ImportDataSection';

interface SpecialReportFormProps {
  report: SpecialReport;
  teacher: Teacher;
  onSave: (report: SpecialReport) => void;
  onCancel: () => void;
  syllabusPlans: SyllabusPlan[];
  isCreatingNew: boolean;
}

const LabeledInputWrapper: React.FC<{label: string, children: React.ReactNode, className?: string}> = ({ label, children, className }) => (
    <div className={`flex items-center w-full p-2 border rounded focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition bg-inherit ${className}`}>
        <span className="pl-2 rtl:pr-0 rtl:pl-2 text-gray-500 text-sm whitespace-nowrap">{label}</span>
        {children}
    </div>
);
const inputClass = "w-full bg-transparent outline-none border-none p-0";

const SpecialReportForm: React.FC<SpecialReportFormProps> = ({ report, teacher, onSave, onCancel, syllabusPlans, isCreatingNew }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<SpecialReport>(report);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    if (isCreatingNew && !formData.plannedSyllabusLesson) {
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
  }, [isCreatingNew, formData.date, formData.subject, formData.grades, syllabusPlans]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCriterionChange = (index: number, score: 0 | 1 | 2 | 3 | 4) => {
    const newCriteria = [...formData.criteria];
    newCriteria[index] = { ...newCriteria[index], score };
    setFormData(prev => ({ ...prev, criteria: newCriteria }));
  };

  const getScoreColor = (score: number) => {
    switch(score) {
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

  const totalPercentage = useMemo(() => {
    if (formData.criteria.length === 0) return 0;
    const totalScore = formData.criteria.reduce((sum, c) => sum + c.score, 0);
    const maxScore = formData.criteria.length * 4;
    if (maxScore === 0) return 0;
    return (totalScore / maxScore) * 100;
  }, [formData.criteria]);

  const getPerformanceStyles = (percentage: number): { className: string, text: string } => {
    if (percentage <= 30) return { className: 'bg-red-800 text-white', text: t('percentage_0_30') };
    if (percentage <= 40) return { className: 'bg-red-500 text-white', text: t('percentage_31_40') };
    if (percentage <= 60) return { className: 'bg-yellow-300 text-gray-800', text: t('percentage_41_60') };
    if (percentage <= 74) return { className: 'bg-yellow-500 text-white', text: t('percentage_61_74') };
    if (percentage <= 80) return { className: 'bg-sky-400 text-white', text: t('percentage_75_80') };
    if (percentage <= 89) return { className: 'bg-sky-600 text-white', text: t('percentage_81_89') };
    return { className: 'bg-green-500 text-white', text: t('percentage_90_100') };
  };
  
  const performanceStyle = getPerformanceStyles(totalPercentage);
  
    const handleDataParsed = (parsedData: Partial<SpecialReport>) => {
        const updatedFormData = { ...formData };

        for (const key of ['subject', 'grades', 'date', 'branch', 'plannedSyllabusLesson']) {
            if (parsedData[key as keyof typeof parsedData]) {
                (updatedFormData as any)[key] = parsedData[key as keyof typeof parsedData];
            }
        }
        
        if (parsedData.criteria && Array.isArray(parsedData.criteria)) {
            const newCriteria = [...updatedFormData.criteria];
            parsedData.criteria.forEach(parsedCrit => {
                if (parsedCrit.label && typeof parsedCrit.score === 'number') {
                    const index = newCriteria.findIndex(c => c.label === parsedCrit.label);
                    if (index !== -1) {
                        newCriteria[index].score = Math.max(0, Math.min(4, parsedCrit.score)) as 0|1|2|3|4;
                    }
                }
            });
            updatedFormData.criteria = newCriteria;
        }
        
        setFormData(updatedFormData);
        setShowImport(false);
    };

    const formStructureForAI = useMemo(() => ({
        evaluationType: 'special',
        templateName: formData.templateName,
        subject: '',
        grades: '',
        branch: '',
        date: 'YYYY-MM-DD',
        plannedSyllabusLesson: '',
        criteria: formData.criteria.map(c => ({ label: c.label, score: 0 })),
    }), [formData.criteria, formData.templateName]);


  return (
    <div className="p-4 md:p-6 rounded-lg shadow-md space-y-6" style={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)' }}>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary">{formData.templateName} - {teacher.name}</h2>
        <button onClick={onCancel} className="flex items-center gap-2 text-sky-600 hover:underline transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rtl:rotate-180" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
            {t('back')}
        </button>
      </div>

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
            <input type="text" name="subject" value={formData.subject} onChange={handleInputChange} className={inputClass} />
        </LabeledInputWrapper>
        <LabeledInputWrapper label={t('gradesLabel')}>
            <input type="text" name="grades" value={formData.grades} onChange={handleInputChange} className={inputClass} />
        </LabeledInputWrapper>
        <LabeledInputWrapper label={t('branchLabel')}>
            <select name="branch" value={formData.branch} onChange={handleInputChange} className={`${inputClass} appearance-none`}>
                <option value="main">{t('mainBranch')}</option>
                <option value="boys">{t('boysBranch')}</option>
                <option value="girls">{t('girlsBranch')}</option>
            </select>
        </LabeledInputWrapper>
        <LabeledInputWrapper label={t('lessonAccordingToPlan')} className="md:col-span-2 lg:col-span-2">
            <input 
                type="text" 
                name="plannedSyllabusLesson"
                value={formData.plannedSyllabusLesson || ''} 
                onChange={handleInputChange} 
                className={inputClass}
            />
        </LabeledInputWrapper>
      </div>

      <div className="border-t pt-4" style={{ borderColor: 'var(--color-card-border)' }}>
        <h3 className="text-xl font-semibold mb-4 text-primary">{t('criteria')}</h3>
        <div className="space-y-4">
          {formData.criteria.map((criterion, index) => (
            <div key={criterion.id} className="p-3 bg-opacity-50 rounded-md flex flex-col md:flex-row items-center gap-4 border-b" style={{ backgroundColor: 'rgba(128,128,128,0.05)', borderColor: 'var(--color-card-border)'}}>
              <div className="flex-grow flex items-center">
                <label className="font-medium">{criterion.label}</label>
                 <span className="text-sm text-gray-500 ms-2 rtl:me-2">({getScoreFeedback(criterion.score)})</span>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                {[1, 2, 3, 4].map(score => (
                  <button key={score} onClick={() => handleCriterionChange(index, score as 1|2|3|4)} className={`w-10 h-10 rounded-full font-bold border-2 transition-transform transform hover:scale-110 ${criterion.score === score ? getScoreColor(score) : 'bg-gray-200 border-gray-300'}`}>
                    {score}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className={`text-center p-4 rounded-lg transition-colors duration-500 ${performanceStyle.className}`}>
        <h4 className="text-lg font-bold">{t('totalPercentage')}: <span className="text-2xl">{totalPercentage.toFixed(2)}%</span></h4>
        <p className="font-semibold mt-1">{performanceStyle.text}</p>
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

export default SpecialReportForm;