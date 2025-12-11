
// FIX: Removed an incorrect import of 'ClassSessionCriterionGroup'. The type is defined in this file.
export type Language = 'ar' | 'en';

// --- New Auth and User Management Types ---
export type Permission = 
  'all' | 
  'manage_users' | 
  'change_school' | 
  'view_supervisory_plan' | // New permission
  'view_task_plan' | 
  'view_supervisory_tools' |
  'view_meeting_minutes' |
  'view_school_calendar' |
  'view_peer_visits' |
  'view_delivery_records' |
  'view_teachers' |
  'add_teacher' |
  'edit_teacher' |
  'delete_teacher' |
  'view_reports_for_specific_teachers' | // This now acts as a "scoping" permission
  'create_general_report' |
  'create_class_session_report' |
  'create_special_report' |
  'delete_report' | // New granular permission
  'view_syllabus' |
  'view_bulk_message' |
  'view_aggregated_reports' |
  'view_performance_dashboard' |
  'view_special_reports_admin' |
  'manage_criteria' |
  'view_syllabus_coverage'; // New permission for the new feature

export interface User {
  id: string;
  name: string;
  code: string;
  permissions: Permission[];
  managedTeacherIds?: string[]; // For teacher scoping permission
}


export interface School {
  id: string;
  name: string;
}

export interface Teacher {
  id: string;
  name: string;
  schoolName: string; 
  // --- Expanded Fields ---
  qualification?: string;
  specialization?: string;
  subjects?: string; // Comma-separated list
  gradesTaught?: string; // Comma-separated list
  sectionsTaught?: string; // Comma-separated list
  weeklyHours?: number | string;
  otherSchoolTasks?: string;
  yearsOfExperience?: number | string;
  yearsInSchool?: number | string;
  phoneNumber?: string;
  branch?: 'main' | 'boys' | 'girls' | 'other' | string; 
  // --- Deprecated fields, kept for backward compatibility ---
  subject?: string;
  grades?: string;
}

export interface BaseReport {
  id: string;
  teacherId: string;
  date: string;
  school: string;
  subject: string;
  grades: string;
  branch: string;
  // --- New Global Fields ---
  supervisorName?: string;
  semester?: 'الأول' | 'الثاني';
  authorId?: string;
  academicYear?: string;
  // --- New Field for Syllabus Progress ---
  syllabusProgress?: {
      status: 'ahead' | 'on_track' | 'behind';
      plannedLesson: string;
  };
  plannedSyllabusLesson?: string;
}

// General Evaluation Types
export interface GeneralCriterion {
  id:string;
  label: string;
  score: 0 | 1 | 2 | 3 | 4;
  progress?: 'متقدم' | 'مطابق' | 'متأخر';
  lastLessonTitle?: string;
}

export interface GeneralEvaluationReport extends BaseReport {
  evaluationType: 'general';
  criteria: GeneralCriterion[];
  strategies: string;
  tools: string;
  programs: string;
  sources: string;
}


// Class Session Evaluation Types
export type VisitType = 'استطلاعية' | 'تقييمية 1' | 'تقييمية 2' | 'فنية إشرافية' | 'تطويرية' | 'تبادلية' | 'تشخيصية' | 'علاجية';
export type ClassNumber = 'الأول' | 'الثاني' | 'الثالث' | 'الرابع' | 'الخامس' | 'السادس' | 'السابع' | 'الثامن' | 'التاسع' | 'العاشر' | 'الحادي عشر' | 'الثاني عشر';
export type Section = 'أ' | 'ب' | 'ج' | 'د' | 'هـ' | 'و' | 'ز' | 'ح' | 'ط';

export interface ClassSessionCriterion {
  id: string;
  label: string;
  score: 0 | 1 | 2 | 3 | 4;
}

export interface ClassSessionCriterionGroup {
  id: string;
  title: string;
  criteria: ClassSessionCriterion[];
}

