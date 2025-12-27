
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SyllabusCoverageReport, SyllabusBranchProgress, Teacher } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { SUBJECTS, GRADES, SUBJECT_BRANCH_MAP } from '../constants';
import { exportSyllabusCoverage } from '../lib/exportUtils';
import CustomizableInputSection from './CustomizableInputSection';
import ImportDataSection from './ImportDataSection';

declare const XLSX: any;

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
    } catch (e) {
        return 0;
    }
};

// دالة تحديد الحالة مع فحص أمان للمتصفحات المحمولة
const getReportStatus = (report: SyllabusCoverageReport): 'ahead' | 'behind' | 'on_track' => {
    if (!report || !report.branches || !Array.isArray(report.branches) || report.branches.length === 0) return 'on_track';
    try {
        if (report.branches.some(b => b?.status === 'behind')) return 'behind';
        if (report.branches.some(b => b?.status === 'ahead')) return 'ahead';
    } catch (e) {
        console.error("Error evaluating status", e);
    }
    return 'on_track';
};

const WhatsAppBulkModal: React.FC<{
    selectedReports: SyllabusCoverageReport[];
    allTeachers: Teacher[];
    onClose: () => void;
    t: (key: any) => string;
}> = ({ selectedReports, allTeachers, onClose, t }) => {
    const teacherMap = useMemo(() => new Map(allTeachers.filter(Boolean).map(t => [t.id, t.name])), [allTeachers]);

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
                const diffs = report.branches.filter(b => b?.lessonDifference).map(b => `${b.branchName}: ${b.lessonDifference} درس`).join('، ');
                if (diffs) content += `   ⚠️ الفارق: ${diffs}\n`;
                const lastLessons = report.branches.map(b => `${b?.branchName}: ${b?.lastLesson || 'لم يحدد'}`).join(' | ');
                content += `   📝 واصل لـ: ${lastLessons}\n`;
            }
            content += `────────────────\n`;
        });

        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100] p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <h3 className="text-xl font-bold text-primary mb-4 border-b pb-2">إرسال التقارير عبر واتساب</h3>
                
                <div className="bg-blue-50 p-4 rounded-lg mb-4 flex flex-col gap-2">
                    <p className="text-sm text-blue-800 font-semibold">
                        تم تحديد {selectedReports.length} تقرير للإرسال.
                    </p>
                    <button 
                        onClick={handleSendCombined}
                        className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-md flex items-center justify-center gap-2 transition-transform transform active:scale-95"
                    >
                        إرسال ملخص مجمع للجميع ({selectedReports.length})
                    </button>
                </div>

                <p className="mb-2 text-gray-600 text-sm font-semibold">أو إرسال تقارير فردية:</p>
                <div className="flex-grow overflow-y-auto space-y-2 border rounded p-2 bg-gray-50">
                    {selectedReports.map((report, idx) => {
                        const teacherName = teacherMap.get(report.teacherId) || 'غير معروف';
                        return (
                            <div key={report.id} className="flex justify-between items-center p-3 border rounded bg-white hover:bg-gray-50">
                                <div className="flex-grow min-w-0">
                                    <span className="font-bold text-gray-800 block truncate">{idx + 1}. {teacherName}</span>
                                    <span className="text-xs text-gray-500 block">{report.subject} - {report.grade}</span>
                                </div>
                                <button 
                                    onClick={() => handleSendIndividual(report)}
                                    className="flex-shrink-0 flex items-center gap-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-bold ml-2"
                                >
                                    <span>إرسال</span>
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
    
    const teacherMap = useMemo(() => new Map(allTeachers.filter(Boolean).map(t => [t.id, t.name])), [allTeachers]);

    const handleTeacherChange = (newTeacherId: string) => {
        const latestReportForTeacher = allReports
            .filter(r => r.teacherId === newTeacherId && r.id !== report.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        onUpdate({
            ...report,
            teacherId: newTeacherId,
            branch: latestReportForTeacher?.branch || report.branch || 'main',
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
                const existing = (report.branches || []).find(b => b?.branchName === branchName);
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
        const newBranches = [...(report.branches || [])];
        const branchToUpdate = { ...newBranches[branchIndex] };

        if (field === 'status') {
            branchToUpdate.status = value as SyllabusBranchProgress['status'];
            branchToUpdate.lessonDifference = ''; 
            if (value === 'on_track' || value === 'ahead') branchToUpdate.percentage = 100;
            else branchToUpdate.percentage = 0;
        } else {
            (branchToUpdate as any)[field] = value;
        }

        newBranches[branchIndex] = branchToUpdate;
        onUpdate({ ...report, branches: newBranches });
    };
    
    const handleFieldUpdate = (field: keyof SyllabusCoverageReport, value: string) => {
        onUpdate({ ...report, [field]: value });
    };

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => setIsSaving(false), 1000);
    };

    const handleDataParsed = (parsedData: any) => {
        if (!parsedData || typeof parsedData !== 'object') return;
        const updatedReport = { ...report };
        if (parsedData.teacherId) {
            const found = allTeachers.find(t => 
                t?.name?.trim().includes(String(parsedData.teacherId).trim()) || 
                String(parsedData.teacherId).trim().includes(t?.name?.trim())
            );
            if (found) updatedReport.teacherId = found.id;
        }
        const simpleFields: (keyof SyllabusCoverageReport)[] = [
            'schoolName', 'academicYear', 'semester', 'subject', 'grade', 'date',
            'meetingsAttended', 'notebookCorrection', 'preparationBook', 'questionsGlossary',
            'programsImplemented', 'strategiesImplemented', 'toolsUsed', 'sourcesUsed',
            'tasksDone', 'testsDelivered', 'peerVisitsDone'
        ];
        simpleFields.forEach(field => {
            if (parsedData[field] !== undefined) (updatedReport as any)[field] = parsedData[field];
        });
        if (parsedData.branches && Array.isArray(parsedData.branches)) {
            updatedReport.branches = parsedData.branches.map((b: any) => ({
                branchName: b.branchName || 'فرع جديد',
                status: b.status || 'not_set',
                lastLesson: b.lastLesson || '',
                lessonDifference: b.lessonDifference || '',
                percentage: b.status === 'on_track' || b.status === 'ahead' ? 100 : 0
            }));
        }
        onUpdate(updatedReport);
        setShowAIImport(false);
    };

    const teacherName = teacherMap.get(report.teacherId) || '';
    const percentageOptions = Array.from({length: 21}, (_, i) => i * 5).map(String);

    if (isCollapsed) {
        return (
            <div className="p-3 border rounded-lg bg-white shadow-sm flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors" onClick={onToggleCollapse}>
                <div className="flex flex-wrap items-center gap-2 md:gap-4 overflow-hidden">
                    <span className="font-bold text-primary truncate max-w-[150px]">{teacherName || t('teacherName')}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-600 truncate max-w-[100px]">{report.subject || t('subject')}</span>
                    <span className="hidden md:inline text-gray-500 text-sm">| {new Date(report.date).toLocaleDateString()}</span>
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap ml-2">توسيع</div>
            </div>
        );
    }

    return (
        <div className="p-2 md:p-4 border-2 border-primary-light rounded-xl space-y-4 bg-white shadow-sm relative max-w-full overflow-hidden">
            <div className="flex justify-between items-start cursor-pointer" onClick={onToggleCollapse}>
                <h3 className="text-base md:text-lg font-semibold text-primary truncate flex-grow">تقرير {teacherName || 'جديد'}</h3>
                <button onClick={(e) => { e.stopPropagation(); onDelete(report.id); }} className="text-red-500 hover:text-red-700 ml-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>

            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                <button onClick={() => setShowAIImport(!showAIImport)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <span>تعبئة ذكية (AI)</span>
                </button>
                {showAIImport && (
                    <div className="mt-3">
                        <ImportDataSection onDataParsed={handleDataParsed} formStructure={{}} />
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg border">
                <div><label className="text-[10px] font-bold block">المعلم</label>
                    <select value={report.teacherId} onChange={e => handleTeacherChange(e.target.value)} className="w-full p-2 border rounded bg-white">
                        <option value="">-- اختر --</option>
                        {allTeachers.filter(Boolean).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div><label className="text-[10px] font-bold block">المادة</label>
                    <select value={!SUBJECTS.includes(report.subject) ? 'other' : report.subject} onChange={e => handleHeaderChange('subject', e.target.value)} className="w-full p-2 border rounded bg-white">
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div><label className="text-[10px] font-bold block">التاريخ</label><input type="date" value={report.date} onChange={e => handleHeaderChange('date', e.target.value)} className="w-full p-2 border rounded bg-white" /></div>
            </div>

            <div className="overflow-x-auto border rounded-lg bg-white">
                <table className="min-w-full text-xs text-right">
                    <thead className="bg-blue-100 text-gray-700">
                        <tr>
                            <th className="p-2 border-l">الفرع</th>
                            <th className="p-2 border-l">آخر درس</th>
                            <th className="p-2">الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(report.branches || []).map((b, i) => (
                            <tr key={i} className="border-t">
                                <td className="p-2 border-l font-bold bg-gray-50 w-24">{b?.branchName}</td>
                                <td className="p-2 border-l"><input type="text" value={b?.lastLesson || ''} onChange={e => handleBranchUpdate(i, 'lastLesson', e.target.value)} className="w-full p-1 border rounded" /></td>
                                <td className="p-2">
                                    <select value={b?.status || 'not_set'} onChange={e => handleBranchUpdate(i, 'status', e.target.value)} className="w-full p-1 border rounded text-[10px]">
                                        <option value="not_set">--</option><option value="on_track">مطابق</option><option value="ahead">متقدم</option><option value="behind">متأخر</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-wrap justify-center gap-2 pt-4 border-t">
                <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold" disabled={isSaving}>{isSaving ? 'جاري الحفظ...' : 'حفظ'}</button>
                <button onClick={() => exportSyllabusCoverage('pdf', report, teacherName, t)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold">PDF</button>
                <button onClick={() => exportSyllabusCoverage('whatsapp', report, teacherName, t)} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold">واتساب</button>
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

    const teacherMap = useMemo(() => new Map(allTeachers.filter(Boolean).map(t => [t.id, t.name])), [allTeachers]);

    // معالجة البيانات بأمان لمنع الانهيار
    const processedReports = useMemo(() => {
        if (!Array.isArray(reports)) return [];
        return reports.filter(r => r && r.id).map(r => ({
            ...r,
            teacherName: teacherMap.get(r.teacherId) || 'غير محدد',
            percentage: calculateOverallPercentage(r),
            status: getReportStatus(r)
        })).filter(r => r.teacherName.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [reports, searchTerm, teacherMap]);

    const handleAddNewReport = () => {
        const newReport: SyllabusCoverageReport = {
            id: `scr-${Date.now()}`,
            schoolName: school, academicYear: academicYear, semester: semester,
            subject: '', grade: '', branches: [], teacherId: '', branch: 'main',
            date: new Date().toISOString().split('T')[0],
        };
        setReports(prev => [newReport, ...(prev || [])]);
        setViewMode('list'); 
    };

    return (
        <div className="space-y-4 w-full overflow-x-hidden p-1">
            <div className="flex justify-between items-center gap-2">
                <h2 className="text-xl font-bold text-primary truncate">تقرير المنهج</h2>
                <button onClick={handleAddNewReport} className="px-3 py-2 bg-primary text-white font-bold rounded-lg text-xs">+ إضافة</button>
            </div>

            <div className="bg-white p-3 rounded-lg shadow-sm border space-y-3">
                <div className="flex gap-2">
                    <input type="text" placeholder="بحث باسم المعلم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-grow p-2 border rounded text-sm" />
                    <button onClick={() => setViewMode(prev => prev === 'list' ? 'table' : 'list')} className="p-2 bg-indigo-100 text-indigo-700 rounded border border-indigo-200">
                        {viewMode === 'list' ? '📊' : '📜'}
                    </button>
                </div>

                {viewMode === 'table' ? (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-xs text-right">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2">المعلم</th>
                                    <th className="p-2 text-center">النسبة</th>
                                    <th className="p-2 text-center">الإجراء</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedReports.map(r => (
                                    <tr key={r.id} className="border-t">
                                        <td className="p-2 font-medium truncate max-w-[120px]">{r.teacherName}</td>
                                        <td className="p-2 text-center font-bold">{r.percentage.toFixed(0)}%</td>
                                        <td className="p-2 text-center"><button onClick={() => { setViewMode('list'); setCollapsedReports(new Set([r.id])); }} className="text-blue-600">فتح</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {processedReports.length > 0 ? processedReports.map(report => (
                            <ReportEditor 
                                key={report.id}
                                report={report}
                                allReports={reports}
                                allTeachers={allTeachers}
                                onUpdate={(upd) => setReports(prev => prev.map(r => r.id === upd.id ? upd : r))}
                                onDelete={(id) => window.confirm('هل تريد الحذف؟') && setReports(prev => prev.filter(r => r.id !== id))}
                                isCollapsed={!collapsedReports.has(report.id)}
                                onToggleCollapse={() => setCollapsedReports(prev => {
                                    const next = new Set(prev);
                                    if (next.has(report.id)) next.delete(report.id);
                                    else next.add(report.id);
                                    return next;
                                })}
                            />
                        )) : <p className="text-center text-gray-400 py-4 text-sm">لا توجد تقارير حالياً</p>}
                    </div>
                )}
            </div>

            {processedReports.length > 0 && (
                <button onClick={() => setShowWhatsAppModal(true)} className="w-full py-3 bg-green-600 text-white rounded-lg font-bold shadow-lg text-sm">
                    إرسال التقارير (واتساب)
                </button>
            )}

            {showWhatsAppModal && (
                <WhatsAppBulkModal 
                    selectedReports={processedReports}
                    allTeachers={allTeachers}
                    onClose={() => setShowWhatsAppModal(false)}
                    t={t}
                />
            )}
        </div>
    );
};

export default SyllabusCoverageManager;
