
import React, { useState, useMemo } from 'react';
import { Teacher, Report, CustomCriterion, SpecialReportTemplate, SyllabusPlan, GeneralCriterion, SpecialReportPlacement, Task, Meeting, PeerVisit, DeliverySheet, BulkMessage, SyllabusCoverageReport, ClassSessionCriterionGroup, SupervisoryPlanWrapper, User } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import TeacherList from './TeacherList';
import ReportView from './ReportView';
import AggregatedReports from './AggregatedReports';
import PerformanceDashboard from './PerformanceDashboard';
import TaskPlan from './TaskPlan';
import SupervisoryTools from './SupervisoryTools';
import BulkMessageSender from './BulkMessageSender';
import UserManagement from './UserManagement';
import SyllabusCoverageManager from './SyllabusCoverageManager';
import SyllabusPlanner from './SyllabusPlanner';
import SupervisoryPlanComponent from './SupervisoryPlan';
import EvaluationSummary from './EvaluationSummary';
import { GENERAL_EVALUATION_CRITERIA_TEMPLATE, CLASS_SESSION_BRIEF_TEMPLATE, CLASS_SESSION_EXTENDED_TEMPLATE, CLASS_SESSION_SUBJECT_SPECIFIC_TEMPLATE } from '../constants';


interface TeacherManagementProps {
  teachers: Teacher[];
  allTeachers: Teacher[];
  reports: Report[];
  customCriteria: CustomCriterion[];
  specialReportTemplates: SpecialReportTemplate[];
  syllabusPlans: SyllabusPlan[];
  syllabusCoverageReports: SyllabusCoverageReport[];
  tasks: Task[];
  meetings: Meeting[];
  peerVisits: PeerVisit[];
  deliverySheets: DeliverySheet[];
  bulkMessages: BulkMessage[];
  supervisoryPlans: SupervisoryPlanWrapper[];
  setSupervisoryPlans: React.Dispatch<React.SetStateAction<SupervisoryPlanWrapper[]>>;
  selectedSchool: string;
  addTeacher: (teacherData: Omit<Teacher, 'id' | 'schoolName'>, schoolName: string) => void;
  updateTeacher: (teacher: Teacher) => void;
  deleteTeacher: (teacherId: string) => void;
  saveReport: (report: Report) => void;
  deleteReport: (reportId: string) => void;
  saveCustomCriterion: (criterion: CustomCriterion) => void;
  deleteCustomCriteria: (criterionIds: string[]) => void;
  saveSpecialReportTemplate: (template: SpecialReportTemplate) => void;
  deleteSpecialReportTemplate: (templateId: string) => void;
  saveSyllabusPlan: (syllabus: SyllabusPlan) => void;
  deleteSyllabusPlan: (syllabusId: string) => void;
  setSyllabusCoverageReports: React.Dispatch<React.SetStateAction<SyllabusCoverageReport[]>>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  hiddenCriteria: { [teacherIdOrAll: string]: string[] };
  manageHiddenCriteria: (criteriaIds: string[], teacherIds: 'all' | string[]) => void;
  saveMeeting: (meeting: Meeting) => void;
  deleteMeeting: (meetingId: string) => void;
  setPeerVisits: React.Dispatch<React.SetStateAction<PeerVisit[]>>;
  deletePeerVisit: (visitId: string) => void;
  setDeliverySheets: React.Dispatch<React.SetStateAction<DeliverySheet[]>>;
  deleteDeliverySheet: (sheetId: string) => void;
  setBulkMessages: React.Dispatch<React.SetStateAction<BulkMessage[]>>;
  usersInSchool: User[]; 
}

type View = 'teachers' | 'syllabus_coverage' | 'aggregated_reports' | 'performance_dashboard' | 'special_reports' | 'syllabus' | 'task_plan' | 'supervisory_tools' | 'bulk_message' | 'user_management' | 'supervisory_plan' | 'evaluation_summary';