export interface ClassSessionEvaluationReport extends BaseReport {
  evaluationType: 'class_session';
  subType: 'brief' | 'extended' | 'subject_specific';
  // supervisorName: string; // Moved to BaseReport
  // semester: 'الأول' | 'الثاني'; // Moved to BaseReport
  visitType: VisitType;
  class: ClassNumber;
  section: Section;
  lessonNumber: string;
  lessonName: string;
  criterionGroups: ClassSessionCriterionGroup[];
  positives: string;
  notesForImprovement: string;
  recommendations: string;
  employeeComment: string;
  // Added fields
  strategies: string;
  tools: string;
  sources: string;
  programs: string;
}

// Special, user-defined report
export interface SpecialReport extends BaseReport {
    evaluationType: 'special';
    templateId: string; // Links to the SpecialReportTemplate
    templateName: string;
    criteria: GeneralCriterion[];
}

export type Report = GeneralEvaluationReport | ClassSessionEvaluationReport | SpecialReport;

export type EvaluationType = 'general' | 'class_session' | 'special';

export interface CustomCriterion {
  id: string;
  school: string;
  evaluationType: 'general' | 'class_session';
  subType?: 'brief' | 'extended' | 'subject_specific';
  groupTitle?: string; // For class session criteria
  criterion: Omit<GeneralCriterion | ClassSessionCriterion, 'score'>;
  // --- New field for teacher-specific criteria ---
  teacherIds?: string[]; // Empty or null means general for all
}


// --- New Feature Types ---

export type SpecialReportPlacement = 'teacher_reports' | 'main' | 'aggregated_reports' | 'performance_dashboard' | 'other';

export interface SpecialReportTemplate {
    id: string;
    schoolName: string;
    name: string;
    criteria: Omit<GeneralCriterion, 'score'>[];
    placement: SpecialReportPlacement[];
}

// This replaces the old Syllabus type
export interface SyllabusLesson {
    id: string;
    title: string;
    plannedDate: string;
}

export interface SyllabusPlan {
    id: string;
    schoolName: string;
    subject: string;
    grade: string;
    lessons: SyllabusLesson[];
    authorId?: string;
    academicYear?: string;
}

// --- New: Syllabus Coverage Report Types ---
export interface SyllabusBranchProgress {
  branchName: string;
  status: 'ahead' | 'on_track' | 'behind' | 'not_set';
  lastLesson: string;
  lessonDifference: string;
  percentage: number;
}

export interface SyllabusCoverageReport {
  id: string;
  schoolName: string;
  academicYear: string;
  semester: 'الأول' | 'الثاني';
  subject: string;
  grade: string;
  branches: SyllabusBranchProgress[];
  authorId?: string;
  teacherId: string;
  branch: 'main' | 'boys' | 'girls';
  date: string;
  
  // --- Enhanced Fields ---
  meetingsAttended?: string; // Number of meetings
  notebookCorrection?: string; // Percentage 1-100
  preparationBook?: string; // Percentage 1-100
  questionsGlossary?: string; // Percentage 1-100
  
  programsImplemented?: string; // Text
  strategiesImplemented?: string; // Text
  toolsUsed?: string; // Text
  sourcesUsed?: string; // Text
  tasksDone?: string; // التكاليف - Text
  testsDelivered?: string; // Text
  peerVisitsDone?: string; // Text
}


// --- Task Plan Types ---
export interface Task {
    id: string;
    description: string;
    type: string[];
    dueDate: string[];
    status: 'لم يتم' | 'قيد التنفيذ' | 'تم التنفيذ';
    completionPercentage: number;
    postponedTo?: string;
    notes?: string;
    isOffPlan?: boolean; 
    authorId?: string;
    academicYear?: string;
}

// --- Supervisory Tools Types ---
export interface SchoolCalendarEvent {
    id: string;
    fromDay: string;
    fromDate: string;
    toDay: string;
    toDate: string;
    program: string;
    deliveryDate: string;
    notes: string;
    // For future file uploads
    attachment?: {
      name: string;
      type: string;
      content: string; // base64 content
    };
}

