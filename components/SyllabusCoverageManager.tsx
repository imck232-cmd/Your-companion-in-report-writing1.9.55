
import React, { useState, useMemo, useEffect } from 'react';
import { SyllabusCoverageReport, SyllabusBranchProgress, Teacher } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { SUBJECTS, GRADES, SUBJECT_BRANCH_MAP } from '../constants';
import { exportSyllabusCoverage } from '../lib/exportUtils';
import CustomizableInputSection from './CustomizableInputSection';
import ImportDataSection from './ImportDataSection';

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
    const [isSaving, setIsSaving] = useState(false);
    
    // Fix: Explicitly type Map to avoid 'unknown' return from .get()
    const teacherMap = useMemo(() => new Map<string, string>(allTeachers.filter(Boolean).map(t => [t.id, t.name])), [allTeachers]);

    const handleTeacherChange = (newTeacherId: string) => {
        const latest = allReports
            .filter(r => r.teacherId === newTeacherId && r.id !== report.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        onUpdate({
            ...report,
            teacherId: newTeacherId,
            branch: latest?.branch || report.branch || 'main',
        });
    };
    
    const handleHeaderChange = (field: keyof SyllabusCoverageReport, value: string) => {
        const updatedReport = { ...report, [field]: value };
        if (field === 'subject') {
            const branches = SUBJECT_BRANCH_MAP[value] || [];
            updatedReport.branches = branches.map(branchName => ({
                branchName, status: 'on_track', lastLesson: '', lessonDifference: '', percentage: 100
            }));
        }
        onUpdate(updatedReport);
    };
    
    const handleBranchUpdate = (index: number, field: keyof SyllabusBranchProgress, value: string) => {
        const newBranches = [...(report.branches || [])];
        if (!newBranches[index]) return;
        (newBranches[index] as any)[field] = value;
        onUpdate({ ...report, branches: newBranches });
    };

    const addManualBranch = () => {
        const branchName = window.prompt("اسم فرع المادة (مثال: نحو، نصوص):");
        if (branchName?.trim()) {
            const newBranch: SyllabusBranchProgress = { 
                branchName: branchName.trim(), status: 'on_track', lastLesson: '', lessonDifference: '', percentage: 100 
            };
            onUpdate({ ...report, branches: [...(report.branches || []), newBranch] });
        }
    };

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            alert("تم حفظ المعلومة بنجاح");
        }, 1000);
    };

    const percentageOptions = Array.from({ length: 100 }, (_, i) => String(i + 1));
    const teacherName = teacherMap.get(report.teacherId) || 'معلم غير محدد';

    const qualitativeFields = [
        { id: 'programsImplemented', label: 'البرامج والمهارات التي تم تنفيذها', key: 'customPrograms' },
        { id: 'strategiesImplemented', label: 'الاستراتيجيات التي تم تنفيذها', key: 'customStrategies' },
        { id: 'toolsUsed', label: 'الوسائل التي تم استخدامها', key: 'customTools' },
        { id: 'sourcesUsed', label: 'المصادر التي تم استخدامها', key: 'customSources' },
        { id: 'tasksDone', label: 'التكاليف التي تم القيام بها', key: 'customTasks' },
        { id: 'testsDelivered', label: 'الاختبارات التي تم تسليمها', key: 'customTests' },
        { id: 'peerVisitsDone', label: 'الزيارات التبادلية التي تمت', key: 'customPeerVisits' }
    ];

    if (isCollapsed) {
        return (
            <div className="p-3 border rounded-lg bg-white shadow-sm flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors" onClick={onToggleCollapse}>
                <div className="flex flex-col">
                   <span className="text-[10px] text-gray-400 mb-1">{report.date}</span>
                   <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">{teacherName}</span>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-600 text-sm">{report.subject || "بدون مادة"}</span>
                   </div>
                </div>
                <button className="p-2 text-primary hover:bg-primary-light/10 rounded-full transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 border-2 border-primary-light rounded-xl space-y-6 bg-white shadow-md relative overflow-hidden">
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400">{report.date}</span>
                    <h3 className="text-lg font-bold text-primary">تحرير تقرير السير في المنهج</h3>
                </div>
                <div className="flex gap-2">
                    <button onClick={onToggleCollapse} className="p-2 text-primary bg-primary/5 hover:bg-primary/10 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                        </svg>
                    </button>
                    <button onClick={() => onDelete(report.id)} className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
            
            {/* القائمة الرئيسية للبيانات */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border">
                <div><label className="text-xs font-bold block mb-1">اسم المدرسة</label><input type="text" value={report.schoolName} onChange={e => handleHeaderChange('schoolName', e.target.value)} className="w-full p-2 border rounded text-sm" /></div>
                <div><label className="text-xs font-bold block mb-1">العام الدراسي</label><input type="text" value={report.academicYear} onChange={e => handleHeaderChange('academicYear', e.target.value)} className="w-full p-2 border rounded text-sm" /></div>
                <div><label className="text-xs font-bold block mb-1">الفصل الدراسي</label>
                    <select value={report.semester} onChange={e => handleHeaderChange('semester', e.target.value)} className="w-full p-2 border rounded text-sm">
                        <option value="الأول">الأول</option><option value="الثاني">الثاني</option>
                    </select>
                </div>
                <div><label className="text-xs font-bold block mb-1">اسم المعلم</label>
                    <select value={report.teacherId} onChange={e => handleTeacherChange(e.target.value)} className="w-full p-2 border rounded font-bold text-sm">
                        <option value="">-- اختر المعلم --</option>
                        {allTeachers.filter(Boolean).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div><label className="text-xs font-bold block mb-1">المادة</label>
                    <select value={report.subject} onChange={e => handleHeaderChange('subject', e.target.value)} className="w-full p-2 border rounded text-sm">
                        <option value="">-- اختر --</option>
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div><label className="text-xs font-bold block mb-1">الصف</label>
                    <select value={report.grade} onChange={e => handleHeaderChange('grade', e.target.value)} className="w-full p-2 border rounded text-sm">
                        <option value="">-- اختر --</option>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div><label className="text-xs font-bold block mb-1">تاريخ التقرير</label><input type="date" value={report.date} onChange={e => handleHeaderChange('date', e.target.value)} className="w-full p-2 border rounded text-sm" /></div>
            </div>

            {/* السير في المنهج - جدول مع تمرير للهاتف */}
            <div className="space-y-4">
                <div className="flex justify-between items-center border-b-2 border-primary-light pb-2">
                    <h4 className="font-bold text-primary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10.392C2.057 15.71 3.245 16 4.5 16h1.054c.254.162.52.305.798.432v-6.95c.57-2.25 2.1-4 4.148-4.682A.75.75 0 0111 5.5v1.233c.05.01.1.022.15.035V6.5a.5.5 0 00-.5-.5h-1a.5.5 0 00-.5.5v2.268a2.5 2.5 0 100 4.464V16.5a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1.233a5.442 5.442 0 00-.15-.035V16.5a.75.75 0 01-1.5 0v-.932c-2.048.682-3.578 2.432-4.148 4.682v.268C5.52 20.695 5.254 20.838 5 21H4.5A2.5 2.5 0 012 18.5V5.5A2.5 2.5 0 014.5 3H5c.254-.162.52-.305.798-.432V3.5a.75.75 0 011.5 0v.932C9.348 3.75 10.878 2 12.5 2a2.5 2.5 0 010 5c-1.622 0-3.152-1.75-4.148-3.432V4.804z" />
                        </svg>
                        السير في المنهج وآخر درس تم أخذه
                    </h4>
                    <button onClick={addManualBranch} className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-bold border border-sky-300 hover:bg-sky-200 shadow-sm">+ إضافة فرع جديد</button>
                </div>
                
                <div className="overflow-x-auto rounded-lg border bg-white shadow-inner" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <table className="min-w-[600px] w-full text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2 border text-right">اسم الفرع</th>
                                <th className="p-2 border text-right">عنوان آخر درس</th>
                                <th className="p-2 border text-center">حالة السير</th>
                                <th className="p-2 border text-center" colSpan={2}>الفارق</th>
                                <th className="p-2 border w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {(report.branches || []).map((branch, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-1 border"><input type="text" value={branch.branchName} onChange={e => handleBranchUpdate(idx, 'branchName', e.target.value)} className="w-full p-1 bg-transparent focus:bg-white" /></td>
                                    <td className="p-1 border"><input type="text" value={branch.lastLesson} onChange={e => handleBranchUpdate(idx, 'lastLesson', e.target.value)} className="w-full p-1 bg-transparent focus:bg-white" /></td>
                                    <td className="p-1 border text-center">
                                        <select value={branch.status} onChange={e => handleBranchUpdate(idx, 'status', e.target.value)} className="w-full p-1 text-xs font-bold bg-transparent">
                                            <option value="on_track">مطابق لخطة الوزارة</option>
                                            <option value="ahead">متقدم عن خطة الوزارة</option>
                                            <option value="behind">متأخر عن خطة الوزارة</option>
                                        </select>
                                    </td>
                                    <td className="p-1 border-y border-r w-16 text-xs text-gray-500 text-center">بعدد</td>
                                    <td className="p-1 border-y w-20"><input type="number" value={branch.lessonDifference} onChange={e => handleBranchUpdate(idx, 'lessonDifference', e.target.value)} className="w-full p-1 text-center font-bold" /></td>
                                    <td className="p-1 border text-center text-xs text-gray-500">دروس</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* الإحصائيات الكمية */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="space-y-1">
                    <label className="text-xs font-bold block text-amber-900">اللقاءات التطويرية</label>
                    <input type="number" value={report.meetingsAttended || ''} onChange={e => onUpdate({...report, meetingsAttended: e.target.value})} placeholder="عدد اللقاءات" className="w-full p-2 border rounded bg-white text-center font-bold shadow-sm" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold block text-amber-900">تصحيح الدفاتر</label>
                    <select value={report.notebookCorrection || ''} onChange={e => onUpdate({...report, notebookCorrection: e.target.value})} className="w-full p-2 border rounded bg-white shadow-sm font-semibold">
                        <option value="">-- اختر % --</option>
                        {percentageOptions.map(p => <option key={p} value={p}>مكتملة بنسبة {p}%</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold block text-amber-900">دفتر التحضير</label>
                    <select value={report.preparationBook || ''} onChange={e => onUpdate({...report, preparationBook: e.target.value})} className="w-full p-2 border rounded bg-white shadow-sm font-semibold">
                        <option value="">-- اختر % --</option>
                        {percentageOptions.map(p => <option key={p} value={p}>مكتملة بنسبة {p}%</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold block text-amber-900">مسرد الأسئلة</label>
                    <select value={report.questionsGlossary || ''} onChange={e => onUpdate({...report, questionsGlossary: e.target.value})} className="w-full p-2 border rounded bg-white shadow-sm font-semibold">
                        <option value="">-- اختر % --</option>
                        {percentageOptions.map(p => <option key={p} value={p}>مكتملة بنسبة {p}%</option>)}
                    </select>
                </div>
            </div>

            {/* الحقول النوعية مع أزرار التبديل (Toggle) */}
            <div className="space-y-8 pt-4">
                {qualitativeFields.map(field => (
                    <CustomizableInputSection
                        key={field.id}
                        title={field.label}
                        value={(report as any)[field.id] || ''}
                        onChange={v => onUpdate({...report, [field.id]: v})}
                        defaultItems={[]}
                        localStorageKey={field.key}
                        isList={true}
                    />
                ))}
            </div>

            {/* أزرار الإجراءات */}
            <div className="flex flex-wrap justify-center gap-3 pt-6 border-t">
                <button onClick={handleSave} className="px-8 py-2 bg-green-600 text-white rounded-lg font-bold shadow-md hover:bg-green-700 transition-all transform hover:scale-105" disabled={isSaving}>{isSaving ? 'جاري الحفظ...' : 'حفظ المعلومة'}</button>
                <button onClick={() => exportSyllabusCoverage('txt', report, teacherName, t)} className="px-4 py-2 bg-gray-700 text-white rounded-lg font-bold shadow-md hover:bg-gray-800 transition-all">{t('exportTxt')}</button>
                <button onClick={() => exportSyllabusCoverage('pdf', report, teacherName, t)} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold shadow-md hover:bg-red-700 transition-all">{t('exportPdf')}</button>
                <button onClick={() => exportSyllabusCoverage('excel', report, teacherName, t)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-md hover:bg-emerald-700 transition-all">{t('exportExcel')}</button>
                <button onClick={() => exportSyllabusCoverage('whatsapp', report, teacherName, t)} className="px-4 py-2 bg-green-500 text-white rounded-lg font-bold shadow-md hover:bg-green-600 transition-all">واتساب</button>
            </div>
        </div>
    );
};

// --- مكون الفلترة المتقدمة ---
const FilterDialog: React.FC<{
    reports: SyllabusCoverageReport[];
    allTeachers: Teacher[];
    onClose: () => void;
    onViewReport: (id: string) => void;
}> = ({ reports, allTeachers, onClose, onViewReport }) => {
    const { t } = useLanguage();
    const [filter, setFilter] = useState({ name: '', subject: '', grade: '', status: 'all' });
    
    // Fix: Explicitly type Map to avoid 'unknown' return from .get()
    const teacherMap = useMemo(() => new Map<string, string>(allTeachers.map(t => [t.id, t.name])), [allTeachers]);

    const filtered = reports.filter(r => {
        const nameMatch = !filter.name || teacherMap.get(r.teacherId)?.includes(filter.name);
        const subjectMatch = !filter.subject || r.subject.includes(filter.subject);
        const gradeMatch = !filter.grade || r.grade.includes(filter.grade);
        const statusMatch = filter.status === 'all' || r.branches.some(b => b.status === filter.status);
        return nameMatch && subjectMatch && gradeMatch && statusMatch;
    });

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-primary">فلترة تقارير السير في المنهج</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">&times;</button>
                </div>
                
                <div className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 bg-gray-50">
                    <input type="text" placeholder="اسم المعلم..." className="p-2 border rounded" value={filter.name} onChange={e => setFilter({...filter, name: e.target.value})} />
                    <input type="text" placeholder="المادة..." className="p-2 border rounded" value={filter.subject} onChange={e => setFilter({...filter, subject: e.target.value})} />
                    <select className="p-2 border rounded" value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})}>
                        <option value="all">كل الحالات</option>
                        <option value="ahead">متقدم</option>
                        <option value="on_track">مطابق</option>
                        <option value="behind">متأخر</option>
                    </select>
                </div>

                <div className="flex-grow overflow-y-auto p-4">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-primary text-white sticky top-0">
                            <tr>
                                <th className="p-2 border">المعلم</th>
                                <th className="p-2 border">المادة</th>
                                <th className="p-2 border">التاريخ</th>
                                <th className="p-2 border">الإجراء</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(r => (
                                <tr key={r.id} className="hover:bg-blue-50 border-b">
                                    <td className="p-2 border font-bold">{teacherMap.get(r.teacherId)}</td>
                                    <td className="p-2 border">{r.subject}</td>
                                    <td className="p-2 border text-gray-500">{r.date}</td>
                                    <td className="p-2 border text-center">
                                        <button onClick={() => { onViewReport(r.id); onClose(); }} className="text-primary font-bold hover:underline">عرض كامل</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const SyllabusCoverageManager: React.FC<SyllabusCoverageManagerProps> = ({ reports, setReports, school, academicYear, semester, allTeachers }) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set(reports.map(r => r.id)));
    const [showFilter, setShowFilter] = useState(false);
    const [showImport, setShowImport] = useState(false);

    const handleUpdateReport = (updatedReport: SyllabusCoverageReport) => {
        setReports(prev => prev.map(r => r.id === updatedReport.id ? updatedReport : r));
    };

    const handleDeleteReport = (reportId: string) => {
        if(window.confirm(t('confirmDelete'))) {
            setReports(prev => prev.filter(r => r.id !== reportId));
        }
    };

    const handleToggleCollapse = (id: string) => {
        setCollapsedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleAddNewReport = () => {
        const newReport: SyllabusCoverageReport = {
            id: `scr-${Date.now()}`,
            schoolName: school, academicYear, semester,
            subject: '', grade: '', branches: [], teacherId: '', branch: 'main',
            date: new Date().toISOString().split('T')[0],
            meetingsAttended: '0', notebookCorrection: '', preparationBook: '', questionsGlossary: '',
            programsImplemented: '', strategiesImplemented: '', toolsUsed: '', sourcesUsed: '',
            tasksDone: '', testsDelivered: '', peerVisitsDone: ''
        };
        setReports(prev => [newReport, ...prev]);
        setCollapsedIds(prev => {
            const next = new Set(prev);
            // الجديد يكون مفتوحاً
            return next;
        });
    };

    const handleViewFromFilter = (id: string) => {
        setCollapsedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
        // Scroll to the element
        setTimeout(() => {
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    // Fix: Explicitly type Map to avoid 'unknown' return from .get()
    const teacherMap = useMemo(() => new Map<string, string>(allTeachers.filter(Boolean).map(t => [t.id, t.name])), [allTeachers]);

    const filteredReports = useMemo(() => {
        if (!searchTerm) return reports;
        return reports.filter(r => teacherMap.get(r.teacherId)?.includes(searchTerm));
    }, [reports, searchTerm, teacherMap]);

    const importFormStructure = {
        subject: "", date: "", schoolName: "", teacherName: "",
        branches: [{ branchName: "", status: "", lastLesson: "", lessonDifference: "" }],
        meetingsAttended: "", notebookCorrection: "", preparationBook: "", questionsGlossary: "",
        programsImplemented: "", strategiesImplemented: "", toolsUsed: "", sourcesUsed: "", tasksDone: "", testsDelivered: "", peerVisitsDone: ""
    };

    return (
        <div className="space-y-6 w-full max-w-full overflow-x-hidden p-1">
            {showFilter && <FilterDialog reports={reports} allTeachers={allTeachers} onClose={() => setShowFilter(false)} onViewReport={handleViewFromFilter} />}
            
            <div className="flex justify-between items-center gap-2">
                <h2 className="text-xl md:text-2xl font-bold text-primary">تقرير السير في المنهج</h2>
                <div className="flex gap-2">
                    <button onClick={() => setShowFilter(true)} className="p-2 md:px-4 md:py-2 bg-amber-500 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>
                        <span className="hidden md:inline">فلترة</span>
                    </button>
                    <button onClick={handleAddNewReport} className="p-2 md:px-4 md:py-2 bg-primary text-white font-bold rounded-lg shadow-lg flex items-center gap-2 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        <span>إضافة تقرير</span>
                    </button>
                </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-grow bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                    <input type="text" placeholder="بحث سريع باسم المعلم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 text-sm outline-none" />
                </div>
                <button onClick={() => setShowImport(!showImport)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm">تعبئة ذكية</button>
            </div>

            {showImport && (
                <ImportDataSection 
                    formStructure={importFormStructure} 
                    onDataParsed={(data: any) => {
                        const newReport: SyllabusCoverageReport = {
                            id: `scr-ai-${Date.now()}`,
                            schoolName: data.schoolName || school,
                            academicYear: data.academicYear || academicYear,
                            semester: data.semester || semester,
                            subject: data.subject || '',
                            grade: data.grade || '',
                            branches: data.branches || [],
                            teacherId: allTeachers.find(t => t.name.includes(data.teacherName))?.id || '',
                            branch: 'main',
                            date: data.date || new Date().toISOString().split('T')[0],
                            meetingsAttended: data.meetingsAttended || '0',
                            notebookCorrection: data.notebookCorrection || '',
                            preparationBook: data.preparationBook || '',
                            questionsGlossary: data.questionsGlossary || '',
                            programsImplemented: data.programsImplemented || '',
                            strategiesImplemented: data.strategiesImplemented || '',
                            toolsUsed: data.toolsUsed || '',
                            sourcesUsed: data.sourcesUsed || '',
                            tasksDone: data.tasksDone || '',
                            testsDelivered: data.testsDelivered || '',
                            peerVisitsDone: data.peerVisitsDone || ''
                        };
                        setReports(prev => [newReport, ...prev]);
                        setShowImport(false);
                        setCollapsedIds(new Set([...collapsedIds]));
                    }} 
                />
            )}

            <div className="space-y-4">
                {filteredReports.length > 0 ? (
                    filteredReports.map(report => (
                        <div key={report.id} id={report.id}>
                            <ReportEditor 
                                report={report}
                                allReports={reports}
                                allTeachers={allTeachers}
                                onUpdate={handleUpdateReport}
                                onDelete={handleDeleteReport}
                                isCollapsed={collapsedIds.has(report.id)}
                                onToggleCollapse={() => handleToggleCollapse(report.id)}
                            />
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-400 font-bold">لا توجد تقارير حالياً</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SyllabusCoverageManager;
