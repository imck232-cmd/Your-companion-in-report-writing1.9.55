import React, { useState, useMemo } from 'react';
import { Task } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { exportTasks } from '../lib/exportUtils';

// --- PROPS ---
interface TaskPlanProps {
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

// --- SUB-COMPONENT: Task Card ---
const TaskCard: React.FC<{
    task: Task;
    onUpdate: (updatedTask: Task) => void;
    onDelete: (taskId: string) => void;
}> = ({ task, onUpdate, onDelete }) => {
    const { t } = useLanguage();
    const TASK_TYPES = ['يومية', 'أسبوعية', 'شهرية', 'فصلية', 'سنوية'];
    const [otherType, setOtherType] = useState(task.type.find(t => !TASK_TYPES.includes(t)) || '');

    const handleTypeChange = (type: string, checked: boolean) => {
        const newTypes = checked
            ? [...task.type, type]
            : task.type.filter(t => t !== type);
        onUpdate({ ...task, type: newTypes });
    };

    const handleOtherTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setOtherType(value);
        const otherTypeExists = task.type.find(t => !TASK_TYPES.includes(t));
        let newTypes;
        if (otherTypeExists) {
            newTypes = task.type.map(t => t === otherTypeExists ? value : t);
        } else {
            newTypes = [...task.type, value];
        }
        onUpdate({ ...task, type: newTypes.filter(Boolean) });
    };

    const handleDateChange = (index: number, value: string) => {
        const newDueDates = [...task.dueDate];
        newDueDates[index] = value;
        onUpdate({ ...task, dueDate: newDueDates });
    };
    
    const addDate = () => {
        onUpdate({ ...task, dueDate: [...task.dueDate, ''] });
    };
    
    const removeDate = (index: number) => {
        const newDueDates = task.dueDate.filter((_, i) => i !== index);
        onUpdate({ ...task, dueDate: newDueDates });
    };
    
    return (
        <div className={`p-4 border-2 rounded-lg space-y-4 bg-white ${task.isOffPlan ? 'border-sky-300' : 'border-gray-200'}`}>
            <textarea 
                value={task.description} 
                onChange={e => onUpdate({...task, description: e.target.value})} 
                placeholder="وصف المهمة" 
                className="p-2 border rounded w-full text-lg font-semibold bg-gray-50" 
            />
            
            <div>
                <label className="font-semibold text-sm text-gray-600">{t('taskType')}</label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                    {TASK_TYPES.map(type => (
                        <label key={type} className="flex items-center gap-2">
                            <input type="checkbox" checked={task.type.includes(type)} onChange={e => handleTypeChange(type, e.target.checked)} />
                            {type}
                        </label>
                    ))}
                    <input 
                        type="text" 
                        placeholder={t('otherType')} 
                        value={otherType}
                        onChange={handleOtherTypeChange}
                        className="p-1 border rounded text-sm w-24"
                    />
                </div>
            </div>

            <div>
                 <label className="font-semibold text-sm text-gray-600">{t('taskDate')}</label>
                 <div className="space-y-2 mt-1">
                     {task.dueDate.map((date, index) => (
                         <div key={index} className="flex items-center gap-2">
                             <input type="date" value={date} onChange={e => handleDateChange(index, e.target.value)} className="p-1 border rounded" />
                             <button onClick={() => removeDate(index)} className="text-red-500 hover:text-red-700 text-xs font-bold">X</button>
                         </div>
                     ))}
                     <button onClick={addDate} className="text-sm text-blue-600 hover:underline">+ {t('addDate')}</button>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <select value={task.status} onChange={e => onUpdate({...task, status: e.target.value as any})} className="p-2 border rounded">
                    <option value="لم يتم">{t('taskNotDone')}</option>
                    <option value="قيد التنفيذ">{t('status_in_progress')}</option>
                    <option value="تم التنفيذ">{t('taskDone')}</option>
               </select>
               <select value={task.completionPercentage} onChange={e => onUpdate({...task, completionPercentage: parseInt(e.target.value)})} className="p-2 border rounded">
                   {[0, 25, 50, 75, 100].map(p => <option key={p} value={p}>{p}%</option>)}
               </select>
            </div>
            
            <textarea 
                value={task.notes || ''} 
                onChange={e => onUpdate({...task, notes: e.target.value})} 
                placeholder={t('notes')} 
                className="w-full p-2 border rounded h-20"
            />

            <div className="flex justify-end">
               <button onClick={() => onDelete(task.id)} className="text-xs text-red-500 hover:text-red-700">{t('delete')}</button>
           </div>
        </div>
    );
};