export interface MeetingOutcome {
    id: string;
    outcome: string;
    assignee: string;
    deadline: string;
    status: 'لم يتم' | 'قيد التنفيذ' | 'تم التنفيذ';
    completionPercentage: number | string;
    notes?: string;
}
export interface Meeting {
    id: string;
    day: string;
    date: string;
    time: string;
    attendees: string;
    subject: string;
    outcomes: MeetingOutcome[];
    signatures: { [attendeeName: string]: string };
    authorId?: string;
    academicYear?: string;
}

export interface PeerVisit {
    id: string;
    visitingTeacher: string;
    visitingSubject: string;
    visitingGrade: string;
    visitedTeacher: string;
    visitedSpecialization: string;
    visitedSubject: string;
    visitedGrade: string;
    status?: 'تمت الزيارة' | 'قيد التنفيذ' | 'لم تتم';
    authorId?: string;
    academicYear?: string;
}

export interface DeliveryRecord {
    id: string;
    grade: string;
    subject: string;
    formCount: number | string;
    receiveDate: string;
    deliveryDate: string;
    teacherName: string;
    teacherId: string;
    notes?: string;
}

export interface DeliverySheet {
    id: string;
    name: string;
    records: DeliveryRecord[];
    authorId?: string;
    academicYear?: string;
}

// --- Bulk Message Type ---
export interface BulkMessage {
    id: string;
    text: string;
    date: string;
    recipientType: 'all' | 'specific';
    recipients: string[]; // teacher names
    authorId?: string;
    academicYear?: string;
}

// --- NEW: Supervisory Plan Types (Updated Structure) ---
export interface SupervisoryPlanEntry {
    id: string;
    domain: string;
    objective: string;
    // Nested indicator
    indicatorText?: string;
    indicatorCount?: number | string;
    evidence?: string;
    // Nested activity
    activityText?: string;
    activityPlanned?: number | string;

    isGroupHeader?: boolean; // To mark domain rows
    isSummaryRow?: boolean; // To mark summary rows
    
    // For simpler rows that don't fit the nested structure
    indicator?: string; 
    activity?: string;
    totalPlanned?: number | string; // For summary rows or simpler rows

    monthlyPlanned: {
        dhu_al_hijjah: number | string;
        muharram: number | string;
        safar: number | string;
        rabi_al_awwal: number | string;
        rabi_al_thani: number | string;
        jumada_al_ula: number | string;
        jumada_al_thani: number | string;
        rajab: number | string;
        shaban: number | string;
        // Adding other months from user's table as placeholders if needed
        month_6?: number | string;
        month_7?: number | string;
        month_8?: number | string;
        month_9?: number | string;
        month_10?: number | string;
        month_11?: number | string;
        month_12?: number | string;
        month_1?: number | string;
        month_2?: number | string;
    };
    
    executed: number | string;
    cost: number | string;
    reasonsForNonExecution: string;
    notes: string;
    status: 'لم يتم' | 'قيد التنفيذ' | 'تم التنفيذ';
}

export type SupervisoryPlan = SupervisoryPlanEntry[];

// --- New Table Structures for Supervisory Plan ---
export interface OffPlanItem {
    id: string;
    domain: string;
    activity: string;
    reason: string;
    notes: string;
}

export interface StrengthItem {
    id: string;
    strength: string;
    reinforcement: string;
    notes: string;
}

export interface ProblemItem {
    id: string;
    problem: string;
    solution: string;
    notes: string;
}

export interface RecommendationItem {
    id: string;
    recommendation: string;
}

export interface SupervisoryPlanWrapper {
  id: string;
  title: string;
  createdAt: string;
  semester: 'الأول' | 'الثاني' | 'الأول والثاني';
  academicYear: string;
  supervisorName: string;
  semesterDates: {
    start1: string;
    end1: string;
    start2: string;
    end2: string;
  };
  planData: SupervisoryPlan;
  isCollapsed: boolean;
  // Updated fields
  offPlanItems: OffPlanItem[]; 
  strengthItems: StrengthItem[];
  problemItems: ProblemItem[];
  recommendationItems: RecommendationItem[];
  // Deprecated but kept for migration if needed
  offPlanActivities?: string[]; 
}
