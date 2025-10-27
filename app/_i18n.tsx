import {createContext, useContext, useMemo, useState, ReactNode, createElement} from 'react';

// Minimal, local i18n implementation to avoid external dependency on react-i18next
// Extend translations as needed.
const resources = {
  ar: {
    // Common
    login: 'تسجيل الدخول',
    // New screens: employees hours
    employeesHoursTitle: 'ساعات الموظفين الشهرية',
    prevMonth: 'الشهر السابق',
    nextMonth: 'الشهر التالي',
    noEmployeesData: 'لا توجد بيانات موظفين',
    // New labels for employees hours row
    worked: 'عمل',
    of: 'من',
    days: 'أيام',
    // Materials form translations
    addMaterial: 'إضافة مادة',
    name: 'الاسم',
    quantity: 'الكمية',
    minQuantity: 'الحد الأدنى للكمية',
    hebrewName: 'الاسم العبري',
    cost: 'التكلفة',
    selectUnit: 'اختر الوحدة',
    selectMaterial: 'اختر مادة',
    searchMaterials: 'ابحث عن المواد',
    cancel: 'إلغاء',
    add: 'إضافة',
    nameRequired: 'الاسم مطلوب',
    hebrewNameRequired: 'الاسم العبري مطلوب',
    costRequired: 'التكلفة مطلوبة',
    failedToCreateMaterial: 'فشل في إضافة المادة',
    low: 'منخفض',
    unit_kg: 'كجم',
    unit_g: 'غ',
    unit_pcs: 'قطعة',
    unit_ltr: 'لتر',
    unit_pack: 'عبوة',
    unit_m: 'متر',
    // Notifications/modal
    notifications: 'الإشعارات',
    markAllRead: 'وضع الكل كمقروء',
    markRead: 'وضع كمقروء',
    close: 'إغلاق',
    // Edit/Delete
    editMaterial: 'تعديل المادة',
    save: 'حفظ',
    delete: 'حذف',
    deleteConfirm: 'هل أنت متأكد أنك تريد حذف هذه المادة؟',
    employeeDetailsTitle: 'تفاصيل الموظف',
    noWorkDays: 'لا توجد أيام عمل',
    startTime: 'وقت البدء',
    endTime: 'وقت الانتهاء',
    sunday: 'الأحد',
    monday: 'الاثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس',
    friday: 'الجمعة',
    saturday: 'السبت',
    idNumber: 'رقم الهوية',
    password: 'كلمة المرور',
    loginButton: 'تسجيل الدخول',
    loginError: 'خطأ في تسجيل الدخول',
    adminDashboard: 'لوحة تحكم المدير',
    employeeDashboard: 'لوحة تحكم الموظف',
    workingHours: 'ساعات العمل',
    clockIn: 'تسجيل الدخول',
    clockOut: 'تسجيل الخروج',
    currentStatus: 'الحالة الحالية',
    clockedIn: 'مسجل الدخول',
    clockedOut: 'مسجل الخروج',
    workingHoursToday: 'ساعات العمل اليوم',
    totalHours: 'إجمالي الساعات',
    workHistory: 'سجل العمل',
    noWorkHistory: 'لا يوجد سجل عمل',
    loading: 'جاري التحميل...',
    clockedInAt: 'مسجل الدخول في الساعة:',
    confirmClockOut: 'هل أنت متأكد من تسجيل الخروج؟',
    back: 'رجوع',
    error: 'خطأ',
    failedToClockIn: 'فشل في تسجيل الدخول',
    failedToClockOut: 'فشل في تسجيل الخروج',
    stillWorking: 'ما زال يعمل',
    in: 'دخول:',
    out: 'خروج:',

    // Work Status screen
    workStatus: 'حالة العمل',
    noOneWorking: 'لا يعمل أي موظف حاليًا على مهام.',
    startedAt: 'بدأ في',
    assignedDuration: 'المدة المحددة',
    elapsed: 'منقضى',

    // Add User screen
    confirmPassword: 'تأكيد كلمة المرور',
    role: 'الدور الوظيفي',
    employee: 'موظف',
    admin: 'مدير',
    active: 'نشط',
    addUser: 'إضافة مستخدم',
    addNewUser: 'إضافة مستخدم جديد',
    addUserSubtitle: 'قم بملء البيانات التالية لإنشاء حساب مستخدم',
    // Placeholders and messages used by add-user.tsx
    enterUserName: 'أدخل الاسم',
    enterIdNumber: 'أدخل رقم الهوية',
    enterPassword: 'أدخل كلمة المرور',
    reEnterPassword: 'أعد إدخال كلمة المرور',
    success: 'نجاح',
    userAddedSuccessfully: 'تم إضافة المستخدم بنجاح',
    ok: 'موافق',
    failedToAddUser: 'فشل في إضافة المستخدم',
    passwordsNotMatch: 'كلمتا المرور غير متطابقتين',
    userCanLoginImmediately: 'يمكن للمستخدم تسجيل الدخول فوراً',
    userCannotLogin: 'لا يمكن للمستخدم تسجيل الدخول',

    // Validation messages
    idNumberRequired: 'رقم الهوية مطلوب',
    idNumberMin: 'رقم الهوية يجب أن يكون 3 أحرف على الأقل',
    passwordRequired: 'كلمة المرور مطلوبة',
    passwordMin: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    materialsManagement: 'إدارة المواد',

    // Task Groups
    taskGroups: 'مجموعات المهام',
    groupName: 'اسم المجموعة',
    tasks: 'المهام',
    taskName: 'اسم المهمة',
    durationInMinutes: 'المدة (بالدقائق)',
    description: 'الوصف',
    usedMaterials: 'المواد المستخدمة',
    producedMaterials: 'المواد المنتجة',
    addMaterialToTask: 'إضافة مادة للمهمة',
    removeMaterialFromTask: 'إزالة مادة من المهمة',
    addTask: 'إضافة مهمة',
    removeTask: 'إزالة المهمة',
    submit: 'إرسال',
    noTaskGroups: 'لا توجد مجموعات مهام بعد',
    noTaskGroup: 'لم يتم العثور على مجموعة المهام',
    errorFetchingData: 'خطأ في جلب البيانات',
    remove: 'إزالة',
    newTaskGroup: 'مجموعة مهام جديدة',
    planWorkDay: 'تخطيط يوم العمل',
    change: 'تغيير',
    set: 'تعيين',
    employees: 'الموظفين',
    assignments: 'المهام',
    noEmployeesSelected: 'لم يتم اختيار أي موظف',
    savePlan: 'حفظ الخطة',
    previousDay: 'اليوم السابق',
    nextDay: 'اليوم التالي',
    selectDate: 'اختر التاريخ',
    // Today tasks screen title
    todayTasks: 'مهام اليوم',
    // Today tasks screen strings
    noTasksToday: 'لا توجد مهام لهذا اليوم.',
    start: 'ابدأ',
    end: 'إنهاء',
    untitledTask: 'مهمة بدون عنوان',
    overrunTitle: 'انتهت المهمة بعد الوقت المخطط',
    overrunPrompt: 'يرجى إدخال سبب موجز لزيادة وقت المهمة:',
    overrunPlaceholder: 'مثال: انتظار مكونات، تعطل الماكينة',
    notificationSent: 'تم إرسال إشعار التأخير إلى المديرين',
    notificationFailed: 'فشل إرسال الإشعار',
    failedToSaveTaskTimes: 'فشل في حفظ أوقات المهام',
    planSaved: 'تم حفظ الخطة',
  },
  en: {
    // Common
    login: 'Login',
    // New screens: employees hours
    employeesHoursTitle: 'Monthly Employee Hours',
    prevMonth: 'Previous Month',
    nextMonth: 'Next Month',
    noEmployeesData: 'No employee data available',
    // New labels for employees hours row
    worked: 'Worked',
    of: 'of',
    days: 'days',
    // Materials form translations
    addMaterial: 'Add Material',
    name: 'Name',
    quantity: 'Quantity',
    minQuantity: 'Minimum Quantity',
    hebrewName: 'Hebrew Name',
    cost: 'Cost',
    selectUnit: 'Select Unit',
    selectMaterial: 'Select material',
    searchMaterials: 'Search materials...',
    cancel: 'Cancel',
    add: 'Add',
    nameRequired: 'Name is required',
    hebrewNameRequired: 'Hebrew name is required',
    costRequired: 'Cost is required',
    failedToCreateMaterial: 'Failed to create material',
    low: 'Low',
    unit_kg: 'kg',
    unit_g: 'g',
    unit_pcs: 'pcs',
    unit_ltr: 'ltr',
    unit_pack: 'pack',
    unit_m: 'm',
    // Notifications/modal
    notifications: 'Notifications',
    markAllRead: 'Mark all as read',
    markRead: 'Mark as read',
    close: 'Close',
    // Edit/Delete
    editMaterial: 'Edit Material',
    save: 'Save',
    delete: 'Delete',
    deleteConfirm: 'Are you sure you want to delete this item?',
    employeeDetailsTitle: 'Employee Details',
    noWorkDays: 'No work days',
    startTime: 'Start Time',
    endTime: 'End Time',
    sunday: 'Sunday',
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    idNumber: 'ID Number',
    password: 'Password',
    loginButton: 'Login',
    loginError: 'Login Error',
    adminDashboard: 'Admin Dashboard',
    employeeDashboard: 'Employee Dashboard',
    workingHours: 'Working Hours',
    clockIn: 'Clock In',
    clockOut: 'Clock Out',
    currentStatus: 'Current Status',
    clockedIn: 'Clocked In',
    clockedOut: 'Clocked Out',
    workingHoursToday: 'Working Hours Today',
    totalHours: 'Total Hours',
    workHistory: 'Work History',
    noWorkHistory: 'No work history',
    loading: 'Loading...',
    clockedInAt: 'Clocked in at:',
    confirmClockOut: 'Are you sure you want to clock out?',
    back: 'Back',
    error: 'Error',
    failedToClockIn: 'Failed to clock in',
    failedToClockOut: 'Failed to clock out',
    stillWorking: 'Still working',
    in: 'In:',
    out: 'Out:',

    // Work Status screen
    workStatus: 'Work Status',
    noOneWorking: 'No employees are currently working on tasks.',
    startedAt: 'Started at',
    assignedDuration: 'Assigned duration',
    elapsed: 'Elapsed',

    // Add User screen
    confirmPassword: 'Confirm Password',
    role: 'Role',
    employee: 'Employee',
    admin: 'Admin',
    active: 'Active',
    addUser: 'Add User',
    addNewUser: 'Add New User',
    addUserSubtitle: 'Fill in the following data to create a user account',
    // Placeholders and messages used by add-user.tsx
    enterUserName: 'Enter name',
    enterIdNumber: 'Enter ID number',
    enterPassword: 'Enter password',
    reEnterPassword: 'Re-enter password',
    success: 'Success',
    userAddedSuccessfully: 'User added successfully',
    ok: 'OK',
    failedToAddUser: 'Failed to add user',
    passwordsNotMatch: 'Passwords do not match',
    userCanLoginImmediately: 'User can login immediately',
    userCannotLogin: 'User cannot login',

    // Validation messages
    idNumberRequired: 'ID number is required',
    idNumberMin: 'ID number must be at least 3 characters',
    passwordRequired: 'Password is required',
    passwordMin: 'Password must be at least 6 characters',
    materialsManagement: 'Materials Management',

    // Task Groups
    taskGroups: 'Task Groups',
    groupName: 'Group Name',
    tasks: 'Tasks',
    taskName: 'Task Name',
    durationInMinutes: 'Duration (minutes)',
    description: 'Description',
    usedMaterials: 'Used Materials',
    producedMaterials: 'Produced Materials',
    addMaterialToTask: 'Add Material to Task',
    removeMaterialFromTask: 'Remove Material from Task',
    addTask: 'Add Task',
    removeTask: 'Remove Task',
    submit: 'Submit',
    noTaskGroups: 'No task groups yet',
    noTaskGroup: 'Task group not found',
    errorFetchingData: 'Error fetching data',
    remove: 'Remove',
    newTaskGroup: 'New Task Group',
    planWorkDay: 'Plan Work Day',
    change: 'Change',
    set: 'Set',
    employees: 'Employees',
    assignments: 'Assignments',
    noEmployeesSelected: 'No employees selected',
    savePlan: 'Save Plan',
    previousDay: 'Previous day',
    nextDay: 'Next day',
    selectDate: 'Select date',
    // Today tasks screen title
    todayTasks: "Today's Tasks",
    // Today tasks screen strings
    noTasksToday: "No tasks assigned for today.",
    start: 'Start',
    end: 'End',
    untitledTask: 'Untitled Task',
    overrunTitle: 'Task took longer than planned',
    overrunPrompt: 'Please enter a brief reason why this task took more time:',
    overrunPlaceholder: 'e.g. waiting on ingredients, machine downtime',
    notificationSent: 'Overrun notification sent to admins',
    notificationFailed: 'Notification failed',
    failedToSaveTaskTimes: 'Failed to save task times',
    planSaved: 'Plan saved',
  }
};

