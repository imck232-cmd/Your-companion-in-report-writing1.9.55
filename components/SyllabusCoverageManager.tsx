import React, { useState, useMemo } from 'react';
import { SyllabusCoverageReport, SyllabusBranchProgress, Teacher } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { SUBJECTS, GRADES, SUBJECT_BRANCH_MAP } from '../constants';
import { exportSyllabusCoverage } from '../lib/exportUtils';

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
}> = ({ report, onUpdate, onDelete, allTeachers, allReports }) => {
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
    
    const handleHeaderChange = (field: 'subject' | 'grade' | 'branch' | 'date' | 'semester', value: string) => {
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
            branchToUpdate.lessonDifference = ''; // Reset on status change
            if (value === 'on_track') branchToUpdate.percentage = 75;
            else if (value === 'ahead') branchToUpdate.percentage = 100;
            else if (value === 'behind') branchToUpdate.percentage = 50; // Default for 1 lesson behind
            else branchToUpdate.percentage = 0;
        } else if (field === 'lessonDifference') {
            const numericValue = parseInt(value, 10);
            const difference = isNaN(numericValue) ? 0 : numericValue;
            
            branchToUpdate.lessonDifference = value; // Store the raw string value
            
            if (branchToUpdate.status === 'behind') {
                if (difference <= 0) branchToUpdate.percentage = 75; // Or maybe 50 if empty means 1
                else if (difference === 1) branchToUpdate.percentage = 50;
                else branchToUpdate.percentage = 25;
            } else if (branchToUpdate.status === 'ahead') {
                branchToUpdate.percentage = 100;
            }
        } else {
            (branchToUpdate as any)[field] = value;
        }

        newBranches[branchIndex] = branchToUpdate;
        onUpdate({ ...report, branches: newBranches });
    };
    
    const handleSave = () => {
        setIsSaving(true);
        // This is just for user feedback, as data saves on change
        setTimeout(() => setIsSaving(false), 1500);
    };

    const reportTitle = t('reportTitle')
        .replace('{subject}', report.subject || `(${t('subject')})`)
        .replace('{grade}', report.grade || `(${t('grade')})`)
        .replace('{semester}', report.semester)
        .replace('{academicYear}', report.academicYear);

    const teacherName = teacherMap.get(report.teacherId) || '';
    
    const isOtherSubject = !SUBJECTS.includes(report.subject) || report.subject === 'أخرى';
    const isOtherGrade = !GRADES.includes(report.grade) || report.grade === 'أخرى';

    return (
        <div className="p-4 border-2 border-primary-light rounded-xl space-y-4 bg-white">
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-primary">{report.teacherId ? reportTitle : t('addNewSyllabusReport')}</h3>
                <button onClick={() => onDelete(report.id)} className="text-red-500 hover:text-red-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
            
            <div className="p-2 border rounded-lg bg-gray-50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <select value={report.teacherId} onChange={e => handleTeacherChange(e.target.value)} className="p-2 border rounded w-full">
                    <option value="">-- {t('teacherName')} --</option>
                    {allTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={report.branch} onChange={e => handleHeaderChange('branch', e.target.value)} className="p-2 border rounded w-full">
                    <option value="main">{t('mainBranch')}</option>
                    <option value="boys">{t('boysBranch')}</option>
                    <option value="girls">{t('girlsBranch')}</option>
                </select>
                <input type="date" value={report.date} onChange={e => handleHeaderChange('date', e.target.value)} className="p-2 border rounded w-full" />
                <select value={report.semester} onChange={e => handleHeaderChange('semester', e.target.value)} className="p-2 border rounded w-full">
                    <option value="الأول">{t('semester1')}</option>
                    <option value="الثاني">{t('semester2')}</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex gap-2">
                    <select value={isOtherSubject ? 'other' : report.subject} onChange={e => handleHeaderChange('subject', e.target.value)} className="p-2 border rounded w-full">
                        <option value="">-- {t('subject')} --</option>
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {isOtherSubject && (
                        <input type="text" value={otherSubject} onChange={e => { setOtherSubject(e.target.value); onUpdate({...report, subject: e.target.value }) }} placeholder={t('subject')} className="p-2 border rounded w-full" />
                    )}
                </div>
                 <div className="flex gap-2">
                    <select value={isOtherGrade ? 'other' : report.grade} onChange={e => handleHeaderChange('grade', e.target.value)} className="p-2 border rounded w-full">
                        <option value="">-- {t('grade')} --</option>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                     {isOtherGrade && (
                        <input type="text" value={otherGrade} onChange={e => { setOtherGrade(e.target.value); onUpdate({...report, grade: e.target.value }) }} placeholder={t('grade')} className="p-2 border rounded w-full" />
                    )}
                </div>
            </div>

            {report.branches.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="p-2 border font-semibold">{t('branch')}</th>
                                {report.branches.map(b => <th key={b.branchName} className="p-2 border font-semibold">{b.branchName}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="p-2 border font-semibold">{t('status')}</td>
                                {report.branches.map((b, i) => (
                                    <td key={b.branchName} className="p-2 border text-center">
                                        <select value={b.status} onChange={e => handleBranchUpdate(i, 'status', e.target.value)} className="p-1 border rounded w-full text-sm">
                                            <option value="not_set">--</option>
                                            <option value="ahead">{t('statusAhead')}</option>
                                            <option value="on_track">{t('statusOnTrack')}</option>
                                            <option value="behind">{t('statusBehind')}</option>
                                        </select>
                                        {(b.status === 'ahead' || b.status === 'behind') && (
                                            <input 
                                                type="number" 
                                                value={b.lessonDifference} 
                                                onChange={e => handleBranchUpdate(i, 'lessonDifference', e.target.value)} 
                                                placeholder={b.status === 'ahead' ? t('lessonsAhead') : t('lessonsBehind')}
                                                className="mt-1 p-1 border rounded w-full text-sm" 
                                                min="0"
                                            />
                                        )}
                                    </td>
                                ))}
                            </tr>
                            <tr>
                                <td className="p-2 border font-semibold">{t('lastLesson')}</td>
                                {report.branches.map((b, i) => (
                                    <td key={b.branchName} className="p-2 border">
                                        <input type="text" value={b.lastLesson} onChange={e => handleBranchUpdate(i, 'lastLesson', e.target.value)} className="p-1 border rounded w-full" />
                                    </td>
                                ))}
                            </tr>
                             <tr className="bg-gray-50">
                                <td className="p-2 border font-semibold">{t('percentage')}</td>
                                {report.branches.map(b => (
                                    <td key={b.branchName} className="p-2 border text-center font-bold text-lg text-primary">{b.percentage}%</td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
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


const SyllabusCoverageManager: React.FC<SyllabusCoverageManagerProps> = (props) => {
    const { reports, setReports, school, academicYear, semester, allTeachers } = props;
    const { t } = useLanguage();
    const { currentUser } = useAuth();
    
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
    };

    const handleUpdateReport = (updatedReport: SyllabusCoverageReport) => {
        setReports(prev => prev.map(r => r.id === updatedReport.id ? updatedReport : r));
    };

    const handleDeleteReport = (reportId: string) => {
        if (window.confirm(t('confirmDelete'))) {
            setReports(prev => prev.filter(r => r.id !== reportId));
        }
    };
    
    return (
        <div className="p-6 bg-gray-50 rounded-lg shadow-lg space-y-6">
            <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-bold text-center text-primary">{t('syllabusCoverageReport')}</h2>
                 <button onClick={handleAddReport} className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors">+ {t('addNewSyllabusReport')}</button>
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