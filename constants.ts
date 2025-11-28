
import { Teacher, GeneralCriterion, ClassSessionCriterionGroup, School, User, Permission, SupervisoryPlan, SupervisoryPlanWrapper } from './types';

export const INITIAL_SCHOOLS: School[] = [
    { id: 'school-1', name: 'مدارس الرائد النموذجية' },
    { id: 'school-2', name: 'مدارس عمان الأهلية' },
];

// --- New: Initial Users with Main Admin ---
export const INITIAL_USERS: User[] = [
    {
        id: 'main-admin-01',
        name: 'إبراهيم دخان',
        code: '772324000a780804012a',
        permissions: ['all'],
        managedTeacherIds: []
    },
    {
        id: 'user-02',
        name: 'آية فاتق',
        code: '3A8B',
        permissions: ['create_general_report', 'view_reports_for_specific_teachers', 'view_syllabus', 'view_teachers'],
        managedTeacherIds: ['t5']
    },
    {
        id: 'user-03',
        name: 'إيمان قطيش',
        code: '5C2D',
        permissions: ['create_general_report', 'view_reports_for_specific_teachers', 'view_syllabus', 'view_teachers'],
        managedTeacherIds: ['t9']
    },
    {
        id: 'user-04',
        name: 'إيمان النصيف',
        code: '9E4F',
        permissions: ['create_general_report', 'view_reports_for_specific_teachers', 'view_syllabus', 'view_teachers'],
        managedTeacherIds: ['t11']
    },
    {
        id: 'user-05',
        name: 'جمال الرديني',
        code: '7G6H',
        permissions: ['create_general_report', 'view_reports_for_specific_teachers', 'view_syllabus', 'view_teachers'],
        managedTeacherIds: ['t8']
    },
    {
        id: 'user-06',
        name: 'عبدالرزاق صبيح',
        code: '1I8J',
        permissions: ['create_general_report', 'view_reports_for_specific_teachers', 'view_syllabus', 'view_teachers'],
        managedTeacherIds: ['t7']
    },
    {
        id: 'user-07',
        name: 'علي الروني',
        code: '2K5L',
        permissions: ['create_general_report', 'view_reports_for_specific_teachers', 'view_syllabus', 'view_teachers'],
        managedTeacherIds: ['t13']
    },
    {
        id: 'user-08',
        name: 'فهمي الجرافي',
        code: '4M3N',
        permissions: ['create_general_report', 'view_reports_for_specific_teachers', 'view_syllabus', 'view_teachers'],
        managedTeacherIds: ['t4']
    },
    {
        id: 'user-09',
        name: 'منير الجمري',
        code: '6O9P',
        permissions: ['create_general_report', 'view_reports_for_specific_teachers', 'view_syllabus', 'view_teachers'],
        managedTeacherIds: ['t1']
    },
    {
        id: 'user-10',
        name: 'وجدان عزي',
        code: '8Q7R',
        permissions: ['create_general_report', 'view_reports_for_specific_teachers', 'view_syllabus', 'view_teachers'],
        managedTeacherIds: ['t1']
    },
    {
        id: 'user-11',
        name: 'وفاء الصلوي',
        code: '0S1T',
        permissions: ['create_general_report', 'view_reports_for_specific_teachers', 'view_syllabus', 'view_teachers'],
        managedTeacherIds: ['t10']
    },
    {
        id: 'user-12',
        name: 'إيمان العبسي',
        code: '3U2V',
        permissions: ['create_general_report', 'view_reports_for_specific_teachers', 'view_syllabus', 'view_teachers'],
        managedTeacherIds: ['t15']
    },
    {
        id: 'user-13',
        name: 'رانيا العزي',
        code: '5W4X',
        permissions: ['create_general_report', 'view_reports_for_specific_teachers', 'view_syllabus', 'view_teachers'],
        managedTeacherIds: ['t16']
    },
    {
        id: 'user-14',
        name: 'هدى الصغير',
        code: '7Y6Z',
        permissions: ['create_general_report', 'view_reports_for_specific_teachers', 'view_syllabus', 'view_teachers'],
        managedTeacherIds: ['t17']
    },
    {
        id: 'user-15',
        name: 'أشواق المخلافي',
        code: '9A8B',
        permissions: ['create_general_report', 'view_reports_for_specific_teachers', 'view_syllabus', 'view_teachers'],
        managedTeacherIds: ['t18']
    },
    {
        id: 'user-16',
        name: 'عائشة العريقي',
        code: '2C1D',
        permissions: ['create_general_report', 'view_reports_for_specific_teachers', 'view_syllabus', 'view_teachers'],
        managedTeacherIds: ['t19']
    }
];


// --- New: Permissions Hierarchy for User Management UI ---
export const PERMISSIONS_HIERARCHY: { [key in Permission]?: Permission[] } = {
    view_teachers: ['add_teacher', 'edit_teacher', 'delete_teacher', 'create_general_report', 'create_class_session_report', 'create_special_report', 'delete_report', 'view_reports_for_specific_teachers'],
    view_supervisory_plan: [],
    view_syllabus_coverage: [],
    view_supervisory_tools: ['view_meeting_minutes', 'view_school_calendar', 'view_peer_visits', 'view_delivery_records'],
    view_task_plan: [],
    view_syllabus: [],
    view_bulk_message: [],
    view_aggregated_reports: [],
    view_performance_dashboard: [],
    view_special_reports_admin: [],
    manage_criteria: [],
    manage_users: [],
    change_school: [],
};


// Updated to include new fields for backward compatibility with localStorage
const addEmptyFields = (teacher: Omit<Teacher, 'schoolName'> & { schoolName: string }): Teacher => ({
    qualification: '',
    specialization: '',
    subjects: '',
    gradesTaught: '',
    sectionsTaught: '',
    weeklyHours: '',
    otherSchoolTasks: '',
    yearsOfExperience: '',
    yearsInSchool: '',
    phoneNumber: '',
    ...teacher,
});


export const INITIAL_TEACHERS: Teacher[] = [
  { id: 't1', name: 'وجدان العزي', schoolName: 'مدارس الرائد النموذجية' }, { id: 't2', name: 'محمد الدريهم', schoolName: 'مدارس الرائد النموذجية' },
  { id: 't3', name: 'عبد الرؤوف الوصابي', schoolName: 'مدارس الرائد النموذجية' }, { id: 't4', name: 'فهمي الجرافي', schoolName: 'مدارس الرائد النموذجية' },
  { id: 't5', name: 'آية فاتق', schoolName: 'مدارس الرائد النموذجية' }, { id: 't6', name: 'عاصم المنعي', schoolName: 'مدارس الرائد النموذجية' },
  { id: 't7', name: 'عبد الرزاق صبيح', schoolName: 'مدارس الرائد النموذجية' }, { id: 't8', name: 'جمال الرديني', schoolName: 'مدارس الرائد النموذجية' },
  { id: 't9', name: 'إيمان قطيش', schoolName: 'مدارس الرائد النموذجية' }, { id: 't10', name: 'وفاء الصلوي', schoolName: 'مدارس الرائد النموذجية' },
  { id: 't11', name: 'إيمان النصيف', schoolName: 'مدارس الرائد النموذجية' }, { id: 't12', name: 'عبد السلام المعدني', schoolName: 'مدارس الرائد النموذجية' },
  { id: 't13', name: 'علي عامر', schoolName: 'مدارس الرائد النموذجية' }, { id: 't14', name: 'محمد المشرع', schoolName: 'مدارس الرائد النموذجية' },
  { id: 't15', name: 'إيمان العبسي', schoolName: 'مدارس الرائد النموذجية' }, { id: 't16', name: 'رانيا العزي', schoolName: 'مدارس الرائد النموذجية' },
  { id: 't17', name: 'هدى الصغير', schoolName: 'مدارس الرائد النموذجية' }, { id: 't18', name: 'أشواق المخلافي', schoolName: 'مدارس الرائد النموذجية' },
  { id: 't19', name: 'عائشة العريقي', schoolName: 'مدارس الرائد النموذجية' }, { id: 't20', name: 'ألطاف جار الله', schoolName: 'مدارس الرائد النموذجية' },
  { id: 't21', name: 'هناء الحيجنة', schoolName: 'مدارس الرائد النموذجية' }, { id: 't22', name: 'رحاب العيفري', schoolName: 'مدارس الرائد النموذجية' },
  { id: 't23', name: 'ضحى القباطي', schoolName: 'مدارس الرائد النموذجية' }, { id: 't24', name: 'خلود صلاح', schoolName: 'مدارس الرائد النموذجية' },
  { id: 't25', name: 'هند  الحبابي', schoolName: 'مدارس الرائد النموذجية' }, { id: 't26', name: 'ناديا الورد', schoolName: 'مدارس الرائد النموذجية' }
].map(addEmptyFields);

