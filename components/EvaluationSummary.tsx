import React, { useState, useMemo } from 'react';
import { Report, Teacher, ClassSessionEvaluationReport } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { calculateReportPercentage } from '../lib/exportUtils';
import useLocalStorage from '../hooks/useLocalStorage';

interface EvaluationSummaryProps {
    reports: Report[];
    teachers: Teacher[];
    onViewReport: (teacherId: string, reportId: string) => void;
}

type SummaryView = 'general' | 'brief' | 'extended' | 'subject_specific' | null;
type SortKey = 'date' | 'name' | 'subject' | 'grade' | 'percentage' | 'bookmark';

const StarIcon: React.FC<{ bookmarked: boolean }> = ({ bookmarked }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 cursor-pointer ${bookmarked ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`} viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

const EvaluationSummary: React.FC<EvaluationSummaryProps> = ({ reports, teachers, onViewReport }) => {
    const { t } = useLanguage();
    const [activeView, setActiveView] = useState<SummaryView>(null);
    const [semesterFilter, setSemesterFilter] = useState<'الأول' | 'الثاني' | 'all'>('all');
    const [sortKey, setSortKey] = useState<SortKey>('date');
    const [bookmarkedReportIds, setBookmarkedReportIds] = useLocalStorage<string[]>('bookmarkedReportIds', []);

    const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t.name])), [teachers]);

    const toggleBookmark = (reportId: string) => {
        setBookmarkedReportIds(prev =>
            prev.includes(reportId) ? prev.filter(id => id !== reportId) : [...prev, reportId]
        );
    };

    const sortedReports = useMemo(() => {
        if (!activeView) return [];

        let filtered = reports.filter(r => {
            if (activeView === 'general') return r.evaluationType === 'general';
            if (activeView === 'brief') return r.evaluationType === 'class_session' && (r as ClassSessionEvaluationReport).subType === 'brief';
            if (activeView === 'extended') return r.evaluationType === 'class_session' && (r as ClassSessionEvaluationReport).subType === 'extended';
            if (activeView === 'subject_specific') return r.evaluationType === 'class_session' && (r as ClassSessionEvaluationReport).subType === 'subject_specific';
            return false;
        });

        if (semesterFilter !== 'all') {
            filtered = filtered.filter(r => r.semester === semesterFilter);
        }

        const enriched = filtered.map(r => ({
            ...r,
            teacherName: teacherMap.get(r.teacherId) || 'Unknown',
            percentage: calculateReportPercentage(r),
            isBookmarked: bookmarkedReportIds.includes(r.id),
        }));

        return enriched.sort((a, b) => {
            if (sortKey === 'bookmark') {
                return (b.isBookmarked ? 1 : 0) - (a.isBookmarked ? 1 : 0);
            }
            if (sortKey === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
            if (sortKey === 'name') return a.teacherName.localeCompare(b.teacherName, 'ar');
            if (sortKey === 'subject') return (a.subject || '').localeCompare(b.subject || '', 'ar');
            if (sortKey === 'grade') return (a.grades || '').localeCompare(b.grades || '', 'ar');
            if (sortKey === 'percentage') return b.percentage - a.percentage;
            return 0;
        });
    }, [activeView, reports, semesterFilter, sortKey, teacherMap, bookmarkedReportIds]);

    const renderTable = () => {
        if (!activeView) return null;
        return (
            <div>
                <button onClick={() => setActiveView(null)} className="mb-4 text-sky-600 hover:underline">&larr; {t('back')}</button>
                <div className="flex flex-wrap gap-4 p-4 mb-4 bg-gray-100 rounded-lg">
                    <div>
                        <label className="text-sm font-semibold">{t('semesterLabel')}</label>
                        <select value={semesterFilter} onChange={e => setSemesterFilter(e.target.value as any)} className="w-full p-2 border rounded">
                            <option value="all">{t('semesterAll')}</option>
                            <option value="الأول">{t('semester1')}</option>
                            <option value="الثاني">{t('semester2')}</option>
                        </select>
                    </div>
                     <div>
                        <label className="text-sm font-semibold">{t('sortBy')}</label>
                        <select value={sortKey} onChange={e => setSortKey(e.target.value as any)} className="w-full p-2 border rounded">
                            <option value="date">{t('sort_date')}</option>
                            <option value="name">{t('sort_name')}</option>
                            <option value="subject">{t('sort_subject')}</option>
                            <option value="grade">{t('sort_grade')}</option>
                            <option value="percentage">{t('sort_percentage')}</option>
                            <option value="bookmark">{t('sort_bookmark')}</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-2 py-3">{t('bookmark')}</th>
                                <th scope="col" className="px-6 py-3">{t('teacherName')}</th>
                                <th scope="col" className="px-6 py-3">{t('date')}</th>
                                <th scope="col" className="px-6 py-3">{t('semester')}</th>
                                <th scope="col" className="px-6 py-3">{t('subject')}</th>
                                <th scope="col" className="px-6 py-3">{t('grade')}</th>
                                <th scope="col" className="px-6 py-3">{t('performancePercentage')}</th>
                                <th scope="col" className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedReports.map(report => (
                                <tr key={report.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-2 py-4"><button onClick={() => toggleBookmark(report.id)} title={t('bookmark')}><StarIcon bookmarked={report.isBookmarked} /></button></td>
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{report.teacherName}</td>
                                    <td className="px-6 py-4">{new Date(report.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">{report.semester}</td>
                                    <td className="px-6 py-4">{report.subject}</td>
                                    <td className="px-6 py-4">{report.grades}</td>
                                    <td className="px-6 py-4 font-bold">{report.percentage.toFixed(2)}%</td>
                                    <td className="px-6 py-4"><button onClick={() => onViewReport(report.teacherId, report.id)} className="font-medium text-blue-600 hover:underline">{t('viewReport')}</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    const typeBoxes = [
        { key: 'general', label: t('generalEvaluation') },
        { key: 'brief', label: t('briefClassSessionEvaluation') },
        { key: 'extended', label: t('extendedClassSessionEvaluation') },
        { key: 'subject_specific', label: t('subjectSpecificClassSessionEvaluation') },
    ];

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
            <h2 className="text-2xl font-bold text-center text-primary">{t('evaluationSummary')}</h2>
            
            {activeView ? renderTable() : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {typeBoxes.map(box => (
                        <button key={box.key} onClick={() => setActiveView(box.key as SummaryView)} className="p-8 text-center bg-primary-light text-white rounded-lg shadow-md hover:shadow-lg hover:bg-primary transition-all transform hover:-translate-y-1">
                            <h3 className="text-xl font-bold">{box.label}</h3>
                            <p className="mt-2 text-sm opacity-90">{t('totalVisits')}: {reports.filter(r => (r.evaluationType === 'general' && box.key === 'general') || (r.evaluationType === 'class_session' && (r as any).subType === box.key)).length}</p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EvaluationSummary;
