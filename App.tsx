import React, { useState, useMemo, useEffect } from 'react';
// FIX: Import 'useLanguage' hook to resolve 'Cannot find name' error.
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { translations } from './i18n/translations';
import Header from './components/Header';
import Footer from './components/Footer';
import TeacherManagement from './components/TeacherManagement';
import LoginModal from './components/LoginModal';
import { Teacher, Report, CustomCriterion, School, SpecialReportTemplate, SyllabusPlan, Task, Meeting, PeerVisit, DeliverySheet, BulkMessage, User, SyllabusCoverageReport, SupervisoryPlanWrapper } from './types';
import { THEMES, INITIAL_TEACHERS, INITIAL_SCHOOLS, INITIAL_SUPERVISORY_PLANS } from './constants';
import useLocalStorage from './hooks/useLocalStorage';

const AppContent: React.FC = () => {
  const { isAuthenticated, selectedSchool, academicYear, hasPermission, currentUser, setSelectedSchool } = useAuth();
  const { language, t } = useLanguage();
  const [theme, setTheme] = useLocalStorage<string>('theme', 'default');
  
  // Data states - now representing the entire dataset for the app
  const [schools, setSchools] = useLocalStorage<School[]>('schools', INITIAL_SCHOOLS);
  const [teachers, setTeachers] = useLocalStorage<Teacher[]>('teachers', INITIAL_TEACHERS);
  const [reports, setReports] = useLocalStorage<Report[]>('reports', []);
  const [customCriteria, setCustomCriteria] = useLocalStorage<CustomCriterion[]>('customCriteria', []);
  const [specialReportTemplates, setSpecialReportTemplates] = useLocalStorage<SpecialReportTemplate[]>('specialReportTemplates', []);
  const [syllabusPlans, setSyllabusPlans] = useLocalStorage<SyllabusPlan[]>('syllabusPlans', []);
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', []);
  const [meetings, setMeetings] = useLocalStorage<Meeting[]>('meetings', []);
  const [peerVisits, setPeerVisits] = useLocalStorage<PeerVisit[]>('peerVisits', []);
  const [deliverySheets, setDeliverySheets] = useLocalStorage<DeliverySheet[]>('deliverySheets', []);
  const [bulkMessages, setBulkMessages] = useLocalStorage<BulkMessage[]>('bulkMessages', []);
  const [syllabusCoverageReports, setSyllabusCoverageReports] = useLocalStorage<SyllabusCoverageReport[]>('syllabusCoverageReports', []);
  const [supervisoryPlans, setSupervisoryPlans] = useLocalStorage<SupervisoryPlanWrapper[]>('supervisoryPlans', INITIAL_SUPERVISORY_PLANS);
  const [hiddenCriteria, setHiddenCriteria] = useLocalStorage<{ [teacherIdOrAll: string]: string[] }>('hiddenCriteria', {});

  useEffect(() => {
    const themeConfig = THEMES[theme as keyof typeof THEMES] || THEMES.default;
    const themeColors = themeConfig.colors;
    for (const key in themeColors) {
      document.documentElement.style.setProperty(key, themeColors[key as keyof typeof themeColors]);
    }
  }, [theme]);

  const addSchool = (name: string) => {
      const newSchool: School = { id: `school-${Date.now()}`, name };
      setSchools(prev => [...prev, newSchool]);
  };

  const addTeacher = (teacherData: Omit<Teacher, 'id' | 'schoolName'>, schoolName: string) => {
    const newTeacher: Teacher = {
      id: `teacher-${Date.now()}`,
      schoolName,
      name: teacherData.name,
      ...teacherData
    };
    setTeachers(prev => [...prev, newTeacher]);
  };
  
  const updateTeacher = (updatedTeacher: Teacher) => {
    setTeachers(prev => prev.map(t => t.id === updatedTeacher.id ? updatedTeacher : t));
  };

  const deleteTeacher = (teacherId: string) => {
    setTeachers(prev => prev.filter(t => t.id !== teacherId));
    setReports(prev => prev.filter(r => r.teacherId !== teacherId));
  };
  
  const saveData = <T extends { authorId?: string, academicYear?: string }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    data: T & { id: string }
  ) => {
      const dataToSave = {
          ...data,
          authorId: currentUser?.id,
          academicYear: academicYear
      };
      setter(prev => {
          const existingIndex = prev.findIndex(item => (item as any).id === dataToSave.id);
          if (existingIndex > -1) {
              const updated = [...prev];
              updated[existingIndex] = dataToSave;
              return updated;
          }
          return [...prev, dataToSave];
      });
  };

  const manageHiddenCriteria = (criteriaIds: string[], teacherIds: 'all' | string[]) => {
    setHiddenCriteria(prev => {
        const newHidden = { ...prev };
        const targets = teacherIds === 'all' ? ['all'] : teacherIds;

        targets.forEach(targetId => {
            const existing = newHidden[targetId] || [];
            // Use a Set to ensure uniqueness before saving
            const updated = [...new Set([...existing, ...criteriaIds])];
            newHidden[targetId] = updated;
        });

        return newHidden;
    });
  };

  const deleteCustomCriteria = (criterionIds: string[]) => {
    const idsToDelete = new Set(criterionIds);
    setCustomCriteria(prev => prev.filter(c => !idsToDelete.has(c.id)));
  };

  const deleteMeeting = (meetingId: string) => {
    setMeetings(prev => prev.filter(m => m.id !== meetingId));
  };

  const deletePeerVisit = (visitId: string) => {
    setPeerVisits(prev => prev.filter(v => v.id !== visitId));
  };
  
  const deleteDeliverySheet = (sheetId: string) => {
    setDeliverySheets(prev => prev.filter(s => s.id !== sheetId));
  };

  const deleteSyllabusPlan = (syllabusId: string) => {
    setSyllabusPlans(prev => prev.filter(s => s.id !== syllabusId));
  };


  // --- Data filtering based on current user permissions ---
  const userFilteredData = useMemo(() => {
    if (!currentUser || !selectedSchool) {
        return {
            teachers: [], reports: [], customCriteria: [], specialReportTemplates: [], syllabusPlans: [],
            tasks: [], meetings: [], peerVisits: [], deliverySheets: [], bulkMessages: [], allTeachersInSchool: [],
            syllabusCoverageReports: []
        };
    }
    
    const isMainAdmin = hasPermission('all');
    
    // 1. Filter Teachers
    const allTeachersInSchool = teachers.filter(t => t.schoolName === selectedSchool);
    
    let visibleTeachers: Teacher[] = [];
    if (!hasPermission('view_teachers')) {
        visibleTeachers = [];
    } else if (isMainAdmin || !hasPermission('view_reports_for_specific_teachers')) {
        visibleTeachers = allTeachersInSchool;
    } else {
        visibleTeachers = allTeachersInSchool.filter(t => currentUser.managedTeacherIds?.includes(t.id));
    }
    const visibleTeacherIds = new Set(visibleTeachers.map(t => t.id));

    // 2. Filter data linked to teachers (e.g., Reports)
    // Admin sees all reports in the school. A supervisor sees all reports for their assigned teachers.
    const visibleReports = reports.filter(r => visibleTeacherIds.has(r.teacherId));
    
    // 3. Filter data linked to authors (e.g., Tasks, Meetings)
    // Admin sees all. Others see only their own.
    const filterByAuthor = <T extends { authorId?: string }>(data: T[]) => {
        return isMainAdmin ? data : data.filter(d => d.authorId === currentUser.id);
    };

    const schoolAndYearFilter = <T extends { schoolName?: string, academicYear?: string }>(data: T[]) => {
        return data.filter(d => d.schoolName === selectedSchool && d.academicYear === academicYear);
    }

    return {
        teachers: visibleTeachers,
        allTeachersInSchool: allTeachersInSchool,
        reports: visibleReports,
        // School-wide data is filtered by school, permissions hide the UI to manage them.
        customCriteria: customCriteria.filter(c => c.school === selectedSchool),
        specialReportTemplates: specialReportTemplates.filter(t => t.schoolName === selectedSchool),
        syllabusPlans: syllabusPlans.filter(s => s.schoolName === selectedSchool),
        syllabusCoverageReports: filterByAuthor(schoolAndYearFilter(syllabusCoverageReports)),
        // Author-specific data
        tasks: filterByAuthor(tasks),
        meetings: filterByAuthor(meetings),
        peerVisits: filterByAuthor(peerVisits),
        deliverySheets: filterByAuthor(deliverySheets),
        bulkMessages: filterByAuthor(bulkMessages)
    };
  }, [currentUser, selectedSchool, academicYear, teachers, reports, customCriteria, specialReportTemplates, syllabusPlans, tasks, meetings, peerVisits, deliverySheets, bulkMessages, syllabusCoverageReports, hasPermission]);


  if (!isAuthenticated) {
    return <LoginModal schools={schools} addSchool={addSchool} />;
  }

  return (
    <div className={`min-h-screen font-sans ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <Header 
          currentTheme={theme} 
          setTheme={setTheme} 
          selectedSchool={selectedSchool}
          onChangeSchool={() => setSelectedSchool(null)}
      />
      <main className="container mx-auto p-4 md:p-6">
        <TeacherManagement 
          teachers={userFilteredData.teachers}
          allTeachers={userFilteredData.allTeachersInSchool}
          reports={userFilteredData.reports}
          customCriteria={customCriteria} // Pass unfiltered for manager
          specialReportTemplates={userFilteredData.specialReportTemplates}
          syllabusPlans={userFilteredData.syllabusPlans}
          syllabusCoverageReports={userFilteredData.syllabusCoverageReports}
          tasks={userFilteredData.tasks}
          meetings={userFilteredData.meetings}
          peerVisits={userFilteredData.peerVisits}
          deliverySheets={userFilteredData.deliverySheets}
          bulkMessages={userFilteredData.bulkMessages}
          supervisoryPlans={supervisoryPlans}
          setSupervisoryPlans={setSupervisoryPlans}
          selectedSchool={selectedSchool!}
          addTeacher={addTeacher}
          updateTeacher={updateTeacher}
          deleteTeacher={deleteTeacher}
          saveReport={(report) => saveData(setReports, report)}
          deleteReport={(reportId) => setReports(prev => prev.filter(r => r.id !== reportId))}
          saveCustomCriterion={(criterion) => saveData(setCustomCriteria as any, criterion)}
          deleteCustomCriteria={deleteCustomCriteria}
          saveSpecialReportTemplate={(template) => saveData(setSpecialReportTemplates as any, template)}
          deleteSpecialReportTemplate={(templateId) => setSpecialReportTemplates(prev => prev.filter(t => t.id !== templateId))}
          saveSyllabusPlan={(syllabus) => saveData(setSyllabusPlans as any, syllabus)}
          deleteSyllabusPlan={deleteSyllabusPlan}
          setSyllabusCoverageReports={setSyllabusCoverageReports}
          setTasks={setTasks} // Pass full setter for local manipulation in component
          hiddenCriteria={hiddenCriteria}
          manageHiddenCriteria={manageHiddenCriteria}
          saveMeeting={(meeting) => saveData(setMeetings, meeting)}
          deleteMeeting={deleteMeeting}
          setPeerVisits={setPeerVisits}
          deletePeerVisit={deletePeerVisit}
          setDeliverySheets={setDeliverySheets}
          deleteDeliverySheet={deleteDeliverySheet}
          setBulkMessages={setBulkMessages}
        />
      </main>
      <Footer />
    </div>
  );
};

const App: React.FC = () => {
    const [language, setLanguage] = useState<'ar' | 'en'>('ar');

    const t = useMemo(() => {
        return (key: keyof typeof translations.ar) => {
            return translations[language][key] || key;
        };
    }, [language]);

    const toggleLanguage = () => {
        const newLang = language === 'ar' ? 'en' : 'ar';
        setLanguage(newLang);
        document.documentElement.lang = newLang;
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    };
    
    useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }, [language]);

    return (
        <LanguageProvider value={{ language, t, toggleLanguage }}>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </LanguageProvider>
    );
};

export default App;
