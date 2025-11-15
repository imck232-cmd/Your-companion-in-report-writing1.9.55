import React, { useState, useMemo } from 'react';
import { Teacher } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import CustomizableInputSection from './CustomizableInputSection';
import { SUBJECTS } from '../constants';

interface TeacherListProps {
  teachers: Teacher[];
  onSelectTeacher: (teacher: Teacher) => void;
  addTeacher: (teacherData: Omit<Teacher, 'id' | 'schoolName'>) => void;
  deleteTeacher: (teacherId: string) => void;
  updateTeacher: (teacher: Teacher) => void;
}

const PlusIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);

const TrashIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
  </svg>
);

const DetailsIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10.392C2.057 15.71 3.245 16 4.5 16h1.054c.254.162.52.305.798.432v-6.95c.57-2.25 2.1-4 4.148-4.682A.75.75 0 0111 5.5v1.233c.05.01.1.022.15.035V6.5a.5.5 0 00-.5-.5h-1a.5.5 0 00-.5.5v2.268a2.5 2.5 0 100 4.464V16.5a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1.233a5.442 5.442 0 00-.15-.035V16.5a.75.75 0 01-1.5 0v-.932c-2.048.682-3.578 2.432-4.148 4.682v.268C5.52 20.695 5.254 20.838 5 21H4.5A2.5 2.5 0 012 18.5V5.5A2.5 2.5 0 014.5 3H5c.254-.162.52-.305.798-.432V3.5a.75.75 0 011.5 0v.932C9.348 3.75 10.878 2 12.5 2a2.5 2.5 0 010 5c-1.622 0-3.152-1.75-4.148-3.432V4.804z" />
    </svg>
);

