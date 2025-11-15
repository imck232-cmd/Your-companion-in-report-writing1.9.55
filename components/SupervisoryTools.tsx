import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Meeting, PeerVisit, DeliverySheet, DeliveryRecord, MeetingOutcome, SchoolCalendarEvent, Teacher } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { exportPeerVisits, exportDeliveryRecords, exportMeeting as exportMeetingUtil, exportMeetingSummary as exportMeetingSummaryUtil } from '../lib/exportUtils';
import { useAuth } from '../contexts/AuthContext';
import { SUBJECTS } from '../constants';

type ToolView = 'meeting' | 'calendar' | 'peer_visit' | 'delivery';

// --- Meeting Outcome Card ---
const MeetingOutcomeCard: React.FC<{
    outcome: MeetingOutcome;
    index: number;
    onUpdate: (index: number, field: keyof MeetingOutcome, value: string | number) => void;
    onDelete: (index: number) => void;
}> = ({ outcome, index, onUpdate, onDelete }) => {
    const { t } = useLanguage();
    return (
        <div className="p-4 border-2 border-primary-light/50 rounded-lg bg-white shadow-md space-y-3">
            <div className="flex justify-between items-center">
                <h4 className="font-bold text-primary">{t('outcomeCardTitle')} {index + 1}</h4>
                <button onClick={() => onDelete(index)} className="text-red-500 hover:text-red-700">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                </button>
            </div>
             <textarea value={outcome.outcome} onChange={e => onUpdate(index, 'outcome', e.target.value)} placeholder={t('meetingOutcomes')} className="p-2 border rounded w-full" />
             <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                 <input value={outcome.assignee} onChange={e => onUpdate(index, 'assignee', e.target.value)} placeholder={t('assignee')} className="p-2 border rounded" />
                 <input type="date" value={outcome.deadline} onChange={e => onUpdate(index, 'deadline', e.target.value)} className="p-2 border rounded" />
                 <select value={outcome.status} onChange={e => onUpdate(index, 'status', e.target.value)} className="p-2 border rounded bg-white">
                    <option value="لم يتم">{t('status_not_done')}</option>
                    <option value="قيد التنفيذ">{t('status_in_progress')}</option>
                    <option value="تم التنفيذ">{t('status_done')}</option>
                </select>
             </div>
             {outcome.status === 'تم التنفيذ' && (
                <div className="flex items-center gap-2">
                    <label className="font-semibold">{t('executedWithPercentage')}:</label>
                    <input type="number" value={outcome.completionPercentage} onChange={e => onUpdate(index, 'completionPercentage', parseInt(e.target.value) || 0)} placeholder="%" className="p-2 border rounded w-24" min="0" max="100" />
                </div>
             )}
             <textarea value={outcome.notes || ''} onChange={e => onUpdate(index, 'notes', e.target.value)} placeholder={t('notes')} className="w-full p-2 border rounded h-20" />
        </div>
    );
};

