
import React, { useState, useMemo, useRef, useEffect } from 'react';
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

// --- Helper Functions for Sorting/Filtering ---
const calculateOverallPercentage = (report: SyllabusCoverageReport): number => {
    // Simple average of branches percentage or qualitative assessment
    if (!report.branches || report.branches.length === 0) return 0;
    const total = report.branches.reduce((acc, b) => acc + (b.percentage || 0), 0);
    return total / report.branches.length;
};

const getReportStatus = (report: SyllabusCoverageReport): 'ahead' | 'behind' | 'on_track' => {
    if (!report.branches || report.branches.length === 0) return 'on_track';
    // Priority: Behind > Ahead > On Track
    if (report.branches.some(b => b.status === 'behind')) return 'behind';
    if (report.branches.some(b => b.status === 'ahead')) return 'ahead';
    return 'on_track';
};

// --- WhatsApp Selection Modal ---
const WhatsAppBulkModal: React.FC<{
    selectedReports: SyllabusCoverageReport[];
    allTeachers: Teacher[];
    onClose: () => void;
    t: (key: any) => string;
}> = ({ selectedReports, allTeachers, onClose, t }) => {
    const teacherMap = useMemo(() => new Map(allTeachers.map(t => [t.id, t.name])), [allTeachers]);

    const handleSendIndividual = (report: SyllabusCoverageReport) => {
        const teacherName = teacherMap.get(report.teacherId) || report.teacherId;
        exportSyllabusCoverage('whatsapp', report, teacherName, t);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-2xl">
                <h3 className="text-xl font-bold text-primary mb-4 border-b pb-2">إرسال التقارير عبر واتساب</h3>
                <p className="mb-4 text-gray-600 text-sm">تم تحديد {selectedReports.length} تقرير للإرسال. يرجى اختيار المعلم لإرسال تقريره:</p>
                
                <div className="max-h-[60vh] overflow-y-auto space-y-2">
                    {selectedReports.map((report, idx) => {
                        const teacherName = teacherMap.get(report.teacherId) || 'غير معروف';
                        return (
                            <div key={report.id} className="flex justify-between items-center p-3 border rounded hover:bg-gray-50">
                                <div>
                                    <span className="font-bold text-gray-800">{idx + 1}. {teacherName}</span>
                                    <span className="text-xs text-gray-500 block">{report.subject} - {report.grade}</span>
                                </div>
                                <button 
                                    onClick={() => handleSendIndividual(report)}
                                    className="flex items-center gap-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-bold"
                                >
                                    <span>إرسال</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.267.651 4.383 1.905 6.25l-.275 1.002 1.03 1.018zM8.718 7.243c.133-.336.434-.543.818-.576.43-.034.636.101.804.312.189.231.631 1.52.663 1.623.032.102.05.213-.016.344-.065.131-.229.213-.401.325-.202.129-.41.26-.552.404-.16.161-.318.35-.165.608.175.292.747 1.229 1.624 2.016.994.881 1.866 1.158 2.149 1.24.31.09.462.046.63-.122.19-.184.82-1.022.952-1.229.132-.206.264-.238.44-.152.195.094 1.306.685 1.518.79.212.105.356.161.404.248.048.088.028.471-.124.922-.152.452-.947.881-1.306.922-.32.034-1.127.02-1.748-.227-.753-.3-1.859-1.158-3.041-2.451-1.37-1.52-2.316-3.213-2.316-3.213s-.165-.286-.318-.553c-.152-.267-.32-.287-.462-.287-.132 0-.304.01-.462.01z"/></svg>
                                </button>
                            </div>
                        );
                    })}
                </div>
                
                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">إغلاق</button>
                </div>
            </div>
        </div>
    );
};

