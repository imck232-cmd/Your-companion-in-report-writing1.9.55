
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SyllabusCoverageReport, SyllabusBranchProgress, Teacher } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { SUBJECTS, GRADES, SUBJECT_BRANCH_MAP } from '../constants';
import { exportSyllabusCoverage } from '../lib/exportUtils';
import CustomizableInputSection from './CustomizableInputSection';

interface SyllabusCoverageManagerProps {
    reports: SyllabusCoverageReport[];
    setReports: React.Dispatch<React.SetStateAction<SyllabusCoverageReport[]>>;
    school: string;
    academicYear: string;
    semester: 'الأول' | 'الثاني';
    allTeachers: Teacher[];
}

// دالة حسابية فائقة الأمان لمنع انهيار الواجهة
const calculateOverallPercentage = (report: SyllabusCoverageReport): number => {
    if (!report || !report.branches || !Array.isArray(report.branches) || report.branches.length === 0) return 0;
    try {
        const total = report.branches.reduce((acc, b) => acc + (Number(b.percentage) || 0), 0);
        return total / report.branches.length;
    } catch (e) { return 0; }
};

const getReportStatus = (report: SyllabusCoverageReport): 'ahead' | 'behind' | 'on_track' => {
    if (!report || !report.branches || !Array.isArray(report.branches) || report.branches.length === 0) return 'on_track';
    if (report.branches.some(b => b?.status === 'behind')) return 'behind';
    if (report.branches.some(b => b?.status === 'ahead')) return 'ahead';
    return 'on_track';
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
    const [isSaving, setIsSaving] = useState(false);
    
    const teacherMap = useMemo(() => new Map(allTeachers.filter(Boolean).map(t => [t.id, t.name])), [allTeachers]);

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
        const branchName = window.prompt("اسم فرع المادة:");
        if (branchName?.trim()) {
            const newBranch: SyllabusBranchProgress = { 
                branchName: branchName.trim(), status: 'on_track', lastLesson: '', lessonDifference: '', percentage: 100 
            };
            onUpdate({ ...report, branches: [...(report.branches || []), newBranch] });
        }
    };

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => setIsSaving(false), 1000);
    };

    const percentageOptions = Array.from({ length: 100 }, (_, i) => String(i + 1));
    const teacherName = teacherMap.get(report.teacherId) || '';

    if (isCollapsed) {
        return (
            <div className="p-3 border rounded-lg bg-white shadow-sm flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors" onClick={onToggleCollapse}>
                <div className="flex flex-wrap items-center gap-2 overflow-hidden">
                    <span className="font-bold text-primary truncate max-w-[150px]">{teacherName || "معلم جديد"}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-600 truncate max-w-[100px]">{report.subject || "المادة"}</span>
                    <span className="hidden md:inline text-gray-500 text-sm">| {report.date}</span>
                </div>
                <div className="text-xs text-blue-500 font-bold whitespace-nowrap">تعديل</div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 border-2 border-primary-light rounded-xl space-y-6 bg-white shadow-md relative overflow-hidden">
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-primary">تحرير تقرير السير في المنهج</h3>
                <div className="flex gap-2">
                    <button onClick={onToggleCollapse} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button onClick={() => onDelete(report.id)} className="text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border">
                <div><label className="text-xs font-bold block mb-1">اسم المدرسة</label><input type="text" value={report.schoolName} onChange={e => handleHeaderChange('schoolName', e.target.value)} className="w-full p-2 border rounded" /></div>
                <div><label className="text-xs font-bold block mb-1">العام الدراسي</label><input type="text" value={report.academicYear} onChange={e => handleHeaderChange('academicYear', e.target.value)} className="w-full p-2 border rounded" /></div>
                <div><label className="text-xs font-bold block mb-1">الفصل الدراسي</label>
                    <select value={report.semester} onChange={e => handleHeaderChange('semester', e.target.value)} className="w-full p-2 border rounded">
                        <option value="الأول">الأول</option><option value="الثاني">الثاني</option>
                    </select>
                </div>
                <div><label className="text-xs font-bold block mb-1">اسم المعلم</label>
                    <select value={report.teacherId} onChange={e => handleTeacherChange(e.target.value)} className="w-full p-2 border rounded font-bold">
                        <option value="">-- اختر المعلم --</option>
                        {allTeachers.filter(Boolean).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div><label className="text-xs font-bold block mb-1">المادة</label>
                    <select value={report.subject} onChange={e => handleHeaderChange('subject', e.target.value)} className="w-full p-2 border rounded">
                        <option value="">-- اختر --</option>
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div><label className="text-xs font-bold block mb-1">الصف</label>
                    <select value={report.grade} onChange={e => handleHeaderChange('grade', e.target.value)} className="w-full p-2 border rounded">
                        <option value="">-- اختر --</option>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div><label className="text-xs font-bold block mb-1">التاريخ</label><input type="date" value={report.date} onChange={e => handleHeaderChange('date', e.target.value)} className="w-full p-2 border rounded" /></div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center border-b-2 border-primary-light pb-2">
                    <h4 className="font-bold text-primary">📘 السير في المنهج وآخر درس تم أخذه</h4>
                    <button onClick={addManualBranch} className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-bold border border-sky-300">+ إضافة فرع/درس</button>
                </div>
                <div className="space-y-3">
                    {(report.branches || []).map((branch, idx) => (
                        <div key={idx} className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end p-3 border rounded-lg bg-white shadow-sm">
                            <div className="lg:col-span-3">
                                <label className="text-[10px] font-bold text-gray-400">فرع المادة</label>
                                <input type="text" value={branch.branchName} onChange={e => handleBranchUpdate(idx, 'branchName', e.target.value)} className="w-full p-2 border rounded bg-gray-50 font-bold" />
                            </div>
                            <div className="lg:col-span-3">
                                <label className="text-[10px] font-bold text-gray-400">آخر درس تم أخذه</label>
                                <input type="text" value={branch.lastLesson} onChange={e => handleBranchUpdate(idx, 'lastLesson', e.target.value)} className="w-full p-2 border rounded" />
                            </div>
                            <div className="lg:col-span-3">
                                <label className="text-[10px] font-bold text-gray-400">الحالة</label>
                                <select value={branch.status} onChange={e => handleBranchUpdate(idx, 'status', e.target.value)} className="w-full p-2 border rounded text-xs font-bold">
                                    <option value="on_track">مطابق لخطة الوزارة</option>
                                    <option value="ahead">متقدم عن خطة الوزارة</option>
                                    <option value="behind">متأخر عن خطة الوزارة</option>
                                </select>
                            </div>
                            <div className="lg:col-span-3 flex items-center gap-2">
                                <div className="flex-grow">
                                    <label className="text-[10px] font-bold text-gray-400">بعدد</label>
                                    <input type="text" value={branch.lessonDifference} onChange={e => handleBranchUpdate(idx, 'lessonDifference', e.target.value)} placeholder="0" className="w-full p-2 border rounded text-center" />
                                </div>
                                <span className="text-xs font-bold text-gray-500 mt-5">دروس</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div>
                    <label className="text-xs font-bold block mb-1 text-amber-900">اللقاءات التطويرية التي تم حضورها</label>
                    <input type="number" value={report.meetingsAttended || ''} onChange={e => onUpdate({...report, meetingsAttended: e.target.value})} className="w-full p-2 border rounded bg-white text-center font-bold" />
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1 text-amber-900">تصحيح الدفاتر</label>
                    <select value={report.notebookCorrection || ''} onChange={e => onUpdate({...report, notebookCorrection: e.target.value})} className="w-full p-2 border rounded bg-white">
                        <option value="">-- اختر % --</option>
                        {percentageOptions.map(p => <option key={p} value={p}>مكتملة بنسبة {p}%</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1 text-amber-900">دفتر التحضير</label>
                    <select value={report.preparationBook || ''} onChange={e => onUpdate({...report, preparationBook: e.target.value})} className="w-full p-2 border rounded bg-white">
                        <option value="">-- اختر % --</option>
                        {percentageOptions.map(p => <option key={p} value={p}>مكتملة بنسبة {p}%</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold block mb-1 text-amber-900">مسرد الأسئلة نهاية دفتر التحضير</label>
                    <select value={report.questionsGlossary || ''} onChange={e => onUpdate({...report, questionsGlossary: e.target.value})} className="w-full p-2 border rounded bg-white">
                        <option value="">-- اختر % --</option>
                        {percentageOptions.map(p => <option key={p} value={p}>مكتملة بنسبة {p}%</option>)}
                    </select>
                </div>
            </div>

            <div className="space-y-6 pt-4">
                {[
                    { id: 'programsImplemented', label: 'البرامج والمهارات التي تم تنفيذها', key: 'customPrograms' },
                    { id: 'strategiesImplemented', label: 'الاستراتيجيات التي تم تنفيذها', key: 'customStrategies' },
                    { id: 'toolsUsed', label: 'الوسائل التي تم استخدامها', key: 'customTools' },
                    { id: 'sourcesUsed', label: 'المصادر التي تم استخدامها', key: 'customSources' },
                    { id: 'tasksDone', label: 'التكاليف التي تم القيام بها', key: 'customTasks' },
                    { id: 'testsDelivered', label: 'الاختبارات التي تم تسليمها', key: 'customTests' },
                    { id: 'peerVisitsDone', label: 'الزيارات التبادلية التي تمت', key: 'customPeerVisits' }
                ].map(field => (
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

            <div className="flex flex-wrap justify-center gap-2 pt-6 border-t">
                <button onClick={handleSave} className="px-8 py-2 bg-green-600 text-white rounded-lg font-bold shadow-md" disabled={isSaving}>{isSaving ? 'جاري الحفظ...' : 'حفظ التقرير'}</button>
                <button onClick={() => exportSyllabusCoverage('pdf', report, teacherName, t)} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold shadow-md">تصدير PDF</button>
                <button onClick={() => exportSyllabusCoverage('whatsapp', report, teacherName, t)} className="px-4 py-2 bg-green-500 text-white rounded-lg font-bold shadow-md">واتساب</button>
            </div>
        </div>
    );
};

const SyllabusCoverageManager: React.FC<SyllabusCoverageManagerProps> = ({ reports, setReports, school, academicYear, semester, allTeachers }) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [collapsedReports, setCollapsedReports] = useState<Set<string>>(new Set());

    const teacherMap = useMemo(() => new Map(allTeachers.filter(Boolean).map(t => [t.id, t.name])), [allTeachers]);

    const filteredReports = useMemo(() => {
        if (!Array.isArray(reports)) return [];
        return reports.filter(r => {
            if (!r || !r.teacherId) return false;
            const name = teacherMap.get(r.teacherId)?.toLowerCase() || '';
            return name.includes(searchTerm.toLowerCase());
        });
    }, [reports, searchTerm, teacherMap]);

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
        setReports(prev => [newReport, ...(prev || [])]);
    };

    return (
        <div className="space-y-6 w-full max-w-full overflow-x-hidden p-1">
            <div className="flex justify-between items-center gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-primary">تقرير السير في المنهج</h2>
                <button onClick={handleAddNewReport} className="px-4 py-2 bg-primary text-white font-bold rounded-lg shadow-lg text-sm">+ إضافة تقرير</button>
            </div>
            
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <input type="text" placeholder="بحث باسم المعلم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            </div>

            <div className="space-y-3">
                {filteredReports.length > 0 ? filteredReports.map(report => (
                    <ReportEditor 
                        key={report.id}
                        report={report}
                        allReports={reports}
                        allTeachers={allTeachers}
                        onUpdate={upd => setReports(prev => prev.map(r => r.id === upd.id ? upd : r))}
                        onDelete={id => window.confirm('هل تريد الحذف؟') && setReports(prev => prev.filter(r => r.id !== id))}
                        isCollapsed={!collapsedReports.has(report.id)}
                        onToggleCollapse={() => setCollapsedReports(prev => {
                            const next = new Set(prev);
                            if (next.has(report.id)) next.delete(report.id);
                            else next.add(report.id);
                            return next;
                        })}
                    />
                )) : (
                    <div className="text-center py-12 bg-white rounded-lg border border-dashed text-gray-400">لا توجد تقارير حالياً</div>
                )}
            </div>
        </div>
    );
};

export default SyllabusCoverageManager;