// --- Meeting Minutes Component ---
const MeetingMinutesTool: React.FC<{
    meetings: Meeting[];
    saveMeeting: (meeting: Meeting) => void;
    deleteMeeting: (meetingId: string) => void;
    academicYear: string;
}> = ({ meetings, saveMeeting, deleteMeeting, academicYear }) => {
    const { t } = useLanguage();
    const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [globalStats, setGlobalStats] = useState<any>(null);
    
    const calculateStats = (outcomes: MeetingOutcome[]) => {
        const total = outcomes.length;
        if (total === 0) return { executed: 0, inProgress: 0, notExecuted: 0, percentages: { executed: 0, inProgress: 0, notExecuted: 0 } };
        const executed = outcomes.filter(o => o.status === 'تم التنفيذ').length;
        const inProgress = outcomes.filter(o => o.status === 'قيد التنفيذ').length;
        const notExecuted = outcomes.filter(o => o.status === 'لم يتم').length;
        return {
            total,
            executed,
            inProgress,
            notExecuted,
            percentages: {
                executed: (executed / total) * 100,
                inProgress: (inProgress / total) * 100,
                notExecuted: (notExecuted / total) * 100,
            }
        };
    };

    const handleCalculateGlobalStats = useCallback(() => {
        const { start, end } = dateRange;
        if (!start || !end) return;
        const startDate = new Date(start);
        const endDate = new Date(end);

        const relevantMeetings = meetings.filter(m => {
            const meetingDate = new Date(m.date);
            return meetingDate >= startDate && meetingDate <= endDate;
        });
        
        const allOutcomes = relevantMeetings.flatMap(m => m.outcomes.filter(o => o.outcome));
        setGlobalStats(calculateStats(allOutcomes));
    }, [dateRange, meetings]);
    
    const handleExportSummary = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp') => {
        if (!globalStats) return;
        exportMeetingSummaryUtil({ format, stats: globalStats, dateRange, t });
    };

    const handleNewMeeting = () => {
        setCurrentMeeting({
            id: `meet-${Date.now()}`,
            day: '', date: new Date().toISOString().split('T')[0], time: '',
            subject: '', attendees: '', academicYear,
            outcomes: [{
                id: `out-${Date.now()}`,
                outcome: '', assignee: '', deadline: '', status: 'لم يتم', completionPercentage: 0, notes: ''
            }],
            signatures: {}
        });
    };

    const handleSave = () => {
        if (currentMeeting) {
            // Filter out empty outcomes before saving
            const finalMeeting = {
                ...currentMeeting,
                outcomes: currentMeeting.outcomes.filter(o => o.outcome.trim() !== '')
            };
            saveMeeting(finalMeeting);
            setCurrentMeeting(null);
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!currentMeeting) return;
        setCurrentMeeting({...currentMeeting, [e.target.name]: e.target.value});
    };
    
    const handleOutcomeChange = (index: number, field: keyof MeetingOutcome, value: string | number) => {
        if (!currentMeeting) return;
        const newOutcomes = [...currentMeeting.outcomes];
        (newOutcomes[index] as any)[field] = value;
        setCurrentMeeting({...currentMeeting, outcomes: newOutcomes});
    };
    
    const addOutcome = () => {
        if (!currentMeeting) return;
        const newOutcome: MeetingOutcome = {
            id: `out-${Date.now()}`,
            outcome: '', assignee: '', deadline: '', status: 'لم يتم', completionPercentage: 0, notes: ''
        };
        setCurrentMeeting({...currentMeeting, outcomes: [...currentMeeting.outcomes, newOutcome]});
    }

    const deleteOutcome = (index: number) => {
        if (!currentMeeting || currentMeeting.outcomes.length <= 1) return;
        setCurrentMeeting({
            ...currentMeeting,
            outcomes: currentMeeting.outcomes.filter((_, i) => i !== index)
        });
    };

    const handleSign = (attendeeName: string) => {
        if (!currentMeeting) return;
        const newSignatures = { ...currentMeeting.signatures };
        newSignatures[attendeeName] = t('signatureText');
        setCurrentMeeting({ ...currentMeeting, signatures: newSignatures });
    };
    
    const localStats = useMemo(() => {
        if (!currentMeeting) return null;
        return calculateStats(currentMeeting.outcomes.filter(o => o.outcome));
    }, [currentMeeting]);

    if (currentMeeting) {
        const attendeeList = currentMeeting.attendees.split('\n').map(s => s.trim()).filter(Boolean);
        return (
            <div className="p-4 border rounded-lg space-y-4 bg-gray-50">
                <h3 className="text-xl font-bold text-primary">{t('meetingMinutes')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" name="day" value={currentMeeting.day} onChange={handleChange} placeholder={t('meetingDay')} className="p-2 border rounded" />
                    <input type="date" name="date" value={currentMeeting.date} onChange={handleChange} className="p-2 border rounded" />
                    <input type="time" name="time" value={currentMeeting.time} onChange={handleChange} className="p-2 border rounded" />
                </div>
                <input type="text" name="subject" value={currentMeeting.subject} onChange={handleChange} placeholder={t('meetingWith')} className="w-full p-2 border rounded" />
                
                <div className="space-y-4">
                    {currentMeeting.outcomes.map((outcome, index) => (
                        <MeetingOutcomeCard key={outcome.id} outcome={outcome} index={index} onUpdate={handleOutcomeChange} onDelete={deleteOutcome} />
                    ))}
                    <button onClick={addOutcome} className="w-full py-2 bg-sky-100 text-sky-700 font-semibold rounded-lg hover:bg-sky-200 transition">+ {t('addNewItem')}</button>
                </div>

                {localStats && localStats.total > 0 && (
                    <div className="p-3 bg-primary-light/10 rounded-lg text-center space-y-2 border border-primary-light/50">
                        <h4 className="font-bold text-primary">{t('summaryForThisMeeting')}</h4>
                        <div className="flex justify-around flex-wrap gap-2 text-sm">
                            <span className="font-semibold">{t('totalOutcomes')}: {localStats.total}</span>
                            <span className="text-green-600 font-semibold">✅ {t('executed')}: {localStats.executed} ({localStats.percentages.executed.toFixed(0)}%)</span>
                            <span className="text-yellow-600 font-semibold">⏳ {t('inProgress')}: {localStats.inProgress} ({localStats.percentages.inProgress.toFixed(0)}%)</span>
                            <span className="text-red-600 font-semibold">❌ {t('notExecuted')}: {localStats.notExecuted} ({localStats.percentages.notExecuted.toFixed(0)}%)</span>
                        </div>
                    </div>
                )}

                <textarea name="attendees" value={currentMeeting.attendees} onChange={handleChange} placeholder={`${t('attendees')} (كل اسم في سطر)`} className="w-full p-2 border rounded h-24" />
                
                {attendeeList.length > 0 && (
                    <div>
                        <h4 className="font-semibold mt-4">{t('signature')}</h4>
                        <div className="space-y-2 p-2 border rounded bg-white">
                            {attendeeList.map(name => (
                                <div key={name} className="flex items-center justify-between">
                                    <span>{name}</span>
                                    {currentMeeting.signatures[name] ? <span className="text-green-600 text-sm">✓ {t('signed')}</span> : <button onClick={() => handleSign(name)} className="text-sm bg-blue-500 text-white px-2 py-1 rounded">{t('sign')}</button>}
                                </div>
                            ))}
                            <textarea value={Object.entries(currentMeeting.signatures).map(([name, sig]) => `${name}: ${sig}`).join('\n')} readOnly className="w-full p-2 border rounded bg-gray-100 h-24 mt-2" />
                        </div>
                    </div>
                )}


                 <div className="flex flex-wrap justify-center gap-3 pt-4 border-t">
                    <button onClick={handleSave} className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">{t('saveWork')}</button>
                    <button onClick={() => setCurrentMeeting(null)} className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">{t('cancel')}</button>
                    <button onClick={() => exportMeetingUtil({ format: 'pdf', meeting: currentMeeting })} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('exportPdf')}</button>
                    <button onClick={() => exportMeetingUtil({ format: 'excel', meeting: currentMeeting })} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{t('exportExcel')}</button>
                    <button onClick={() => exportMeetingUtil({ format: 'whatsapp', meeting: currentMeeting })} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">{t('sendToWhatsApp')}</button>
                </div>
            </div>
        )
    }

    return (
        <div>
            {/* Global Stats Section */}
            <div className="p-4 border rounded-lg bg-gray-50 space-y-3 mb-6">
                <h3 className="text-xl font-bold text-center text-primary">{t('summaryForAllMeetings')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div><label className="text-sm font-medium">{t('from_date')}</label><input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} className="w-full p-2 border rounded" /></div>
                    <div><label className="text-sm font-medium">{t('to_date')}</label><input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} className="w-full p-2 border rounded" /></div>
                    <button onClick={handleCalculateGlobalStats} className="w-full px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90">{t('calculate')}</button>
                </div>
                {globalStats && (
                    <div className="p-3 bg-primary-light/10 rounded-lg text-center space-y-2 border border-primary-light/50">
                        <div className="flex justify-around flex-wrap gap-2 text-md">
                            <span className="font-bold">{t('totalOutcomes')}: {globalStats.total}</span>
                            <span className="text-green-700 font-bold">✅ {t('executed')}: {globalStats.executed} ({globalStats.percentages.executed.toFixed(0)}%)</span>
                            <span className="text-yellow-700 font-bold">⏳ {t('inProgress')}: {globalStats.inProgress} ({globalStats.percentages.inProgress.toFixed(0)}%)</span>
                            <span className="text-red-700 font-bold">❌ {t('notExecuted')}: {globalStats.notExecuted} ({globalStats.percentages.notExecuted.toFixed(0)}%)</span>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 pt-2">
                             <button onClick={() => handleExportSummary('pdf')} className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600">{t('exportPdf')}</button>
                             <button onClick={() => handleExportSummary('excel')} className="px-3 py-1 text-sm bg-emerald-500 text-white rounded hover:bg-emerald-600">{t('exportExcel')}</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-primary">{t('meetingMinutes')}</h3>
                <button onClick={handleNewMeeting} className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors">+ {t('addNewItem')}</button>
            </div>
             <div className="space-y-3">
                {meetings.map(meeting => (
                    <div key={meeting.id} className="p-4 border rounded flex justify-between items-center bg-white shadow-sm">
                       <p className="font-semibold">{meeting.subject} - {meeting.date}</p>
                       <div>
                           <button onClick={() => setCurrentMeeting(meeting)} className="text-sm text-blue-600 px-2">{t('edit')}</button>
                           <button onClick={() => window.confirm(t('confirmDelete')) && deleteMeeting(meeting.id)} className="text-sm text-red-600 px-2">{t('delete')}</button>
                       </div>
                    </div>
                ))}
             </div>
        </div>
    );
};