const ReportEditor: React.FC<{
    report: SyllabusCoverageReport;
    allReports: SyllabusCoverageReport[];
    allTeachers: Teacher[];
    onUpdate: (updatedReport: SyllabusCoverageReport) => void;
    onDelete: (reportId: string) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}> = ({ report, onUpdate, onDelete, allTeachers, allReports, isCollapsed, onToggleCollapse }) => {
    // ... [Original ReportEditor Code remains exactly the same] ...
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

    // Excel Import Logic - Enhanced to read specific layout AND capture all fields
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
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

                if (data.length > 0) {
                    const updatedReport = { ...report };
                    let branches: SyllabusBranchProgress[] = [];
                    
                    // Helper to find value by loosely matching keys in the first cell of a row
                    const findValue = (key: string) => {
                        for (let i = 0; i < data.length; i++) {
                            const row = data[i] as any[];
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
                    
                    const semester = findValue('الفصل الدراسي') || findValue('الفصل');
                    if (semester && (semester.includes('الأول') || semester.includes('1'))) updatedReport.semester = 'الأول';
                    else if (semester && (semester.includes('الثاني') || semester.includes('2'))) updatedReport.semester = 'الثاني';


                    // --- Branch Data Parsing ---
                    // Find the row where branch headers start
                    let branchHeaderRowIndex = -1;
                    for(let i=0; i<data.length; i++) {
                        const row = data[i] as any[];
                        if(row.includes('الفرع') && (row.includes('حالة السير') || row.includes('الحالة'))) {
                            branchHeaderRowIndex = i;
                            break;
                        }
                    }

                    if(branchHeaderRowIndex !== -1) {
                        // Iterate rows below header until empty row or new section
                        for(let i = branchHeaderRowIndex + 1; i < data.length; i++) {
                            const row = data[i] as any[];
                            if(!row[0]) break; // Stop at empty line
                            
                            // Expecting columns: BranchName | StatusText | LastLesson | Diff
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
                    // Using findValue with localized keys ensures robustness
                    const meetings = findValue(t('meetingsAttended')) || findValue('اللقاءات');
                    if(meetings) updatedReport.meetingsAttended = String(meetings);
                    
                    const correction = findValue(t('notebookCorrection')) || findValue('تصحيح');
                    if(correction) updatedReport.notebookCorrection = String(correction).replace('%', '').trim();
                    
                    const prep = findValue(t('preparationBook')) || findValue('التحضير');
                    if(prep) updatedReport.preparationBook = String(prep).replace('%', '').trim();
                    
                    const glos = findValue(t('questionsGlossary')) || findValue('مسرد');
                    if(glos) updatedReport.questionsGlossary = String(glos).replace('%', '').trim();

                    // --- Qualitative ---
                    const strats = findValue(t('strategiesUsed')) || findValue('الاستراتيجيات');
                    if(strats) updatedReport.strategiesImplemented = strats;
                    
                    const tools = findValue(t('toolsUsed')) || findValue('الوسائل');
                    if(tools) updatedReport.toolsUsed = tools;
                    
                    const sources = findValue(t('sourcesUsed')) || findValue('المصادر');
                    if(sources) updatedReport.sourcesUsed = sources;
                    
                    const progs = findValue(t('programsUsed')) || findValue('البرامج');
                    if(progs) updatedReport.programsImplemented = progs;
                    
                    const tasks = findValue(t('tasksDone')) || findValue('التكاليف');
                    if(tasks) updatedReport.tasksDone = tasks;
                    
                    const tests = findValue(t('testsDelivered')) || findValue('الاختبارات');
                    if(tests) updatedReport.testsDelivered = tests;
                    
                    const visits = findValue(t('peerVisitsDone')) || findValue('الزيارات');
                    if(visits) updatedReport.peerVisitsDone = visits;

                    onUpdate(updatedReport);
                    alert('تم استيراد جميع البيانات بنجاح.');
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

    const handleDataParsed = (data: any) => {
        // IMPORTANT: Extract ID to prevent overwriting the existing report's ID
        const { id, branches, ...otherData } = data;
        
        // --- 1. Resolve Teacher Name to ID ---
        let resolvedTeacherId = report.teacherId;
        // Check if AI returned a teacherId (often it returns the name here per prompt instruction)
        const incomingTeacherIdentifier = otherData.teacherId;
        
        if (incomingTeacherIdentifier) {
            // Fuzzy search for teacher name
            const nameToSearch = String(incomingTeacherIdentifier).trim();
            const found = allTeachers.find(t => t.name.includes(nameToSearch) || nameToSearch.includes(t.name));
            if (found) {
                resolvedTeacherId = found.id;
            } else if (allTeachers.find(t => t.id === incomingTeacherIdentifier)) {
                // If it happened to be a valid ID
                resolvedTeacherId = incomingTeacherIdentifier;
            }
        }

        // --- 2. Sanitize Percentages (Remove % and text) ---
        const sanitizeNumberString = (val: any) => {
            if (!val) return '';
            // Remove everything except digits
            return String(val).replace(/[^0-9]/g, '');
        };

        if (otherData.notebookCorrection) otherData.notebookCorrection = sanitizeNumberString(otherData.notebookCorrection);
        if (otherData.preparationBook) otherData.preparationBook = sanitizeNumberString(otherData.preparationBook);
        if (otherData.questionsGlossary) otherData.questionsGlossary = sanitizeNumberString(otherData.questionsGlossary);

        // --- 3. Sanitize Grade (Remove 'الصف') ---
        if (otherData.grade) {
            // Remove 'الصف' prefix if present to match dropdown values like "الأول"
            otherData.grade = String(otherData.grade).replace('الصف', '').trim();
        }

        // --- 4. Merge branches safely ---
        let updatedBranches = report.branches;
        if (branches && Array.isArray(branches) && branches.length > 0) {
            updatedBranches = branches.map((b: any) => ({
                branchName: b.branchName || '',
                status: ['ahead', 'on_track', 'behind', 'not_set'].includes(b.status) ? b.status : 'not_set',
                lastLesson: b.lastLesson || '',
                lessonDifference: b.lessonDifference || '',
                percentage: b.status === 'on_track' || b.status === 'ahead' ? 100 : 0
            }));
        }

        // Use functional state update to ensure we don't lose current state if multiple updates happen
        // But since onUpdate replaces the object in the parent array, we create a new object based on 'report'
        const newReport = { 
            ...report, // Preserve all existing fields first
            ...otherData, // Overwrite with AI data (only what's provided)
            teacherId: resolvedTeacherId, 
            branches: updatedBranches 
        };

        onUpdate(newReport);
        setShowAIImport(false);
    };

    // Improved prompt structure to guide AI better
    const formStructureForAI = {
        schoolName: report.schoolName || 'اسم المدرسة',
        academicYear: report.academicYear || 'العام الدراسي (مثل: 2024-2025)',
        semester: report.semester || 'الفصل الدراسي',
        subject: report.subject || 'المادة',
        grade: report.grade || 'الصف (مثال: الأول، الثاني...)',
        teacherId: 'اسم المعلم', // Hint changed to explicitly ask for Name
        date: 'التاريخ (YYYY-MM-DD)',
        branches: [{ branchName: 'اسم الفرع (مثل: نحو، أدب...)', status: 'ahead/behind/on_track', lastLesson: 'عنوان الدرس', lessonDifference: 'عدد الدروس' }],
        meetingsAttended: 'عدد اللقاءات',
        notebookCorrection: 'نسبة تصحيح الدفاتر (رقم فقط)',
        preparationBook: 'نسبة إعداد دفتر التحضير (رقم فقط)',
        questionsGlossary: 'نسبة مسرد الأسئلة (رقم فقط)',
        programsImplemented: 'البرامج المنفذة',
        strategiesImplemented: 'الاستراتيجيات المنفذة',
        toolsUsed: 'الوسائل المستخدمة',
        sourcesUsed: 'المصادر المستخدمة',
        tasksDone: 'التكاليف المنجزة',
        testsDelivered: 'الاختبارات المسلمة',
        peerVisitsDone: 'الزيارات التبادلية'
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

            {/* --- TOP IMPORT SECTION (Moved Here) --- */}
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 mb-6 shadow-inner">
                <div className="flex flex-wrap items-center gap-3">
                     {/* Excel Button (Offline) */}
                    <label className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 cursor-pointer transition-colors shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>تعبئة من ملف إكسل (بدون نت)</span>
                        <input type="file" accept=".xlsx" onChange={handleImportExcel} className="hidden" ref={fileInputRef} />
                    </label>

                    {/* AI Button */}
                    <button onClick={() => setShowAIImport(!showAIImport)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>ألصق نصاً أو حمل ملف (PDF, TXT)</span>
                    </button>
                </div>

                {showAIImport && (
                    <div className="mt-4 border-t border-indigo-200 pt-4">
                        <p className="text-sm text-indigo-800 mb-2 font-semibold">
                            ألصق النص أدناه أو حمل ملف (PDF, TXT, Excel) ثم اضغط "تعبئة الحقول تلقائياً":
                        </p>
                        <ImportDataSection 
                            onDataParsed={(data) => handleDataParsed(data as any)}
                            formStructure={formStructureForAI}
                            customButtonLabel="تعبئة الحقول تلقائياً"
                        />
                    </div>
                )}
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

             <div className="flex flex-wrap justify-center gap-3 pt-4 border-t">
                <button onClick={handleSave} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all transform hover:scale-105" disabled={isSaving}>
                    {isSaving ? `${t('save')}...` : t('saveWork')}
                </button>
                <button onClick={() => exportSyllabusCoverage('txt', report, teacherName, t)} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800">{t('exportTxt')}</button>
                <button onClick={() => exportSyllabusCoverage('pdf', report, teacherName, t)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('exportPdf')}</button>
                <button onClick={() => exportSyllabusCoverage('excel', report, teacherName, t)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{t('exportExcel')}</button>
                <button onClick={() => exportSyllabusCoverage('whatsapp', report, teacherName, t)} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">{t('sendToWhatsApp')}</button>
            </div>
        </div>
    );
};

const SyllabusCoverageManager: React.FC<SyllabusCoverageManagerProps> = ({
    reports,
    setReports,
    school,
    academicYear,
    semester,
    allTeachers,
}) => {
    const { t } = useLanguage();
    const { currentUser } = useAuth();
    
    // View state: 'list' (default, cards) or 'table' (new filterable view)
    const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
    
    // Filtering states
    const [filterTeacher, setFilterTeacher] = useState('all');
    const [filterSubject, setFilterSubject] = useState('all');
    const [filterGrade, setFilterGrade] = useState('all');
    const [sortKey, setSortKey] = useState<'date' | 'percentage_high' | 'percentage_low' | 'ahead' | 'behind'>('date');
    const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

    // Expansion state for list view
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Teacher Map
    const teacherMap = useMemo(() => new Map(allTeachers.map(t => [t.id, t.name])), [allTeachers]);

    useEffect(() => {
        // Expand the most recent report by default in list view if newly added
        if (viewMode === 'list' && reports.length > 0 && expandedIds.size === 0) {
             // Optional: Expand first report on load
        }
    }, [viewMode, reports.length]); 

    const handleAddReportWithExpand = () => {
        const newReport: SyllabusCoverageReport = {
            id: `scr-${Date.now()}`,
            schoolName: school,
            academicYear: academicYear,
            semester: semester,
            teacherId: '',
            subject: '',
            grade: '',
            branch: 'main',
            date: new Date().toISOString().split('T')[0],
            branches: [],
        };
        setReports(prev => [newReport, ...prev]);
        setExpandedIds(prev => new Set(prev).add(newReport.id));
        setViewMode('list'); // Switch to list view to edit the new report
    };

    const handleUpdateReport = (updated: SyllabusCoverageReport) => {
        setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
    };

    const handleDeleteReport = (id: string) => {
        if(window.confirm(t('confirmDelete'))) {
            setReports(prev => prev.filter(r => r.id !== id));
            setSelectedReportIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if(newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleSelectReport = (id: string) => {
        setSelectedReportIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleSelectAll = (filteredIds: string[]) => {
        if (selectedReportIds.size === filteredIds.length && filteredIds.length > 0) {
            setSelectedReportIds(new Set());
        } else {
            setSelectedReportIds(new Set(filteredIds));
        }
    };

    // --- Computed Filtered Reports ---
    const filteredReports = useMemo(() => {
        let result = [...reports];

        if (filterTeacher !== 'all') {
            result = result.filter(r => r.teacherId === filterTeacher);
        }
        if (filterSubject !== 'all') {
            result = result.filter(r => r.subject === filterSubject);
        }
        if (filterGrade !== 'all') {
            result = result.filter(r => r.grade === filterGrade);
        }

        return result.sort((a, b) => {
            switch (sortKey) {
                case 'date': 
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                case 'percentage_high':
                    return calculateOverallPercentage(b) - calculateOverallPercentage(a);
                case 'percentage_low':
                    return calculateOverallPercentage(a) - calculateOverallPercentage(b);
                case 'ahead': {
                    const statusA = getReportStatus(a);
                    const statusB = getReportStatus(b);
                    if (statusA === 'ahead' && statusB !== 'ahead') return -1;
                    if (statusB === 'ahead' && statusA !== 'ahead') return 1;
                    return 0;
                }
                case 'behind': {
                    const statusA = getReportStatus(a);
                    const statusB = getReportStatus(b);
                    if (statusA === 'behind' && statusB !== 'behind') return -1;
                    if (statusB === 'behind' && statusA !== 'behind') return 1;
                    return 0;
                }
                default: return 0;
            }
        });
    }, [reports, filterTeacher, filterSubject, filterGrade, sortKey]);

    // --- Bulk Export Logic ---
    const handleBulkExcelExport = () => {
        const reportsToExport = selectedReportIds.size > 0 
            ? reports.filter(r => selectedReportIds.has(r.id)) 
            : filteredReports;

        if (reportsToExport.length === 0) {
            alert('لا توجد تقارير للتصدير.');
            return;
        }

        const data = reportsToExport.map(r => {
            const status = getReportStatus(r);
            let statusText = 'مطابق';
            if (status === 'ahead') statusText = 'متقدم';
            if (status === 'behind') statusText = 'متأخر';

            // Find max branch diff
            let maxDiff = '';
            if (r.branches) {
                const diffs = r.branches.filter(b => b.lessonDifference).map(b => b.lessonDifference);
                if(diffs.length > 0) maxDiff = diffs.join(', ');
            }

            return {
                'المعلم': teacherMap.get(r.teacherId) || r.teacherId,
                'المادة': r.subject,
                'الصف': r.grade,
                'التاريخ': new Date(r.date).toLocaleDateString(),
                'حالة السير': statusText,
                'الفارق (دروس)': maxDiff,
                'اللقاءات': r.meetingsAttended || '0',
                'تصحيح الدفاتر %': r.notebookCorrection || '0',
                'دفتر التحضير %': r.preparationBook || '0',
                'مسرد الأسئلة %': r.questionsGlossary || '0',
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Syllabus Summary");
        XLSX.writeFile(wb, `syllabus_summary_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleViewReportFromTable = (id: string) => {
        // Expand the report and switch to list view
        setExpandedIds(new Set([id]));
        setViewMode('list');
        // Scroll to top? (optional)
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="space-y-6">
            {showWhatsAppModal && (
                <WhatsAppBulkModal 
                    selectedReports={reports.filter(r => selectedReportIds.has(r.id))}
                    allTeachers={allTeachers}
                    onClose={() => setShowWhatsAppModal(false)}
                    t={t}
                />
            )}

            <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-lg shadow-sm border gap-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-primary">{t('syllabusCoverageReport')}</h2>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {reports.length} تقرير
                    </span>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setViewMode(viewMode === 'list' ? 'table' : 'list')}
                        className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 ${viewMode === 'table' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        {viewMode === 'table' ? (
                            <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg> عرض القائمة</>
                        ) : (
                            <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg> عرض الجدول (فلترة)</>
                        )}
                    </button>
                    <button onClick={handleAddReportWithExpand} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                        <span>+</span> {t('addNewSyllabusReport')}
                    </button>
                </div>
            </div>
            
            {viewMode === 'table' ? (
                <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                    {/* Filters Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} className="p-2 border rounded">
                            <option value="all">كل المعلمين</option>
                            {allTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="p-2 border rounded">
                            <option value="all">كل المواد</option>
                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="p-2 border rounded">
                            <option value="all">كل الصفوف</option>
                            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <select value={sortKey} onChange={e => setSortKey(e.target.value as any)} className="p-2 border rounded">
                            <option value="date">حسب التاريخ (الأحدث)</option>
                            <option value="percentage_high">الأعلى إنجازاً</option>
                            <option value="percentage_low">الأقل إنجازاً</option>
                            <option value="ahead">المتقدمون في المنهج</option>
                            <option value="behind">المتأخرون في المنهج</option>
                        </select>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-gray-100 text-gray-700 uppercase">
                                <tr>
                                    <th className="p-3 w-10 text-center">
                                        <input 
                                            type="checkbox" 
                                            onChange={(e) => handleSelectAll(e.target.checked ? filteredReports.map(r => r.id) : [])}
                                            checked={filteredReports.length > 0 && selectedReportIds.size === filteredReports.length}
                                        />
                                    </th>
                                    <th className="p-3">{t('teacherName')}</th>
                                    <th className="p-3">{t('subject')}</th>
                                    <th className="p-3">{t('grade')}</th>
                                    <th className="p-3 text-center">{t('date')}</th>
                                    <th className="p-3 text-center">الحالة</th>
                                    <th className="p-3 text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredReports.map(report => {
                                    const status = getReportStatus(report);
                                    let statusBadge = <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">مطابق</span>;
                                    if (status === 'ahead') statusBadge = <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">متقدم</span>;
                                    if (status === 'behind') statusBadge = <span className="bg-red-100 text-red-800 px-2 py-1 rounded">متأخر</span>;

                                    return (
                                        <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-3 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedReportIds.has(report.id)}
                                                    onChange={() => handleSelectReport(report.id)}
                                                />
                                            </td>
                                            <td className="p-3 font-medium text-gray-900">{teacherMap.get(report.teacherId) || 'غير معروف'}</td>
                                            <td className="p-3">{report.subject}</td>
                                            <td className="p-3">{report.grade}</td>
                                            <td className="p-3 text-center">{new Date(report.date).toLocaleDateString()}</td>
                                            <td className="p-3 text-center">{statusBadge}</td>
                                            <td className="p-3 text-center">
                                                <button 
                                                    onClick={() => handleViewReportFromTable(report.id)}
                                                    className="text-blue-600 hover:underline font-bold"
                                                >
                                                    عرض التقرير
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredReports.length === 0 && (
                                    <tr><td colSpan={7} className="p-8 text-center text-gray-500">لا توجد تقارير تطابق البحث.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Bulk Actions Footer */}
                    <div className="mt-4 pt-4 border-t flex flex-wrap justify-between items-center gap-3">
                        <div className="text-sm text-gray-600">
                            تم تحديد <strong>{selectedReportIds.size}</strong> من <strong>{filteredReports.length}</strong>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleBulkExcelExport} 
                                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-2"
                                disabled={selectedReportIds.size === 0 && filteredReports.length === 0}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                تصدير Excel
                            </button>
                            <button 
                                onClick={() => {
                                    if (selectedReportIds.size === 0) {
                                        alert('يرجى تحديد تقرير واحد على الأقل.');
                                        return;
                                    }
                                    setShowWhatsAppModal(true);
                                }}
                                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                                إرسال واتساب
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {reports.length > 0 ? (
                        reports.map(report => (
                            <ReportEditor 
                                key={report.id} 
                                report={report} 
                                allReports={reports}
                                allTeachers={allTeachers}
                                onUpdate={handleUpdateReport} 
                                onDelete={handleDeleteReport}
                                isCollapsed={!expandedIds.has(report.id)}
                                onToggleCollapse={() => toggleExpand(report.id)}
                            />
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-8">{t('noSyllabusCoverageReports')}</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default SyllabusCoverageManager;
