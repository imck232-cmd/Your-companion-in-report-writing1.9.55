
import React, { useState, useMemo, useRef } from 'react';
import { SyllabusCoverageReport, SyllabusBranchProgress, Teacher } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { SUBJECTS, GRADES, SUBJECT_BRANCH_MAP } from '../constants';
import { exportSyllabusCoverage } from '../lib/exportUtils';
import CustomizableInputSection from './CustomizableInputSection';
import ImportDataSection from './ImportDataSection';

// Declare XLSX for import functionality
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
    const [showAIImport, setShowAIImport] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
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
            branchToUpdate.lessonDifference = ''; 
            if (value === 'on_track') branchToUpdate.percentage = 100;
            else if (value === 'ahead') branchToUpdate.percentage = 100;
            else branchToUpdate.percentage = 0;
        } else {
            (branchToUpdate as any)[field] = value;
        }

        newBranches[branchIndex] = branchToUpdate;
        onUpdate({ ...report, branches: newBranches });
    };
    
    // Handler for new dynamic fields
    const handleFieldUpdate = (field: keyof SyllabusCoverageReport, value: string) => {
        onUpdate({ ...report, [field]: value });
    };

    // Excel Import Logic - Enhanced to read the specific export format row by row AND handle Branches
    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                // Use header:1 to get array of arrays, easier to parse the specific layout
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

                if (data.length > 0) {
                    const updatedReport = { ...report };
                    let branches: SyllabusBranchProgress[] = [];
                    
                    // Helper to find value by scanning all rows for the key in the first cell
                    const findValue = (key: string) => {
                        for (let i = 0; i < data.length; i++) {
                            const row = data[i] as any[];
                            if (row[0] && String(row[0]).trim() === key.trim()) {
                                return row[1];
                            }
                            if (row[0] && String(row[0]).includes(key)) {
                                return row[1];
                            }
                        }
                        return null;
                    };

                    // --- Header Data ---
                    const teacherName = findValue('المعلم');
                    if (teacherName) updatedReport.teacherId = allTeachers.find(t => t.name === teacherName)?.id || report.teacherId;
                    
                    const subj = findValue('المادة');
                    if(subj) updatedReport.subject = subj;
                    
                    const grd = findValue('الصف');
                    if(grd) updatedReport.grade = grd;
                    
                    const acYear = findValue('العام الدراسي');
                    if(acYear) updatedReport.academicYear = acYear;
                    
                    const school = findValue('المدرسة');
                    if(school) updatedReport.schoolName = school;

                    const reportDate = findValue('التاريخ');
                    if(reportDate) updatedReport.date = reportDate;

                    // --- Branch Data Parsing ---
                    // Find the row where branch headers start (الفرع, حالة السير, آخر درس)
                    let branchHeaderRowIndex = -1;
                    for(let i=0; i<data.length; i++) {
                        const row = data[i] as any[];
                        if(row.includes('الفرع') && row.includes('حالة السير')) {
                            branchHeaderRowIndex = i;
                            break;
                        }
                    }

                    if(branchHeaderRowIndex !== -1) {
                        // Iterate rows below header until empty row or new section
                        for(let i = branchHeaderRowIndex + 1; i < data.length; i++) {
                            const row = data[i] as any[];
                            if(!row[0]) break; // Stop at empty line
                            // Map columns based on their typical order in export: Branch, Status, LastLesson, Diff
                            // Export order: [BranchName, StatusText, LastLesson, Diff]
                            const branchName = row[0];
                            const statusText = row[1];
                            const lastLesson = row[2];
                            const diff = row[3];

                            // Map status text back to key
                            let status: SyllabusBranchProgress['status'] = 'not_set';
                            if(String(statusText).includes(t('statusAhead'))) status = 'ahead';
                            else if(String(statusText).includes(t('statusBehind'))) status = 'behind';
                            else if(String(statusText).includes(t('statusOnTrack'))) status = 'on_track';

                            branches.push({
                                branchName,
                                status,
                                lastLesson: lastLesson || '',
                                lessonDifference: diff || '',
                                percentage: status === 'on_track' ? 100 : 0
                            });
                        }
                        if(branches.length > 0) updatedReport.branches = branches;
                    }


                    // --- Stats ---
                    const meetings = findValue(t('meetingsAttended')) || findValue('اللقاءات التطويرية التي تم حضورها');
                    if(meetings) updatedReport.meetingsAttended = String(meetings);
                    
                    const correction = findValue(t('notebookCorrection')) || findValue('تصحيح الدفاتر');
                    if(correction) updatedReport.notebookCorrection = String(correction).replace('%', '').trim();
                    
                    const prep = findValue(t('preparationBook')) || findValue('دفتر التحضير');
                    if(prep) updatedReport.preparationBook = String(prep).replace('%', '').trim();
                    
                    const glos = findValue(t('questionsGlossary')) || findValue('مسرد الأسئلة نهاية دفتر التحضير');
                    if(glos) updatedReport.questionsGlossary = String(glos).replace('%', '').trim();

                    // --- Qualitative ---
                    const strats = findValue(t('strategiesUsed')) || findValue('أهم الاستراتيجيات المنفذة');
                    if(strats) updatedReport.strategiesImplemented = strats;
                    
                    const tools = findValue(t('toolsUsed')) || findValue('أهم الوسائل المستخدمة');
                    if(tools) updatedReport.toolsUsed = tools;
                    
                    const sources = findValue(t('sourcesUsed')) || findValue('أهم المصادر المستخدمة');
                    if(sources) updatedReport.sourcesUsed = sources;
                    
                    const progs = findValue(t('programsUsed')) || findValue('أهم البرامج المنفذة');
                    if(progs) updatedReport.programsImplemented = progs;
                    
                    const tasks = findValue(t('tasksDone')) || findValue('التكاليف التي تم القيام بها');
                    if(tasks) updatedReport.tasksDone = tasks;
                    
                    const tests = findValue(t('testsDelivered')) || findValue('الاختبارات التي تم تسليمها');
                    if(tests) updatedReport.testsDelivered = tests;
                    
                    const visits = findValue(t('peerVisitsDone')) || findValue('الزيارات التبادلية التي تمت');
                    if(visits) updatedReport.peerVisitsDone = visits;

                    onUpdate(updatedReport);
                    alert('تم استيراد البيانات من ملف الإكسل بنجاح.');
                }
            } catch (error) {
                console.error("Import error:", error);
                alert('حدث خطأ أثناء قراءة ملف الإكسل.');
            }
        };
        reader.readAsBinaryString(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => setIsSaving(false), 1500);
    };

    const handleDataParsed = (data: Partial<SyllabusCoverageReport>) => {
        onUpdate({ ...report, ...data });
        setShowAIImport(false);
    };

    // Prepare full structure for AI import including branches
    const formStructureForAI = {
        ...report,
        branches: [{ branchName: 'اسم الفرع', status: 'ahead/behind/on_track', lastLesson: 'عنوان الدرس', lessonDifference: 'عدد الدروس' }],
        meetingsAttended: '',
        notebookCorrection: '',
        preparationBook: '',
        questionsGlossary: '',
        programsImplemented: '',
        strategiesImplemented: '',
        toolsUsed: '',
        sourcesUsed: '',
        tasksDone: '',
        testsDelivered: '',
        peerVisitsDone: ''
    };

    const reportTitle = t('reportTitle')
        .replace('{subject}', report.subject || `(${t('subject')})`)
        .replace('{grade}', report.grade || `(${t('grade')})`)
        .replace('{semester}', report.semester)
        .replace('{academicYear}', report.academicYear);

    const teacherName = teacherMap.get(report.teacherId) || '';
    const isOtherSubject = !SUBJECTS.includes(report.subject) || report.subject === 'أخرى';
    const isOtherGrade = !GRADES.includes(report.grade) || report.grade === 'أخرى';
    const percentageOptions = Array.from({length: 20}, (_, i) => (i + 1) * 5).map(String);

    // Collapsed View
    if (isCollapsed) {
        return (
            <div className="p-3 border rounded-lg bg-white shadow-sm flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors" onClick={onToggleCollapse}>
                <div className="flex items-center gap-4">
                    <span className="font-bold text-primary text-lg">{teacherName || t('teacherName')}</span>
                    <span className="text-gray-600">| {report.subject || t('subject')}</span>
                    <span className="text-gray-600">| {report.grade || t('grade')}</span>
                    <span className="text-gray-500 text-sm">| {new Date(report.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">اضغط للتوسيع</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>
        );
    }

    // Expanded View
    return (
        <div className="p-4 border-2 border-primary-light rounded-xl space-y-4 bg-white shadow-sm relative">
            <div className="flex justify-between items-start cursor-pointer" onClick={onToggleCollapse}>
                <h3 className="text-lg font-semibold text-primary">{report.teacherId ? reportTitle : t('addNewSyllabusReport')}</h3>
                <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }} className="text-gray-500 hover:text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-180" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(report.id); }} className="text-red-500 hover:text-red-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>
            
            {/* Header Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg border">
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t('schoolName')}</label>
                    <input type="text" value={report.schoolName} onChange={e => handleHeaderChange('schoolName', e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t('academicYear')}</label>
                    <input type="text" value={report.academicYear} onChange={e => handleHeaderChange('academicYear', e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t('semester')}</label>
                    <div className="flex gap-2">
                        <select value={report.semester} onChange={e => handleHeaderChange('semester', e.target.value)} className="w-full p-2 border rounded">
                            <option value="الأول">{t('semester1')}</option>
                            <option value="الثاني">{t('semester2')}</option>
                        </select>
                        <input type="date" value={report.date} onChange={e => handleHeaderChange('date', e.target.value)} className="w-full p-2 border rounded" title={t('dateLabel')} />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t('teacherName')}</label>
                    <select value={report.teacherId} onChange={e => handleTeacherChange(e.target.value)} className="w-full p-2 border rounded">
                        <option value="">-- اختر --</option>
                        {allTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t('subject')}</label>
                    <div className="flex gap-1">
                        <select value={isOtherSubject ? 'other' : report.subject} onChange={e => handleHeaderChange('subject', e.target.value)} className="w-full p-2 border rounded">
                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {isOtherSubject && <input type="text" value={otherSubject} onChange={e => { setOtherSubject(e.target.value); handleHeaderChange('subject', e.target.value) }} className="w-full p-2 border rounded" />}
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t('grade')}</label>
                    <div className="flex gap-1">
                        <select value={isOtherGrade ? 'other' : report.grade} onChange={e => handleHeaderChange('grade', e.target.value)} className="w-full p-2 border rounded">
                            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        {isOtherGrade && <input type="text" value={otherGrade} onChange={e => { setOtherGrade(e.target.value); handleHeaderChange('grade', e.target.value) }} className="w-full p-2 border rounded" />}
                    </div>
                </div>
            </div>

            {/* Syllabus Progress Table */}
            {report.branches.length > 0 && (
                <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full border-collapse">
                        <thead className="bg-blue-100">
                            <tr>
                                <th className="p-2 border text-sm w-1/6">{t('branch')}</th>
                                <th className="p-2 border text-sm w-2/5">{t('lastLesson')}</th>
                                <th className="p-2 border text-sm w-1/3">{t('status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.branches.map((b, i) => (
                                <tr key={i}>
                                    <td className="p-2 border font-bold text-sm bg-gray-50">{b.branchName}</td>
                                    <td className="p-2 border">
                                        <input 
                                            type="text" 
                                            value={b.lastLesson} 
                                            onChange={e => handleBranchUpdate(i, 'lastLesson', e.target.value)} 
                                            className="w-full p-1 border rounded"
                                            style={{ minWidth: '200px' }}
                                        />
                                    </td>
                                    <td className="p-2 border">
                                        <div className="flex gap-2">
                                            <select value={b.status} onChange={e => handleBranchUpdate(i, 'status', e.target.value)} className="p-1 border rounded text-sm flex-grow">
                                                <option value="not_set">--</option>
                                                <option value="on_track">{t('statusOnTrack')}</option>
                                                <option value="ahead">{t('statusAhead')}</option>
                                                <option value="behind">{t('statusBehind')}</option>
                                            </select>
                                            {(b.status === 'ahead' || b.status === 'behind') && (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs">بعدد</span>
                                                    <input 
                                                        type="number" 
                                                        value={b.lessonDifference} 
                                                        onChange={e => handleBranchUpdate(i, 'lessonDifference', e.target.value)} 
                                                        className="w-12 p-1 border rounded text-center" 
                                                    />
                                                    <span className="text-xs">دروس</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Quantitative Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div>
                    <label className="text-xs font-bold block mb-1">{t('meetingsAttended')}</label>
                    <input type="number" value={report.meetingsAttended || ''} onChange={e => handleFieldUpdate('meetingsAttended', e.target.value)} className="w-full p-2 border rounded bg-white" />
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1">{t('notebookCorrection')}</label>
                    <select value={report.notebookCorrection || ''} onChange={e => handleFieldUpdate('notebookCorrection', e.target.value)} className="w-full p-2 border rounded bg-white">
                        <option value="">-- % --</option>
                        {percentageOptions.map(p => <option key={p} value={p}>{p}%</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1">{t('preparationBook')}</label>
                    <select value={report.preparationBook || ''} onChange={e => handleFieldUpdate('preparationBook', e.target.value)} className="w-full p-2 border rounded bg-white">
                        <option value="">-- % --</option>
                        {percentageOptions.map(p => <option key={p} value={p}>{p}%</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1">{t('questionsGlossary')}</label>
                    <select value={report.questionsGlossary || ''} onChange={e => handleFieldUpdate('questionsGlossary', e.target.value)} className="w-full p-2 border rounded bg-white">
                        <option value="">-- % --</option>
                        {percentageOptions.map(p => <option key={p} value={p}>{p}%</option>)}
                    </select>
                </div>
            </div>

            {/* Qualitative Fields */}
            <div className="space-y-4">
                <CustomizableInputSection title={t('programsUsed')} value={report.programsImplemented || ''} onChange={v => handleFieldUpdate('programsImplemented', v)} defaultItems={[]} localStorageKey="customPrograms" isList={true} />
                <CustomizableInputSection title={t('strategiesUsed')} value={report.strategiesImplemented || ''} onChange={v => handleFieldUpdate('strategiesImplemented', v)} defaultItems={['التعلم التعاوني', 'العصف الذهني', 'الحوار والمناقشة']} localStorageKey="customStrategies" isList={true} />
                <CustomizableInputSection title={t('toolsUsed')} value={report.toolsUsed || ''} onChange={v => handleFieldUpdate('toolsUsed', v)} defaultItems={['السبورة', 'جهاز العرض', 'نماذج ومجسمات']} localStorageKey="customTools" isList={true} />
                <CustomizableInputSection title={t('sourcesUsed')} value={report.sourcesUsed || ''} onChange={v => handleFieldUpdate('sourcesUsed', v)} defaultItems={['الكتاب المدرسي', 'دليل المعلم', 'الانترنت']} localStorageKey="customSources" isList={true} />
                <CustomizableInputSection title={t('tasksDone')} value={report.tasksDone || ''} onChange={v => handleFieldUpdate('tasksDone', v)} defaultItems={[]} localStorageKey="customTasks" isList={true} />
                <CustomizableInputSection title={t('testsDelivered')} value={report.testsDelivered || ''} onChange={v => handleFieldUpdate('testsDelivered', v)} defaultItems={['اختبار الشهر الأول', 'اختبار الشهر الثاني', 'اختبار تجريبي']} localStorageKey="customTests" isList={true} />
                <CustomizableInputSection title={t('peerVisitsDone')} value={report.peerVisitsDone || ''} onChange={v => handleFieldUpdate('peerVisitsDone', v)} defaultItems={[]} localStorageKey="customPeerVisits" isList={true} />
            </div>

             <div className="border-t pt-4">
                <button onClick={() => setShowAIImport(!showAIImport)} className="w-full px-6 py-2 bg-indigo-100 text-indigo-700 font-bold rounded-lg hover:bg-indigo-200 transition-colors mb-2">
                    {t('pasteOrUpload')} (استيراد ذكي للنص)
                </button>
                {showAIImport && (
                    <ImportDataSection 
                        onDataParsed={(data) => handleDataParsed(data as any)}
                        formStructure={formStructureForAI}
                    />
                )}
            </div>

             <div className="flex flex-wrap justify-center gap-3 pt-4 border-t">
                <button onClick={handleSave} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all transform hover:scale-105" disabled={isSaving}>
                    {isSaving ? `${t('save')}...` : t('saveWork')}
                </button>
                <button onClick={() => exportSyllabusCoverage('txt', report, teacherName, t)} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800">{t('exportTxt')}</button>
                <button onClick={() => exportSyllabusCoverage('pdf', report, teacherName, t)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('exportPdf')}</button>
                
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => exportSyllabusCoverage('excel', report, teacherName, t)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{t('exportExcel')}</button>
                    <label className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 cursor-pointer">
                        {t('fillFromExcel')}
                        <input 
                            type="file" 
                            accept=".xlsx" 
                            onChange={handleImportExcel} 
                            className="hidden" 
                            ref={fileInputRef}
                        />
                    </label>
                </div>

                <button onClick={() => exportSyllabusCoverage('whatsapp', report, teacherName, t)} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">{t('sendToWhatsApp')}</button>
            </div>
        </div>
    );
};


const SyllabusCoverageManager: React.FC<SyllabusCoverageManagerProps> = (props) => {
    const { reports, setReports, school, academicYear, semester, allTeachers } = props;
    const { t } = useLanguage();
    const { currentUser } = useAuth();
    const [collapsedReports, setCollapsedReports] = useState<Set<string>>(new Set());
    const [showFilterTable, setShowFilterTable] = useState(false);
    
    // Filter State
    const [filterName, setFilterName] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterGrade, setFilterGrade] = useState('');
    const [selectedForView, setSelectedForView] = useState<Set<string>>(new Set());

    const handleAddReport = () => {
        const latestReport = [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        const prefilledSubject = latestReport?.subject || '';
        const initialBranches = (SUBJECT_BRANCH_MAP[prefilledSubject] || []).map(branchName => ({
            branchName,
            status: 'not_set' as const,
            lastLesson: '',
            lessonDifference: '',
            percentage: 0
        }));

        const newReport: SyllabusCoverageReport = {
            id: `scr-${Date.now()}`,
            schoolName: school,
            academicYear: academicYear,
            teacherId: latestReport?.teacherId || '',
            branch: latestReport?.branch || 'main',
            date: new Date().toISOString().split('T')[0],
            semester: latestReport?.semester || semester,
            subject: prefilledSubject,
            grade: '', // Leave grade empty
            branches: initialBranches, // Populate branches based on subject, but leave them empty
            authorId: currentUser?.id,
        };
        setReports(prev => [newReport, ...prev]);
        // Do not collapse new report immediately
    };

    const handleUpdateReport = (updatedReport: SyllabusCoverageReport) => {
        setReports(prev => prev.map(r => r.id === updatedReport.id ? updatedReport : r));
    };

    const handleDeleteReport = (reportId: string) => {
        if (window.confirm(t('confirmDelete'))) {
            setReports(prev => prev.filter(r => r.id !== reportId));
        }
    };

    const toggleCollapse = (reportId: string) => {
        setCollapsedReports(prev => {
            const newSet = new Set(prev);
            if (newSet.has(reportId)) newSet.delete(reportId);
            else newSet.add(reportId);
            return newSet;
        });
    };

    const teacherMap = useMemo(() => new Map(allTeachers.map(t => [t.id, t.name])), [allTeachers]);

    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            const name = teacherMap.get(r.teacherId) || '';
            return name.includes(filterName) && 
                   r.subject.includes(filterSubject) && 
                   r.grade.includes(filterGrade);
        });
    }, [reports, filterName, filterSubject, filterGrade, teacherMap]);

    const handleToggleSelectView = (id: string) => {
        setSelectedForView(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    }

    const openSelectedReports = () => {
        setCollapsedReports(prev => {
            const newSet = new Set(prev);
            // Un-collapse selected
            selectedForView.forEach(id => newSet.delete(id));
            return newSet;
        });
        setShowFilterTable(false);
    };

    const FilterModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-lg">فلترة وعرض التقارير</h3>
                    <button onClick={() => setShowFilterTable(false)} className="text-red-500 font-bold">X</button>
                </div>
                <div className="p-4 bg-gray-50 grid grid-cols-3 gap-3">
                    <input placeholder="اسم المعلم" value={filterName} onChange={e => setFilterName(e.target.value)} className="p-2 border rounded" />
                    <input placeholder="المادة" value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="p-2 border rounded" />
                    <input placeholder="الصف" value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="p-2 border rounded" />
                </div>
                <div className="flex-grow overflow-auto p-4">
                    <table className="w-full border-collapse">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="p-2 border">تحديد</th>
                                <th className="p-2 border">المعلم</th>
                                <th className="p-2 border">المادة</th>
                                <th className="p-2 border">الصف</th>
                                <th className="p-2 border">التاريخ</th>
                                <th className="p-2 border">الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReports.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50">
                                    <td className="p-2 border text-center">
                                        <input type="checkbox" checked={selectedForView.has(r.id)} onChange={() => handleToggleSelectView(r.id)} />
                                    </td>
                                    <td className="p-2 border">{teacherMap.get(r.teacherId)}</td>
                                    <td className="p-2 border">{r.subject}</td>
                                    <td className="p-2 border">{r.grade}</td>
                                    <td className="p-2 border">{new Date(r.date).toLocaleDateString()}</td>
                                    <td className="p-2 border">
                                        {r.branches.some(b => b.status === 'behind') ? <span className="text-red-500">متأخر</span> : 
                                         r.branches.some(b => b.status === 'ahead') ? <span className="text-blue-500">متقدم</span> : 
                                         <span className="text-green-500">مطابق</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t flex justify-end gap-3">
                    <button onClick={openSelectedReports} className="px-4 py-2 bg-primary text-white rounded hover:bg-opacity-90">عرض المحدد ({selectedForView.size})</button>
                    <button onClick={() => setShowFilterTable(false)} className="px-4 py-2 bg-gray-500 text-white rounded">إغلاق</button>
                </div>
            </div>
        </div>
    );
    
    return (
        <div className="p-6 bg-gray-50 rounded-lg shadow-lg space-y-6">
            {showFilterTable && <FilterModal />}
            <div className="flex justify-between items-center flex-wrap gap-4">
                 <h2 className="text-2xl font-bold text-center text-primary">{t('syllabusCoverageReport')}</h2>
                 <div className="flex gap-2">
                    <button onClick={() => setShowFilterTable(true)} className="px-4 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors">
                        🔍 فلترة وعرض
                    </button>
                    <button onClick={handleAddReport} className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors">+ {t('addNewSyllabusReport')}</button>
                 </div>
            </div>
           
            <div className="space-y-6">
                {reports.length > 0 ? (
                    reports.map(report => (
                        <ReportEditor 
                            key={report.id}
                            report={report}
                            onUpdate={handleUpdateReport}
                            onDelete={handleDeleteReport}
                            allTeachers={allTeachers}
                            allReports={reports}
                            isCollapsed={collapsedReports.has(report.id)}
                            onToggleCollapse={() => toggleCollapse(report.id)}
                        />
                    ))
                ) : (
                    <p className="text-center text-gray-500 py-8">{t('noSyllabusCoverageReports')}</p>
                )}
            </div>
        </div>
    );
};

export default SyllabusCoverageManager;