// --- School Calendar Component ---
const SchoolCalendarTool: React.FC<{}> = () => {
    const {t} = useLanguage();
    const [text, setText] = useState('');
    return (
        <div className="p-4 border rounded-lg space-y-4">
             <h3 className="text-xl font-bold text-primary">{t('schoolCalendar')}</h3>
             <textarea className="w-full p-2 border rounded h-40" value={text} onChange={e=>setText(e.target.value)} placeholder="ألصق النص هنا..."></textarea>
             <div className="flex gap-4">
                 <button className="px-4 py-2 bg-sky-500 text-white rounded">{t('uploadImage')}</button>
                 <button className="px-4 py-2 bg-sky-500 text-white rounded">{t('uploadFile')}</button>
             </div>
        </div>
    );
}

// --- Peer Visits Component ---
const PeerVisitsTool: React.FC<{
    visits: PeerVisit[];
    setVisits: React.Dispatch<React.SetStateAction<PeerVisit[]>>;
    deleteVisit: (visitId: string) => void;
    academicYear: string;
}> = ({ visits, setVisits, deleteVisit, academicYear }) => {
    const {t} = useLanguage();
    const { currentUser } = useAuth();

    const visitStats = useMemo(() => {
        const activeVisits = visits.filter(v => v.visitingTeacher.trim() !== '');
        const completed = activeVisits.filter(v => v.status === 'تمت الزيارة').length;
        const inProgress = activeVisits.filter(v => v.status === 'قيد التنفيذ').length;
        const notCompleted = activeVisits.filter(v => (v.status === 'لم تتم' || !v.status)).length;
        return { completed, inProgress, notCompleted };
    }, [visits]);

    const handleUpdate = (id: string, field: keyof PeerVisit, value: string) => {
        const updated = visits.map(v => v.id === id ? {...v, [field]: value} : v);
        setVisits(updated);

        const lastVisit = updated[updated.length - 1];
        if (id === lastVisit.id && Object.values(lastVisit).some(val => typeof val === 'string' && val.trim() !== '')) {
            addVisit();
        }
    };
    
    const addVisit = () => {
        setVisits(prev => [...prev, { 
            id: `pv-${Date.now()}`, 
            visitingTeacher: '', visitingSubject: '', visitingGrade: '', 
            visitedTeacher: '', visitedSpecialization: '', visitedSubject: '', visitedGrade: '',
            status: 'لم تتم',
            authorId: currentUser?.id,
            academicYear: academicYear
        }]);
    };
    
    const handleSave = () => {
        alert(t('saveWork'));
    }

    // FIX: Changed useState to useEffect to run logic on mount.
    useEffect(() => {
        if (visits.length === 0) addVisit();
    }, []);

    return (
         <div className="p-4 border rounded-lg space-y-4">
            <h3 className="text-xl font-bold text-primary">{t('peerVisits')}</h3>
            
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                <div className="p-3 bg-green-100 text-green-800 rounded-lg shadow">
                    <p className="font-bold text-2xl">{visitStats.completed}</p>
                    <p className="text-sm">تمت الزيارة</p>
                </div>
                <div className="p-3 bg-yellow-100 text-yellow-800 rounded-lg shadow">
                    <p className="font-bold text-2xl">{visitStats.inProgress}</p>
                    <p className="text-sm">قيد التنفيذ</p>
                </div>
                <div className="p-3 bg-red-100 text-red-800 rounded-lg shadow">
                    <p className="font-bold text-2xl">{visitStats.notCompleted}</p>
                    <p className="text-sm">لم تتم</p>
                </div>
            </div>

            <div className="space-y-3">
            {visits.map((visit) => (
                 <div key={visit.id} className="p-3 border rounded-md grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-center">
                    <input value={visit.visitingTeacher} onChange={e => handleUpdate(visit.id, 'visitingTeacher', e.target.value)} placeholder={t('visitingTeacher')} className="p-1 border rounded" />
                    <input value={visit.visitingSubject} onChange={e => handleUpdate(visit.id, 'visitingSubject', e.target.value)} placeholder={t('visitingSubject')} className="p-1 border rounded" />
                    <input value={visit.visitingGrade} onChange={e => handleUpdate(visit.id, 'visitingGrade', e.target.value)} placeholder={t('visitingGrade')} className="p-1 border rounded" />
                    <input value={visit.visitedTeacher} onChange={e => handleUpdate(visit.id, 'visitedTeacher', e.target.value)} placeholder={t('visitedTeacher')} className="p-1 border rounded" />
                    <input value={visit.visitedSpecialization} onChange={e => handleUpdate(visit.id, 'visitedSpecialization', e.target.value)} placeholder={t('visitedSpecialization')} className="p-1 border rounded" />
                    <input value={visit.visitedSubject} onChange={e => handleUpdate(visit.id, 'visitedSubject', e.target.value)} placeholder={t('visitedSubject')} className="p-1 border rounded" />
                    <input value={visit.visitedGrade} onChange={e => handleUpdate(visit.id, 'visitedGrade', e.target.value)} placeholder={t('visitedGrade')} className="p-1 border rounded" />
                    <select
                        value={visit.status || 'لم تتم'}
                        onChange={e => handleUpdate(visit.id, 'status', e.target.value as any)}
                        className="p-1.5 border rounded"
                    >
                        <option value="تمت الزيارة">تمت الزيارة</option>
                        <option value="قيد التنفيذ">قيد التنفيذ</option>
                        <option value="لم تتم">لم تتم</option>
                    </select>
                    <div className="flex justify-end">
                         <button onClick={() => deleteVisit(visit.id)} className="text-red-500 hover:text-red-700 p-1 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                         </button>
                    </div>
                 </div>
            ))}
            </div>
            {/* FIX: Fixed broken button JSX and added export buttons. */}
            <div className="flex flex-wrap justify-center gap-3 pt-4 border-t">
                <button onClick={handleSave} className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">{t('saveWork')}</button>
                <button onClick={() => exportPeerVisits({ format: 'pdf', visits, academicYear })} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('exportPdf')}</button>
                <button onClick={() => exportPeerVisits({ format: 'excel', visits, academicYear })} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{t('exportExcel')}</button>
                <button onClick={() => exportPeerVisits({ format: 'whatsapp', visits, academicYear })} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">{t('sendToWhatsApp')}</button>
            </div>
        </div>
    );
};