type Lang = keyof typeof resources;

type I18nContextValue = {
  lang: Lang;
  setLang: (lng: Lang) => void;
  // Accept any string key to avoid strict typing errors in codebase where keys
  // may be added dynamically or missing from the small `resources` map.
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children, defaultLang = 'ar' as Lang }: { children: ReactNode; defaultLang?: Lang }) {
  const [lang, setLang] = useState<Lang>(defaultLang);
  const value = useMemo<I18nContextValue>(() => ({
    lang,
    setLang,
    // Use any-indexing to lookup keys; fall back to the key string when missing.
    t: (key) => ((resources as any)[lang]?.[key] ?? String(key)) as string,
  }), [lang]);
  return createElement(I18nContext.Provider, { value }, children as any);
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  // Fallback to default Arabic if no provider is used
  const t = (key: string) => ((resources as any)['ar']?.[key] ?? String(key)) as string;
  if (!ctx) return { t };
  return { t: ctx.t };
}

export function setLanguage(lng: Lang) {
  // Convenience for non-React places if needed later (no-op without provider)
  // Consumers using the hook should prefer I18nProvider.
  console.warn('setLanguage called without provider; wrap app in <I18nProvider /> to enable dynamic language switching. Requested:', lng);
}

// Add a default export so the Expo/Next-style app router doesn't warn about a
// missing default export for this route file. Export a small wrapper component
// that simply renders the I18nProvider so if the router mounts this file it
// still provides i18n to its children.
export default function I18nRoute({ children }: { children?: ReactNode }) {
  return createElement(I18nProvider, { children } as any);
}
