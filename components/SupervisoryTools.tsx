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
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
            <textarea value={outcome.outcome} onChange={e => onUpdate(index, 'outcome', e.target.value)} placeholder={t('meetingOutcomes')} className="w-full p-2 border rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="text" value={outcome.assignee} onChange={e => onUpdate(index, 'assignee', e.target.value)} placeholder={t('assignee')} className="p-2 border rounded" />
                <input type="date" value={outcome.deadline} onChange={e => onUpdate(index, 'deadline', e.target.value)} className="p-2 border rounded" />
                <select value={outcome.status} onChange={e => onUpdate(index, 'status', e.target.value)} className="p-2 border rounded">
                    <option value="لم يتم">{t('status_not_done')}</option>
                    <option value="قيد التنفيذ">{t('status_in_progress')}</option>
                    <option value="تم التنفيذ">{t('status_done')}</option>
                </select>
                 <select value={outcome.completionPercentage} onChange={e => onUpdate(index, 'completionPercentage', e.target.value)} className="p-2 border rounded">
                    {[0, 25, 50, 75, 100].map(p => <option key={p} value={p}>{p}%</option>)}
                </select>
            </div>
            <textarea value={outcome.notes || ''} onChange={e => onUpdate(index, 'notes', e.target.value)} placeholder={t('notes')} className="w-full p-2 border rounded" />
        </div>
    );
}