// --- Delivery Records Component ---
const DeliverySheetsTool: React.FC<{
    deliverySheets: DeliverySheet[];
    setDeliverySheets: React.Dispatch<React.SetStateAction<DeliverySheet[]>>;
    deleteDeliverySheet: (sheetId: string) => void;
    allTeachers: Teacher[];
    academicYear: string;
}> = ({ deliverySheets, setDeliverySheets, deleteDeliverySheet, allTeachers, academicYear }) => {
    const { t } = useLanguage();
    const { currentUser } = useAuth();
    const [activeSheetId, setActiveSheetId] = useState<string | null>(null);

    const handleNewSheet = () => {
        const name = window.prompt(t('sheetName'));
        if (name) {
            const newSheet: DeliverySheet = {
                id: `sheet-${Date.now()}`,
                name,
                records: allTeachers.map(teacher => ({
                    id: `rec-${teacher.id}`,
                    teacherId: teacher.id,
                    teacherName: teacher.name,
                    grade: teacher.gradesTaught || '',
                    subject: teacher.subjects || '',
                    formCount: '',
                    receiveDate: '',
                    deliveryDate: ''
                })),
                authorId: currentUser?.id,
                academicYear: academicYear,
            };
            setDeliverySheets(prev => [...prev, newSheet]);
            setActiveSheetId(newSheet.id);
        }
    };
    
    const activeSheet = useMemo(() => deliverySheets.find(s => s.id === activeSheetId), [deliverySheets, activeSheetId]);

    const handleUpdateRecord = (recordId: string, field: keyof DeliveryRecord, value: string) => {
        if (!activeSheet) return;
        const newRecords = activeSheet.records.map(r => r.id === recordId ? {...r, [field]: value} : r);
        const newSheet = {...activeSheet, records: newRecords};
        setDeliverySheets(prev => prev.map(s => s.id === newSheet.id ? newSheet : s));
    };

    if (activeSheet) {
        return (
            <div>
                <button onClick={() => setActiveSheetId(null)} className="mb-2 text-sm text-blue-600">&larr; {t('back')}</button>
                <h3 className="text-xl font-bold text-primary">{activeSheet.name}</h3>
                <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm border-collapse">
                        <thead><tr className="bg-gray-100">
                           {['المعلم', 'الصف', 'المادة', 'عدد النماذج', 'تاريخ الاستلام', 'تاريخ التسليم'].map(h => <th key={h} className="p-2 border">{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {activeSheet.records.map(record => (
                                <tr key={record.id}>
                                    <td className="p-1 border">{record.teacherName}</td>
                                    <td className="p-1 border"><input value={record.grade} onChange={e => handleUpdateRecord(record.id, 'grade', e.target.value)} className="w-full p-1 bg-transparent" /></td>
                                    <td className="p-1 border"><input value={record.subject} onChange={e => handleUpdateRecord(record.id, 'subject', e.target.value)} className="w-full p-1 bg-transparent" /></td>
                                    <td className="p-1 border"><input type="number" value={record.formCount} onChange={e => handleUpdateRecord(record.id, 'formCount', e.target.value)} className="w-full p-1 bg-transparent" /></td>
                                    <td className="p-1 border"><input type="date" value={record.receiveDate} onChange={e => handleUpdateRecord(record.id, 'receiveDate', e.target.value)} className="w-full p-1 bg-transparent" /></td>
                                    <td className="p-1 border"><input type="date" value={record.deliveryDate} onChange={e => handleUpdateRecord(record.id, 'deliveryDate', e.target.value)} className="w-full p-1 bg-transparent" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="flex flex-wrap justify-center gap-3 pt-4 border-t">
                     <button onClick={() => exportDeliveryRecords({ format: 'pdf', records: activeSheet.records, sheetName: activeSheet.name, academicYear })} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('exportPdf')}</button>
                     <button onClick={() => exportDeliveryRecords({ format: 'excel', records: activeSheet.records, sheetName: activeSheet.name, academicYear })} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{t('exportExcel')}</button>
                     <button onClick={() => exportDeliveryRecords({ format: 'whatsapp', records: activeSheet.records, sheetName: activeSheet.name, academicYear })} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">{t('sendToWhatsApp')}</button>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 border rounded-lg space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-primary">{t('deliveryRecords')}</h3>
                <button onClick={handleNewSheet} className="px-3 py-1.5 bg-primary text-white font-semibold rounded-lg hover:bg-opacity-90">+ {t('addNewSheet')}</button>
            </div>
            <div className="space-y-2">
                {deliverySheets.map(sheet => (
                    <div key={sheet.id} className="p-2 border rounded flex justify-between items-center bg-white shadow-sm">
                        <span className="font-semibold">{sheet.name}</span>
                        <div>
                            <button onClick={() => setActiveSheetId(sheet.id)} className="text-sm text-blue-600 px-2">{t('edit')}</button>
                             <button onClick={() => window.confirm(t('confirmDelete')) && deleteDeliverySheet(sheet.id)} className="text-sm text-red-600 px-2">{t('delete')}</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Supervisory Tools Component ---
const SupervisoryTools: React.FC<{
    meetings: Meeting[];
    saveMeeting: (meeting: Meeting) => void;
    deleteMeeting: (meetingId: string) => void;
    peerVisits: PeerVisit[];
    setPeerVisits: React.Dispatch<React.SetStateAction<PeerVisit[]>>;
    deletePeerVisit: (visitId: string) => void;
    deliverySheets: DeliverySheet[];
    setDeliverySheets: React.Dispatch<React.SetStateAction<DeliverySheet[]>>;
    deleteDeliverySheet: (sheetId: string) => void;
    allTeachers: Teacher[];
    academicYear: string;
}> = (props) => {
    const { hasPermission } = useAuth();
    const { meetings, saveMeeting, deleteMeeting, peerVisits, setPeerVisits, deletePeerVisit, deliverySheets, setDeliverySheets, deleteDeliverySheet, allTeachers, academicYear } = props;
    const { t } = useLanguage();
    const [activeTool, setActiveTool] = useState<ToolView>('meeting');

    const getButtonClass = (tool: ToolView) => `px-4 py-2 rounded-lg font-semibold transition-colors ${activeTool === tool ? 'bg-primary text-white' : 'bg-gray-200 hover:bg-gray-300'}`;

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
            <h2 className="text-2xl font-bold text-center text-primary">{t('supervisoryTools')}</h2>
            <div className="flex flex-wrap justify-center gap-3 border-b pb-4">
                {hasPermission('view_meeting_minutes') && <button onClick={() => setActiveTool('meeting')} className={getButtonClass('meeting')}>{t('meetingMinutes')}</button>}
                {hasPermission('view_school_calendar') && <button onClick={() => setActiveTool('calendar')} className={getButtonClass('calendar')}>{t('schoolCalendar')}</button>}
                {hasPermission('view_peer_visits') && <button onClick={() => setActiveTool('peer_visit')} className={getButtonClass('peer_visit')}>{t('peerVisits')}</button>}
                {hasPermission('view_delivery_records') && <button onClick={() => setActiveTool('delivery')} className={getButtonClass('delivery')}>{t('deliveryRecords')}</button>}
            </div>
            <div>
                {activeTool === 'meeting' && <MeetingMinutesTool meetings={meetings} saveMeeting={saveMeeting} deleteMeeting={deleteMeeting} academicYear={academicYear} />}
                {activeTool === 'calendar' && <SchoolCalendarTool />}
                {activeTool === 'peer_visit' && <PeerVisitsTool visits={peerVisits} setVisits={setPeerVisits} deleteVisit={deletePeerVisit} academicYear={academicYear} />}
                {activeTool === 'delivery' && <DeliverySheetsTool deliverySheets={deliverySheets} setDeliverySheets={setDeliverySheets} deleteDeliverySheet={deleteDeliverySheet} allTeachers={allTeachers} academicYear={academicYear} />}
            </div>
        </div>
    );
};

export default SupervisoryTools;