// --- CriterionManagerModal ---
interface CriterionManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddCriterion: (criterion: CustomCriterion) => void;
    onManageHiddenCriteria: (criteriaIds: string[], teacherIds: 'all' | string[]) => void;
    school: string;
    teachers: Teacher[];
    customCriteria: CustomCriterion[];
}

const DeletionOptionsModal: React.FC<{
    teachers: Teacher[];
    onConfirm: (scope: 'all' | 'specific', teacherIds: string[]) => void;
    onCancel: () => void;
}> = ({ teachers, onConfirm, onCancel }) => {
    const { t } = useLanguage();
    const [scope, setScope] = useState<'all' | 'specific'>('all');
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());

    const handleToggleTeacher = (id: string) => {
        const newSet = new Set(selectedTeacherIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedTeacherIds(newSet);
    };

    const handleConfirm = () => {
        if (scope === 'specific' && selectedTeacherIds.size === 0) {
            alert(t('selectTeachers'));
            return;
        }
        onConfirm(scope, Array.from(selectedTeacherIds));
    };

    return (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex justify-center items-center z-10">
            <div className="p-6 bg-white rounded-lg shadow-2xl border-2 border-primary w-full max-w-lg space-y-4">
                <h3 className="text-xl font-bold text-primary">{t('deleteSelected')}</h3>
                <div className="space-y-2">
                    <label className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50">
                        <input type="radio" name="delete-scope" value="all" checked={scope === 'all'} onChange={() => setScope('all')} className="form-radio h-5 w-5 text-primary" />
                        <span>حذفه من جميع المعلمين</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50">
                        <input type="radio" name="delete-scope" value="specific" checked={scope === 'specific'} onChange={() => setScope('specific')} className="form-radio h-5 w-5 text-primary" />
                        <span>حذفه من معلم/معلمين محددين</span>
                    </label>
                </div>
                {scope === 'specific' && (
                    <div className="max-h-48 overflow-y-auto border p-2 rounded-lg space-y-1">
                        {teachers.map(teacher => (
                            <label key={teacher.id} className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded">
                                <input type="checkbox" checked={selectedTeacherIds.has(teacher.id)} onChange={() => handleToggleTeacher(teacher.id)} className="form-checkbox rounded text-primary" />
                                {teacher.name}
                            </label>
                        ))}
                    </div>
                )}
                <div className="flex justify-end gap-4 pt-4 border-t">
                    <button onClick={handleConfirm} className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700">{t('delete')}</button>
                    <button onClick={onCancel} className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">{t('cancel')}</button>
                </div>
            </div>
        </div>
    );
};