// --- Meeting Minutes Component ---
const MeetingMinutes: React.FC<{
    meetings: Meeting[];
    saveMeeting: (meeting: Meeting) => void;
    deleteMeeting: (meetingId: string) => void;
    allTeachers: Teacher[];
    academicYear: string;
}> = ({ meetings, saveMeeting, deleteMeeting, allTeachers, academicYear }) => {
    const { t } = useLanguage();
    const { currentUser } = useAuth();
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

    const handleNewMeeting = () => {
        setSelectedMeeting({
            id: `meeting-${Date.now()}`,
            day: '', date: new Date().toISOString().split('T')[0], time: '',
            attendees: '', subject: '', outcomes: [{id:`o-0`, outcome:'', assignee:'', deadline:'', status: 'لم يتم', completionPercentage: 0}],
            signatures: {},
            academicYear: academicYear,
            authorId: currentUser?.id
        });
    };

    const handleUpdateMeeting = (field: keyof Meeting, value: any) => {
        if (!selectedMeeting) return;
        setSelectedMeeting(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleOutcomeUpdate = (index: number, field: keyof MeetingOutcome, value: string | number) => {
        if (!selectedMeeting) return;
        const newOutcomes = [...selectedMeeting.outcomes];
        (newOutcomes[index] as any)[field] = value;
        handleUpdateMeeting('outcomes', newOutcomes);
    };

    const addOutcome = () => {
         if (!selectedMeeting) return;
         const newOutcomes = [...selectedMeeting.outcomes, {id: `o-${Date.now()}`, outcome:'', assignee:'', deadline:'', status: 'لم يتم', completionPercentage: 0}];
         handleUpdateMeeting('outcomes', newOutcomes);
    };
    
    const deleteOutcome = (index: number) => {
        if (!selectedMeeting) return;
        const newOutcomes = selectedMeeting.outcomes.filter((_, i) => i !== index);
        handleUpdateMeeting('outcomes', newOutcomes);
    }
    
    const handleSign = (attendeeName: string) => {
        if (!selectedMeeting || !currentUser) return;
        // Simplified signature using current user's name
        const newSignatures = { ...selectedMeeting.signatures, [attendeeName]: currentUser.name };
        handleUpdateMeeting('signatures', newSignatures);
    }

    const handleSave = () => {
        if (selectedMeeting) {
            saveMeeting(selectedMeeting);
            setSelectedMeeting(null);
        }
    }
    
    const getStatsForMeeting = (meeting: Meeting) => {
        const total = meeting.outcomes.filter(o => o.outcome).length;
        if(total === 0) return { total: 0, executed: 0, inProgress: 0, notExecuted: 0, percentages: { executed: 0, inProgress: 0, notExecuted: 0 }};
        const executed = meeting.outcomes.filter(o => o.status === 'تم التنفيذ').length;
        const inProgress = meeting.outcomes.filter(o => o.status === 'قيد التنفيذ').length;
        const notExecuted = total - executed - inProgress;
        return {
            total, executed, inProgress, notExecuted,
            percentages: {
                executed: (executed / total) * 100,
                inProgress: (inProgress / total) * 100,
                notExecuted: (notExecuted / total) * 100,
            }
        };
    };

    const allOutcomes = useMemo(() => meetings.flatMap(m => m.outcomes.filter(o => o.outcome)), [meetings]);
    const overallStats = useMemo(() => {
        const total = allOutcomes.length;
        if (total === 0) return null;
        const executed = allOutcomes.filter(o => o.status === 'تم التنفيذ').length;
        const inProgress = allOutcomes.filter(o => o.status === 'قيد التنفيذ').length;
        return {
            total, executed, inProgress, notExecuted: total - executed - inProgress,
            percentages: {
                executed: (executed / total) * 100,
                inProgress: (inProgress / total) * 100,
                notExecuted: ((total - executed - inProgress) / total) * 100,
            }
        };
    }, [allOutcomes]);

    if (selectedMeeting) {
        const stats = getStatsForMeeting(selectedMeeting);
        return (
            <div className="p-4 bg-gray-50 border rounded-lg space-y-4">
                 <button onClick={() => setSelectedMeeting(null)} className="mb-4 text-sky-600 hover:underline">&larr; {t('back')}</button>
                 <h3 className="text-xl font-bold text-primary">{t('meetingReport')}</h3>
                 {/* Inputs for day, date, time, subject */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <input type="text" value={selectedMeeting.day} onChange={e => handleUpdateMeeting('day', e.target.value)} placeholder={t('meetingDay')} className="p-2 border rounded" />
                    <input type="date" value={selectedMeeting.date} onChange={e => handleUpdateMeeting('date', e.target.value)} className="p-2 border rounded" />
                    <input type="time" value={selectedMeeting.time} onChange={e => handleUpdateMeeting('time', e.target.value)} className="p-2 border rounded" />
                    <input type="text" value={selectedMeeting.subject} onChange={e => handleUpdateMeeting('subject', e.target.value)} placeholder={t('meetingWith')} className="p-2 border rounded" />
                 </div>
                 
                {/* Outcomes */}
                <div className="space-y-4">
                    {selectedMeeting.outcomes.map((o, i) => <MeetingOutcomeCard key={o.id} outcome={o} index={i} onUpdate={handleOutcomeUpdate} onDelete={deleteOutcome} />)}
                </div>
                <button onClick={addOutcome} className="px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600">+ {t('addNewItem')}</button>
                
                {/* Attendees and Signatures */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="font-semibold">{t('attendees')}</label>
                        <textarea value={selectedMeeting.attendees} onChange={e => handleUpdateMeeting('attendees', e.target.value)} placeholder="اسم، اسم، ..." className="w-full p-2 border rounded h-24" />
                     </div>
                     <div className="p-4 border rounded-lg bg-white">
                         <h4 className="font-semibold text-center mb-2">{t('signature')}</h4>
                         <p className="text-xs text-center text-gray-500 mb-3">{t('signatureText')}</p>
                         <div className="space-y-2">
                            {selectedMeeting.attendees.split(/[,،]/).map(name => name.trim()).filter(Boolean).map(name => (
                                <div key={name} className="flex justify-between items-center text-sm p-1 bg-gray-50 rounded">
                                    <span>{name}</span>
                                    {selectedMeeting.signatures[name]
                                        ? <span className="text-green-600 font-bold">{t('signed')} ({selectedMeeting.signatures[name]})</span>
                                        : <button onClick={() => handleSign(name)} className="px-2 py-1 bg-green-500 text-white rounded text-xs">{t('sign')}</button>
                                    }
                                </div>
                            ))}
                         </div>
                     </div>
                </div>

                 <div className="p-4 border-t-2 mt-4 space-y-4">
                    <h4 className="font-semibold text-primary">{t('summaryForThisMeeting')}</h4>
                    <div className="grid grid-cols-4 gap-2 text-center">
                        <div><p className="font-bold text-lg">{stats.total}</p><p className="text-sm">{t('totalOutcomes')}</p></div>
                        <div className="text-green-600"><p className="font-bold text-lg">{stats.executed}</p><p className="text-sm">{t('executed')}</p></div>
                        <div className="text-yellow-600"><p className="font-bold text-lg">{stats.inProgress}</p><p className="text-sm">{t('inProgress')}</p></div>
                        <div className="text-red-600"><p className="font-bold text-lg">{stats.notExecuted}</p><p className="text-sm">{t('notExecuted')}</p></div>
                    </div>
                </div>


                <div className="flex gap-4">
                    <button onClick={handleSave} className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">{t('save')}</button>
                    <button onClick={() => exportMeetingUtil({format: 'pdf', meeting: selectedMeeting})} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">{t('exportPdf')}</button>
                    <button onClick={() => exportMeetingUtil({format: 'whatsapp', meeting: selectedMeeting})} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">{t('sendToWhatsApp')}</button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <button onClick={handleNewMeeting} className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors">+ {t('meetingReport')}</button>
            {meetings.length > 0 && overallStats && (
                <div className="p-4 border rounded-lg bg-gray-100">
                    <h4 className="font-bold text-lg text-center mb-2">{t('summaryForAllMeetings')}</h4>
                    <div className="grid grid-cols-4 gap-2 text-center">
                        <div><p className="font-bold text-xl">{overallStats.total}</p><p className="text-sm">{t('totalOutcomes')}</p></div>
                        <div className="text-green-600"><p className="font-bold text-xl">{overallStats.executed}</p><p className="text-sm">{t('executed')}</p></div>
                        <div className="text-yellow-600"><p className="font-bold text-xl">{overallStats.inProgress}</p><p className="text-sm">{t('inProgress')}</p></div>
                        <div className="text-red-600"><p className="font-bold text-xl">{overallStats.notExecuted}</p><p className="text-sm">{t('notExecuted')}</p></div>
                    </div>
                </div>
            )}
            <div className="space-y-3">
                {meetings.map(m => (
                    <div key={m.id} className="p-3 border rounded flex justify-between items-center bg-white shadow-sm">
                        <span>{t('meetingReport')} - {m.date}</span>
                        <div>
                            <button onClick={() => setSelectedMeeting(m)} className="text-blue-500 p-2">{t('edit')}</button>
                            <button onClick={() => window.confirm(t('confirmDelete')) && deleteMeeting(m.id)} className="text-red-500 p-2">{t('delete')}</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- School Calendar Component ---
const SchoolCalendar: React.FC = () => {
    const { t } = useLanguage();
    return (
        <div className="p-4 border rounded-lg text-center bg-yellow-50">
            <h3 className="text-xl font-semibold mb-2">{t('schoolCalendar')}</h3>
            <p className="text-gray-600">هذه الميزة قيد التطوير حالياً.</p>
        </div>
    );
}

// --- Peer Visits Component ---
const PeerVisits: React.FC<{
    visits: PeerVisit[];
    setVisits: React.Dispatch<React.SetStateAction<PeerVisit[]>>;
    deleteVisit: (visitId: string) => void;
    allTeachers: Teacher[];
    academicYear: string;
}> = ({ visits, setVisits, deleteVisit, allTeachers, academicYear }) => {
    const { t } = useLanguage();
    const { currentUser } = useAuth();
    
    const teacherNames = useMemo(() => allTeachers.map(t => t.name), [allTeachers]);
    
    const handleAddVisit = () => {
        const newVisit: PeerVisit = {
            id: `pv-${Date.now()}`, visitingTeacher: '', visitingSubject: '', visitingGrade: '',
            visitedTeacher: '', visitedSpecialization: '', visitedSubject: '', visitedGrade: '',
            status: 'لم تتم',
            academicYear: academicYear, authorId: currentUser?.id
        };
        setVisits(prev => [newVisit, ...prev]);
    };
    
    const handleUpdateVisit = (id: string, field: keyof PeerVisit, value: string) => {
        setVisits(prev => prev.map(v => v.id === id ? {...v, [field]: value} : v));
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                 <h3 className="text-xl font-bold text-primary">{t('peerVisits')}</h3>
                 <button onClick={() => exportPeerVisits({format: 'pdf', visits, academicYear})} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">{t('exportPdf')}</button>
            </div>
            <button onClick={handleAddVisit} className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors">+ {t('addNewItem')}</button>
            <div className="space-y-4">
                {visits.map(v => (
                    <div key={v.id} className="p-4 border rounded-lg bg-white shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2 p-3 border-l">
                            <h4 className="font-semibold">{t('visitingTeacher')}</h4>
                            <input list="teacher-names" value={v.visitingTeacher} onChange={e => handleUpdateVisit(v.id, 'visitingTeacher', e.target.value)} placeholder={t('teacherName')} className="w-full p-2 border rounded" />
                            <input value={v.visitingSubject} onChange={e => handleUpdateVisit(v.id, 'visitingSubject', e.target.value)} placeholder={t('visitingSubject')} className="w-full p-2 border rounded" />
                            <input value={v.visitingGrade} onChange={e => handleUpdateVisit(v.id, 'visitingGrade', e.target.value)} placeholder={t('visitingGrade')} className="w-full p-2 border rounded" />
                         </div>
                         <div className="space-y-2 p-3">
                            <h4 className="font-semibold">{t('visitedTeacher')}</h4>
                            <input list="teacher-names" value={v.visitedTeacher} onChange={e => handleUpdateVisit(v.id, 'visitedTeacher', e.target.value)} placeholder={t('teacherName')} className="w-full p-2 border rounded" />
                            <datalist id="teacher-names">{teacherNames.map(name => <option key={name} value={name} />)}</datalist>
                            <input value={v.visitedSubject} onChange={e => handleUpdateVisit(v.id, 'visitedSubject', e.target.value)} placeholder={t('visitedSubject')} className="w-full p-2 border rounded" />
                            <input value={v.visitedGrade} onChange={e => handleUpdateVisit(v.id, 'visitedGrade', e.target.value)} placeholder={t('visitedGrade')} className="w-full p-2 border rounded" />
                         </div>
                         <div className="md:col-span-2 flex justify-between items-center border-t pt-3">
                             <select value={v.status} onChange={e => handleUpdateVisit(v.id, 'status', e.target.value)} className="p-2 border rounded">
                                <option value="لم تتم">لم تتم</option>
                                <option value="قيد التنفيذ">قيد التنفيذ</option>
                                <option value="تمت الزيارة">تمت الزيارة</option>
                             </select>
                             <button onClick={() => window.confirm(t('confirmDelete')) && deleteVisit(v.id)} className="text-red-500 text-sm">{t('delete')}</button>
                         </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- Delivery Records Component ---
const DeliveryRecords: React.FC<{
    sheets: DeliverySheet[];
    setSheets: React.Dispatch<React.SetStateAction<DeliverySheet[]>>;
    deleteSheet: (sheetId: string) => void;
    allTeachers: Teacher[];
}> = ({ sheets, setSheets, deleteSheet, allTeachers }) => {
    const { t } = useLanguage();
    const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
    const [newSheetName, setNewSheetName] = useState('');

    const [quickFormCount, setQuickFormCount] = useState('');
    const [quickReceiveDate, setQuickReceiveDate] = useState('');
    const [quickDeliveryDate, setQuickDeliveryDate] = useState('');
    const [quickEntryBranch, setQuickEntryBranch] = useState('all');

    const handleAddNewSheet = () => {
        if (!newSheetName.trim()) return;
        const newSheet: DeliverySheet = {
            id: `ds-${Date.now()}`,
            name: newSheetName.trim(),
            records: allTeachers.map(teacher => ({
                id: `dr-${teacher.id}-${Date.now()}`,
                teacherId: teacher.id,
                teacherName: teacher.name,
                grade: teacher.gradesTaught || '',
                subject: teacher.subjects || '',
                formCount: '',
                receiveDate: '',
                deliveryDate: '',
            }))
        };
        setSheets(prev => [newSheet, ...prev]);
        setNewSheetName('');
    };
    
    const handleRecordUpdate = (recordId: string, field: keyof DeliveryRecord, value: string) => {
        if (!selectedSheetId) return;
        setSheets(prev => prev.map(sheet => {
            if (sheet.id === selectedSheetId) {
                const updatedRecords = sheet.records.map(r => r.id === recordId ? {...r, [field]: value} : r);
                return {...sheet, records: updatedRecords};
            }
            return sheet;
        }));
    };

    const handleBulkUpdate = (field: 'formCount' | 'receiveDate' | 'deliveryDate') => {
        if (!selectedSheetId) return;

        let value: string | number = '';
        if (field === 'formCount') value = quickFormCount;
        if (field === 'receiveDate') value = quickReceiveDate;
        if (field === 'deliveryDate') value = quickDeliveryDate;

        if (!value) return;

        const teacherBranchMap = new Map(allTeachers.map(t => [t.id, t.branch]));

        setSheets(prevSheets => {
            return prevSheets.map(sheet => {
                if (sheet.id === selectedSheetId) {
                    const updatedRecords = sheet.records.map(record => {
                        const teacherBranch = teacherBranchMap.get(record.teacherId);
                        const branchMatch = quickEntryBranch === 'all' || teacherBranch === quickEntryBranch;
                        
                        if (branchMatch) {
                            return { ...record, [field]: value };
                        }
                        return record;
                    });
                    return { ...sheet, records: updatedRecords };
                }
                return sheet;
            });
        });
    };

    const currentSheet = useMemo(() => {
        if (!selectedSheetId) return null;
        return sheets.find(s => s.id === selectedSheetId);
    }, [selectedSheetId, sheets]);

    if (currentSheet) {
        return (
            <div>
                 <button onClick={() => setSelectedSheetId(null)} className="mb-4 text-sky-600 hover:underline">&larr; {t('back')}</button>
                 <h3 className="text-xl font-bold text-primary mb-4">{currentSheet.name}</h3>
                
                <div className="p-4 border-2 border-dashed border-primary-light rounded-lg mb-6 bg-green-50/50 space-y-4">
                    <h4 className="font-semibold text-lg text-primary">إدخال سريع للبيانات</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                        <div className="flex-grow">
                            <label className="text-sm font-medium">{t('applyToBranch')}</label>
                            <select value={quickEntryBranch} onChange={e => setQuickEntryBranch(e.target.value)} className="w-full p-2 border rounded-md">
                                <option value="all">الكل</option>
                                <option value="main">{t('mainBranch')}</option>
                                <option value="boys">{t('boysBranch')}</option>
                                <option value="girls">{t('girlsBranch')}</option>
                            </select>
                        </div>
                        <div className="flex gap-2 items-end">
                            <div className="flex-grow">
                                <label className="text-sm font-medium">{t('formCount')}</label>
                                <input type="number" value={quickFormCount} onChange={e => setQuickFormCount(e.target.value)} placeholder={t('formCount')} className="w-full p-2 border rounded-md" />
                            </div>
                            <button onClick={() => handleBulkUpdate('formCount')} className="px-3 py-2 bg-primary text-white rounded-md hover:bg-opacity-90">{t('apply')}</button>
                        </div>
                        <div className="flex gap-2 items-end">
                            <div className="flex-grow">
                                <label className="text-sm font-medium">{t('receiveDate')}</label>
                                <input type="date" value={quickReceiveDate} onChange={e => setQuickReceiveDate(e.target.value)} className="w-full p-2 border rounded-md" />
                            </div>
                            <button onClick={() => handleBulkUpdate('receiveDate')} className="px-3 py-2 bg-primary text-white rounded-md hover:bg-opacity-90">{t('apply')}</button>
                        </div>
                         <div className="flex gap-2 items-end">
                            <div className="flex-grow">
                                <label className="text-sm font-medium">{t('deliveryDate')}</label>
                                <input type="date" value={quickDeliveryDate} onChange={e => setQuickDeliveryDate(e.target.value)} className="w-full p-2 border rounded-md" />
                            </div>
                            <button onClick={() => handleBulkUpdate('deliveryDate')} className="px-3 py-2 bg-primary text-white rounded-md hover:bg-opacity-90">{t('apply')}</button>
                        </div>
                    </div>
                </div>

                 <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="p-2 border">{t('teacherName')}</th>
                                <th className="p-2 border">{t('formCount')}</th>
                                <th className="p-2 border">{t('receiveDate')}</th>
                                <th className="p-2 border">{t('deliveryDate')}</th>
                                <th className="p-2 border">{t('notes')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentSheet.records.map(record => (
                                <tr key={record.id}>
                                    <td className="p-1 border">{record.teacherName}</td>
                                    <td className="p-1 border"><input type="number" value={record.formCount} onChange={e => handleRecordUpdate(record.id, 'formCount', e.target.value)} className="w-full p-1 border rounded" /></td>
                                    <td className="p-1 border"><input type="date" value={record.receiveDate} onChange={e => handleRecordUpdate(record.id, 'receiveDate', e.target.value)} className="w-full p-1 border rounded" /></td>
                                    <td className="p-1 border"><input type="date" value={record.deliveryDate} onChange={e => handleRecordUpdate(record.id, 'deliveryDate', e.target.value)} className="w-full p-1 border rounded" /></td>
                                    <td className="p-1 border"><input type="text" value={record.notes || ''} onChange={e => handleRecordUpdate(record.id, 'notes', e.target.value)} className="w-full p-1 border rounded" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
             <div className="flex gap-2">
                <input value={newSheetName} onChange={e => setNewSheetName(e.target.value)} placeholder={t('sheetName')} className="flex-grow p-2 border rounded" />
                <button onClick={handleAddNewSheet} className="px-4 py-2 bg-primary text-white rounded hover:bg-opacity-90">{t('addNewSheet')}</button>
             </div>
             <div className="space-y-3">
                {sheets.map(sheet => (
                    <div key={sheet.id} className="p-3 border rounded flex justify-between items-center bg-white shadow-sm">
                        <span className="font-semibold">{sheet.name}</span>
                        <div>
                             <button onClick={() => setSelectedSheetId(sheet.id)} className="text-blue-500 p-2">{t('edit')}</button>
                             <button onClick={() => window.confirm(t('confirmDelete')) && deleteSheet(sheet.id)} className="text-red-500 p-2">{t('deleteSheet')}</button>
                        </div>
                    </div>
                ))}
             </div>
        </div>
    );
};

// --- Main Supervisory Tools Component ---
interface SupervisoryToolsProps {
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
}

const SupervisoryTools: React.FC<SupervisoryToolsProps> = (props) => {
    const { t } = useLanguage();
    const { hasPermission } = useAuth();
    const [activeView, setActiveView] = useState<ToolView>('meeting');

    const renderView = () => {
        switch (activeView) {
            case 'meeting':
                if (!hasPermission('view_meeting_minutes')) return null;
                return <MeetingMinutes {...props} />;
            case 'calendar':
                 if (!hasPermission('view_school_calendar')) return null;
                return <SchoolCalendar />;
            case 'peer_visit':
                 if (!hasPermission('view_peer_visits')) return null;
                return <PeerVisits visits={props.peerVisits} setVisits={props.setPeerVisits} deleteVisit={props.deletePeerVisit} allTeachers={props.allTeachers} academicYear={props.academicYear}/>;
            case 'delivery':
                 if (!hasPermission('view_delivery_records')) return null;
                return <DeliveryRecords sheets={props.deliverySheets} setSheets={props.setDeliverySheets} deleteSheet={props.deleteDeliverySheet} allTeachers={props.allTeachers} />;
            default:
                return null;
        }
    }
    
    const getButtonClass = (view: ToolView) => `px-4 py-2 rounded-lg font-semibold transition-all text-sm transform hover:scale-105 ${activeView === view ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'}`;

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
            <h2 className="text-2xl font-bold text-center text-primary">{t('supervisoryTools')}</h2>
            <div className="flex flex-wrap justify-center gap-3 border-b pb-4">
                {hasPermission('view_meeting_minutes') && <button onClick={() => setActiveView('meeting')} className={getButtonClass('meeting')}>{t('meetingMinutes')}</button>}
                {hasPermission('view_school_calendar') && <button onClick={() => setActiveView('calendar')} className={getButtonClass('calendar')}>{t('schoolCalendar')}</button>}
                {hasPermission('view_peer_visits') && <button onClick={() => setActiveView('peer_visit')} className={getButtonClass('peer_visit')}>{t('peerVisits')}</button>}
                {hasPermission('view_delivery_records') && <button onClick={() => setActiveView('delivery')} className={getButtonClass('delivery')}>{t('deliveryRecords')}</button>}
            </div>
            <div>
                {renderView()}
            </div>
        </div>
    );
};

export default SupervisoryTools;
