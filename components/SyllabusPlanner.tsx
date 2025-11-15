import React, { useState } from 'react';
import { SyllabusPlan, SyllabusLesson } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { exportSyllabusPlan } from '../lib/exportUtils';
import { SUBJECTS, GRADES } from '../constants';

interface SyllabusPlannerProps {
    syllabusPlans: SyllabusPlan[];
    saveSyllabusPlan: (plan: SyllabusPlan) => void;
    deleteSyllabusPlan: (planId: string) => void;
    schoolName: string;
}

const SyllabusPlanner: React.FC<SyllabusPlannerProps> = ({ syllabusPlans, saveSyllabusPlan, deleteSyllabusPlan, schoolName }) => {
    const { t } = useLanguage();
    const [editingPlan, setEditingPlan] = useState<SyllabusPlan | null>(null);
    const [planText, setPlanText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleNewPlan = () => {
        setEditingPlan({
            id: `new-plan-${Date.now()}`,
            schoolName,
            subject: '',
            grade: '',
            lessons: [],
        });
        setPlanText('');
        setError('');
    };
    
    const handleSelectPlan = (plan: SyllabusPlan) => {
        setEditingPlan(JSON.parse(JSON.stringify(plan))); // Deep copy
        setPlanText('');
        setError('');
    };

    const handleAnalyze = async () => {
        if (!editingPlan || !planText.trim()) return;
        setIsLoading(true);
        setError('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `
                Analyze the following syllabus text. Extract each lesson title and its planned date.
                Respond with a JSON array of objects, where each object has "title" and "plannedDate" (in YYYY-MM-DD format).
                If a date is not specific, make a reasonable guess based on the context or surrounding dates.
                
                Syllabus Text:
                ---
                ${planText}
                ---

                Respond ONLY with the JSON array.
            `;

            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                 config: {
                    responseMimeType: "application/json",
                }
            });
            const text = response.text;
            
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedLessons = JSON.parse(jsonString);

            if (Array.isArray(parsedLessons)) {
                const newLessons: SyllabusLesson[] = parsedLessons.map((item, index) => ({
                    id: `lesson-${Date.now()}-${index}`,
                    title: item.title || '',
                    plannedDate: item.plannedDate || '',
                }));
                setEditingPlan(prev => prev ? { ...prev, lessons: newLessons } : null);
            } else {
                throw new Error("Invalid response format from AI.");
            }
        } catch (err) {
            console.error(err);
            setError('Failed to analyze the plan. Please check the text or try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLessonChange = (index: number, field: keyof SyllabusLesson, value: string) => {
        if (!editingPlan) return;
        const newLessons = [...editingPlan.lessons];
        (newLessons[index] as any)[field] = value;
        setEditingPlan({ ...editingPlan, lessons: newLessons });
    };

    const handleSave = () => {
        if (!editingPlan || !editingPlan.subject || !editingPlan.grade) {
            alert('Please select a subject and grade.');
            return;
        }
        const planToSave = { ...editingPlan, id: editingPlan.id.startsWith('new-plan') ? `plan-${Date.now()}` : editingPlan.id };
        saveSyllabusPlan(planToSave);
        setEditingPlan(null);
    };
    
    const handleExport = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp') => {
        if(editingPlan) {
            exportSyllabusPlan(format, editingPlan, t);
        }
    };

    if (editingPlan) {
        return (
            <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-primary">{t('syllabusPlan')}</h3>
                    <button onClick={() => setEditingPlan(null)} className="text-gray-500 hover:text-gray-700">&times; {t('back')}</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select value={editingPlan.subject} onChange={e => setEditingPlan({...editingPlan, subject: e.target.value})} className="p-2 border rounded">
                        <option value="">-- {t('subject')} --</option>
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={editingPlan.grade} onChange={e => setEditingPlan({...editingPlan, grade: e.target.value})} className="p-2 border rounded">
                        <option value="">-- {t('grade')} --</option>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div>
                    <label className="font-semibold">{t('pasteSyllabusPlanHere')}</label>
                    <textarea value={planText} onChange={e => setPlanText(e.target.value)} className="w-full p-2 border rounded h-24" />
                    <button onClick={handleAnalyze} disabled={isLoading} className="mt-2 px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600 disabled:bg-gray-400">
                        {isLoading ? t('analyzing') : t('analyzeSyllabus')}
                    </button>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto border p-2 rounded">
                    {editingPlan.lessons.map((lesson, index) => (
                        <div key={lesson.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                            <input type="text" value={lesson.title} onChange={e => handleLessonChange(index, 'title', e.target.value)} placeholder={t('lessonTitle')} className="p-1 border rounded md:col-span-2" />
                            <input type="date" value={lesson.plannedDate} onChange={e => handleLessonChange(index, 'plannedDate', e.target.value)} className="p-1 border rounded" />
                        </div>
                    ))}
                </div>
                 <div className="flex flex-wrap justify-center gap-3 pt-4 border-t">
                    <button onClick={handleSave} className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">{t('savePlan')}</button>
                    <button onClick={() => handleExport('pdf')} className="px-4 py-2 bg-red-600 text-white rounded">{t('exportPdf')}</button>
                    <button onClick={() => handleExport('excel')} className="px-4 py-2 bg-emerald-600 text-white rounded">{t('exportExcel')}</button>
                    <button onClick={() => handleExport('whatsapp')} className="px-4 py-2 bg-green-500 text-white rounded">{t('sendToWhatsApp')}</button>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-primary">{t('syllabusPlan')}</h2>
                <button onClick={handleNewPlan} className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors">+ {t('addNewSyllabus')}</button>
            </div>
            <div className="space-y-3">
                {syllabusPlans.length > 0 ? syllabusPlans.map(plan => (
                    <div key={plan.id} className="p-3 border rounded flex justify-between items-center">
                        <span className="font-semibold">{plan.subject} - {plan.grade}</span>
                        <div>
                            <button onClick={() => handleSelectPlan(plan)} className="text-blue-500 p-2">{t('edit')}</button>
                            <button onClick={() => window.confirm(t('confirmDelete')) && deleteSyllabusPlan(plan.id)} className="text-red-500 p-2">{t('delete')}</button>
                        </div>
                    </div>
                )) : <p className="text-center text-gray-500">{t('noSyllabusPlans')}</p>}
            </div>
        </div>
    )
}

export default SyllabusPlanner;