const DeletionSection: React.FC<{
    title: string;
    criteria: { id: string, label: string }[];
    selectedIds: Set<string>;
    onToggle: (id: string) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
}> = ({ title, criteria, selectedIds, onToggle, onSelectAll, onDeselectAll }) => {
    const { t } = useLanguage();
    return (
        <details className="p-2 border rounded-lg" open>
            <summary className="font-bold text-lg text-primary cursor-pointer flex justify-between items-center">
                <span>{title} ({criteria.length})</span>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button type="button" onClick={onSelectAll} className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">{t('selectAll')}</button>
                    <button type="button" onClick={onDeselectAll} className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600">{t('deselectCategory')}</button>
                </div>
            </summary>
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-2">
                {criteria.map(criterion => (
                    <label key={criterion.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-md">
                        <input type="checkbox" checked={selectedIds.has(criterion.id)} onChange={() => onToggle(criterion.id)} className="form-checkbox h-5 w-5 text-primary rounded" />
                        <span className="text-gray-800">{criterion.label}</span>
                    </label>
                ))}
            </div>
        </details>
    );
};


const CriterionManagerModal: React.FC<CriterionManagerModalProps> = ({ isOpen, onClose, onAddCriterion, onManageHiddenCriteria, school, teachers, customCriteria }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'add' | 'delete'>('add');
    
    const [addLabel, setAddLabel] = useState('');
    const [addType, setAddType] = useState<'general' | 'class_session'>('general');
    const [addScope, setAddScope] = useState<'general' | 'specific'>('general');
    const [addSelectedTeacherIds, setAddSelectedTeacherIds] = useState<string[]>([]);

    const [selectedToDelete, setSelectedToDelete] = useState<Set<string>>(new Set());
    const [showDeletionOptions, setShowDeletionOptions] = useState(false);
    
    const handleAdd = () => {
        if (!addLabel.trim()) return;
        const newCriterion: CustomCriterion = {
            id: `custom-g-${Date.now()}`, school, evaluationType: addType,
            criterion: { id: `crit-${Date.now()}`, label: addLabel.trim() },
            teacherIds: addScope === 'specific' ? addSelectedTeacherIds : [],
        };
        onAddCriterion(newCriterion);
        setAddLabel(''); setAddSelectedTeacherIds([]); setAddScope('general');
        setActiveTab('delete');
    };
    
    const handleToggleDelete = (id: string) => {
        setSelectedToDelete(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleConfirmDeletion = (scope: 'all' | 'specific', teacherIds: string[]) => {
        const idsToHide = Array.from(selectedToDelete);
        const target = scope === 'all' ? 'all' : teacherIds;
        onManageHiddenCriteria(idsToHide, target);
        setShowDeletionOptions(false);
        setSelectedToDelete(new Set());
        onClose();
    };

    const handleSelectGroup = (criteriaIds: string[]) => {
        setSelectedToDelete(prev => {
            const newSet = new Set(prev);
            criteriaIds.forEach(id => newSet.add(id));
            return newSet;
        });
    };
    
    const handleDeselectGroup = (criteriaIds: string[]) => {
        setSelectedToDelete(prev => {
            const newSet = new Set(prev);
            criteriaIds.forEach(id => newSet.delete(id));
            return newSet;
        });
    };

    const allCriteriaForHiding = useMemo(() => {
        const customGeneral = customCriteria.filter(c => c.school === school && c.evaluationType === 'general').map(c => c.criterion);
        const customClassSession = customCriteria.filter(c => c.school === school && c.evaluationType === 'class_session').map(c => c.criterion);

        return {
            general: [...GENERAL_EVALUATION_CRITERIA_TEMPLATE, ...customGeneral],
            brief: [...CLASS_SESSION_BRIEF_TEMPLATE.flatMap(g => g.criteria), ...customClassSession],
            extended: [...CLASS_SESSION_EXTENDED_TEMPLATE.flatMap(g => g.criteria), ...customClassSession],
            subject_specific: [...CLASS_SESSION_SUBJECT_SPECIFIC_TEMPLATE.flatMap(g => g.criteria), ...customClassSession],
        };
    }, [customCriteria, school]);
    
    if (!isOpen) return null;

    const TabButton: React.FC<{tab: 'add' | 'delete', label: string}> = ({tab, label}) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-lg font-semibold w-1/2 rounded-t-lg transition-colors ${activeTab === tab ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col relative">
                {showDeletionOptions && (
                    <DeletionOptionsModal
                        teachers={teachers}
                        onConfirm={handleConfirmDeletion}
                        onCancel={() => setShowDeletionOptions(false)}
                    />
                )}
                <div className="flex">
                    <TabButton tab="add" label={t('addCriterionTab')} />
                    <TabButton tab="delete" label={t('deleteCriterionTab')} />
                </div>

                <div className="py-4 overflow-y-auto flex-grow">
                    {activeTab === 'add' && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-primary">{t('addNewCriterion')}</h3>
                            <input type="text" placeholder={t('criterionName')} value={addLabel} onChange={e => setAddLabel(e.target.value)} className="w-full p-2 border rounded" />
                            <select value={addType} onChange={e => setAddType(e.target.value as any)} className="w-full p-2 border rounded">
                                <option value="general">{t('generalEvaluation')}</option>
                                <option value="class_session">{t('classSessionEvaluation')}</option>
                            </select>
                            <div>
                                <label className="font-semibold">{t('criterionScope')}</label>
                                <div className="flex gap-4 mt-2">
                                    <label className="flex items-center gap-2"><input type="radio" name="scope" value="general" checked={addScope === 'general'} onChange={() => setAddScope('general')} /> {t('scopeGeneral')}</label>
                                    <label className="flex items-center gap-2"><input type="radio" name="scope" value="specific" checked={addScope === 'specific'} onChange={() => setAddScope('specific')} /> {t('scopeSpecific')}</label>
                                </div>
                            </div>
                            {addScope === 'specific' && (
                                <div className="max-h-40 overflow-y-auto border p-2 rounded">
                                    {teachers.map(teacher => (
                                        <div key={teacher.id}>
                                            <label className="flex items-center gap-2">
                                                <input type="checkbox" checked={addSelectedTeacherIds.includes(teacher.id)} onChange={() => setAddSelectedTeacherIds(prev => prev.includes(teacher.id) ? prev.filter(id => id !== teacher.id) : [...prev, teacher.id])} />
                                                {teacher.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button onClick={handleAdd} className="w-full px-6 py-2 bg-primary text-white rounded hover:bg-opacity-90">{t('add')}</button>
                        </div>
                    )}

                    {activeTab === 'delete' && (
                        <div className="space-y-4">
                            <div className="mb-4">
                                <button onClick={() => setSelectedToDelete(new Set())} className="w-full px-4 py-2 bg-gray-600 text-white font-bold rounded hover:bg-gray-700">
                                    {t('deselectAll')}
                                </button>
                            </div>
                            <DeletionSection 
                                title={t('generalEvaluationElements')} 
                                criteria={allCriteriaForHiding.general} 
                                selectedIds={selectedToDelete} 
                                onToggle={handleToggleDelete} 
                                onSelectAll={() => handleSelectGroup(allCriteriaForHiding.general.map(c => c.id))}
                                onDeselectAll={() => handleDeselectGroup(allCriteriaForHiding.general.map(c => c.id))}
                            />
                            <DeletionSection 
                                title={t('briefEvaluationElements')} 
                                criteria={allCriteriaForHiding.brief} 
                                selectedIds={selectedToDelete} 
                                onToggle={handleToggleDelete} 
                                onSelectAll={() => handleSelectGroup(allCriteriaForHiding.brief.map(c => c.id))}
                                onDeselectAll={() => handleDeselectGroup(allCriteriaForHiding.brief.map(c => c.id))}
                            />
                            <DeletionSection 
                                title={t('extendedEvaluationElements')} 
                                criteria={allCriteriaForHiding.extended} 
                                selectedIds={selectedToDelete} 
                                onToggle={handleToggleDelete} 
                                onSelectAll={() => handleSelectGroup(allCriteriaForHiding.extended.map(c => c.id))}
                                onDeselectAll={() => handleDeselectGroup(allCriteriaForHiding.extended.map(c => c.id))}
                            />
                            <DeletionSection 
                                title={t('subjectSpecificEvaluationElements')} 
                                criteria={allCriteriaForHiding.subject_specific} 
                                selectedIds={selectedToDelete} 
                                onToggle={handleToggleDelete} 
                                onSelectAll={() => handleSelectGroup(allCriteriaForHiding.subject_specific.map(c => c.id))}
                                onDeselectAll={() => handleDeselectGroup(allCriteriaForHiding.subject_specific.map(c => c.id))}
                            />
                            
                            <button onClick={() => setShowDeletionOptions(true)} disabled={selectedToDelete.size === 0} className="w-full px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300">
                               {t('deleteSelected')} ({selectedToDelete.size})
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="flex-shrink-0 pt-4 border-t">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">{t('cancel')}</button>
                </div>
            </div>
        </div>
    );
};

const TeacherManagement: React.FC<TeacherManagementProps> = (props) => {
  const { 
    teachers, allTeachers, reports, customCriteria, specialReportTemplates, syllabusPlans, syllabusCoverageReports,
    tasks, meetings, peerVisits, deliverySheets, bulkMessages, supervisoryPlans, setSupervisoryPlans, selectedSchool,
    addTeacher, updateTeacher, deleteTeacher, saveReport, deleteReport, saveCustomCriterion, deleteCustomCriteria,
    saveSpecialReportTemplate, deleteSpecialReportTemplate, saveSyllabusPlan, deleteSyllabusPlan, setSyllabusCoverageReports,
    setTasks, hiddenCriteria, manageHiddenCriteria, saveMeeting, deleteMeeting, setPeerVisits, deletePeerVisit, setDeliverySheets, deleteDeliverySheet, setBulkMessages,
    usersInSchool
  } = props;

  const { t } = useLanguage();
  const { hasPermission, academicYear } = useAuth();
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [activeView, setActiveView] = useState<View>('teachers');
  const [isManagingCriteria, setIsManagingCriteria] = useState(false);
  const [initiallyOpenReportId, setInitiallyOpenReportId] = useState<string | null>(null);
  const [supervisorName, setSupervisorName] = useState('');
  const [semester, setSemester] = useState<'الأول' | 'الثاني'>('الأول');
  
  const handleSelectTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setActiveView('teachers');
  };

  const handleBackToList = () => {
    setSelectedTeacher(null);
    setInitiallyOpenReportId(null);
  };

  const handleViewReport = (teacherId: string, reportId: string) => {
      const teacher = allTeachers.find(t => t.id === teacherId);
      if (teacher) {
          setSelectedTeacher(teacher);
          setInitiallyOpenReportId(reportId);
          setActiveView('teachers');
      }
  };
  
  const SpecialReportsManager = () => {
      const [editingTemplate, setEditingTemplate] = useState<SpecialReportTemplate | null>(null);

      const handleNewTemplate = () => {
          setEditingTemplate({
              id: `srt-${Date.now()}`,
              schoolName: selectedSchool,
              name: '',
              criteria: [],
              placement: ['teacher_reports']
          });
      };
      
      const handleSaveTemplate = (template: SpecialReportTemplate) => {
          if (template.name.trim() && template.placement.length > 0) {
            saveSpecialReportTemplate(template);
            setEditingTemplate(null);
          } else {
            alert('يرجى إدخال اسم النموذج واختيار مكان واحد على الأقل.');
          }
      };

      const handlePlacementChange = (placement: SpecialReportPlacement, checked: boolean) => {
          if (!editingTemplate) return;
          const currentPlacements = editingTemplate.placement;
          if (checked) {
              if (!currentPlacements.includes(placement)) {
                  setEditingTemplate({...editingTemplate, placement: [...currentPlacements, placement]});
              }
          } else {
              setEditingTemplate({...editingTemplate, placement: currentPlacements.filter(p => p !== placement)});
          }
      };
      
      const addCriterionToTemplate = (template: SpecialReportTemplate) => {
          const newCriterionName = window.prompt(t('criterionName'));
          if(newCriterionName?.trim()){
              const newCriterion: Omit<GeneralCriterion, 'score'> = {
                  id: `scrit-${Date.now()}`,
                  label: newCriterionName.trim(),
              };
              setEditingTemplate({...template, criteria: [...template.criteria, newCriterion]});
          }
      };
      
      const removeCriterionFromTemplate = (template: SpecialReportTemplate, critId: string) => {
          setEditingTemplate({...template, criteria: template.criteria.filter(c => c.id !== critId)});
      };

      const placementOptions: {key: SpecialReportPlacement, label: string}[] = [
          {key: 'teacher_reports', label: t('placementInTeacherReports')},
          {key: 'main', label: t('placementInMainScreen')},
          {key: 'aggregated_reports', label: t('placementInAggregatedReports')},
          {key: 'performance_dashboard', label: t('placementInPerformanceDashboard')},
          {key: 'other', label: t('placement_other')},
      ];

      if (editingTemplate) {
          return (
              <div className="p-6 bg-white rounded-lg shadow-lg space-y-4">
                  <h3 className="text-xl font-bold text-primary">{t('newSpecialReportTemplate')}</h3>
                  <input type="text" placeholder={t('templateName')} value={editingTemplate.name} onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})} className="w-full p-2 border rounded" />
                  <div>
                    <h4 className="font-semibold mb-2">{t('placement')}</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {placementOptions.map(opt => (
                            <label key={opt.key} className="flex items-center gap-2 p-2 bg-gray-100 rounded">
                                <input 
                                    type="checkbox" 
                                    checked={editingTemplate.placement.includes(opt.key)}
                                    onChange={e => handlePlacementChange(opt.key, e.target.checked)}
                                />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                      <h4 className="font-semibold">{t('criteria')}</h4>
                      {editingTemplate.criteria.map(c => <div key={c.id} className="flex justify-between items-center p-2 bg-gray-100 rounded"><span>{c.label}</span><button onClick={() => removeCriterionFromTemplate(editingTemplate, c.id)} className="text-red-500">X</button></div>)}
                      <button onClick={() => addCriterionToTemplate(editingTemplate)} className="px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600">+ {t('addNewCriterion')}</button>
                  </div>
                  <div className="flex gap-4">
                      <button onClick={() => handleSaveTemplate(editingTemplate)} className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">{t('saveTemplate')}</button>
                      <button onClick={() => setEditingTemplate(null)} className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">{t('cancel')}</button>
                  </div>
              </div>
          )
      }

      return (
           <div className="p-6 bg-white rounded-lg shadow-lg space-y-4">
              <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-primary">{t('specialReports')}</h2>
                  <button onClick={handleNewTemplate} className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors">+ {t('newSpecialReportTemplate')}</button>
              </div>
              {specialReportTemplates.length === 0 ? <p>{t('noSpecialTemplates')}</p> :
                  specialReportTemplates.map(template => (
                      <div key={template.id} className="p-3 border rounded flex justify-between items-center">
                          <span className="font-semibold">{template.name}</span>
                          <div>
                              <button onClick={() => setEditingTemplate(template)} className="text-blue-500 p-2">{t('edit')}</button>
                              <button onClick={() => window.confirm(t('confirmDelete')) && deleteSpecialReportTemplate(template.id)} className="text-red-500 p-2">{t('delete')}</button>
                          </div>
                      </div>
                  ))
              }
          </div>
      )
  };


  const renderView = () => {
    switch (activeView) {
      case 'evaluation_summary':
        return <EvaluationSummary reports={reports} teachers={allTeachers} onViewReport={handleViewReport} />;
      case 'user_management':
        return <UserManagement allTeachers={allTeachers} usersInSchool={usersInSchool} />;
      case 'supervisory_plan':
        return <SupervisoryPlanComponent plans={supervisoryPlans} setPlans={setSupervisoryPlans} selectedSchool={selectedSchool} />;
      case 'task_plan':
        return <TaskPlan tasks={tasks} setTasks={setTasks} />;
      case 'supervisory_tools':
        return <SupervisoryTools 
                    meetings={meetings} 
                    saveMeeting={saveMeeting} 
                    deleteMeeting={deleteMeeting}
                    peerVisits={peerVisits} 
                    setPeerVisits={setPeerVisits}
                    deletePeerVisit={deletePeerVisit}
                    deliverySheets={deliverySheets} 
                    setDeliverySheets={setDeliverySheets}
                    deleteDeliverySheet={deleteDeliverySheet}
                    allTeachers={allTeachers}
                    academicYear={academicYear!}
                    selectedSchool={selectedSchool} // ممررة لضمان الاستقلالية
                />;
      case 'bulk_message':
        return <BulkMessageSender 
                    messages={bulkMessages} 
                    setMessages={setBulkMessages} 
                    teachers={teachers} 
                />;
      case 'aggregated_reports':
        return <AggregatedReports reports={reports} teachers={teachers} tasks={tasks} meetings={meetings} peerVisits={peerVisits} deliverySheets={deliverySheets} />;
      case 'performance_dashboard':
        return <PerformanceDashboard 
                    reports={reports} 
                    teachers={allTeachers} 
                    tasks={tasks} 
                    meetings={meetings} 
                    peerVisits={peerVisits} 
                    deliverySheets={deliverySheets} 
                    syllabusCoverageReports={syllabusCoverageReports}
                />;
      case 'special_reports':
        return <SpecialReportsManager />;
      case 'syllabus':
          return <SyllabusPlanner 
                    syllabusPlans={syllabusPlans}
                    saveSyllabusPlan={saveSyllabusPlan}
                    deleteSyllabusPlan={deleteSyllabusPlan}
                    schoolName={selectedSchool}
                 />;
      case 'syllabus_coverage':
          return <SyllabusCoverageManager 
                    reports={syllabusCoverageReports}
                    setReports={setSyllabusCoverageReports}
                    school={selectedSchool}
                    academicYear={academicYear}
                    semester={semester}
                    allTeachers={allTeachers}
                 />;
      case 'teachers':
      default:
        if (selectedTeacher) {
          return <ReportView 
                    teacher={selectedTeacher} 
                    reports={reports} 
                    customCriteria={customCriteria}
                    specialReportTemplates={specialReportTemplates.filter(t => t.placement.includes('teacher_reports'))}
                    syllabusPlans={syllabusPlans}
                    onBack={handleBackToList} 
                    saveReport={saveReport} 
                    deleteReport={deleteReport} 
                    updateTeacher={updateTeacher} 
                    saveCustomCriterion={saveCustomCriterion}
                    hiddenCriteria={hiddenCriteria}
                    supervisorName={supervisorName}
                    semester={semester}
                    academicYear={academicYear!}
                    initiallyOpenReportId={initiallyOpenReportId}
                 />;
        }
        return (
            <>
                <div className="bg-white p-4 rounded-xl shadow-lg mb-6 flex flex-col md:flex-row items-center gap-4">
                    <input type="text" placeholder={t('supervisorName')} value={supervisorName} onChange={e => setSupervisorName(e.target.value)} className="p-2 border rounded w-full md:w-auto flex-grow" />
                    <div className="flex items-center gap-2">
                        <label className="font-semibold">{t('semesterLabel')}</label>
                        <select value={semester} onChange={e => setSemester(e.target.value as any)} className="p-2 border rounded w-full md:w-auto">
                            <option value="الأول">{t('semester1')}</option>
                            <option value="الثاني">{t('semester2')}</option>
                        </select>
                    </div>
                </div>
                <TeacherList teachers={teachers} onSelectTeacher={handleSelectTeacher} addTeacher={(data) => addTeacher(data, selectedSchool)} deleteTeacher={deleteTeacher} updateTeacher={updateTeacher} />
            </>
        );
    }
  };

  const getButtonClass = (view: View) => {
    return `px-5 py-2.5 rounded-lg font-bold transition-all text-sm md:text-base transform hover:scale-105 ${activeView === view ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`;
  }

  return (
    <div>
      {isManagingCriteria && 
        <CriterionManagerModal 
            isOpen={isManagingCriteria}
            onClose={() => setIsManagingCriteria(false)} 
            onAddCriterion={saveCustomCriterion} 
            onManageHiddenCriteria={manageHiddenCriteria}
            school={selectedSchool} 
            teachers={allTeachers}
            customCriteria={customCriteria}
        />}
      <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-6">
        <button onClick={() => setActiveView('evaluation_summary')} className={getButtonClass('evaluation_summary')}>{t('evaluationSummary')}</button>
        {hasPermission('view_supervisory_plan') && <button onClick={() => setActiveView('supervisory_plan')} className={getButtonClass('supervisory_plan')}>{t('supervisoryPlan')}</button>}
        {hasPermission('view_task_plan') && <button onClick={() => setActiveView('task_plan')} className={getButtonClass('task_plan')}>{t('taskPlan')}</button>}
        {hasPermission('view_supervisory_tools') && <button onClick={() => setActiveView('supervisory_tools')} className={getButtonClass('supervisory_tools')}>{t('supervisoryTools')}</button>}
        {hasPermission('view_teachers') && <button onClick={() => { setActiveView('teachers'); setSelectedTeacher(null); }} className={getButtonClass('teachers')}>{t('manageTeachersAndReports')}</button>}
        {hasPermission('view_syllabus_coverage') && <button onClick={() => setActiveView('syllabus_coverage')} className={getButtonClass('syllabus_coverage')}>{t('syllabusCoverageReport')}</button>}
        
        {hasPermission('manage_criteria') && (
            <button onClick={() => setIsManagingCriteria(true)} className="px-5 py-2.5 rounded-lg font-bold transition-all text-sm md:text-base transform hover:scale-105 bg-sky-500 text-white hover:bg-sky-600">
                {t('addOrDeleteCriterion')}
            </button>
        )}

        {hasPermission('view_syllabus') && <button onClick={() => { setActiveView('syllabus'); setSelectedTeacher(null); }} className={getButtonClass('syllabus')}>{t('syllabusProgress')}</button>}
        
        {hasPermission('view_bulk_message') && <button onClick={() => setActiveView('bulk_message')} className="p-2.5 rounded-lg transition-all transform hover:scale-105 bg-green-500 text-white hover:bg-green-600" title={t('bulkMessage')}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.267.651 4.383 1.905 6.25l-.275 1.002 1.03 1.018zM8.718 7.243c.133-.336.434-.543.818-.576.43-.034.636.101.804.312.189.231.631 1.52.663 1.623.032.102.05.213-.016.344-.065.131-.229.213-.401.325-.202.129-.41.26-.552.404-.16.161-.318.35-.165.608.175.292.747 1.229 1.624 2.016.994.881 1.866 1.158 2.149 1.24.31.09.462.046.63-.122.19-.184.82-1.022.952-1.229.132-.206.264-.238.44-.152.195.094 1.306.685 1.518.79.212.105.356.161.404.248.048.088.028.471-.124.922-.152.452-.947.881-1.306.922-.32.034-1.127.02-1.748-.227-.753-.3-1.859-1.158-3.041-2.451-1.37-1.52-2.316-3.213-2.316-3.213s-.165-.286-.318-.553c-.152-.267-.32-.287-.462-.287-.132 0-.304.01-.462.01z"/></svg>
        </button>}

        {hasPermission('view_aggregated_reports') && <button onClick={() => { setActiveView('aggregated_reports'); setSelectedTeacher(null); }} className={getButtonClass('aggregated_reports')}>{t('aggregatedReports')}</button>}
        {hasPermission('view_performance_dashboard') && <button onClick={() => { setActiveView('performance_dashboard'); setSelectedTeacher(null); }} className={getButtonClass('performance_dashboard')}>{t('performanceIndicators')}</button>}
        {hasPermission('view_special_reports_admin') && <button onClick={() => { setActiveView('special_reports'); setSelectedTeacher(null); }} className={getButtonClass('special_reports')}>{t('specialReports')}</button>}
        {hasPermission('manage_users') && <button onClick={() => setActiveView('user_management')} className={getButtonClass('user_management')}>{t('specialCodes')}</button>}
      </div>
      {renderView()}
    </div>
  );
};

export default TeacherManagement;
