
import React, { useState, useMemo } from 'react';
import { Teacher, Report, CustomCriterion, SpecialReportTemplate, SyllabusPlan, GeneralCriterion, SpecialReportPlacement, Task, Meeting, PeerVisit, DeliverySheet, BulkMessage, SyllabusCoverageReport, ClassSessionCriterionGroup, SupervisoryPlanWrapper, User, SchoolCalendarEvent } from '../types';
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
  schoolCalendarEvents: SchoolCalendarEvent[];
  setSchoolCalendarEvents: React.Dispatch<React.SetStateAction<SchoolCalendarEvent[]>>;
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

const TeacherManagement: React.FC<TeacherManagementProps> = (props) => {
  const { 
    teachers, allTeachers, reports, customCriteria, specialReportTemplates, syllabusPlans, syllabusCoverageReports,
    tasks, meetings, peerVisits, deliverySheets, schoolCalendarEvents, setSchoolCalendarEvents, bulkMessages, supervisoryPlans, setSupervisoryPlans, selectedSchool,
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
                    schoolCalendarEvents={schoolCalendarEvents}
                    setSchoolCalendarEvents={setSchoolCalendarEvents}
                    allTeachers={allTeachers}
                    academicYear={academicYear!}
                    selectedSchool={selectedSchool}
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
                    selectedSchool={selectedSchool}
                />;
      case 'special_reports':
        return <div>Special Reports Manager Placeholder</div>; // (Simplified for this diff)
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
      <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-6">
        <button onClick={() => setActiveView('evaluation_summary')} className={getButtonClass('evaluation_summary')}>{t('evaluationSummary')}</button>
        {hasPermission('view_supervisory_plan') && <button onClick={() => setActiveView('supervisory_plan')} className={getButtonClass('supervisory_plan')}>{t('supervisoryPlan')}</button>}
        {hasPermission('view_task_plan') && <button onClick={() => setActiveView('task_plan')} className={getButtonClass('task_plan')}>{t('taskPlan')}</button>}
        {hasPermission('view_supervisory_tools') && <button onClick={() => setActiveView('supervisory_tools')} className={getButtonClass('supervisory_tools')}>{t('supervisoryTools')}</button>}
        {hasPermission('view_teachers') && <button onClick={() => { setActiveView('teachers'); setSelectedTeacher(null); }} className={getButtonClass('teachers')}>{t('manageTeachersAndReports')}</button>}
        {hasPermission('view_syllabus_coverage') && <button onClick={() => setActiveView('syllabus_coverage')} className={getButtonClass('syllabus_coverage')}>{t('syllabusCoverageReport')}</button>}
        {hasPermission('view_aggregated_reports') && <button onClick={() => { setActiveView('aggregated_reports'); setSelectedTeacher(null); }} className={getButtonClass('aggregated_reports')}>{t('aggregatedReports')}</button>}
        {hasPermission('view_performance_dashboard') && <button onClick={() => { setActiveView('performance_dashboard'); setSelectedTeacher(null); }} className={getButtonClass('performance_dashboard')}>{t('performanceIndicators')}</button>}
        {hasPermission('manage_users') && <button onClick={() => setActiveView('user_management')} className={getButtonClass('user_management')}>{t('specialCodes')}</button>}
      </div>
      {renderView()}
    </div>
  );
};

export default TeacherManagement;
