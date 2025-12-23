
import React, { useState, useMemo, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { translations } from './i18n/translations';
import Header from './components/Header';
import Footer from './components/Footer';
import TeacherManagement from './components/TeacherManagement';
import LoginModal from './components/LoginModal';
import ScrollButtons from './components/ScrollButtons';
import { Teacher, Report, CustomCriterion, School, SpecialReportTemplate, SyllabusPlan, Task, Meeting, PeerVisit, DeliverySheet, BulkMessage, User, SyllabusCoverageReport, SupervisoryPlanWrapper } from './types';
import { THEMES, INITIAL_TEACHERS, INITIAL_SCHOOLS, INITIAL_SUPERVISORY_PLANS, INITIAL_USERS } from './constants';
import useLocalStorage from './hooks/useLocalStorage';

const AppContent: React.FC = () => {
  const { isAuthenticated, selectedSchool, academicYear, hasPermission, currentUser, setSelectedSchool, users, setUsers } = useAuth();
  const { language, t } = useLanguage();
  const [theme, setTheme] = useLocalStorage<string>('theme', 'default');
  
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
  
  const saveData = <T extends { authorId?: string, academicYear?: string, schoolName?: string, school?: string }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    data: T & { id: string }
  ) => {
      const dataToSave = {
          ...data,
          authorId: currentUser?.id,
          academicYear: academicYear,
          schoolName: selectedSchool || data.schoolName,
          school: selectedSchool || data.school,
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

  // محرك الفلترة الذكي لاستعادة البيانات القديمة
  const userFilteredData = useMemo(() => {
    if (!currentUser || !selectedSchool) {
        return {
            teachers: [], reports: [], customCriteria: [], specialReportTemplates: [], syllabusPlans: [],
            tasks: [], meetings: [], peerVisits: [], deliverySheets: [], bulkMessages: [], allTeachersInSchool: [],
            syllabusCoverageReports: [], supervisoryPlans: [], usersInSchool: []
        };
    }
    
    const isMainAdmin = hasPermission('all');
    const firstSchoolName = schools[0]?.name || 'مدارس الرائد النموذجية';
    
    // دالة مساعدة لتحديد ما إذا كان السجل ينتمي للمدرسة المختارة (مع دعم البيانات القديمة)
    const isItemInSelectedSchool = (item: any) => {
        const itemSchool = item.schoolName || item.school;
        // إذا لم يكن هناك مدرسة مسجلة، نعتبرها تابعة للمدرسة الأولى (الرائد)
        if (!itemSchool) return selectedSchool === firstSchoolName;
        return itemSchool === selectedSchool;
    };

    // 1. فلترة المعلمين
    const allTeachersInSchool = teachers.filter(isItemInSelectedSchool);
    
    let visibleTeachers: Teacher[] = [];
    if (!hasPermission('view_teachers')) {
        visibleTeachers = [];
    } else if (isMainAdmin || !hasPermission('view_reports_for_specific_teachers')) {
        visibleTeachers = allTeachersInSchool;
    } else {
        visibleTeachers = allTeachersInSchool.filter(t => currentUser.managedTeacherIds?.includes(t.id));
    }
    const visibleTeacherIds = new Set(visibleTeachers.map(t => t.id));

    // 2. فلترة التقارير
    const visibleReports = reports.filter(r => isItemInSelectedSchool(r) && visibleTeacherIds.has(r.teacherId));
    
    // 3. فلترة البيانات العامة للمدرسة
    const schoolFilter = <T extends { schoolName?: string, school?: string }>(data: T[]) => {
        return data.filter(isItemInSelectedSchool);
    };

    // 4. فلترة البيانات المرتبطة بالمؤلف + المدرسة
    const authorAndSchoolFilter = <T extends { authorId?: string, schoolName?: string, school?: string }>(data: T[]) => {
        const inSchool = data.filter(isItemInSelectedSchool);
        return isMainAdmin ? inSchool : inSchool.filter(d => d.authorId === currentUser.id);
    };

    // 5. فلترة المستخدمين
    const usersInSchool = users.filter(u => !u.schoolName || u.schoolName === selectedSchool);

    return {
        teachers: visibleTeachers,
        allTeachersInSchool: allTeachersInSchool,
        reports: visibleReports,
        customCriteria: schoolFilter(customCriteria),
        specialReportTemplates: schoolFilter(specialReportTemplates),
        syllabusPlans: schoolFilter(syllabusPlans),
        syllabusCoverageReports: authorAndSchoolFilter(syllabusCoverageReports),
        tasks: authorAndSchoolFilter(tasks),
        meetings: authorAndSchoolFilter(meetings),
        peerVisits: authorAndSchoolFilter(peerVisits),
        deliverySheets: authorAndSchoolFilter(deliverySheets),
        bulkMessages: authorAndSchoolFilter(bulkMessages),
        supervisoryPlans: authorAndSchoolFilter(supervisoryPlans),
        usersInSchool: usersInSchool
    };
  }, [currentUser, selectedSchool, academicYear, teachers, reports, customCriteria, specialReportTemplates, syllabusPlans, tasks, meetings, peerVisits, deliverySheets, bulkMessages, syllabusCoverageReports, supervisoryPlans, users, schools, hasPermission]);


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
      <main className="container mx-auto p-4 md:p-6 pb-24">
        <TeacherManagement 
          teachers={userFilteredData.teachers}
          allTeachers={userFilteredData.allTeachersInSchool}
          reports={userFilteredData.reports}
          customCriteria={userFilteredData.customCriteria} 
          specialReportTemplates={userFilteredData.specialReportTemplates}
          syllabusPlans={userFilteredData.syllabusPlans}
          syllabusCoverageReports={userFilteredData.syllabusCoverageReports}
          tasks={userFilteredData.tasks}
          meetings={userFilteredData.meetings}
          peerVisits={userFilteredData.peerVisits}
          deliverySheets={userFilteredData.deliverySheets}
          bulkMessages={userFilteredData.bulkMessages}
          supervisoryPlans={userFilteredData.supervisoryPlans}
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
          setTasks={setTasks} 
          hiddenCriteria={hiddenCriteria}
          manageHiddenCriteria={manageHiddenCriteria}
          saveMeeting={(meeting) => saveData(setMeetings, meeting)}
          deleteMeeting={deleteMeeting}
          setPeerVisits={setPeerVisits}
          deletePeerVisit={deletePeerVisit}
          setDeliverySheets={setDeliverySheets}
          deleteDeliverySheet={deleteDeliverySheet}
          setBulkMessages={setBulkMessages}
          usersInSchool={userFilteredData.usersInSchool}
        />
      </main>
      <ScrollButtons />
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