// --- SUB-COMPONENT: Dashboard ---
const TaskPerformanceDashboard: React.FC<{tasks: Task[]}> = ({ tasks }) => {
    const { t } = useLanguage();

    const stats = useMemo(() => {
        const statusCounts: { [key in Task['status']]: number } = { 'تم التنفيذ': 0, 'قيد التنفيذ': 0, 'لم يتم': 0 };
        const typeCounts: {[key: string]: number} = {};
        const comparisonData: {[key: string]: { 'تم التنفيذ': number, 'قيد التنفيذ': number, 'لم يتم': number }} = {};

        tasks.forEach(task => {
            statusCounts[task.status]++;
            task.type.forEach(type => {
                if (!type) return;
                typeCounts[type] = (typeCounts[type] || 0) + 1;
                if (!comparisonData[type]) {
                    comparisonData[type] = { 'تم التنفيذ': 0, 'قيد التنفيذ': 0, 'لم يتم': 0 };
                }
                comparisonData[type][task.status]++;
            });
        });

        return { statusCounts, typeCounts, comparisonData };
    }, [tasks]);

    const Bar: React.FC<{label: string, value: number, max: number, color: string}> = ({label, value, max, color}) => (
        <div>
            <div className="flex justify-between text-sm"><span className="font-semibold">{label}</span><span>{value}</span></div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className={`${color} h-2.5 rounded-full`} style={{width: `${max > 0 ? (value / max) * 100 : 0}%`}}></div>
            </div>
        </div>
    );
    
    return (
        <div className="p-4 border-t-2 mt-6 space-y-8">
            <h3 className="text-xl font-bold text-center text-primary">{t('taskPerformanceDashboard')}</h3>

            <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">{t('performanceByStatus')}</h4>
                <div className="flex justify-around text-center">
                    <div className="text-green-600"><p className="text-2xl font-bold">{stats.statusCounts['تم التنفيذ']}</p><p>{t('status_done')}</p></div>
                    <div className="text-yellow-600"><p className="text-2xl font-bold">{stats.statusCounts['قيد التنفيذ']}</p><p>{t('status_in_progress')}</p></div>
                    <div className="text-red-600"><p className="text-2xl font-bold">{stats.statusCounts['لم يتم']}</p><p>{t('status_not_done')}</p></div>
                </div>
            </div>
            
            <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">{t('illustrativeCharts')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <h5 className="text-center font-medium">{t('performanceByStatus')}</h5>
                        <Bar label={t('status_done')} value={stats.statusCounts['تم التنفيذ']} max={tasks.length} color="bg-green-500" />
                        <Bar label={t('status_in_progress')} value={stats.statusCounts['قيد التنفيذ']} max={tasks.length} color="bg-yellow-500" />
                        <Bar label={t('status_not_done')} value={stats.statusCounts['لم يتم']} max={tasks.length} color="bg-red-500" />
                    </div>
                    <div className="space-y-2">
                         <h5 className="text-center font-medium">{t('performanceByType')}</h5>
                         {/* FIX: Cast `a` and `b` to number to resolve arithmetic operation error on `unknown` type. */}
                         {Object.entries(stats.typeCounts).sort(([,a],[,b]) => (b as number) - (a as number)).map(([type, count]) => (
                            <Bar key={type} label={type} value={count as number} max={tasks.length} color="bg-blue-500" />
                         ))}
                    </div>
                </div>
            </div>

            <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">{t('comparativeAnalysis')}</h4>
                 <div className="space-y-4">
                    {Object.entries(stats.comparisonData).map(([type, data]) => {
                        const total = data['تم التنفيذ'] + data['قيد التنفيذ'] + data['لم يتم'];
                        if (total === 0) return null;
                        return (
                            <div key={type}>
                                <p className="font-medium">{type} ({total})</p>
                                <div className="flex h-5 rounded-full overflow-hidden bg-gray-200">
                                    <div className="bg-green-500" style={{width: `${(data['تم التنفيذ']/total)*100}%`}} title={`${t('status_done')}: ${data['تم التنفيذ']}`}></div>
                                    <div className="bg-yellow-500" style={{width: `${(data['قيد التنفيذ']/total)*100}%`}} title={`${t('status_in_progress')}: ${data['قيد التنفيذ']}`}></div>
                                    <div className="bg-red-500" style={{width: `${(data['لم يتم']/total)*100}%`}} title={`${t('status_not_done')}: ${data['لم يتم']}`}></div>
                                </div>
                            </div>
                        )
                    })}
                 </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const TaskPlan: React.FC<TaskPlanProps> = ({ tasks, setTasks }) => {
    const { t } = useLanguage();
    const [planText, setPlanText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [offPlanTask, setOffPlanTask] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const handleConvertPlan = async () => {
        if (!planText.trim()) return;
        setIsLoading(true);
        setError('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `
                Analyze the following plan text. For each task, extract its description, type(s), and due date(s).
                Respond ONLY with a valid JSON array of objects. Each object must have this structure: 
                { "description": "...", "type": ["...", "..."], "dueDate": ["...", "..."] }.
                - "description": The task description in Arabic.
                - "type": An array of strings. Each string must be one of: 'يومية', 'أسبوعية', 'شهرية', 'فصلية', 'سنوية'. If a task seems to have multiple types, include them all. If a custom type is mentioned, include it as a string. Default to ['أسبوعية'] if unsure.
                - "dueDate": An array of strings, each in 'YYYY-MM-DD' format. If multiple dates are mentioned for a task, include them all. If no date is found, use an empty array [].
                Plan Text:
                ---
                ${planText}
                ---
            `;
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            const jsonString = response.text.trim();
            const parsedTasks = JSON.parse(jsonString);
            if (Array.isArray(parsedTasks)) {
                const newTasks: Task[] = parsedTasks.map(item => ({
                    id: `task-${Date.now()}-${Math.random()}`,
                    description: item.description || '',
                    type: Array.isArray(item.type) ? item.type : (item.type ? [item.type] : []),
                    dueDate: Array.isArray(item.dueDate) ? item.dueDate : (item.dueDate ? [item.dueDate] : []),
                    status: 'قيد التنفيذ',
                    completionPercentage: 0,
                }));
                setTasks(prev => [...prev, ...newTasks]);
                setPlanText('');
            } else { throw new Error("Invalid response format from AI."); }
        } catch (err) {
            console.error(err);
            setError('فشل في تحويل الخطة. يرجى المحاولة مرة أخرى أو التحقق من النص.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateTask = (updatedTask: Task) => {
        setTasks(prev => prev.map(task => task.id === updatedTask.id ? updatedTask : task));
    };
    const handleDeleteTask = (taskId: string) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
    };

    const handleAddOffPlanTask = () => {
        if (!offPlanTask.trim()) return;
        const newTask: Task = {
            id: `task-${Date.now()}`,
            description: offPlanTask,
            type: [],
            dueDate: [new Date().toISOString().split('T')[0]],
            status: 'قيد التنفيذ',
            completionPercentage: 0,
            isOffPlan: true,
        };
        setTasks(prev => [newTask, ...prev]);
        setOffPlanTask('');
    };
    
    const filteredTasks = useMemo(() => {
        return tasks
            .filter(task => {
                const typeMatch = filterType === 'all' || task.type.includes(filterType);
                if (!dateRange.start || !dateRange.end) { return typeMatch; }
                const startDate = new Date(dateRange.start);
                const endDate = new Date(dateRange.end);
                const dateMatch = task.dueDate.length === 0 ? true : task.dueDate.some(d => {
                    if (!d) return false;
                    const taskDate = new Date(d);
                    return taskDate >= startDate && taskDate <= endDate;
                });
                return typeMatch && dateMatch;
            })
            .sort((a,b) => (a.dueDate[0] || 'z').localeCompare(b.dueDate[0] || 'z'));
    }, [tasks, filterType, dateRange]);
    
    const filterOptions = [
        { key: 'all', label: t('allTasks') },
        { key: 'يومية', label: t('dailyTasks') },
        { key: 'أسبوعية', label: t('weeklyTasks') },
        { key: 'شهرية', label: t('monthlyTasks') },
        { key: 'فصلية', label: t('semesterTasks') },
        { key: 'سنوية', label: t('annualTasks') },
    ];

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
            <h2 className="text-2xl font-bold text-center text-primary">{t('taskPlan')}</h2>

            <div className="p-4 border rounded-lg space-y-3">
                <label htmlFor="planText" className="font-semibold">{t('pastePlanHere')}</label>
                <textarea id="planText" value={planText} onChange={(e) => setPlanText(e.target.value)} className="w-full p-2 border rounded h-32" />
                <button onClick={handleConvertPlan} disabled={isLoading} className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 disabled:bg-gray-400">
                    {isLoading ? t('generatingTasks') : t('convertPlanToTasks')}
                </button>
                {error && <p className="text-red-500">{error}</p>}
            </div>
            
            <div className="p-4 border rounded-lg space-y-3">
                <label htmlFor="offPlanTask" className="font-semibold">{t('offPlanTasks')}</label>
                <div className="flex gap-2">
                    <input id="offPlanTask" value={offPlanTask} onChange={(e) => setOffPlanTask(e.target.value)} className="w-full p-2 border rounded" placeholder={t('addNewTask')} />
                    <button onClick={handleAddOffPlanTask} className="px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600">{t('add')}</button>
                </div>
            </div>

            <div className="p-4 border rounded-lg space-y-4">
                 <h3 className="text-xl font-semibold text-primary">{t('filterBy')}</h3>
                 <div className="flex flex-wrap items-center gap-2">
                    {filterOptions.map(opt => (
                        <button key={opt.key} onClick={() => setFilterType(opt.key)} className={`px-3 py-1 rounded-full text-sm ${filterType === opt.key ? 'bg-primary text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>{opt.label}</button>
                    ))}
                 </div>
                 <div className="flex flex-wrap items-end gap-4">
                     <div>
                        <label className="text-sm font-medium">{t('from_date')}</label>
                        <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} className="w-full p-2 border rounded" />
                     </div>
                     <div>
                        <label className="text-sm font-medium">{t('to_date')}</label>
                        <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} className="w-full p-2 border rounded" />
                     </div>
                 </div>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto p-2 bg-gray-50 rounded-lg">
                {filteredTasks.length > 0 ? filteredTasks.map(task => (
                    <TaskCard key={task.id} task={task} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} />
                )) : <p className="text-center text-gray-500 py-8">{t('noDataForPeriod')}</p>}
            </div>

            {filteredTasks.length > 0 && <TaskPerformanceDashboard tasks={filteredTasks} />}
        </div>
    );
};

export default TaskPlan;