// --- New: Syllabus Coverage Report Constants ---
export const SUBJECTS = ['القرآن كريم', 'التربية الإسلامية', 'اللغة العربية', 'اللغة الإنجليزية', 'الرياضيات', 'العلوم', 'الكيمياء', 'الفيزياء', 'الأحياء', 'الاجتماعيات', 'الحاسوب', 'أخرى'];
export const GRADES = ['التمهيدي', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي', 'أخرى'];
export const SUBJECT_BRANCH_MAP: { [key: string]: string[] } = {
    'القرآن كريم': ['حفظ وتفسير', 'تجويد', 'تلاوة'],
    'التربية الإسلامية': ['إيمان', 'حديث', 'فقه', 'سيرة'],
    'اللغة العربية': ['نحو', 'أدب', 'نصوص', 'بلاغة', 'نقد', 'قراءة'],
    'اللغة الإنجليزية': ['لغة إنجليزية'],
    'الرياضيات': ['جبر', 'هندسة', 'تفاضل', 'تكامل', 'إحصاء'],
    'العلوم': ['علوم'],
    'الكيمياء': ['كيمياء'],
    'الفيزياء': ['فيزياء'],
    'الأحياء': ['أحياء'],
    'الاجتماعيات': ['تاريخ', 'مجتمع', 'جغرافيا', 'وطنية'],
    'الحاسوب': ['حاسوب'],
    'أخرى': [],
};


export const GENERAL_EVALUATION_CRITERIA_TEMPLATE: Omit<GeneralCriterion, 'score'>[] = [
  { id: 'gc1', label: 'حضور اللقاء التطويري' },
  { id: 'gc4', label: 'تسليم الأسئلة الأسبوعية' },
  { id: 'gc5', label: 'اختبار الطلاب' },
  { id: 'gc6', label: 'تنفيذ البرامج الخاصة بالمادة' },
  { id: 'gc7', label: 'تنفيذ الاستراتيجيات' },
  { id: 'gc8', label: 'استخدام وسائل تعليمية' },
];

export const COMMON_STRATEGIES = [
    'التعلم باللعب', 'التعلم بالقصص', 'التعلّم القائم على التكرار', 'التعلم التعاوني', 
    'المحاكاة', 'البطاقات', 'العصف الذهني', 'الاكتشاف الموجّه', 'الأناشيد التعليمية',
    'التمثيل والدراما', 'التعلم بالصور', 'الملاحظة', 'الأنشطة الحسية', 'المحاكاة الرقمية',
    'استراتيجية التساؤل', 'المشاريع الصغيرة', 'العرض والنموذج', 'المهام المصغّرة',
    'التجريب', 'البحث', 'التعلم الذاتي', 'التعلم المقلوب', 'حل المشكلات', 
    'الحوار والمناقشة', 'التفكير الناقد', 'الخرائط الذهنية', 'التعلم بالخبرة', 
    'التعليم القائم على المواقف', 'التعليم القائم على المهام الواقعية', 'التعلم القائم على التصميم',
    'استراتيجية التعليم المبرمج', 'الاستقصاء', 'التكنولوجيا', 'النمذجة', 'التفكير الإبداعي'
];

export const COMMON_TOOLS = [
    'السبورة', 'البطاقات التعليمية', 'النماذج المجسمة', 'الصور واللوحات', 'الشرائح الشفافة',
    'الأفلام التعليمية', 'الفيديو التعليمي', 'جهاز العرض الضوئي', 'الخرائط الجغرافية', 'المجسمات',
    'الرسوم البيانية', 'الألعاب التعليمية', 'الحاسب الآلي', 'السبورة الذكية', 'المعامل الافتراضية',
    'الكتب التفاعلية', 'الوسائط المتعددة', 'العينات الحقيقية', 'التسجيلات الصوتية', 'العروض التقديمية'
];

export const COMMON_SOURCES = [
    'الكتب الدراسية', 'المراجع الأكاديمية', 'المجلات العلمية', 'المواقع الإلكترونية التعليمية',
    'قواعد البيانات', 'المكتبات المدرسية', 'المكتبات الرقمية', 'المعلم', 'الزملاء (التعلم من الأقران)',
    'الدروس المصوّرة', 'الدورات التدريبية', 'المنصات التعليمية الإلكترونية', 'التطبيقات التعليمية',
    'المؤتمرات والندوات', 'الخبراء والمختصون', 'الرحلات التعليمية', 'المتاحف والمراكز العلمية',
    'القنوات التعليمية', 'الوثائق الرسمية', 'الدراسات الميدانية'
];


export const CLASS_SESSION_BRIEF_TEMPLATE: ClassSessionCriterionGroup[] = [
  { id: 'csb1', title: 'الكفايات الشخصية وسمات المعلم', criteria: [
    { id: 'csb1c1', label: 'يهتم بمظهره الشخصي', score: 0 },
    { id: 'csb1c2', label: 'يظهر ثقة بنفسه', score: 0 },
    { id: 'csb1c3', label: 'يتحدث بصوت ولغة سليمة', score: 0 },
  ]},
  { id: 'csb2', title: 'الخطة الدرسية', criteria: [
    { id: 'csb2c1', label: 'يسير في المنهج وفق الخطة', score: 0 },
    { id: 'csb2c2', label: 'يقدم خطة درسية مكتملة العناصر (كمي)', score: 0 },
    { id: 'csb2c3', label: 'يربط الخطة الدراسية بموضوع الدرس (نوعي)', score: 0 },
  ]},
   { id: 'csb3', title: 'إدارة الصف', criteria: [
    { id: 'csb3c1', label: 'يحافظ على قواعد الانضباط الصفي', score: 0 },
    { id: 'csb3c2', label: 'يدير التفاعل الصفي بنجاح', score: 0 },
    { id: 'csb3c3', label: 'يساهم في إيجاد مناخ صفي ملائم', score: 0 },
    { id: 'csb3c4', label: 'يوزع زمن الحصة على خطوات الدرس (تنفيذ)', score: 0 },
  ]},
  { id: 'csb4', title: 'الأداء والعرض المباشر للدرس', criteria: [
    { id: 'csb4c1', label: 'يهيئ ويمهد للدرس بصورة ملائمة', score: 0 },
    { id: 'csb4c2', label: 'يظهر إلماما بالمادة العلمية', score: 0 },
    { id: 'csb4c3', label: 'يراعي الفروق الفردية بين المتعلمين', score: 0 },
    { id: 'csb4c4', label: 'يربط الدرس بالتطبيقات والبيئة المحيطة', score: 0 },
    { id: 'csb4c5', label: 'ينمي القيم والأخلاق الحميدة', score: 0 },
    { id: 'csb4c6', label: 'يفعل دور المتعلمين ويحفزهم', score: 0 },
    { id: 'csb4c7', label: 'يطرح أسئلة صفية متنوعة', score: 0 },
    { id: 'csb4c8', label: 'يتابع أعمال المتعلمين أثناء الدرس', score: 0 },
    { id: 'csb4c9', label: 'يغلق الدرس بصورة مناسبة', score: 0 },
  ]},
  { id: 'csb5', title: 'السبورة والوسائل والأنشطة التعليمية', criteria: [
    { id: 'csb5c1', label: 'يمارس التقييم المعزز للتعلم', score: 0 },
    { id: 'csb5c2', label: 'يستخدم السبورة بفاعلية', score: 0 },
    { id: 'csb5c3', label: 'يوظف الوسائط التعليمية بصورة مناسبة', score: 0 },
    { id: 'csb5c4', label: 'يدير النشاط الصفي بفاعلية', score: 0 },
  ]},
  { id: 'csb6', title: 'تحصيل المتعلمين', criteria: [
    { id: 'csb6c1', label: 'يفعل سجل الدرجات في الحصة', score: 0 },
    { id: 'csb6c2', label: 'يقيس استيعاب المتعلمين', score: 0 },
    { id: 'csb6c3', label: 'يتابع دفاتر المتعلمين بفاعلية', score: 0 },
    { id: 'csb6c4', label: 'يفعل الواجب المنزلي والتعيينات', score: 0 },
    { id: 'csb6c5', label: 'يربط تحصيل المتعلمين بمصادر التعلم', score: 0 },
  ]},
  { id: 'csb7', title: 'مهارات المادة', criteria: [
    { id: 'csb7c1', label: 'ينفذ المهارات الأساسية للمادة', score: 0 },
  ]},
  { id: 'csb8', title: 'البيئة الصفية', criteria: [
    { id: 'csb8c1', label: 'مشاركة الطلاب وتفاعلهم', score: 0 },
    { id: 'csb8c2', label: 'التفاعل الإيجابي بين المعلم والطلاب', score: 0 },
  ]},
];

export const CLASS_SESSION_EXTENDED_TEMPLATE: ClassSessionCriterionGroup[] = [
  { id: 'cse1', title: 'متميز في الصفات الشخصية', criteria: [
      { id: 'cse1c1', label: 'يظهر بمظهر حسن', score: 0 },
      { id: 'cse1c2', label: 'يحترم مشاعر الآخرين', score: 0 },
      { id: 'cse1c3', label: 'يثق بنفسه', score: 0 },
  ]},
  { id: 'cse2', title: 'اكتمال الخطة والتحضير (كمي)', criteria: [
      { id: 'cse2c1', label: 'توفر البيانات العامة (صف، حصة، عنوان، تاريخ)', score: 0 },
      { id: 'cse2c2', label: 'توفر الأهداف والمحتوى والأساليب الوسائل والتقويم', score: 0 },
      { id: 'cse2c3', label: 'توفر التمهيد والغلق والواجب بشكل مناسب', score: 0 },
      { id: 'cse2c4', label: 'يحدد أدواراً نشطة للمعلم والمتعلم تتفق مع المحتوى', score: 0 },
  ]},
  { id: 'cse3', title: 'اتفاق عناصر التحضير مع الدرس (نوعي)', criteria: [
      { id: 'cse3c1', label: 'تتفق عناصر التحضير مع المحتوى ومهاراته', score: 0 },
      { id: 'cse3c2', label: 'الأهداف مصاغة من المستويات العليا والدنيا', score: 0 },
      { id: 'cse3c3', label: 'الأهداف سليمة الصياغة وخالية من الأخطاء الإملائية', score: 0 },
      { id: 'cse3c4', label: 'التقويم مصاغ بطريقة تقيس تحقق الأهداف', score: 0 },
  ]},
   { id: 'cse4', title: 'التهيئة والتمهيد مناسبان للدرس', criteria: [
      { id: 'cse4c1', label: 'تهيئة بيئية و نفسية(نظافة، نظام، قيام، مجموعات)', score: 0 },
      { id: 'cse4c2', label: 'تهيئة توجيهية وانتقالية من نشاط إلى آخر', score: 0 },
      { id: 'cse4c3', label: 'تمهيد مشوق ومناسب للدرس ويثير دافعية المتعلم', score: 0 },
      { id: 'cse4c4', label: 'تمهيد انتقالي من مهارة علمية إلى أخرى', score: 0 },
  ]},
  { id: 'cse5', title: 'استخدام السبورة بفاعلية', criteria: [
      { id: 'cse5c1', label: 'يكتب البيانات والدرس وينظم السبورة مع التلوين', score: 0 },
      { id: 'cse5c2', label: 'يكتب عناصر ومهارات الدرس مع الأمثلة والتلوين', score: 0 },
      { id: 'cse5c3', label: 'يكتب القواعد والأساسيات التي يشرحها', score: 0 },
      { id: 'cse5c4', label: 'خلو الكتابة من الأخطاء العلمية واللغوية والإملائية', score: 0 },
  ]},
  { id: 'cse6', title: 'وضوح الشرح بتمكن علمي وتسلسل منطقي للدرس', criteria: [
      { id: 'cse6c1', label: 'الشرح خالٍ من الأخطاء العلمية الملقاة في الدرس', score: 0 },
      { id: 'cse6c2', label: 'الشرح خالٍ من الأخطاء اللغوية الملقاة في الدرس', score: 0 },
      { id: 'cse6c3', label: 'يوضح المفاهيم والمصطلحات الواردة في الدرس', score: 0 },
      { id: 'cse6c4', label: 'يتدرج من السهل والمعلوم إلى الصعب والمجهول', score: 0 },
      { id: 'cse6c5', label: 'التسلسل كامل و مناسب لمحتوى الدرس والمتعلم', score: 0 },
      { id: 'cse6c6', label: 'يكثر من الأمثلة التطبيقية لكل مهارة ونشاط', score: 0 },
      { id: 'cse6c7', label: 'يصحح أخطاء الطلاب ويوجههم للصواب', score: 0 },
      { id: 'cse6c8', label: 'يعتمد على المقارنات لتوضيح الفروق العلمية', score: 0 },
      { id: 'cse6c9', label: 'يضع أسئلة متنوعة لإثارة نشاط الطلاب', score: 0 },
  ]},
  { id: 'cse7', title: 'الاستراتيجات ودور المتعلم', criteria: [
      { id: 'cse7c1', label: 'تنويع الأساليب بحيث لكل هدف أسلوب نشط', score: 0 },
      { id: 'cse7c2', label: 'يستخدم طرقاً نشطة مثيرة لانتباه الطلاب', score: 0 },
      { id: 'cse7c3', label: 'يشرك المتعلم في نشاط الدرس ( فردي، جماعي)', score: 0 },
      { id: 'cse7c4', label: 'يحدد أدواراً للمعلم والمتعلم نشطة تتفق مع المحتوى', score: 0 },
  ]},
   { id: 'cse8', title: 'مهارات التواصل', criteria: [
      { id: 'cse8c1', label: 'يحسن إيصال المعلومة بلغة جسد وتحرك متميز', score: 0 },
      { id: 'cse8c2', label: 'وضوح الصوت وتنوع نبراته وفق محتوى الدرس', score: 0 },
      { id: 'cse8c3', label: 'يحسن الاستماع والحوار مع جميع المتعلمين', score: 0 },
  ]},
  { id: 'cse9', title: 'ربط الدرس بالقيم وخبرات الطلاب', criteria: [
      { id: 'cse9c1', label: 'ربط الدرس بقيمة حياتية من واقع الطلبة', score: 0 },
      { id: 'cse9c2', label: 'ينوع في الأنشطة وفق قدرات الطلبة العقلية', score: 0 },
      { id: 'cse9c3', label: 'يقدم التغذية الراجعة أثناء تنفيذ الطلاب للمهارات', score: 0 },
  ]},
  { id: 'cse10', title: 'الوسائل والمصادر', criteria: [
      { id: 'cse10c1', label: 'توفر وسائل مناسبة ومتنوعة وملتزمة بالوقت', score: 0 },
      { id: 'cse10c2', label: 'يتم توظيف الكتاب ومصادر أخرى حسب النشاط', score: 0 },
  ]},
  { id: 'cse11', title: 'تفاعل المتعلمين مع الدرس', criteria: [
      { id: 'cse11c1', label: 'شارك جميع الطلبة في الدرس', score: 0 },
      { id: 'cse11c2', label: 'تفاعل جميع المتعلمين مع بعضهم', score: 0 },
      { id: 'cse11c3', label: 'تفاعل المتعلمين مع المعلم والوسيلة والنشاط', score: 0 },
  ]},
  { id: 'cse12', title: 'الإدارة الصفية وقواعد السلوك', criteria: [
      { id: 'cse12c1', label: 'إدارة فاعلة منضبطة نشطة وغير خاملة دائماً', score: 0 },
      { id: 'cse12c2', label: 'يفعل الطالب الخامل من خلال السؤال والمشاركة', score: 0 },
      { id: 'cse12c3', label: 'تعزيز السلوكيات المرغوبة وتقويم غير المرغوبة', score: 0 },
      { id: 'cse12c4', label: 'أنهى الحصة وغطى الوقت حسب المخطط له', score: 0 },
      { id: 'cse12c5', label: 'يستخدم سجل نقاط ودرجات المشاركات الطلابية', score: 0 },
      { id: 'cse12c6', label: 'يستخدم الفاظاً وأحكاماً تربوية مناسبة لمعالجة سلوك', score: 0 },
  ]},
  { id: 'cse13', title: 'التقويم والغلق مناسبان ومثيران', criteria: [
      { id: 'cse13c1', label: 'تقويم تشخيصي وبنائي وختامي مكتمل', score: 0 },
      { id: 'cse13c2', label: 'يطرح أسئلة تثير التفكير( عصف، تصنيف، سابرة)', score: 0 },
      { id: 'cse13c3', label: 'يتابع استجابات المتعلمين', score: 0 },
      { id: 'cse13c4', label: 'إغلاق الدرس بملخص أو مراجعة أو نشاط تطبيقي', score: 0 }
  ]},
  { id: 'cse14', title: 'يهتم بالواجبات والتصحيح', criteria: [
      { id: 'cse14c1', label: 'تقديم واجبات وتعيينات مناسبة ومتنوعه', score: 0 },
      { id: 'cse14c2', label: 'يتابع تنفيذ الواجبات من قبل الطلاب', score: 0 },
      { id: 'cse14c3', label: 'يصحح الدفاتر أولا بأول', score: 0 },
      { id: 'cse14c4', label: 'يضع إشارات وتغذية راجعة ويصوب الخطأ', score: 0 },
  ]},
];

export const CLASS_SESSION_SUBJECT_SPECIFIC_TEMPLATE: ClassSessionCriterionGroup[] = [];

export const THEMES = {
  default: {
    name: 'Default',
    colors: {
      '--color-primary': '#16786d',
      '--color-primary-light': '#3ab3a3',
      '--color-background': '#f9fafb',
      '--color-text': '#1f2937',
      '--color-card-bg': '#ffffff',
      '--color-card-border': '#e5e7eb',
      '--color-header-bg': '#16786d',
      '--color-header-text': '#ffffff',
    }
  },
  dark: {
    name: 'Dark',
    colors: {
      '--color-primary': '#3ab3a3',
      '--color-primary-light': '#16786d',
      '--color-background': '#1f2937',
      '--color-text': '#f9fafb',
      '--color-card-bg': '#374151',
      '--color-card-border': '#4b5563',
      '--color-header-bg': '#1f2937',
      '--color-header-text': '#ffffff',
    }
  }
};

const emptyMonthly = { dhu_al_hijjah: '', muharram: '', safar: '', rabi_al_awwal: '', rabi_al_thani: '', jumada_al_ula: '', jumada_al_thani: '', rajab: '', shaban: '' };

export const INITIAL_SUPERVISORY_PLAN: SupervisoryPlan = [
  // Domain: العمليات الداخلية
  { id: 'sp1', domain: 'العمليات الداخلية', objective: 'تنفيذ خطط الإشراف التربوي', indicatorText: 'تم تنفيذ 8 أنشطة للخطط والخلاصات', indicatorCount: 8, evidence: 'الخطة/ لتنفيذ', activityText: 'المراجعة الدورية لانشطة الخطة', activityPlanned: 7, monthlyPlanned: { ...emptyMonthly, muharram: 1, safar: 1, rabi_al_awwal: 1, rabi_al_thani: 1, jumada_al_ula: 1, jumada_al_thani: 1, rajab: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp2', domain: 'العمليات الداخلية', objective: 'تنفيذ خطط الإشراف التربوي', indicatorText: 'تم تنفيذ 8 أنشطة للخطط والخلاصات', indicatorCount: 8, evidence: 'نسخ التقارير', activityText: 'تسليم التقارير الكترونيا', activityPlanned: 7, monthlyPlanned: { ...emptyMonthly, muharram: 1, safar: 1, rabi_al_awwal: 1, rabi_al_thani: 1, jumada_al_ula: 1, jumada_al_thani: 1, rajab: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp3', domain: 'العمليات الداخلية', objective: 'تنفيذ خطط الإشراف التربوي', indicatorText: 'تم تنفيذ 8 أنشطة للخطط والخلاصات', indicatorCount: 8, evidence: 'نسخ التقارير', activityText: 'إعداد الخلاصة الشهرية', activityPlanned: 7, monthlyPlanned: { ...emptyMonthly, muharram: 1, safar: 1, rabi_al_awwal: 1, rabi_al_thani: 1, jumada_al_ula: 1, jumada_al_thani: 1, rajab: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp4', domain: 'العمليات الداخلية', objective: 'تنفيذ خطط الإشراف التربوي', indicatorText: 'تم مناقشة 2 تقارير أداء للخطط بنسبة 100%', indicatorCount: 2, evidence: 'نسخة التقارير', activityText: 'تجهيز العرض الفصلي الداخلي', activityPlanned: 1, monthlyPlanned: { ...emptyMonthly, jumada_al_ula: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp5', domain: 'العمليات الداخلية', objective: 'تنفيذ خطط الإشراف التربوي', indicatorText: 'تم مناقشة 2 تقارير أداء للخطط بنسبة 100%', indicatorCount: 2, evidence: 'نسخة التقارير', activityText: 'تجهيز العرض الختامي الداخلي', activityPlanned: 1, monthlyPlanned: { ...emptyMonthly, shaban: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp-sum1', isSummaryRow: true, domain: '0', objective: '0', indicatorText: '10', indicatorCount: '0', evidence: '0', activityText: '23', activityPlanned: '0', monthlyPlanned: { ...emptyMonthly, muharram: 3, safar: 3, rabi_al_awwal: 3, rabi_al_thani: 4, jumada_al_ula: 3, jumada_al_thani: 3, rajab: 3, shaban: 1 }, executed: 0, cost: 0, reasonsForNonExecution: '0', notes: '0', status: 'قيد التنفيذ' },

  // Domain: التدريس
  { id: 'sp6', domain: 'التدريس', objective: 'التخطيط التربوي للمنهج الدراسي', indicatorText: 'تم تدريب المعلمين إعداد الخطط الفصلية لعدد 1 بنسبة 100%', indicatorCount: 1, evidence: 'تقرير النشاط', activityText: 'دورة تدريبية في إعداد الخطط الفصلية', activityPlanned: 1, monthlyPlanned: { ...emptyMonthly, muharram: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp7', domain: 'التدريس', objective: 'التخطيط التربوي للمنهج الدراسي', indicatorText: 'تم تقديم تغذية راجعة للخطط التدريسية للمواد الدراسية لعدد 2 بنسبة 100%', indicatorCount: 2, evidence: 'نسخ الخطط', activityText: 'ورش مراجعة الخطط', activityPlanned: 2, monthlyPlanned: { ...emptyMonthly, muharram: 1, jumada_al_ula: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp8', domain: 'التدريس', objective: 'تفعيل استخدام طرائق التعلم النشط في العملية التعليمية', indicatorText: 'تم ممارسة 75% من المعلمين لاستراتيجيات التعلم النشط ( إعدادا وتنفيذا) لعدد 7مواد دراسية بنسبة %100 الأساس - امعلمي الصفوف من 1-3 (25) استراتجية معلمي الصفوف من 4-12 (30)', indicatorCount: 7, evidence: 'استمارة الزيارة الصفية', activityText: 'زيارات صفية', activityPlanned: 6, monthlyPlanned: { ...emptyMonthly, muharram: 1, safar: 1, rabi_al_awwal: 1, jumada_al_ula: 1, jumada_al_thani: 1, rajab: 1 }, executed: 6, cost: 0, reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp9', domain: 'التدريس', objective: 'تفعيل استخدام طرائق التعلم النشط في العملية التعليمية', indicatorText: 'تم ممارسة 75% من المعلمين لاستراتيجيات التعلم النشط ( إعدادا وتنفيذا) لعدد 7مواد دراسية بنسبة %100 الأساس - امعلمي الصفوف من 1-3 (25) استراتجية معلمي الصفوف من 4-12 (30)', indicatorCount: 7, evidence: 'لقاء التوعية الأسبوعية', activityText: 'متبايعة المشرفين التربويين متابعة المعلمين التنويع من الاستراتجيات', activityPlanned: 6, monthlyPlanned: { ...emptyMonthly, muharram: 1, safar: 1, rabi_al_awwal: 1, jumada_al_ula: 1, jumada_al_thani: 1, rajab: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp10', domain: 'التدريس', objective: 'تفعيل استخدام طرائق التعلم النشط في العملية التعليمية', indicatorText: 'تم ممارسة 75% من المعلمين لاستراتيجيات التعلم النشط ( إعدادا وتنفيذا) لعدد 7مواد دراسية بنسبة %100 الأساس - امعلمي الصفوف من 1-3 (25) استراتجية معلمي الصفوف من 4-12 (30)', indicatorCount: 7, evidence: 'كشف بالاستراتيجيات احسب المراحل', activityText: 'متابعة تنوع الاستراتجيات ميدانيا', activityPlanned: 6, monthlyPlanned: { ...emptyMonthly, muharram: 1, safar: 1, rabi_al_awwal: 1, jumada_al_ula: 1, jumada_al_thani: 1, rajab: 1 }, executed: 6, cost: 0, reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp11', domain: 'التدريس', objective: 'تفعيل استخدام طرائق التعلم النشط في العملية التعليمية', indicatorText: 'تم ممارسة 75% من المعلمين لاستراتيجيات التعلم النشط ( إعدادا وتنفيذا) لعدد 7مواد دراسية بنسبة %100 الأساس - امعلمي الصفوف من 1-3 (25) استراتجية معلمي الصفوف من 4-12 (30)', indicatorCount: 7, evidence: 'جدول تنفيذ الدروس', activityText: 'دروس نموذجية بالاستراتجيات', activityPlanned: 8, monthlyPlanned: { ...emptyMonthly, rabi_al_awwal: 4, jumada_al_thani: 4 }, executed: 8, cost: 0, reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp12', domain: 'التدريس', objective: 'تفعيل استخدام طرائق التعلم النشط في العملية التعليمية', indicatorText: 'تم ممارسة 75% من المعلمين لاستراتيجيات التعلم النشط ( إعدادا وتنفيذا) لعدد 7مواد دراسية بنسبة %100 الأساس - امعلمي الصفوف من 1-3 (25) استراتجية معلمي الصفوف من 4-12 (30)', indicatorCount: 7, evidence: 'جدول التنفيذ', activityText: 'زيارة تبادل خبرات (لغرض الثانية/للجددالأولى/للخبرة الثالثة', activityPlanned: 2, monthlyPlanned: { ...emptyMonthly, rabi_al_awwal: 1, jumada_al_thani: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp13', domain: 'التدريس', objective: 'تفعيل استخدام طرائق التعلم النشط في العملية التعليمية', indicatorText: 'تم ممارسة 75% من المعلمين لاستراتيجيات التعلم النشط ( إعدادا وتنفيذا) لعدد 7مواد دراسية بنسبة %100 الأساس - امعلمي الصفوف من 1-3 (25) استراتجية معلمي الصفوف من 4-12 (30)', indicatorCount: 7, evidence: 'استمارت التحليل', activityText: 'تحليل تبادل الخرات', activityPlanned: 2, monthlyPlanned: { ...emptyMonthly, rabi_al_awwal: 1, jumada_al_thani: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp14', domain: 'التدريس', objective: 'تفعيل الإثراء الأمثل للمواد الدراسية', indicatorText: 'توظيف المعلمين للمهارات الحياتية المتضمن في المنهج بمعدل مهارة واحدة لكل درس لعدد 7مواد دراسية بنسبة%100', indicatorCount: 7, evidence: 'نسخة خطة المعلمين', activityText: 'زيارات صفية', activityPlanned: 2, monthlyPlanned: { ...emptyMonthly, rabi_al_thani: 1, shaban: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp15', domain: 'التدريس', objective: 'تفعيل الإثراء الأمثل للمواد الدراسية', indicatorText: 'تم تنفذ 2 من البرامج العلاجية من قبل المعلم بحسب احتياجات المتعلمين بنسبة 100%', indicatorCount: 2, evidence: 'النزول الميداني', activityText: 'متابعة إعداد المحتوى', activityPlanned: 1, monthlyPlanned: { ...emptyMonthly, rabi_al_awwal: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp16', domain: 'التدريس', objective: 'تفعيل الإثراء الأمثل للمواد الدراسية', indicatorText: 'تم تنفذ 2 من البرامج العلاجية من قبل المعلم بحسب احتياجات المتعلمين بنسبة 100%', indicatorCount: 2, evidence: 'تقرير التفعيل', activityText: 'متابعة التفعيل على مستوى المادة والمعلم', activityPlanned: 6, monthlyPlanned: { ...emptyMonthly, muharram: 1, safar: 1, rabi_al_awwal: 1, jumada_al_ula: 1, jumada_al_thani: 1, rajab: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp17', domain: 'التدريس', objective: 'تفعيل الإثراء الأمثل للمواد الدراسية', indicatorText: 'تم تنفذ 2 برامج إثرائية من قبل لمعلم بحسب احتياجات المتعلمين بنسبة 100%', indicatorCount: 2, evidence: 'النزول الميداني', activityText: 'متابعة إعداد المحتوى', activityPlanned: 1, monthlyPlanned: { ...emptyMonthly, rabi_al_awwal: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp18', domain: 'التدريس', objective: 'تفعيل الإثراء الأمثل للمواد الدراسية', indicatorText: 'تم تنفذ 2 برامج إثرائية من قبل لمعلم بحسب احتياجات المتعلمين بنسبة 100%', indicatorCount: 2, evidence: 'تقرير التفعيل', activityText: 'متابعة التفعيل على مستوى المادة والمعلم', activityPlanned: 6, monthlyPlanned: { ...emptyMonthly, muharram: 1, safar: 1, rabi_al_awwal: 1, jumada_al_ula: 1, jumada_al_thani: 1, rajab: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp19', domain: 'التدريس', objective: 'تفعيل الإثراء الأمثل للمواد الدراسية', indicatorText: 'تم إعداد ثلاث مواد إثرائية للمواد بحسب احتياجات المتعلمين بنسبة 100%', indicatorCount: 3, evidence: 'البرامج/التوثيق', activityText: 'ورشة الإعداد', activityPlanned: 1, monthlyPlanned: { ...emptyMonthly, dhu_al_hijjah: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp20', domain: 'التدريس', objective: 'تفعيل الإثراء الأمثل للمواد الدراسية', indicatorText: 'تم إعداد ثلاث مواد إثرائية للمواد بحسب احتياجات المتعلمين بنسبة 100%', indicatorCount: 3, evidence: '', activityText: 'ورشة المراجعة', activityPlanned: 2, monthlyPlanned: { ...emptyMonthly, muharram: 1, jumada_al_ula: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp21', domain: 'التدريس', objective: 'تفعيل الإثراء الأمثل للمواد الدراسية', indicatorText: 'تم إعداد ثلاث مواد إثرائية للمواد بحسب احتياجات المتعلمين بنسبة 100%', indicatorCount: 3, evidence: '', activityText: 'متاببعة التنفيذ', activityPlanned: 6, monthlyPlanned: { ...emptyMonthly, muharram: 1, safar: 1, rabi_al_awwal: 1, jumada_al_ula: 1, jumada_al_thani: 1, rajab: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp-sum2', isSummaryRow: true, domain: '0', objective: '0', indicatorText: '24', indicatorCount: '0', evidence: '0', activityText: '58', activityPlanned: '1', monthlyPlanned: { ...emptyMonthly, dhu_al_hijjah: 9, muharram: 13, safar: 7, rabi_al_awwal: 1, rabi_al_thani: 13, jumada_al_ula: 7, jumada_al_thani: 6, rajab: 1, shaban: 0 }, executed: 0, cost: 0, reasonsForNonExecution: '0', notes: '0', status: 'قيد التنفيذ' },

  // Domain: البرامج النوعية
  { id: 'sp22', domain: 'البرامج النوعية', objective: '', indicatorText: 'تم إضافة 2 برامج نوعية للأساسي من 4-12', indicatorCount: 2, evidence: 'تصورات البرنامج', activityText: 'برنامج المهارات', activityPlanned: 1, monthlyPlanned: { ...emptyMonthly, jumada_al_ula: 1 }, executed: 1, cost: 0, reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp23', domain: 'البرامج النوعية', objective: '', indicatorText: 'تم إضافة 2 برامج نوعية للأساسي من 4-12', indicatorCount: 2, evidence: 'سجلات المتابعة', activityText: 'متابعة تنفيذ البرنامج', activityPlanned: 3, monthlyPlanned: { ...emptyMonthly, jumada_al_ula: 1, jumada_al_thani: 1, rajab: 1 }, executed: 3, cost: 0, reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp24', domain: 'البرامج النوعية', objective: '', indicatorText: 'تم إضافة 2 برامج نوعية للأساسي من 4-12', indicatorCount: 2, evidence: 'نسخة التصور', activityText: 'رفع تصور فعالية البرنامج', activityPlanned: 1, monthlyPlanned: { ...emptyMonthly, jumada_al_ula: 1 }, executed: 1, cost: 0, reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp25', domain: 'البرامج النوعية', objective: '', indicatorText: 'تم تنفيذ 4 أنشطة للمواد الدراسية على مستوى الفرعين', indicatorCount: '', evidence: 'لقاءات المتابعة', activityText: 'نشاط اليوم العالمي للغة العربيةا/اليوم العالمي للترجمة/اليوم العالمي للرياضيات/اليوم العالمي للعلوم', activityPlanned: 4, monthlyPlanned: { ...emptyMonthly, rabi_al_thani: 2, rajab: 2 }, executed: 4, cost: 0, reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp-sum3', isSummaryRow: true, domain: '', objective: '', indicatorText: '7', indicatorCount: '0', evidence: '0', activityText: '94', activityPlanned: '2', monthlyPlanned: { ...emptyMonthly, dhu_al_hijjah: 13, muharram: 18, safar: 13, rabi_al_awwal: 2, rabi_al_thani: 20, jumada_al_ula: 12, jumada_al_thani: 12, rajab: 2, shaban: 0 }, executed: 0, cost: 94, reasonsForNonExecution: '0', notes: '', status: 'قيد التنفيذ' },

  // Domain: التنمية المهنية
  { id: 'sp26', domain: 'التنمية المهنية', objective: 'تحديد برامج التنمية المهنية للكادر التربوي حسب طبيعة الوظيفة', indicatorText: 'قياس أثر التدريب في الفئة المستفيدة لعدد5 أنشطة تدريبية بنسبة 70%', indicatorCount: 5, evidence: 'تقرير قياس أثر التدريب', activityText: 'ورشة قياس الأثر أثناء الزيارات', activityPlanned: 5, monthlyPlanned: { ...emptyMonthly, rabi_al_thani: 3, jumada_al_thani: 2 }, executed: 5, cost: 0, reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp27', domain: 'التنمية المهنية', objective: 'تحديد برامج التنمية المهنية للكادر التربوي حسب طبيعة الوظيفة', indicatorText: 'تم تحديد برامج التنمية المهنية للمعلمين لعدد 4 بنسبة70%', indicatorCount: 4, evidence: 'اللقاءات الأسبوعية', activityText: 'حصر أنشطة التنمية المهية حسب الاحتياج', activityPlanned: 6, monthlyPlanned: { ...emptyMonthly, muharram: 1, safar: 1, rabi_al_awwal: 1, rabi_al_thani: 1, jumada_al_ula: 1, jumada_al_thani: 1, rajab: 1 }, executed: 7, cost: 1, reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp28', domain: 'التنمية المهنية', objective: 'تحديد برامج التنمية المهنية للكادر التربوي حسب طبيعة الوظيفة', indicatorText: 'تم تحديد برامج التنمية المهنية للمعلمين لعدد 4 بنسبة70%', indicatorCount: 4, evidence: 'اللقاءات الأسبوعية', activityText: 'إعداد جدول التنمية المهنية', activityPlanned: 6, monthlyPlanned: { ...emptyMonthly, muharram: 1, safar: 1, rabi_al_awwal: 1, jumada_al_thani: 1, rajab: 1 }, executed: 5, cost: -1, reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp29', domain: 'التنمية المهنية', objective: 'تحديد برامج التنمية المهنية للكادر التربوي حسب طبيعة الوظيفة', indicatorText: 'تم تحديد برامج التنمية المهنية للمعلمين لعدد 4 بنسبة70%', indicatorCount: 4, evidence: 'نسخة التقرير', activityText: 'رفع تقريرر تنفيذ التنمية المهنية', activityPlanned: 6, monthlyPlanned: { ...emptyMonthly, muharram: 1, safar: 1, rabi_al_awwal: 1, rabi_al_thani: 1, jumada_al_ula: 1, jumada_al_thani: 1, rajab: 1 }, executed: 7, cost: 1, reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp30', domain: 'التنمية المهنية', objective: 'تحديد برامج التنمية المهنية للكادر التربوي حسب طبيعة الوظيفة', indicatorText: 'تم تحديد برامج التنمية المهنية للمعلمين لعدد 4 بنسبة70%', indicatorCount: 4, evidence: 'النزول الميداني', activityText: 'متابعة اثر التنمية المهنية من خلال اللقاءات', activityPlanned: 6, monthlyPlanned: { ...emptyMonthly, muharram: 1, safar: 1, rabi_al_awwal: 1, rabi_al_thani: 1, jumada_al_thani: 1, rajab: 1 }, executed: 6, cost: 0, reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp31', domain: 'التنمية المهنية', objective: 'تحديد برامج التنمية المهنية للكادر التربوي حسب طبيعة الوظيفة', indicatorText: 'تم تحديد برامج التنمية المهنية للمعلمين لعدد 4 بنسبة70%', indicatorCount: 4, evidence: 'سحل الاحتياجات', activityText: 'رفع احتيات التنمية المهنية لرئيس القسم', activityPlanned: 4, monthlyPlanned: { ...emptyMonthly, muharram: 1, safar: 1, rabi_al_awwal: 1, jumada_al_ula: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp32', domain: 'التنمية المهنية', objective: 'تحديد برامج التنمية المهنية للكادر التربوي حسب طبيعة الوظيفة', indicatorText: 'تم تحديد برامج التنمية المهنية للمعلمين لعدد 4 بنسبة70%', indicatorCount: 4, evidence: 'الكتب', activityText: 'تكوين مكتبة تربوية (الكترونية أو ورقية )', activityPlanned: 4, monthlyPlanned: { ...emptyMonthly, muharram: 1, safar: 1, rabi_al_awwal: 1, jumada_al_ula: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp33', domain: 'التنمية المهنية', objective: 'تحديد برامج التنمية المهنية للكادر التربوي حسب طبيعة الوظيفة', indicatorText: 'تم تحديد برامج التنمية المهنية للمعلمين لعدد 4 بنسبة70%', indicatorCount: 4, evidence: 'سجل المتابعة', activityText: 'متابعة تكاليف التنمية المهنية', activityPlanned: 4, monthlyPlanned: { ...emptyMonthly, muharram: 1, safar: 1, rabi_al_awwal: 1, jumada_al_thani: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp-sum4', isSummaryRow: true, domain: '0', objective: '0', indicatorText: '0', indicatorCount: '14', evidence: '0', activityText: '0', activityPlanned: '85', monthlyPlanned: { ...emptyMonthly, dhu_al_hijjah: 0, muharram: 17, safar: 17, rabi_al_awwal: 18, rabi_al_thani: 9, jumada_al_ula: 10, jumada_al_thani: 8, rajab: 5, shaban: 1 }, executed: 0, cost: 0, reasonsForNonExecution: '0', notes: '0', status: 'قيد التنفيذ' },

  // Domain: وسائل ومصادر التعلم
  { id: 'sp34', domain: 'وسائل ومصادر التعلم', objective: 'تفعيل الاستخدام الأمثل لوسائل ومصادر التعلم', indicatorText: 'تم تنفيذ عدد2 نشاط لتوعية المعلمين في استخدام الوسائل والمصادر بنسبة 100%', indicatorCount: 2, evidence: 'المنشورات', activityText: 'منشور/ مجموعات وتس/دورة ونلاين', activityPlanned: 8, monthlyPlanned: { ...emptyMonthly, dhu_al_hijjah: 1, muharram: 1, safar: 1, rabi_al_awwal: 1, rabi_al_thani: 1, jumada_al_ula: 1, jumada_al_thani: 1, rajab: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp35', domain: 'وسائل ومصادر التعلم', objective: 'تفعيل الاستخدام الأمثل لوسائل ومصادر التعلم', indicatorText: 'تم تنفيذ عدد2 نشاط لتوعية المعلمين في استخدام الوسائل والمصادر بنسبة 100%', indicatorCount: 2, evidence: '', activityText: 'التوعية الميدانية تفعيل المصادر', activityPlanned: 4, monthlyPlanned: { ...emptyMonthly, dhu_al_hijjah: 4 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp36', domain: 'وسائل ومصادر التعلم', objective: 'تفعيل الاستخدام الأمثل لوسائل ومصادر التعلم', indicatorText: 'استخدم المعلمون عدد 1وسيلة لكل حصة بحسب طبيعة الدرس لعدد 6أشهر بنسبة 80%', indicatorCount: 6, evidence: 'سجلات المصادر', activityText: 'متابعة سجلات المصادر', activityPlanned: 6, monthlyPlanned: { ...emptyMonthly, dhu_al_hijjah: 1, muharram: 1, safar: 1, jumada_al_ula: 1, jumada_al_thani: 1, rajab: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp37', domain: 'وسائل ومصادر التعلم', objective: 'تفعيل الاستخدام الأمثل لوسائل ومصادر التعلم', indicatorText: 'يستخدم المعلمون مصادر تعلم ملائمة لكل بحسب طبيعة الدرس لعدد 6أشهر بنسبة 80%', indicatorCount: 6, evidence: '', activityText: 'متابعة سجلات المصادر', activityPlanned: 6, monthlyPlanned: { ...emptyMonthly, dhu_al_hijjah: 1, muharram: 1, safar: 1, jumada_al_ula: 1, jumada_al_thani: 1, rajab: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp38', domain: 'وسائل ومصادر التعلم', objective: 'تفعيل الاستخدام الأمثل لوسائل ومصادر التعلم', indicatorText: 'يستخدم 10% من الطلبة مصادر التعلم', indicatorCount: 6, evidence: 'خلاصات الاستخدام', activityText: 'زيارة استطلاعية لمختصي المصادر', activityPlanned: 6, monthlyPlanned: { ...emptyMonthly, dhu_al_hijjah: 1, muharram: 1, safar: 1, jumada_al_ula: 1, jumada_al_thani: 1, rajab: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp-sum5', isSummaryRow: true, domain: '', objective: '', indicatorText: '20', indicatorCount: '', evidence: '', activityText: '30', activityPlanned: '8', monthlyPlanned: { ...emptyMonthly, dhu_al_hijjah: 4, muharram: 4, safar: 1, rabi_al_awwal: 4, rabi_al_thani: 4, jumada_al_ula: 4, jumada_al_thani: 1, rajab: 0 }, executed: 0, cost: 0, reasonsForNonExecution: '0', notes: '0', status: 'قيد التنفيذ' },

  // Domain: تقويم التحصيل العلمي
  { id: 'sp39', domain: 'تقويم التحصيل العلمي', objective: 'إعداد الاختبارات طبقا لجداول المواصفات', indicatorText: 'أعد المعلمون عدد 4اختبارات وفقاً لجدول المواصفات بنسبة كفاءة 75%', indicatorCount: 4, evidence: 'نماذج من المراجعة', activityText: 'ورشة تدريبية', activityPlanned: 2, monthlyPlanned: { ...emptyMonthly, rabi_al_thani: 1, shaban: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp40', domain: 'تقويم التحصيل العلمي', objective: 'إعداد الاختبارات طبقا لجداول المواصفات', indicatorText: 'أعد المعلمون عدد 4اختبارات وفقاً لجدول المواصفات بنسبة كفاءة 75%', indicatorCount: 4, evidence: '', activityText: 'ورشة مراجعة الاختبارات', activityPlanned: 6, monthlyPlanned: { ...emptyMonthly, muharram: 1, safar: 1, jumada_al_ula: 1, jumada_al_thani: 1, rajab: 1, shaban: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp41', domain: 'تقويم التحصيل العلمي', objective: 'متابعة التقويم البنائي ومراجعته', indicatorText: 'تم العمل بالتقويم البنائي عدد 4في الفرع بنسبة (80)%', indicatorCount: 4, evidence: 'تقرير الأداء', activityText: 'جلسات مراجعة', activityPlanned: 6, monthlyPlanned: { ...emptyMonthly, muharram: 1, safar: 1, rabi_al_awwal: 1, jumada_al_ula: 1, jumada_al_thani: 1, rajab: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp42', domain: 'تقويم التحصيل العلمي', objective: 'تحليل نتائج الطلبة وفق منهجية علمية', indicatorText: 'تم تحليل نتائج الاختبارات بطريقة علمية عدد4 بنسبة100%', indicatorCount: 4, evidence: 'نسخة التقرير', activityText: 'ورشة تحليل النتائج', activityPlanned: 3, monthlyPlanned: { ...emptyMonthly, rabi_al_awwal: 1, jumada_al_thani: 1, shaban: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp43', domain: 'تقويم التحصيل العلمي', objective: 'تحليل نتائج الطلبة وفق منهجية علمية', indicatorText: 'تم تحليل نتائج الاختبارات بطريقة علمية عدد4 بنسبة100%', indicatorCount: 4, evidence: 'تقرير المراجعة', activityText: '', activityPlanned: 3, monthlyPlanned: { ...emptyMonthly, rabi_al_awwal: 1, jumada_al_thani: 1, shaban: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp44', domain: 'تقويم التحصيل العلمي', objective: 'تنفيذ برامج المعالجة للطلبة (ضعاف التحصيل)', indicatorText: 'تم تنفيذ برنامج ضعاف التحصيل لعدد3مراحل بنسبة 80%', indicatorCount: 3, evidence: 'نسخة البرنامج', activityText: 'ورشة عمل لتصنيف الطلبة', activityPlanned: 3, monthlyPlanned: { ...emptyMonthly, muharram: 1, safar: 1, jumada_al_ula: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp45', domain: 'تقويم التحصيل العلمي', objective: 'تنفيذ برامج المعالجة للطلبة (ضعاف التحصيل)', indicatorText: 'تم تنفيذ برنامج ضعاف التحصيل لعدد3مراحل بنسبة 80%', indicatorCount: 3, evidence: '', activityText: 'ورشة عمل لإعداد البرنامج', activityPlanned: 1, monthlyPlanned: { ...emptyMonthly, rabi_al_awwal: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp46', domain: 'تقويم التحصيل العلمي', objective: 'تنفيذ برامج المعالجة للطلبة (ضعاف التحصيل)', indicatorText: 'تم تنفيذ برنامج ضعاف التحصيل لعدد3مراحل بنسبة 80%', indicatorCount: 3, evidence: '', activityText: 'نزول ميداني للمتابعة', activityPlanned: 4, monthlyPlanned: { ...emptyMonthly, rabi_al_thani: 1, jumada_al_ula: 1, rajab: 1, shaban: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp47', domain: 'تقويم التحصيل العلمي', objective: 'تنفيذ برامج المعالجة للطلبة (ضعاف التحصيل)', indicatorText: 'تم تنفيذ برنامج ضعاف التحصيل لعدد3مراحل بنسبة 80%', indicatorCount: 3, evidence: '', activityText: 'ورشة عمل لإعداد تقرير البرنامج', activityPlanned: 2, monthlyPlanned: { ...emptyMonthly, jumada_al_ula: 1, shaban: 1 }, executed: '', cost: '', reasonsForNonExecution: '', notes: '', status: 'قيد التنفيذ' },
  { id: 'sp-sum6', isSummaryRow: true, domain: '0', objective: '0', indicatorText: '15', indicatorCount: '0', evidence: '0', activityText: '30', activityPlanned: '0', monthlyPlanned: { ...emptyMonthly, dhu_al_hijjah: 3, muharram: 6, safar: 3, rabi_al_awwal: 3, rabi_al_thani: 5, jumada_al_ula: 3, jumada_al_thani: 4, rajab: 3, shaban: 0 }, executed: 0, cost: 0, reasonsForNonExecution: '0', notes: '0', status: 'قيد التنفيذ' },
  
  // Final Summary Row
  { id: 'sp-sum-final', isSummaryRow: true, domain: 'اجمالي عدد الانشطة المنفـــــــذة', objective: '0', indicatorText: '83', indicatorCount: '0', evidence: '0', activityText: '226', activityPlanned: '9', monthlyPlanned: { ...emptyMonthly, dhu_al_hijjah: 36, muharram: 43, safar: 32, rabi_al_awwal: 21, rabi_al_thani: 35, jumada_al_ula: 25, jumada_al_thani: 19, rajab: 6, shaban: 0 }, executed: 0, cost: 0, reasonsForNonExecution: '0', notes: '0', status: 'قيد التنفيذ' }
];


export const INITIAL_SUPERVISORY_PLANS: SupervisoryPlanWrapper[] = [
    {
        id: 'spw-initial-1',
        title: '', // Title is now generated dynamically
        createdAt: new Date().toISOString(),
        semester: 'الأول',
        academicYear: '1447هـ / 2025-2026م',
        supervisorName: 'إبراهيم دخان',
        semesterDates: {
            start1: "2025-07-28",
            end1: "2025-10-18",
            start2: "2025-10-23",
            end2: "2026-02-07"
        },
        planData: INITIAL_SUPERVISORY_PLAN,
        isCollapsed: false,
    }
];
