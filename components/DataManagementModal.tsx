
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Teacher, School, Report } from '../types';

interface BackupVersion {
  id: number;
  timestamp: string;
  label: string;
  data: string;
}

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  schools: School[];
}

type ExportMode = 'full' | 'teacher' | 'school' | 'type';

const DataManagementModal: React.FC<DataManagementModalProps> = ({ isOpen, onClose, teachers, schools }) => {
  const { t } = useLanguage();
  const { currentUser, hasPermission } = useAuth();
  
  const [exportMode, setExportMode] = useState<ExportMode>('full');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedSchoolName, setSelectedSchoolName] = useState('');
  const [selectedEvalType, setSelectedEvalType] = useState('general');
  const [isProcessing, setIsProcessing] = useState(false);
  const [backups, setBackups] = useState<BackupVersion[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // أسماء مسموح لها بالدخول بناءً على الطلب
  const authorizedNames = ['مجيب الرحمن الأحلسي', 'وداد الشرعبي', 'صالح الرفاعي', 'إبراهيم دخان'];
  const isAuthorized = hasPermission('all') || (currentUser && authorizedNames.includes(currentUser.name));

  useEffect(() => {
    if (isOpen) {
      const savedBackups = localStorage.getItem('app_history_backups');
      if (savedBackups) setBackups(JSON.parse(savedBackups));
    }
  }, [isOpen]);

  if (!isOpen || !isAuthorized) return null;

  // --- منطق التصدير الذكي ---
  const handleExport = () => {
    setIsProcessing(true);
    try {
      const fullData: Record<string, string> = {};
      const keysToExport = [
        'teachers', 'reports', 'customCriteria', 'specialReportTemplates', 
        'syllabusPlans', 'tasks', 'meetings', 'peerVisits', 'deliverySheets', 
        'bulkMessages', 'syllabusCoverageReports', 'supervisoryPlans', 'schools'
      ];

      // جمع البيانات
      keysToExport.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) fullData[key] = value;
      });

      let finalData = { ...fullData };

      // تطبيق الفلترة إذا لم يكن تصديراً كاملاً
      if (exportMode === 'teacher' && selectedTeacherId) {
        const teacherReports = JSON.parse(fullData['reports'] || '[]').filter((r: any) => r.teacherId === selectedTeacherId);
        const teacherObj = JSON.parse(fullData['teachers'] || '[]').filter((t: any) => t.id === selectedTeacherId);
        finalData['reports'] = JSON.stringify(teacherReports);
        finalData['teachers'] = JSON.stringify(teacherObj);
      } else if (exportMode === 'school' && selectedSchoolName) {
        const schoolReports = JSON.parse(fullData['reports'] || '[]').filter((r: any) => r.school === selectedSchoolName);
        const schoolTeachers = JSON.parse(fullData['teachers'] || '[]').filter((t: any) => t.schoolName === selectedSchoolName);
        finalData['reports'] = JSON.stringify(schoolReports);
        finalData['teachers'] = JSON.stringify(schoolTeachers);
      } else if (exportMode === 'type') {
        const filteredReports = JSON.parse(fullData['reports'] || '[]').filter((r: any) => r.evaluationType === selectedEvalType);
        finalData['reports'] = JSON.stringify(filteredReports);
      }

      const blob = new Blob([JSON.stringify(finalData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_${exportMode}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert('خطأ أثناء التصدير: ' + error);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- منطق الأرشفة والاستيراد ---
  const processImport = (jsonContent: string) => {
    setIsProcessing(true);
    try {
      const newData = JSON.parse(jsonContent);
      
      // 1. أخذ نسخة احتياطية من الحالة الحالية قبل المسح
      const currentSnapshot: Record<string, string> = {};
      const appKeys = ['teachers', 'reports', 'customCriteria', 'specialReportTemplates', 'syllabusPlans', 'tasks', 'meetings', 'peerVisits', 'deliverySheets', 'schools'];
      appKeys.forEach(k => {
        const val = localStorage.getItem(k);
        if (val) currentSnapshot[k] = val;
      });

      const newBackup: BackupVersion = {
        id: Date.now(),
        timestamp: new Date().toLocaleString('ar-SA'),
        label: `نسخة تلقائية قبل استيراد ${new Date().toLocaleDateString()}`,
        data: JSON.stringify(currentSnapshot)
      };

      // 2. تحديث مصفوفة الأرشفة (الاحتفاظ بآخر 5 فقط)
      const updatedBackups = [newBackup, ...backups].slice(0, 5);
      localStorage.setItem('app_history_backups', JSON.stringify(updatedBackups));

      // 3. مسح البيانات الحالية (باستثناء الأرشفة والمعلومات الحساسة)
      appKeys.forEach(k => localStorage.removeItem(k));

      // 4. وضع البيانات الجديدة
      Object.keys(newData).forEach(key => {
        localStorage.setItem(key, newData[key]);
      });

      alert('تم استيراد البيانات بنجاح! سيتم إعادة تحميل التطبيق.');
      window.location.reload();
    } catch (error) {
      alert('الملف غير صالح أو تالف.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = (version: BackupVersion) => {
    if (window.confirm('هل أنت متأكد من استعادة هذه النسخة؟ سيتم تبديل البيانات الحالية.')) {
      const dataToRestore = JSON.parse(version.data);
      const appKeys = ['teachers', 'reports', 'customCriteria', 'specialReportTemplates', 'syllabusPlans', 'tasks', 'meetings', 'peerVisits', 'deliverySheets', 'schools'];
      
      appKeys.forEach(k => localStorage.removeItem(k));
      Object.keys(dataToRestore).forEach(k => {
        localStorage.setItem(k, dataToRestore[k]);
      });
      
      window.location.reload();
    }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => processImport(event.target?.result as string);
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[200] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-black text-primary">إدارة ونقل البيانات</h2>
            <p className="text-gray-500 text-sm">تصدير واستيراد قواعد البيانات والإعدادات</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-8">
          
          {/* Section 1: Export Options */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-black font-black mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              تصدير البيانات (Backup)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option Cards */}
              {[
                { id: 'full', title: 'تصدير شامل لكل بيانات البرنامج', sub: 'نسخة احتياطية شاملة' },
                { id: 'teacher', title: 'تصدير بيانات معلم محدد', sub: 'بيانات معلم محدد' },
                { id: 'school', title: 'تصدير بيانات مدرسة محددة', sub: 'بيانات مدرسة كاملة' },
                { id: 'type', title: 'تصدير حسب نوع العمل', sub: 'حسب نوع التقارير' }
              ].map(opt => (
                <label key={opt.id} className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${exportMode === opt.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-gray-100 hover:border-gray-200'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-black text-sm">{opt.title}</h4>
                      <p className="text-gray-600 text-xs mt-1 font-bold">{opt.sub}</p>
                    </div>
                    <input type="radio" checked={exportMode === opt.id} onChange={() => setExportMode(opt.id as any)} className="w-5 h-5 accent-primary" />
                  </div>
                  
                  {/* Selectors inside cards if active */}
                  {exportMode === opt.id && opt.id === 'teacher' && (
                    <select value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)} className="w-full mt-3 p-2 border rounded-lg text-black font-bold text-sm bg-white">
                      <option value="">-- اختر المعلم --</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  )}
                  {exportMode === opt.id && opt.id === 'school' && (
                    <select value={selectedSchoolName} onChange={e => setSelectedSchoolName(e.target.value)} className="w-full mt-3 p-2 border rounded-lg text-black font-bold text-sm bg-white">
                      <option value="">-- اختر المدرسة --</option>
                      {schools.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  )}
                  {exportMode === opt.id && opt.id === 'type' && (
                    <select value={selectedEvalType} onChange={e => setSelectedEvalType(e.target.value)} className="w-full mt-3 p-2 border rounded-lg text-black font-bold text-sm bg-white">
                      <option value="general">التقييم العام</option>
                      <option value="class_session">تقييم الحصة</option>
                      <option value="special">تقارير خاصة</option>
                    </select>
                  )}
                </label>
              ))}
            </div>

            <button 
              onClick={handleExport}
              disabled={isProcessing}
              className="w-full py-4 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {isProcessing ? <div className="h-5 w-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div> : 
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              }
              بدء تصدير البيانات المحددة
            </button>
          </div>

          {/* Section 2: Import Area */}
          <div className="space-y-4 pt-8 border-t border-dashed">
            <div className="flex items-center gap-2 text-blood-red font-black mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              استيراد البيانات (Restore)
            </div>

            <div className="bg-red-50 border-2 border-red-100 p-4 rounded-xl flex gap-3 items-start">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blood-red flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
               <div className="text-blood-red text-sm font-bold leading-relaxed">
                 تحذير هام جداً: استيراد البيانات سيؤدي إلى حذف كافة البيانات الحالية في هذا المتصفح واستبدالها ببيانات الملف المرفوع. سيتم أرشفة نسختك الحالية تلقائياً في سجل النسخ بالأسفل.
               </div>
            </div>

            <div 
              onDragEnter={onDrag} onDragLeave={onDrag} onDragOver={onDrag} onDrop={onDrop}
              className={`border-4 border-dashed rounded-2xl p-10 text-center transition-all ${dragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <h3 className="text-black font-black text-lg">اسحب ملف JSON أو انقر هنا</h3>
              <p className="text-gray-500 text-sm font-bold mt-1">الملفات المدعومة: .json فقط</p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={e => e.target.files && e.target.files[0] && processImport('')} />
              <button onClick={() => fileInputRef.current?.click()} className="mt-6 px-8 py-2 bg-gray-700 text-white font-black rounded-lg hover:bg-black transition-colors">تصفح الملفات</button>
            </div>
          </div>

          {/* Section 3: Archive History */}
          <div className="space-y-4 pt-8 border-t border-dashed">
             <div className="flex items-center gap-2 text-black font-black mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                سجل النسخ الاحتياطية المؤرشفة (آخر 5 نسخ)
             </div>

             <div className="space-y-3">
               {backups.length > 0 ? backups.map((v, idx) => (
                 <div key={v.id} className="flex items-center justify-between p-4 bg-gray-50 border rounded-xl hover:shadow-sm transition-shadow">
                    <div className="flex gap-4 items-center">
                      <div className="h-10 w-10 bg-white border rounded-full flex items-center justify-center font-black text-black">#{backups.length - idx}</div>
                      <div>
                        <h5 className="font-black text-black text-sm">{v.label}</h5>
                        <p className="text-gray-500 text-xs font-bold mt-1">تاريخ الحفظ: {v.timestamp}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRestore(v)}
                      className="px-5 py-2 bg-amber-500 text-white text-xs font-black rounded-lg hover:bg-amber-600 transition-all flex items-center gap-2 shadow-md shadow-amber-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      استعادة النسخة
                    </button>
                 </div>
               )) : (
                 <div className="p-10 border-2 border-dotted rounded-2xl text-center text-gray-400 font-bold italic">
                   لا توجد نسخ مؤرشفة حالياً. يتم الأرشفة تلقائياً عند كل عملية استيراد.
                 </div>
               )}
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end rounded-b-2xl">
          <button onClick={onClose} className="px-10 py-2 bg-gray-200 text-black font-black rounded-lg hover:bg-gray-300 transition-all">إغلاق النافذة</button>
        </div>

      </div>
    </div>
  );
};

export default DataManagementModal;
