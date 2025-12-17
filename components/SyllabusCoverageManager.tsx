
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

// --- Helper Functions ---
const calculateOverallPercentage = (report: SyllabusCoverageReport): number => {
    if (!report.branches || report.branches.length === 0) return 0;
    const total = report.branches.reduce((acc, b) => acc + (b.percentage || 0), 0);
    return total / report.branches.length;
};

const getReportStatus = (report: SyllabusCoverageReport): 'ahead' | 'behind' | 'on_track' => {
    if (!report.branches || report.branches.length === 0) return 'on_track';
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

    const handleSendCombined = () => {
        let content = `*📊 ملخص السير في المنهج (مجمع)*\n`;
        content += `*📅 التاريخ:* ${new Date().toLocaleDateString()}\n`;
        content += `*عدد التقارير:* ${selectedReports.length}\n\n`;
        content += `━━━━━━━━━━━━━━━━\n`;

        selectedReports.forEach((report, idx) => {
            const teacherName = teacherMap.get(report.teacherId) || 'غير معروف';
            const status = getReportStatus(report);
            let statusText = 'مطابق';
            let icon = '🟢';
            if (status === 'ahead') { statusText = 'متقدم'; icon = '🔵'; }
            if (status === 'behind') { statusText = 'متأخر'; icon = '🔴'; }

            const percentage = calculateOverallPercentage(report).toFixed(0);

            content += `*${idx + 1}. ${teacherName}* | ${report.subject}\n`;
            content += `   الصف: ${report.grade}\n`;
            content += `   ${icon} الحالة: ${statusText} (${percentage}%)\n`;
            
            if (report.branches && report.branches.length > 0) {
                const diffs = report.branches.filter(b => b.lessonDifference).map(b => `${b.branchName}: ${b.lessonDifference} درس`).join('، ');
                if (diffs) content += `   ⚠️ الفارق: ${diffs}\n`;
                const lastLessons = report.branches.map(b => `${b.branchName}: ${b.lastLesson}`).join(' | ');
                content += `   📝 واصل لـ: ${lastLessons}\n`;
            }
            content += `────────────────\n`;
        });

        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <h3 className="text-xl font-bold text-primary mb-4 border-b pb-2">إرسال التقارير عبر واتساب</h3>
                
                <div className="bg-blue-50 p-4 rounded-lg mb-4 flex flex-col gap-2">
                    <p className="text-sm text-blue-800 font-semibold">
                        تم تحديد {selectedReports.length} تقرير للإرسال.
                    </p>
                    <button 
                        onClick={handleSendCombined}
                        className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-md flex items-center justify-center gap-2 transition-transform transform hover:scale-[1.02]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.267.651 4.383 1.905 6.25l-.275 1.002 1.03 1.018z"/></svg>
                        إرسال ملخص مجمع للجميع ({selectedReports.length})
                    </button>
                </div>

                <p className="mb-2 text-gray-600 text-sm font-semibold">أو إرسال تقارير فردية:</p>
                <div className="flex-grow overflow-y-auto space-y-2 border rounded p-2 bg-gray-50">
                    {selectedReports.map((report, idx) => {
                        const teacherName = teacherMap.get(report.teacherId) || 'غير معروف';
                        return (
                            <div key={report.id} className="flex justify-between items-center p-3 border rounded bg-white hover:bg-gray-50">
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
                
                <div className="mt-4 pt-2 border-t flex justify-end">
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

    // Excel Import Logic
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
                    
                    // Simple logic to find keys and set values (mapping might need adjustment based on user excel structure)
                    const findValue = (key: string) => {
                        for (let i = 0; i < data.length; i++) {
                            const row = data[i] as any[];
                            if (row[0] && String(row[0]).includes(key)) {
                                return row[1];
                            }
                        }
                        return null;
                    };

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

                    // Try to find branches in the rows
                    let branchHeaderRowIndex = -1;
                    for(let i=0; i<data.length; i++) {
                        const row = data[i] as any[];
                        if(row.includes('الفرع') && (row.includes('حالة السير') || row.includes('الحالة'))) {
                            branchHeaderRowIndex = i;
                            break;
                        }
                    }

                    if(branchHeaderRowIndex !== -1) {
                        for(let i = branchHeaderRowIndex + 1; i < data.length; i++) {
                            const row = data[i] as any[];
                            if(!row[0]) break; 
                            
                            const branchName = row[0];
                            const statusText = row[1];
                            const lastLesson = row[2];
                            const diff = row[3];

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

                    // Qualitative fields
                    const meetings = findValue(t('meetingsAttended')) || findValue('اللقاءات');
                    if(meetings) updatedReport.meetingsAttended = String(meetings);
                    
                    const correction = findValue(t('notebookCorrection')) || findValue('تصحيح');
                    if(correction) updatedReport.notebookCorrection = String(correction).replace('%', '').trim();
                    
                    const prep = findValue(t('preparationBook')) || findValue('التحضير');
                    if(prep) updatedReport.preparationBook = String(prep).replace('%', '').trim();
                    
                    const glos = findValue(t('questionsGlossary')) || findValue('مسرد');
                    if(glos) updatedReport.questionsGlossary = String(glos).replace('%', '').trim();

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
                alert('حدث خطأ أثناء قراءة ملف الإكسل. تأكد من صحة الملف.');
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
        // AI fill logic - Improved to handle the new fields
        const { id, teacherId, branches, ...otherData } = data;
        let resolvedTeacherId = report.teacherId;
        
        if (!report.teacherId && teacherId) {
            const found = allTeachers.find(t => t.name.includes(String(teacherId).trim()) || String(teacherId).includes(t.name));
            if (found) resolvedTeacherId = found.id;
        }

        const newReport: SyllabusCoverageReport = { 
            ...report, ...otherData, id: report.id, teacherId: resolvedTeacherId, 
            branches: branches && Array.isArray(branches) ? branches.map((b: any) => ({
                ...b,
                percentage: b.status === 'on_track' || b.status === 'ahead' ? 100 : 0
            })) : report.branches 
        };
        onUpdate(newReport);
        setShowAIImport(false);
    };

    const formStructureForAI = {
        schoolName: "extract from: *🏫 المدرسة:*",
        academicYear: "extract from: *🎓 العام الدراسي:*",
        semester: "extract from: *الفصل:*",
        subject: "extract from: *📖 المادة:*",
        grade: "extract from: *الصف:*",
        teacherId: "extract from: *👨‍🏫 المعلم:*",
        date: "extract from: *📅 التاريخ:*",
        branches: [{ 
            branchName: "from *📌 فرع:*", 
            status: "from *الحالة:* (map 'مطابق' to 'on_track', 'متقدم' to 'ahead', 'متأخر' to 'behind')", 
            lastLesson: "from *✍️ آخر درس:*"
        }],
        meetingsAttended: "count",
        notebookCorrection: "from *تصحيح الدفاتر:*",
        preparationBook: "from *دفتر التحضير:*",
        questionsGlossary: "from *مسرد الأسئلة:*",
        programsImplemented: "list under *💻 البرامج المنفذة:*",
        strategiesImplemented: "list under *💡 الاستراتيجيات المستخدمة:*",
        toolsUsed: "list under *🛠️ الوسائل المستخدمة:*",
        sourcesUsed: "list under *📚 المصادر المستخدمة:*",
        tasksDone: "list under *✅ التكاليف:*",
        testsDelivered: "list under *📄 الاختبارات:*",
        peerVisitsDone: "list under *🤝 الزيارات التبادلية:*"
    };

    const reportTitle = t('reportTitle')
        .replace('{subject}', report.subject || `(${t('subject')})`)
        .replace('{grade}', report.grade || `(${t('grade')})`)
        .replace('{semester}', report.semester)
        .replace('{academicYear}', report.academicYear);

    const teacherName = teacherMap.get(report.teacherId) || '';
    const percentageOptions = Array.from({length: 20}, (_, i) => (i + 1) * 5).map(String);

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
        <div className="p-4 border-2 border-primary-light rounded-xl space-y-4 bg-white shadow-sm relative">
            <div className="flex justify-between items-start cursor-pointer" onClick={onToggleCollapse}>
                <h3 className="text-lg font-semibold text-primary">{report.teacherId ? reportTitle : t('addNewSyllabusReport')}</h3>
                <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onDelete(report.id); }} className="text-red-500 hover:text-red-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 mb-6 shadow-inner">
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => setShowAIImport(!showAIImport)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <span>تعبئة ذكية (AI)</span>
                    </button>
                    
                    {/* Excel Import Button */}
                    <div className="relative">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImportExcel} 
                            accept=".xlsx, .xls" 
                            className="hidden" 
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()} 
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m-6-9l3-3m0 0l3 3m-3-3v12" /></svg>
                            <span>تعبئة من إكسل</span>
                        </button>
                    </div>
                </div>
                {showAIImport && (
                    <div className="mt-4 border-t border-indigo-200 pt-4">
                        <ImportDataSection onDataParsed={(data) => handleDataParsed(data as any)} formStructure={formStructureForAI} customButtonLabel="تعبئة الحقول" />
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg border">
                <div><label className="text-xs font-bold block">{t('schoolName')}</label><input type="text" value={report.schoolName} onChange={e => handleHeaderChange('schoolName', e.target.value)} className="w-full p-2 border rounded" /></div>
                <div><label className="text-xs font-bold block">{t('academicYear')}</label><input type="text" value={report.academicYear} onChange={e => handleHeaderChange('academicYear', e.target.value)} className="w-full p-2 border rounded" /></div>
                <div>
                    <label className="text-xs font-bold block">{t('semester')}</label>
                    <select value={report.semester} onChange={e => handleHeaderChange('semester', e.target.value)} className="w-full p-2 border rounded">
                        <option value="الأول">{t('semester1')}</option><option value="الثاني">{t('semester2')}</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold block">{t('teacherName')}</label>
                    <select value={report.teacherId} onChange={e => handleTeacherChange(e.target.value)} className="w-full p-2 border rounded">
                        <option value="">-- اختر --</option>
                        {allTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold block">{t('subject')}</label>
                    <div className="flex gap-1">
                        <select value={!SUBJECTS.includes(report.subject) ? 'other' : report.subject} onChange={e => handleHeaderChange('subject', e.target.value)} className="w-full p-2 border rounded">{SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}</select>
                        {!SUBJECTS.includes(report.subject) && <input type="text" value={otherSubject} onChange={e => { setOtherSubject(e.target.value); handleHeaderChange('subject', e.target.value) }} className="w-full p-2 border rounded" />}
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold block">{t('grade')}</label>
                    <div className="flex gap-1">
                        <select value={!GRADES.includes(report.grade) ? 'other' : report.grade} onChange={e => handleHeaderChange('grade', e.target.value)} className="w-full p-2 border rounded">{GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select>
                        {!GRADES.includes(report.grade) && <input type="text" value={otherGrade} onChange={e => { setOtherGrade(e.target.value); handleHeaderChange('grade', e.target.value) }} className="w-full p-2 border rounded" />}
                    </div>
                </div>
            </div>

            {/* الجدول يدعم التمرير اليدوي على الجوال */}
            <div className="overflow-x-auto border rounded-lg bg-white">
                <div className="min-w-[600px]"> 
                    <div className="bg-blue-100 p-2 flex font-bold text-sm">
                        <div className="w-1/4 p-1 border-l border-blue-200">{t('branch')}</div>
                        <div className="w-1/3 p-1 border-l border-blue-200">{t('lastLesson')}</div>
                        <div className="flex-grow p-1">{t('status')}</div>
                    </div>
                    {report.branches.length > 0 ? report.branches.map((b, i) => (
                        <div key={i} className="flex border-t items-center bg-gray-50 hover:bg-white transition-colors">
                            <div className="w-1/4 p-2 border-l font-bold text-sm bg-gray-100">{b.branchName}</div>
                            <div className="w-1/3 p-2 border-l">
                                <input type="text" value={b.lastLesson} onChange={e => handleBranchUpdate(i, 'lastLesson', e.target.value)} className="w-full p-1 border rounded" />
                            </div>
                            <div className="flex-grow p-2">
                                <div className="flex gap-2 items-center flex-wrap">
                                    <select value={b.status} onChange={e => handleBranchUpdate(i, 'status', e.target.value)} className="p-1 border rounded text-sm flex-grow min-w-[140px]">
                                        <option value="not_set">-- اختر --</option><option value="on_track">{t('statusOnTrack')}</option><option value="ahead">{t('statusAhead')}</option><option value="behind">{t('statusBehind')}</option>
                                    </select>
                                    {(b.status === 'ahead' || b.status === 'behind') && (
                                        <div className="flex items-center gap-1 bg-white border rounded p-1"><span className="text-xs whitespace-nowrap">بعدد</span><input type="number" value={b.lessonDifference} onChange={e => handleBranchUpdate(i, 'lessonDifference', e.target.value)} className="w-12 p-1 border rounded text-center text-sm" /><span className="text-xs whitespace-nowrap">دروس</span></div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )) : <div className="p-4 text-center text-gray-500">لا توجد فروع محددة لهذه المادة</div>}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div><label className="text-xs font-bold block mb-1">{t('meetingsAttended')}</label><input type="number" value={report.meetingsAttended || ''} onChange={e => handleFieldUpdate('meetingsAttended', e.target.value)} className="w-full p-2 border rounded bg-white text-center font-bold" /></div>
                <div><label className="text-xs font-bold block mb-1">{t('notebookCorrection')}</label><select value={report.notebookCorrection || ''} onChange={e => handleFieldUpdate('notebookCorrection', e.target.value)} className="w-full p-2 border rounded bg-white text-center"><option value="">-- % --</option>{percentageOptions.map(p => <option key={p} value={p}>{p}%</option>)}</select></div>
                <div><label className="text-xs font-bold block mb-1">{t('preparationBook')}</label><select value={report.preparationBook || ''} onChange={e => handleFieldUpdate('preparationBook', e.target.value)} className="w-full p-2 border rounded bg-white text-center"><option value="">-- % --</option>{percentageOptions.map(p => <option key={p} value={p}>{p}%</option>)}</select></div>
                <div><label className="text-xs font-bold block mb-1">{t('questionsGlossary')}</label><select value={report.questionsGlossary || ''} onChange={e => handleFieldUpdate('questionsGlossary', e.target.value)} className="w-full p-2 border rounded bg-white text-center"><option value="">-- % --</option>{percentageOptions.map(p => <option key={p} value={p}>{p}%</option>)}</select></div>
            </div>

            <div className="space-y-4">
                <CustomizableInputSection title={t('programsUsed')} value={report.programsImplemented || ''} onChange={v => handleFieldUpdate('programsImplemented', v)} defaultItems={[]} localStorageKey="customPrograms" isList={true} />
                <CustomizableInputSection title={t('strategiesUsed')} value={report.strategiesImplemented || ''} onChange={v => handleFieldUpdate('strategiesImplemented', v)} defaultItems={['التعلم التعاوني', 'العصف الذهني', 'الحوار والمناقشة']} localStorageKey="customStrategies" isList={true} />
                <CustomizableInputSection title={t('toolsUsed')} value={report.toolsUsed || ''} onChange={v => handleFieldUpdate('toolsUsed', v)} defaultItems={['السبورة', 'جهاز العرض', 'نماذج ومجسمات']} localStorageKey="customTools" isList={true} />
                <CustomizableInputSection title={t('sourcesUsed')} value={report.sourcesUsed || ''} onChange={v => handleFieldUpdate('sourcesUsed', v)} defaultItems={['الكتاب المدرسي', 'دليل المعلم', 'الانترنت']} localStorageKey="customSources" isList={true} />
                <CustomizableInputSection title={t('tasksDone')} value={report.tasksDone || ''} onChange={v => handleFieldUpdate('tasksDone', v)} defaultItems={[]} localStorageKey="customTasks" isList={true} />
                <CustomizableInputSection title={t('testsDelivered')} value={report.testsDelivered || ''} onChange={v => handleFieldUpdate('testsDelivered', v)} defaultItems={['اختبار الشهر الأول', 'اختبار الشهر الثاني']} localStorageKey="customTests" isList={true} />
                <CustomizableInputSection title={t('peerVisitsDone')} value={report.peerVisitsDone || ''} onChange={v => handleFieldUpdate('peerVisitsDone', v)} defaultItems={[]} localStorageKey="customPeerVisits" isList={true} />
            </div>

             <div className="flex flex-wrap justify-center gap-3 pt-4 border-t">
                <button onClick={handleSave} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all transform hover:scale-105" disabled={isSaving}>{isSaving ? `${t('save')}...` : t('saveWork')}</button>
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
    allTeachers 
}) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReports, setSelectedReports] = useState<string[]>([]);
    const [collapsedReports, setCollapsedReports] = useState<Set<string>>(new Set());
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    
    const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
    const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'}>({ key: 'percentage', direction: 'desc' });
    const [filterStatus, setFilterStatus] = useState<'all' | 'ahead' | 'behind' | 'on_track'>('all');
    const [filterSubject, setFilterSubject] = useState('all');
    const [filterGrade, setFilterGrade] = useState('all');

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
            if (newSet.has(reportId)) newSet.delete(reportId);
            else newSet.add(reportId);
            return newSet;
        });
    };

    const handleAddNewReport = () => {
        const newReport: SyllabusCoverageReport = {
            id: `scr-${Date.now()}`,
            schoolName: school, academicYear: academicYear, semester: semester,
            subject: '', grade: '', branches: [], teacherId: '', branch: 'main',
            date: new Date().toISOString().split('T')[0],
        };
        setReports(prev => [newReport, ...prev]);
        setViewMode('list'); 
    };

    const teacherMap = useMemo(() => new Map(allTeachers.map(t => [t.id, t.name])), [allTeachers]);

    const processedReports = useMemo(() => {
        let result = reports.map(r => ({
            ...r,
            teacherName: teacherMap.get(r.teacherId) || '',
            percentage: calculateOverallPercentage(r),
            status: getReportStatus(r)
        }));

        result = result.filter(r => {
            const matchesSearch = r.teacherName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesSubject = filterSubject === 'all' || r.subject === filterSubject;
            const matchesGrade = filterGrade === 'all' || r.grade === filterGrade;
            const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
            return matchesSearch && matchesSubject && matchesGrade && matchesStatus;
        });

        result.sort((a, b) => {
            let valA: any = a[sortConfig.key as keyof typeof a];
            let valB: any = b[sortConfig.key as keyof typeof b];
            
            if (sortConfig.key === 'status') {
                const rank = { behind: 0, on_track: 1, ahead: 2 };
                valA = rank[a.status];
                valB = rank[b.status];
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [reports, searchTerm, filterSubject, filterGrade, filterStatus, sortConfig, teacherMap]);

    const handleSelectReport = (reportId: string) => {
        setSelectedReports(prev => prev.includes(reportId) ? prev.filter(id => id !== reportId) : [...prev, reportId]);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedReports(processedReports.map(r => r.id));
        } else {
            setSelectedReports([]);
        }
    };

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const selectedReportsObjects = useMemo(() => 
        reports.filter(r => selectedReports.includes(r.id))
    , [reports, selectedReports]);

    const exportTableToExcel = () => {
        const data = processedReports.map(r => ({
            'المعلم': r.teacherName,
            'المادة': r.subject,
            'الصف': r.grade,
            'الحالة': r.status === 'ahead' ? 'متقدم' : r.status === 'behind' ? 'متأخر' : 'مطابق',
            'النسبة': r.percentage.toFixed(0) + '%',
            'آخر درس': r.branches.map(b => b.lastLesson).join(' | '),
            'التاريخ': new Date(r.date).toLocaleDateString()
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "تقرير السير في المنهج");
        XLSX.writeFile(wb, `syllabus_coverage_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="space-y-6 w-full overflow-x-hidden">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-primary">{t('syllabusCoverageReport')}</h2>
                <div className="flex gap-2">
                    <button onClick={() => setViewMode(prev => prev === 'list' ? 'table' : 'list')} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                        {viewMode === 'list' ? 'عرض جدول الفلترة' : 'عرض القائمة'}
                    </button>
                    {/* تفعيل زر الإضافة */}
                    <button onClick={handleAddNewReport} className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors shadow-sm">
                        + {t('addNewSyllabusReport')}
                    </button>
                </div>
            </div>
            
            {viewMode === 'table' && (
                <div className="bg-white p-4 rounded-lg shadow-md border space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input type="text" placeholder={t('searchForTeacher')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="p-2 border rounded text-base" />
                        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="p-2 border rounded text-base">
                            <option value="all">كل المواد</option>
                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="p-2 border rounded text-base">
                            <option value="all">كل الصفوف</option>
                            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="p-2 border rounded text-base">
                            <option value="all">كل الحالات</option>
                            <option value="ahead">{t('statusAhead')}</option>
                            <option value="behind">{t('statusBehind')}</option>
                            <option value="on_track">{t('statusOnTrack')}</option>
                        </select>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 justify-between items-center border-t pt-3">
                        <div className="flex gap-2">
                            <button onClick={() => handleSort('percentage')} className={`px-3 py-1 text-sm rounded ${sortConfig.key === 'percentage' ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-gray-100'}`}>النسبة % {sortConfig.key === 'percentage' && (sortConfig.direction === 'desc' ? '⬇' : '⬆')}</button>
                            <button onClick={() => handleSort('status')} className={`px-3 py-1 text-sm rounded ${sortConfig.key === 'status' ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-gray-100'}`}>الحالة {sortConfig.key === 'status' && (sortConfig.direction === 'desc' ? '⬇' : '⬆')}</button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={exportTableToExcel} className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700">تصدير Excel</button>
                            <button onClick={() => setShowWhatsAppModal(true)} className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">إرسال واتساب ({selectedReports.length})</button>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-gray-100 text-gray-700 uppercase">
                                <tr>
                                    <th className="p-3"><input type="checkbox" checked={selectedReports.length === processedReports.length && processedReports.length > 0} onChange={handleSelectAll} className="w-4 h-4" /></th>
                                    <th className="p-3">المعلم</th>
                                    <th className="p-3">المادة / الصف</th>
                                    <th className="p-3 text-center">الحالة</th>
                                    <th className="p-3 text-center">النسبة</th>
                                    <th className="p-3">آخر درس</th>
                                    <th className="p-3 text-center">إجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {processedReports.map(report => (
                                    <tr key={report.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setViewMode('list'); handleToggleCollapse(report.id); }}>
                                        <td className="p-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedReports.includes(report.id)} onChange={() => handleSelectReport(report.id)} className="w-4 h-4" /></td>
                                        <td className="p-3 font-medium">{report.teacherName}</td>
                                        <td className="p-3">{report.subject} - {report.grade}</td>
                                        <td className="p-3 text-center">
                                            {report.status === 'ahead' && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">متقدم</span>}
                                            {report.status === 'behind' && <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">متأخر</span>}
                                            {report.status === 'on_track' && <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">مطابق</span>}
                                        </td>
                                        <td className="p-3 text-center font-bold">{report.percentage.toFixed(0)}%</td>
                                        <td className="p-3 text-gray-500 truncate max-w-xs">{report.branches[0]?.lastLesson || '-'}</td>
                                        <td className="p-3 text-center">
                                            <button className="text-blue-600 hover:text-blue-800">عرض</button>
                                        </td>
                                    </tr>
                                ))}
                                {processedReports.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-gray-500">لا توجد نتائج تطابق الفلترة.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showWhatsAppModal && (
                <WhatsAppBulkModal 
                    selectedReports={selectedReportsObjects}
                    allTeachers={allTeachers}
                    onClose={() => setShowWhatsAppModal(false)}
                    t={t}
                />
            )}

            {viewMode === 'list' && (
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg shadow border flex flex-col md:flex-row gap-4 items-center justify-between">
                        <input 
                            type="text" 
                            placeholder={t('searchForTeacher')} 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="p-2 border rounded w-full md:w-64 text-base"
                        />
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={selectedReports.length === processedReports.length && processedReports.length > 0} onChange={handleSelectAll} className="w-5 h-5 text-primary" />
                                {t('selectAll')}
                            </label>
                            {selectedReports.length > 0 && (
                                <button onClick={() => setShowWhatsAppModal(true)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-bold flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.267.651 4.383 1.905 6.25l-.275 1.002 1.03 1.018z"/></svg>
                                    إرسال المحدد ({selectedReports.length})
                                </button>
                            )}
                        </div>
                    </div>

                    {processedReports.length > 0 ? processedReports.map(report => (
                        <div key={report.id} className="flex items-start gap-2">
                            <div className="pt-4">
                                <input 
                                    type="checkbox" 
                                    checked={selectedReports.includes(report.id)}
                                    onChange={() => handleSelectReport(report.id)}
                                    className="w-5 h-5 text-primary rounded cursor-pointer"
                                />
                            </div>
                            <div className="flex-grow max-w-full overflow-hidden">
                                <ReportEditor 
                                    report={report}
                                    allReports={reports}
                                    allTeachers={allTeachers}
                                    onUpdate={handleUpdateReport}
                                    onDelete={handleDeleteReport}
                                    isCollapsed={collapsedReports.has(report.id)}
                                    onToggleCollapse={() => handleToggleCollapse(report.id)}
                                />
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 py-8">{t('noSyllabusCoverageReports')}</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default SyllabusCoverageManager;