const TeacherDetailsModal: React.FC<{
    teacher: Teacher;
    onClose: () => void;
    onSave: (teacher: Teacher) => void;
}> = ({ teacher, onClose, onSave }) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState(teacher);
    const [otherBranch, setOtherBranch] = useState(
        ['main', 'boys', 'girls'].includes(teacher.branch || '') ? '' : teacher.branch || ''
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'other') {
            setFormData({ ...formData, branch: otherBranch });
        } else {
            setFormData({ ...formData, branch: value as any });
            setOtherBranch('');
        }
    };
    
    const handleOtherBranchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOtherBranch(e.target.value);
        setFormData({ ...formData, branch: e.target.value });
    }

    const fields: (keyof Omit<Teacher, 'id' | 'schoolName' | 'name' | 'subjects' | 'branch'>)[] = [
        'qualification', 'specialization', 'gradesTaught',
        'sectionsTaught', 'weeklyHours', 'otherSchoolTasks', 'yearsOfExperience',
        'yearsInSchool', 'phoneNumber'
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-primary mb-4">{t('teacherDetails')} - {teacher.name}</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block font-semibold text-sm mb-1">{t('teacherName')}</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-semibold text-sm mb-1">{t('branch')}</label>
                            <select 
                                value={['main', 'boys', 'girls'].includes(formData.branch || '') ? formData.branch : 'other'} 
                                onChange={handleBranchChange} 
                                className="w-full p-2 border rounded"
                            >
                                <option value="main">{t('mainBranch')}</option>
                                <option value="boys">{t('boysBranch')}</option>
                                <option value="girls">{t('girlsBranch')}</option>
                                <option value="other">{t('other')}</option>
                            </select>
                        </div>
                        {formData.branch === otherBranch && (
                            <div>
                                <label className="block font-semibold text-sm mb-1">{t('other')}</label>
                                <input 
                                    type="text"
                                    value={otherBranch}
                                    onChange={handleOtherBranchChange}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                        )}
                    </div>

                    <CustomizableInputSection
                        title={t('subjects')}
                        value={formData.subjects || ''}
                        onChange={(value) => setFormData({...formData, subjects: value})}
                        defaultItems={SUBJECTS.filter(s => s !== 'أخرى')}
                        localStorageKey="customSubjectsForTeachers"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {fields.map(field => (
                            <div key={field}>
                                <label className="block font-semibold text-sm mb-1">{t(field as any)}</label>
                                <input 
                                    type={['weeklyHours', 'yearsOfExperience', 'yearsInSchool'].includes(field) ? 'number' : 'text'}
                                    name={field}
                                    value={String(formData[field] ?? '')}
                                    onChange={handleChange}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                 <div className="flex gap-4 mt-6">
                    <button onClick={() => { onSave(formData); onClose(); }} className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">{t('save')}</button>
                    <button onClick={onClose} className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">{t('cancel')}</button>
                </div>
            </div>
        </div>
    );
};


const TeacherList: React.FC<TeacherListProps> = ({ teachers, onSelectTeacher, addTeacher, deleteTeacher, updateTeacher }) => {
  const { t } = useLanguage();
  const { hasPermission } = useAuth();
  const [newTeacherName, setNewTeacherName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkTeacherNames, setBulkTeacherNames] = useState('');
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const handleAddTeacher = () => {
    if (newTeacherName.trim()) {
      addTeacher({ name: newTeacherName.trim() });
      setNewTeacherName('');
    }
  };
  
  const handleBulkAdd = () => {
    const lines = bulkTeacherNames.split('\n').filter(Boolean);
    if (lines.length === 0) return;
    
    const teachersToAdd: Omit<Teacher, 'id' | 'schoolName'>[] = lines.map(line => {
        const parts = line.split('|').map(p => p.trim());
        return {
            name: parts[0] || '',
            qualification: parts[1] || '',
            specialization: parts[2] || '',
            subjects: parts[3] || '',
            gradesTaught: parts[4] || '',
            sectionsTaught: parts[5] || '',
            weeklyHours: parts[6] || '',
            otherSchoolTasks: parts[7] || '',
            yearsOfExperience: parts[8] || '',
            yearsInSchool: parts[9] || '',
            phoneNumber: parts[10] || '',
        };
    }).filter(t => t.name);

    teachersToAdd.forEach(addTeacher);
    setBulkTeacherNames('');
  };

  const handleDelete = (e: React.MouseEvent, teacherId: string) => {
    e.stopPropagation();
    if (window.confirm(t('confirmDelete'))) {
      deleteTeacher(teacherId);
    }
  };

  const filteredTeachers = useMemo(() => {
    const sortedTeachers = [...teachers].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    if (!searchTerm) return sortedTeachers;
    return sortedTeachers.filter(teacher => teacher.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [teachers, searchTerm]);


  return (
    <div className="space-y-8">
      {editingTeacher && <TeacherDetailsModal teacher={editingTeacher} onClose={() => setEditingTeacher(null)} onSave={updateTeacher} />}
      
      {hasPermission('add_teacher') && (
        <div className="bg-white p-6 rounded-xl shadow-lg space-y-4">
          <div>
              <h3 className="text-xl font-semibold mb-4 text-primary">{t('addTeacher')}</h3>
              <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                  type="text"
                  placeholder={t('teacherName')}
                  className="flex-grow w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTeacher()}
              />
              <button onClick={handleAddTeacher} className="w-full sm:w-auto px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2 transform hover:scale-105">
                  <PlusIcon />
                  <span>{t('add')}</span>
              </button>
              </div>
          </div>
          <div className="border-t pt-4">
              <h3 className="text-xl font-semibold mb-4 text-primary">{t('addTeachersBulk')}</h3>
              <textarea 
                  placeholder={t('addTeachersBulkPlaceholder')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition h-32"
                  value={bulkTeacherNames}
                  onChange={(e) => setBulkTeacherNames(e.target.value)}
              />
              <button onClick={handleBulkAdd} className="mt-3 w-full sm:w-auto px-6 py-3 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 transition-colors flex items-center justify-center gap-2 transform hover:scale-105">
                  <PlusIcon />
                  <span>{t('addBulk')}</span>
              </button>
          </div>
        </div>
      )}


      {/* Teacher List Card */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <h3 className="text-xl font-semibold text-primary">{t('teachersList')}</h3>
             <input
                type="text"
                placeholder={t('searchForTeacher')}
                className="w-full sm:w-64 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="space-y-3">
          {filteredTeachers.length > 0 ? (
            filteredTeachers.map(teacher => (
              <div
                key={teacher.id}
                className="p-3 border border-gray-200 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-3 hover:border-primary hover:bg-gray-50 transition-all duration-200"
              >
                <div className="flex-grow flex items-center gap-4">
                    <span className="font-medium text-gray-800">{teacher.name}</span>
                    {teacher.phoneNumber && (
                        <div className="flex items-center gap-2">
                            <a href={`https://wa.me/${teacher.phoneNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM5.022 15.48a6.5 6.5 0 018.956-8.956L14 6.535V5.5a1 1 0 10-2 0v2.5a.5.5 0 00.5.5H15a1 1 0 100-2h-.965l-1.01-1.01a4.5 4.5 0 00-6.364 6.364L6.535 14H5.5a1 1 0 100 2h2.5a.5.5 0 00.5-.5V13a1 1 0 10-2 0v.965l-1.01 1.01z" clipRule="evenodd" /></svg></a>
                            <a href={`tel:${teacher.phoneNumber}`} className="text-blue-500 hover:text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg></a>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => onSelectTeacher(teacher)} className="px-3 py-1.5 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 text-sm flex items-center gap-1 transition-colors transform hover:scale-105">
                    <PlusIcon />
                    <span>{t('newReportForTeacher')}</span>
                  </button>
                  {hasPermission('edit_teacher') && (
                    <button
                      onClick={() => setEditingTeacher(teacher)}
                      className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-full transition-colors transform hover:scale-110"
                      title={t('teacherDetails')}
                    >
                      <DetailsIcon />
                    </button>
                  )}
                  {hasPermission('delete_teacher') && (
                    <button
                      onClick={(e) => handleDelete(e, teacher.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors transform hover:scale-110"
                      title={t('delete')}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">{t('selectTeacherToViewReports')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherList;