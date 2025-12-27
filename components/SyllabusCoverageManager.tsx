
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SyllabusCoverageReport, SyllabusBranchProgress, Teacher } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { SUBJECTS, GRADES, SUBJECT_BRANCH_MAP } from '../constants';
import { exportSyllabusCoverage } from '../lib/exportUtils';
import CustomizableInputSection from './CustomizableInputSection';

declare const XLSX: any;

interface SyllabusCoverageManagerProps {
    reports: SyllabusCoverageReport[];
    setReports: React.Dispatch<React.SetStateAction<SyllabusCoverageReport[]>>;
    school: string;
    academicYear: string;
    semester: 'الأول' | 'الثاني';
    allTeachers: Teacher[];
}

const ReportEditor: React.FC<{
    report: SyllabusCoverageReport;
    allReports: SyllabusCoverageReport[];
    allTeachers: Teacher[];
    onUpdate: (updatedReport: SyllabusCoverageReport) => void;
    onDelete: (reportId: string) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}> = ({ report, onUpdate, onDelete, allTeachers, allReports, isCollapsed, onToggleCollapse }) => {
    const { t } = useLanguage();
    const [otherSubject, setOtherSubject] = useState(SUBJECTS.includes(report.subject) ? '' : report.subject);
    const [otherGrade, setOtherGrade] = useState(GRADES.includes(report.grade) ? '' : report.grade);
    const [isSaving, setIsSaving] = useState(false);
    
    const teacherMap = useMemo(() => new Map(allTeachers.map(t => [t.id, t.name])), [allTeachers]);

    const handleTeacherChange = (newTeacherId: string) => {
        const latestReportForTeacher = allReports
            .filter(r => r.teacherId === newTeacherId && r.id !== report.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        onUpdate({
            ...report,
            teacherId: newTeacherId,
            branch: latestReportForTeacher?.branch || report.branch,
        });
    };
    
    const handleHeaderChange = (field: keyof SyllabusCoverageReport, value: string) => {
        const updatedReport = { ...report, [field]: value };
    
        if (field === 'subject') {
            let subjectValue = value;
            if (value === 'other') {
                subjectValue = otherSubject;
            } else {
                setOtherSubject('');
            }
            updatedReport.subject = subjectValue;
    
            // Auto-populate branches based on subject if it's a new subject
            const branches = SUBJECT_BRANCH_MAP[subjectValue] || [];
            const newBranches: SyllabusBranchProgress[] = branches.map(branchName => {
                const existing = report.branches.find(b => b.branchName === branchName);
                return existing || { branchName, status: 'not_set', lastLesson: '', lessonDifference: '', percentage: 0 };
            });
            updatedReport.branches = newBranches;
        }

        if(field === 'grade' && value === 'other'){
            updatedReport.grade = otherGrade;
        }
    
        onUpdate(updatedReport as SyllabusCoverageReport);
    };
    
    const handleBranchUpdate = (branchIndex: number, field: keyof SyllabusBranchProgress, value: string) => {
        const newBranches = [...report.branches];
        const branchToUpdate = { ...newBranches[branchIndex] };

        if (field === 'status') {
            branchToUpdate.status = value as SyllabusBranchProgress['status'];
            // Reset difference if it's on track
            if (value === 'on_track') {
                branchToUpdate.lessonDifference = '';
            }
            // Update percentage based on status logic if needed, currently just tracking status
            if (value === 'on_track') branchToUpdate.percentage = 100;
            else if (value === 'ahead') branchToUpdate.percentage = 100;
            else branchToUpdate.percentage = 0;
        } else {
            (branchToUpdate as any)[field] = value;
        }

        newBranches[branchIndex] = branchToUpdate;
        onUpdate({ ...report, branches: newBranches });
    };

    const addManualBranch = () => {
        const branchName = window.prompt("اسم فرع المادة (مثال: نحو، سيرة، الخ):");
        if(branchName?.trim()){
            const newBranch: SyllabusBranchProgress = { 
                branchName: branchName.trim(), 
                status: 'not_set', 
                lastLesson: '', 
                lessonDifference: '', 
                percentage: 0 
            };
            onUpdate({ ...report, branches: [...report.branches, newBranch] });
        }
    };
    
    const handleFieldUpdate = (field: keyof SyllabusCoverageReport, value: string) => {
        onUpdate({ ...report, [field]: value });
    };

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => setIsSaving(false), 1500);
    };

    const reportTitle = t('reportTitle')
        .replace('{subject}', report.subject || `(${t('subject')})`)
        .replace('{grade}', report.grade || `(${t('grade')})`)
        .replace('{semester}', report.semester)
        .replace('{academicYear}', report.academicYear);

    const teacherName = teacherMap.get(report.teacherId) || '';

    // Percentage choices 1 to 100
    const percentageOptions = Array.from({length: 100}, (_, i) => i + 1).map(String);

    if (isCollapsed) {
        return (
            <div className="p-3 border rounded-lg bg-white shadow-sm flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors" onClick={onToggleCollapse}>
                <div className="flex items-center gap-4">
                    <span className="font-bold text-primary text-lg">{teacherName || t('teacherName')}</span>
                    <span className="text-gray-600">| {report.subject || t('subject')}</span>
                    <span className="text-gray-600">| {report.grade || t('grade')}</span>
                    <span className="text-gray-500 text-sm">| {new Date(report.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">اضغط للتوسيع</div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 border-2 border-primary-light rounded-xl space-y-6 bg-white shadow-md relative">
            <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-primary">{report.teacherId ? reportTitle : t('addNewSyllabusReport')}</h3>
                <div className="flex items-center gap-2">
                    <button onClick={onToggleCollapse} className="text-gray-400 hover:text-gray-600">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <button onClick={() => onDelete(report.id)} className="text-red-500 hover:text-red-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border">
                <div>
                    <label className="text-sm font-bold block mb-1">{t('schoolName')}</label>
                    <input type="text" value={report.schoolName} onChange={e => handleHeaderChange('schoolName', e.target.value)} className="w-full p-2 border rounded focus:ring-primary" />
                </div>
                <div>
                    <label className="text-sm font-bold block mb-1">{t('academicYear')}</label>
                    <input type="text" value={report.academicYear} onChange={e => handleHeaderChange('academicYear', e.target.value)} className="w-full p-2 border rounded focus:ring-primary" />
                </div>
                <div>
                    <label className="text-sm font-bold block mb-1">{t('semester')}</label>
                    <select value={report.semester} onChange={e => handleHeaderChange('semester', e.target.value)} className="w-full p-2 border rounded focus:ring-primary">
                        <option value="الأول">{t('semester1')}</option>
                        <option value="الثاني">{t('semester2')}</option>
                    </select>
                </div>
                <div>
                    <label className="text-sm font-bold block mb-1">{t('teacherName')}</label>
                    <select value={report.teacherId} onChange={e => handleTeacherChange(e.target.value)} className="w-full p-2 border rounded focus:ring-primary font-semibold">
                        <option value="">-- اختر --</option>
                        {allTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-sm font-bold block mb-1">{t('subject')}</label>
                    <div className="flex gap-2">
                        <select value={!SUBJECTS.includes(report.subject) ? 'other' : report.subject} onChange={e => handleHeaderChange('subject', e.target.value)} className="w-full p-2 border rounded focus:ring-primary flex-grow">
                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {!SUBJECTS.includes(report.subject) && <input type="text" value={otherSubject} onChange={e => { setOtherSubject(e.target.value); handleHeaderChange('subject', e.target.value) }} className="w-full p-2 border rounded focus:ring-primary flex-grow" />}
                    </div>
                </div>
                <div>
                    <label className="text-sm font-bold block mb-1">{t('grade')}</label>
                     <div className="flex gap-2">
                        <select value={!GRADES.includes(report.grade) ? 'other' : report.grade} onChange={e => handleHeaderChange('grade', e.target.value)} className="w-full p-2 border rounded focus:ring-primary flex-grow">
                            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        {!GRADES.includes(report.grade) && <input type="text" value={otherGrade} onChange={e => { setOtherGrade(e.target.value); handleHeaderChange('grade', e.target.value) }} className="w-full p-2 border rounded focus:ring-primary flex-grow" />}
                    </div>
                </div>
            </div>

            {/* Syllabus progress section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="text-lg font-bold text-primary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10.392C2.057 15.71 3.245 16 4.5 16h1.054c.254.162.52.305.798.432v-6.95c.57-2.25 2.1-4 4.148-4.682A.75.75 0 0111 5.5v1.233c.05.01.1.022.15.035V6.5a.5.5 0 00-.5-.5h-1a.5.5 0 00-.5.5v2.268a2.5 2.5 0 100 4.464V16.5a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1.233a5.442 5.442 0 00-.15-.035V16.5a.75.75 0 01-1.5 0v-.932c-2.048.682-3.578 2.432-4.148 4.682v.268C5.52 20.695 5.254 20.838 5 21H4.5A2.5 2.5 0 012 18.5V5.5A2.5 2.5 0 014.5 3H5c.254-.162.52-.305.798-.432V3.5a.75.75 0 011.5 0v.932C9.348 3.75 10.878 2 12.5 2a2.5 2.5 0 010 5c-1.622 0-3.152-1.75-4.148-3.432V4.804z" /></svg>
                        {t('syllabusProgress')} وآخر درس تم أخذه
                    </h4>
                    <button onClick={addManualBranch} className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full hover:bg-sky-200 text-sm font-bold border border-sky-300">+ إضافة فرع/درس</button>
                </div>
                
                <div className="space-y-3">
                    {report.branches.map((branch, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-end p-3 border rounded-lg bg-white shadow-sm border-gray-200 hover:border-primary-light transition-colors">
                            <div className="lg:col-span-3">
                                <label className="text-xs font-bold block mb-1 text-gray-500">فرع المادة</label>
                                <input type="text" value={branch.branchName} onChange={e => handleBranchUpdate(index, 'branchName', e.target.value)} placeholder="مثال: نحو" className="w-full p-2 border rounded bg-gray-50 font-bold" />
                            </div>
                            <div className="lg:col-span-4">
                                <label className="text-xs font-bold block mb-1 text-gray-500">آخر درس</label>
                                <input type="text" value={branch.lastLesson} onChange={e => handleBranchUpdate(index, 'lastLesson', e.target.value)} placeholder="اسم الدرس" className="w-full p-2 border rounded" />
                            </div>
                            <div className="lg:col-span-3">
                                <label className="text-xs font-bold block mb-1 text-gray-500">الحالة</label>
                                <select value={branch.status} onChange={e => handleBranchUpdate(index, 'status', e.target.value)} className="w-full p-2 border rounded font-semibold text-sm">
                                    <option value="not_set">-- اختر --</option>
                                    <option value="on_track">{t('statusOnTrack')}</option>
                                    <option value="ahead">{t('statusAhead')}</option>
                                    <option value="behind">{t('statusBehind')}</option>
                                </select>
                            </div>
                            <div className="lg:col-span-2 flex items-center gap-2">
                                <div className="flex-grow">
                                    <label className="text-xs font-bold block mb-1 text-gray-500">بعدد</label>
                                    <input type="text" value={branch.lessonDifference} onChange={e => handleBranchUpdate(index, 'lessonDifference', e.target.value)} placeholder="0" className="w-full p-2 border rounded text-center" />
                                </div>
                                <span className="text-sm font-bold text-gray-600 mt-5">دروس</span>
                            </div>
                        </div>
                    ))}
                    {report.branches.length === 0 && <p className="text-center text-gray-400 py-4 italic">لا توجد دروس مضافة حالياً</p>}
                </div>
            </div>

            {/* Quantitative section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div>
                    <label className="text-xs font-bold block mb-1 text-yellow-800">{t('meetingsAttended')}</label>
                    <div className="flex items-center gap-2">
                         <input type="number" value={report.meetingsAttended || ''} onChange={e => handleFieldUpdate('meetingsAttended', e.target.value)} placeholder="0" className="w-full p-2 border rounded bg-white text-center font-bold" />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1 text-yellow-800">{t('notebookCorrection')}</label>
                    <select value={report.notebookCorrection || ''} onChange={e => handleFieldUpdate('notebookCorrection', e.target.value)} className="w-full p-2 border rounded bg-white text-center font-semibold">
                        <option value="">-- اختر % --</option>
                        {percentageOptions.map(p => <option key={p} value={p}>{p}%</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1 text-yellow-800">{t('preparationBook')}</label>
                    <select value={report.preparationBook || ''} onChange={e => handleFieldUpdate('preparationBook', e.target.value)} className="w-full p-2 border rounded bg-white text-center font-semibold">
                        <option value="">-- اختر % --</option>
                        {percentageOptions.map(p => <option key={p} value={p}>{p}%</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1 text-yellow-800">{t('questionsGlossary')}</label>
                    <select value={report.questionsGlossary || ''} onChange={e => handleFieldUpdate('questionsGlossary', e.target.value)} className="w-full p-2 border rounded bg-white text-center font-semibold">
                        <option value="">-- اختر % --</option>
                        {percentageOptions.map(p => <option key={p} value={p}>{p}%</option>)}
                    </select>
                </div>
            </div>

            {/* Qualitative sections with toggle buttons */}
            <div className="space-y-6">
                <CustomizableInputSection
                    title={t('programsUsed')}
                    value={report.programsImplemented || ''}
                    onChange={v => handleFieldUpdate('programsImplemented', v)}
                    defaultItems={[]}
                    localStorageKey="customPrograms"
                    isList={true}
                />
                <CustomizableInputSection
                    title={t('strategiesUsed')}
                    value={report.strategiesImplemented || ''}
                    onChange={v => handleFieldUpdate('strategiesImplemented', v)}
                    defaultItems={['التعلم باللعب', 'العصف الذهني', 'الحوار والمناقشة', 'التعلم التعاوني']}
                    localStorageKey="customStrategies"
                    isList={true}
                />
                <CustomizableInputSection
                    title={t('toolsUsed')}
                    value={report.toolsUsed || ''}
                    onChange={v => handleFieldUpdate('toolsUsed', v)}
                    defaultItems={['السبورة', 'جهاز العرض', 'البطاقات التعليمية']}
                    localStorageKey="customTools"
                    isList={true}
                />
                <CustomizableInputSection
                    title={t('sourcesUsed')}
                    value={report.sourcesUsed || ''}
                    onChange={v => handleFieldUpdate('sourcesUsed', v)}
                    defaultItems={['الكتاب المدرسي', 'دليل المعلم', 'الانترنت']}
                    localStorageKey="customSources"
                    isList={true}
                />
                <CustomizableInputSection
                    title={t('tasksDone')}
                    value={report.tasksDone || ''}
                    onChange={v => handleFieldUpdate('tasksDone', v)}
                    defaultItems={[]}
                    localStorageKey="customTasks"
                    isList={true}
                />
                <CustomizableInputSection
                    title={t('testsDelivered')}
                    value={report.testsDelivered || ''}
                    onChange={v => handleFieldUpdate('testsDelivered', v)}
                    defaultItems={['اختبار الشهر الأول', 'اختبار الشهر الثاني']}
                    localStorageKey="customTests"
                    isList={true}
                />
                <CustomizableInputSection
                    title={t('peerVisitsDone')}
                    value={report.peerVisitsDone || ''}
                    onChange={v => handleFieldUpdate('peerVisitsDone', v)}
                    defaultItems={[]}
                    localStorageKey="customPeerVisits"
                    isList={true}
                />
            </div>

             <div className="flex flex-wrap justify-center gap-3 pt-6 border-t">
                <button onClick={handleSave} className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all transform hover:scale-105 shadow-md font-bold" disabled={isSaving}>{isSaving ? `${t('save')}...` : t('saveWork')}</button>
                <button onClick={() => exportSyllabusCoverage('txt', report, teacherName, t)} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all shadow-md">{t('exportTxt')}</button>
                <button onClick={() => exportSyllabusCoverage('pdf', report, teacherName, t)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-md">{t('exportPdf')}</button>
                <button onClick={() => exportSyllabusCoverage('excel', report, teacherName, t)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-md">{t('exportExcel')}</button>
                <button onClick={() => exportSyllabusCoverage('whatsapp', report, teacherName, t)} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md">{t('sendToWhatsApp')}</button>
            </div>
        </div>
    );
};

const SyllabusCoverageManager: React.FC<SyllabusCoverageManagerProps> = ({ reports, setReports, school, academicYear, semester, allTeachers }) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [collapsedReports, setCollapsedReports] = useState<Set<string>>(new Set());

    const handleUpdateReport = (updatedReport: SyllabusCoverageReport) => {
        setReports(prev => prev.map(r => r.id === updatedReport.id ? updatedReport : r));
    };

    const handleDeleteReport = (reportId: string) => {
        if(window.confirm(t('confirmDelete'))) {
            setReports(prev => prev.filter(r => r.id !== reportId));
        }
    };

    const handleToggleCollapse = (reportId: string) => {
        setCollapsedReports(prev => {
            const newSet = new Set(prev);
            if (newSet.has(reportId)) {
                newSet.delete(reportId);
            } else {
                newSet.add(reportId);
            }
            return newSet;
        });
    };

    const handleAddNewReport = () => {
        const newReport: SyllabusCoverageReport = {
            id: `scr-${Date.now()}`,
            schoolName: school,
            academicYear: academicYear,
            semester: semester,
            subject: '',
            grade: '',
            branches: [],
            teacherId: '',
            branch: 'main',
            date: new Date().toISOString().split('T')[0],
        };
        setReports(prev => [newReport, ...prev]);
        // Don't collapse new report initially
    };

    const teacherMap = useMemo(() => new Map(allTeachers.map(t => [t.id, t.name])), [allTeachers]);

    const filteredReports = useMemo(() => {
        if (!searchTerm) return reports;
        return reports.filter(r => {
            const name = teacherMap.get(r.teacherId)?.toLowerCase() || '';
            return name.includes(searchTerm.toLowerCase());
        });
    }, [reports, searchTerm, teacherMap]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-primary">{t('syllabusCoverageReport')}</h2>
                <button onClick={handleAddNewReport} className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition-all transform hover:scale-105 shadow-md">
                    + {t('addNewSyllabusReport')}
                </button>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <input 
                    type="text" 
                    placeholder={t('searchForTeacher')} 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-primary focus:border-primary transition"
                />
            </div>

            <div className="space-y-4">
                {filteredReports.length > 0 ? (
                    filteredReports.map(report => (
                        <ReportEditor 
                            key={report.id}
                            report={report}
                            allReports={reports}
                            allTeachers={allTeachers}
                            onUpdate={handleUpdateReport}
                            onDelete={handleDeleteReport}
                            isCollapsed={collapsedReports.has(report.id)}
                            onToggleCollapse={() => handleToggleCollapse(report.id)}
                        />
                    ))
                ) : (
                    <p className="text-center text-gray-500 py-12 bg-white rounded-lg border border-dashed border-gray-300">
                        {t('noSyllabusCoverageReports')}
                    </p>
                )}
            </div>
        </div>
    );
};

export default SyllabusCoverageManager;
