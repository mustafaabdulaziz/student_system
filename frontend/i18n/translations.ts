export type Language = 'ar' | 'en' | 'tr';

export interface Translations {
    // Common
    appName: string;
    welcome: string;
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    search: string;
    filter: string;
    export: string;
    import: string;
    yes: string;
    no: string;
    confirm: string;
    back: string;
    next: string;
    submit: string;
    close: string;
    optional: string;

    // Navigation
    dashboard: string;
    universities: string;
    programs: string;
    students: string;
    applications: string;
    users: string;
    account: string;
    logout: string;
    notifications: string;

    // Login
    login: string;
    email: string;
    password: string;
    loginButton: string;
    loginError: string;
    accountDeactivated: string;

    // Dashboard
    dashboardTitle: string;
    totalStudents: string;
    totalApplications: string;
    totalPrograms: string;
    totalUniversities: string;
    pendingApplications: string;
    approvedApplications: string;
    rejectedApplications: string;
    recentApplications: string;
    viewDetails: string;
    fromDate: string;
    toDate: string;
    applyFilter: string;
    clearFilter: string;
    applicationsDashboard: string;
    yesterday: string;
    last7Days: string;
    thisWeek: string;
    lastWeek: string;
    thisMonth: string;
    lastMonth: string;
    thisYear: string;
    selectedCountLabel: string;
    noOptions: string;
    byResponsible: string;
    byAgent: string;
    byUniversity: string;
    byProgram: string;
    byCountry: string;
    byStatus: string;
    others: string;
    totalsByFilter: string;
    totalCost: string;

    // News and Updates
    newsAndUpdates: string;
    newsAndUpdatesSubtitle: string;
    addNews: string;
    newsTitle: string;
    newsContent: string;
    noNews: string;
    createdBy: string;

    // Universities
    universitiesTitle: string;
    addUniversity: string;
    universityName: string;
    universityWebsite: string;
    universityCountry: string;
    universityDescription: string;
    noUniversities: string;
    searchUniversities: string;
    searchNoResults: string;
    treeView: string;
    kanbanView: string;
    visitOfficialWebsite: string;
    overview: string;
    programsAndFees: string;
    availableSpecialization: string;
    city: string;
    universityLogoOptional: string;
    clickToUploadLogo: string;
    changeLogo: string;
    editData: string;
    deleteRecord: string;
    deleteUniversityConfirmMessage: string;
    editUniversity: string;
    selectedLogo: string;
    logoFormatHint: string;
    countryTurkey: string;
    countryCyprus: string;

    // Programs
    programsTitle: string;
    addProgram: string;
    editProgram: string;
    programName: string;
    programNameInArabic: string;
    programNameInArabicPlaceholder: string;
    programCategory: string;
    category_medicine_health_sciences: string;
    category_engineering_technology: string;
    category_natural_sciences: string;
    category_social_economic_admin_sciences: string;
    category_education_teaching: string;
    category_law_communication_humanities: string;
    category_art_design_sports: string;
    programDegree: string;
    programLanguage: string;
    programYears: string;
    programDeadline: string;
    programFee: string;
    programPeriod: string;
    selectPeriod: string;
    feeBeforeDiscount: string;
    deposit: string;
    cashPrice: string;
    programCountry: string;
    programCurrency: string;
    programDescription: string;
    selectUniversity: string;
    noPrograms: string;
    searchProgramNamePlaceholder: string;
    searchNameInArabicPlaceholder: string;
    filterAll: string;
    clearFilters: string;
    number: string;
    bachelor: string;
    master: string;
    phd: string;
    combinedPhd: string;

    // Students
    studentsTitle: string;
    addStudent: string;
    firstName: string;
    lastName: string;
    passportNumber: string;
    fatherName: string;
    motherName: string;
    gender: string;
    male: string;
    female: string;
    phone: string;
    nationality: string;
    degreeTarget: string;
    dateOfBirth: string;
    residenceCountry: string;
    noStudents: string;
    studentDetails: string;
    studentInfo: string;
    studentName: string;
    createApplication: string;
    viewApplications: string;

    // Applications
    applicationsTitle: string;
    applicationsSubtitle: string;
    addApplication: string;
    applicationStatus: string;
    applicationNumber: string;
    updateDate: string;
    createdAt: string;
    noApplicationsInSystem: string;
    noAttachments: string;
    attachAdditionalFiles: string;
    uploadNow: string;
    uploadToWhatsApp: string;
    filesSelected: string;
    uploadFailed: string;
    semester: string;
    selectStudent: string;
    selectProgram: string;
    uploadFiles: string;
    noApplications: string;
    pending: string;
    approved: string;
    rejected: string;
    draft: string;
    missingDocs: string;
    underReview: string;
    applicationDetails: string;
    currentApplicationStatus: string;
    updateStatus: string;
    sendToReview: string;
    sendMessage: string;
    messages: string;
    noMessages: string;
    typeMessage: string;
    responsible: string;
    cost: string;
    commission: string;
    saleAmount: string;
    profit: string;
    currency: string;
    editApplication: string;
    selectResponsible: string;

    // Users
    usersTitle: string;
    addUser: string;
    editUser: string;
    userName: string;
    userEmail: string;
    userRole: string;
    userPhone: string;
    countryCode: string;
    noUsers: string;
    admin: string;
    agent: string;
    selectAgent: string;
    hostAgent: string;
    user: string;
    changePassword: string;
    newPassword: string;
    confirmPassword: string;
    active: string;
    inactive: string;
    status: string;

    // Periods
    period: string;
    periodsTitle: string;
    addPeriod: string;
    editPeriod: string;
    periodName: string;
    startDate: string;
    endDate: string;
    noPeriods: string;

    // Notifications
    notificationsTitle: string;
    noNotifications: string;
    markAsRead: string;
    markAllAsRead: string;
    newMessage: string;
    statusUpdate: string;
    statusUpdateMessage: string;
    messageFromAdmin: string;
    messageFromApp: string;

    // Messages
    successAdd: string;
    successUpdate: string;
    successDelete: string;
    errorAdd: string;
    errorUpdate: string;
    errorDelete: string;
    errorConnection: string;
    confirmDelete: string;

    // Validation
    requiredField: string;
    invalidImageFile: string;
    invalidEmail: string;
    passwordMismatch: string;

    // Language
    language: string;
    arabic: string;
    english: string;
    turkish: string;
}

export const translations: Record<Language, Translations> = {
    ar: {
        // Common
        appName: 'NOKTA CRM',
        welcome: 'مرحباً',
        loading: 'جاري التحميل...',
        save: 'حفظ',
        cancel: 'إلغاء',
        delete: 'حذف',
        edit: 'تعديل',
        add: 'إضافة',
        search: 'بحث',
        filter: 'تصفية',
        export: 'تصدير',
        import: 'استيراد',
        yes: 'نعم',
        no: 'لا',
        confirm: 'تأكيد',
        back: 'رجوع',
        next: 'التالي',
        submit: 'إرسال',
        close: 'إغلاق',
        optional: 'اختياري',

        // Navigation
        dashboard: 'لوحة التحكم',
        universities: 'الجامعات',
        programs: 'البرامج',
        students: 'الطلاب',
        applications: 'الطلبات',
        users: 'المستخدمون',
        account: 'الحساب',
        logout: 'تسجيل الخروج',
        notifications: 'الإشعارات',

        // Login
        login: 'تسجيل الدخول',
        email: 'البريد الإلكتروني',
        password: 'كلمة المرور',
        loginButton: 'دخول',
        loginError: 'خطأ في البريد الإلكتروني أو كلمة المرور',
        accountDeactivated: 'هذا الحساب غير مفعل',

        // Dashboard
        dashboardTitle: 'لوحة التحكم',
        totalStudents: 'إجمالي الطلاب',
        totalApplications: 'إجمالي الطلبات',
        totalPrograms: 'إجمالي البرامج',
        totalUniversities: 'إجمالي الجامعات',
        pendingApplications: 'طلبات قيد الانتظار',
        approvedApplications: 'طلبات مقبولة',
        rejectedApplications: 'طلبات مرفوضة',
        recentApplications: 'الطلبات الأخيرة',
        viewDetails: 'عرض التفاصيل',
        fromDate: 'من تاريخ',
        toDate: 'إلى تاريخ',
        applyFilter: 'تطبيق',
        clearFilter: 'مسح الفلتر',
        applicationsDashboard: 'لوحة البطبات',
        yesterday: 'أمس',
        last7Days: 'آخر 7 أيام',
        thisWeek: 'هذا الأسبوع',
        lastWeek: 'الأسبوع الماضي',
        thisMonth: 'هذا الشهر',
        lastMonth: 'الشهر الماضي',
        thisYear: 'هذه السنة',
        selectedCountLabel: 'محدد',
        noOptions: 'لا خيارات',
        byResponsible: 'حسب المسؤول',
        byAgent: 'حسب الوكيل',
        byUniversity: 'حسب الجامعة',
        byProgram: 'حسب البرنامج',
        byCountry: 'حسب الدولة',
        byStatus: 'حسب الحالة',
        others: 'أخرى',
        totalsByFilter: 'المجاميع حسب الفلتر',
        totalCost: 'إجمالي التكلفة',
        newsAndUpdates: 'الأخبار والتحديثات',
        newsAndUpdatesSubtitle: 'آخر الأخبار والإعلانات من الإدارة',
        addNews: 'إضافة خبر أو تحديث',
        newsTitle: 'العنوان',
        newsContent: 'المحتوى',
        noNews: 'لا توجد أخبار بعد',
        createdBy: 'نشر بواسطة',

        // Universities
        universitiesTitle: 'إدارة الجامعات',
        addUniversity: 'إضافة جامعة',
        universityName: 'اسم الجامعة',
        universityWebsite: 'الموقع الإلكتروني',
        universityCountry: 'الدولة',
        universityDescription: 'الوصف',
        noUniversities: 'لا توجد جامعات',
        searchUniversities: 'بحث بالاسم...',
        searchNoResults: 'لا توجد نتائج',
        treeView: 'عرض شجري',
        kanbanView: 'عرض كانبان',
        visitOfficialWebsite: 'زيارة الموقع الرسمي',
        overview: 'نظرة عامة',
        programsAndFees: 'البرامج والرسوم',
        availableSpecialization: 'تخصص متاح',
        city: 'المدينة',
        universityLogoOptional: 'شعار الجامعة (اختياري)',
        clickToUploadLogo: 'انقر لرفع شعار الجامعة',
        changeLogo: 'تغيير',
        editData: 'تعديل البيانات',
        deleteRecord: 'حذف السجل',
        deleteUniversityConfirmMessage: 'سيتم حذف الجامعة وجميع البرامج المرتبطة بها نهائياً.',
        editUniversity: 'تعديل الجامعة',
        selectedLogo: 'تم اختيار الشعار ✓',
        logoFormatHint: 'PNG, JPG, SVG (حد أقصى 2MB)',
        countryTurkey: 'تركيا',
        countryCyprus: 'قبرص',

        // Programs
        programsTitle: 'إدارة البرامج',
        addProgram: 'إضافة برنامج',
        editProgram: 'تعديل البرنامج',
        programName: 'اسم البرنامج',
        programNameInArabic: 'الاسم بالعربية',
        programNameInArabicPlaceholder: 'اسم البرنامج بالعربية',
        programCategory: 'الفئة',
        category_medicine_health_sciences: 'الطب والعلوم الصحية',
        category_engineering_technology: 'الهندسة والتكنولوجيا',
        category_natural_sciences: 'العلوم الطبيعية',
        category_social_economic_admin_sciences: 'العلوم الاجتماعية والاقتصادية والإدارية',
        category_education_teaching: 'التعليم والتدريس',
        category_law_communication_humanities: 'القانون والإعلام والعلوم الإنسانية',
        category_art_design_sports: 'الفن والتصميم والرياضة',
        programDegree: 'الدرجة',
        programLanguage: 'لغة التدريس',
        programYears: 'عدد السنوات',
        programDeadline: 'الموعد النهائي',
        programFee: 'الرسوم',
        programPeriod: 'الدورة',
        selectPeriod: 'اختر الدورة',
        feeBeforeDiscount: 'الرسوم قبل الخصم',
        deposit: 'العربون',
        cashPrice: 'السعر النقدي',
        programCountry: 'الدولة',
        programCurrency: 'العملة',
        programDescription: 'الوصف',
        selectUniversity: 'اختر الجامعة',
        noPrograms: 'لا توجد برامج',
        searchProgramNamePlaceholder: 'بحث باسم البرنامج...',
        searchNameInArabicPlaceholder: 'بحث بالاسم بالعربية...',
        filterAll: 'الكل',
        clearFilters: 'مسح الفلاتر',
        number: 'الرقم',
        bachelor: 'بكالوريوس',
        master: 'ماجستير',
        phd: 'دكتوراه',
        combinedPhd: 'دكتوراه مشتركة',

        // Students
        studentsTitle: 'إدارة الطلاب',
        addStudent: 'إضافة طالب',
        firstName: 'الاسم الأول',
        lastName: 'اسم العائلة',
        passportNumber: 'رقم جواز السفر',
        fatherName: 'اسم الأب',
        motherName: 'اسم الأم',
        gender: 'الجنس',
        male: 'ذكر',
        female: 'أنثى',
        phone: 'رقم الهاتف',
        nationality: 'الجنسية',
        degreeTarget: 'الدرجة المستهدفة',
        dateOfBirth: 'تاريخ الميلاد',
        residenceCountry: 'بلد الإقامة',
        noStudents: 'لا يوجد طلاب',
        studentDetails: 'تفاصيل الطالب',
        studentInfo: 'بيانات الطالب',
        studentName: 'اسم الطالب',
        createApplication: 'إنشاء طلب',
        viewApplications: 'عرض الطلبات',

        // Applications
        applicationsTitle: 'إدارة الطلبات',
        applicationsSubtitle: 'مراقبة وإدارة ملفات القبول الجامعي',
        addApplication: 'إضافة طلب',
        applicationNumber: 'رقم الطلب',
        updateDate: 'التحديث',
        createdAt: 'تاريخ الإنشاء',
        noApplicationsInSystem: 'لم يتم العثور على أي طلبات في النظام',
        noAttachments: 'لا يوجد مرفقات',
        attachAdditionalFiles: 'إرفاق ملفات إضافية',
        uploadNow: 'رفع الآن',
        uploadToWhatsApp: 'رفع للواتساب',
        filesSelected: 'ملفات تم اختيارها',
        uploadFailed: 'فشل الرفع',
        applicationStatus: 'حالة الطلب',
        semester: 'الفصل الدراسي',
        selectStudent: 'اختر الطالب',
        selectProgram: 'اختر البرنامج',
        uploadFiles: 'رفع الملفات',
        noApplications: 'لا توجد طلبات',
        pending: 'قيد الانتظار',
        approved: 'مقبول',
        rejected: 'مرفوض',
        draft: 'مسودة',
        missingDocs: 'طلب ملفات ناقصة',
        underReview: 'قيد التقييم',
        applicationDetails: 'تفاصيل الطلب',
        currentApplicationStatus: 'حالة الطلب الحالية',
        updateStatus: 'تحديث الحالة',
        sendToReview: 'إرسال للمراجعة',
        sendMessage: 'إرسال رسالة',
        messages: 'الرسائل',
        noMessages: 'لا توجد رسائل',
        typeMessage: 'اكتب رسالة...',
        responsible: 'المسؤول',
        cost: 'التكلفة',
        commission: 'العمولة',
        saleAmount: 'مبلغ البيع',
        profit: 'الربح',
        currency: 'العملة',
        editApplication: 'تعديل الطلب',
        selectResponsible: 'اختر المسؤول',

        // Users
        usersTitle: 'إدارة المستخدمين',
        addUser: 'إضافة مستخدم',
        editUser: 'تعديل المستخدم',
        userName: 'اسم المستخدم',
        userEmail: 'البريد الإلكتروني',
        userRole: 'الدور',
        userPhone: 'رقم الهاتف',
        countryCode: 'كود الدولة',
        noUsers: 'لا يوجد مستخدمون',
        admin: 'مدير',
        agent: 'وكيل',
        selectAgent: 'اختر الوكيل',
        hostAgent: 'الوكيل المضيف',
        user: 'مستخدم',
        changePassword: 'تغيير كلمة المرور',
        newPassword: 'كلمة المرور الجديدة',
        confirmPassword: 'تأكيد كلمة المرور',
        active: 'نشط',
        inactive: 'غير نشط',
        status: 'الحالة',

        // Periods
        period: 'الدورة',
        periodsTitle: 'إدارة الدورات',
        addPeriod: 'إضافة دورة',
        editPeriod: 'تعديل الدورة',
        periodName: 'اسم الدورة',
        startDate: 'تاريخ البداية',
        endDate: 'تاريخ النهاية',
        noPeriods: 'لا توجد دورات',

        // Notifications
        notificationsTitle: 'الإشعارات',
        noNotifications: 'لا توجد إشعارات',
        markAsRead: 'تعليم كمقروء',
        markAllAsRead: 'تجاهل الكل',
        newMessage: 'رسالة جديدة',
        statusUpdate: 'تحديث الحالة',
        statusUpdateMessage: 'تم تغيير حالة طلبك #{id} إلى {status}',
        messageFromAdmin: 'الأدمن: {message}',
        messageFromApp: 'طلب #{id}: {message}',

        // Messages
        successAdd: 'تمت الإضافة بنجاح',
        successUpdate: 'تم التحديث بنجاح',
        successDelete: 'تم الحذف بنجاح',
        errorAdd: 'فشلت الإضافة',
        errorUpdate: 'فشل التحديث',
        errorDelete: 'فشل الحذف',
        errorConnection: 'خطأ في الاتصال بالخادم',
        confirmDelete: 'هل أنت متأكد من الحذف؟',

        // Validation
        requiredField: 'هذا الحقل مطلوب',
        invalidImageFile: 'يرجى اختيار ملف صورة صالح',
        invalidEmail: 'البريد الإلكتروني غير صالح',
        passwordMismatch: 'كلمات المرور غير متطابقة',

        // Language
        language: 'اللغة',
        arabic: 'العربية',
        english: 'English',
        turkish: 'Türkçe',
    },

    en: {
        // Common
        appName: 'Nokta CRM',
        welcome: 'Welcome',
        loading: 'Loading...',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        search: 'Search',
        filter: 'Filter',
        export: 'Export',
        import: 'Import',
        yes: 'Yes',
        no: 'No',
        confirm: 'Confirm',
        back: 'Back',
        next: 'Next',
        submit: 'Submit',
        close: 'Close',
        optional: 'Optional',

        // Navigation
        dashboard: 'Dashboard',
        universities: 'Universities',
        programs: 'Programs',
        students: 'Students',
        applications: 'Applications',
        users: 'Users',
        account: 'Account',
        logout: 'Logout',
        notifications: 'Notifications',

        // Login
        login: 'Login',
        email: 'Email',
        password: 'Password',
        loginButton: 'Sign In',
        loginError: 'Invalid email or password',
        accountDeactivated: 'This account is deactivated',

        // Dashboard
        dashboardTitle: 'Dashboard',
        totalStudents: 'Total Students',
        totalApplications: 'Total Applications',
        totalPrograms: 'Total Programs',
        totalUniversities: 'Total Universities',
        pendingApplications: 'Pending Applications',
        approvedApplications: 'Approved Applications',
        rejectedApplications: 'Rejected Applications',
        recentApplications: 'Recent Applications',
        viewDetails: 'View Details',
        fromDate: 'From date',
        toDate: 'To date',
        applyFilter: 'Apply',
        clearFilter: 'Clear filter',
        applicationsDashboard: 'Applications Dashboard',
        yesterday: 'Yesterday',
        last7Days: 'Last 7 days',
        thisWeek: 'This week',
        lastWeek: 'Last week',
        thisMonth: 'This month',
        lastMonth: 'Last month',
        thisYear: 'This year',
        selectedCountLabel: 'selected',
        noOptions: 'No options',
        byResponsible: 'By responsible',
        byAgent: 'By agent',
        byUniversity: 'By university',
        byProgram: 'By program',
        byCountry: 'By country',
        byStatus: 'By status',
        others: 'Others',
        totalsByFilter: 'Totals (filtered)',
        totalCost: 'Total cost',
        newsAndUpdates: 'News and Updates',
        newsAndUpdatesSubtitle: 'Latest news and announcements from the administration',
        addNews: 'Add news or update',
        newsTitle: 'Title',
        newsContent: 'Content',
        noNews: 'No news yet',
        createdBy: 'Posted by',

        // Universities
        universitiesTitle: 'University Management',
        addUniversity: 'Add University',
        universityName: 'University Name',
        universityWebsite: 'Website',
        universityCountry: 'Country',
        universityDescription: 'Description',
        noUniversities: 'No universities found',
        searchUniversities: 'Search by name...',
        searchNoResults: 'No results found',
        treeView: 'Tree view',
        kanbanView: 'Kanban view',
        visitOfficialWebsite: 'Visit Official Website',
        overview: 'Overview',
        programsAndFees: 'Programs and Fees',
        availableSpecialization: 'Available specialization',
        city: 'City',
        universityLogoOptional: 'University logo (optional)',
        clickToUploadLogo: 'Click to upload university logo',
        changeLogo: 'Change',
        editData: 'Edit Data',
        deleteRecord: 'Delete Record',
        deleteUniversityConfirmMessage: 'The university and all associated programs will be permanently deleted.',
        editUniversity: 'Edit University',
        selectedLogo: 'Logo selected ✓',
        logoFormatHint: 'PNG, JPG, SVG (max 2MB)',
        countryTurkey: 'Turkey',
        countryCyprus: 'Cyprus',

        // Programs
        programsTitle: 'Program Management',
        addProgram: 'Add Program',
        editProgram: 'Edit Program',
        programName: 'Program Name',
        programNameInArabic: 'Name in Arabic',
        programNameInArabicPlaceholder: 'Program name in Arabic',
        programCategory: 'Category',
        category_medicine_health_sciences: 'Medicine and Health Sciences',
        category_engineering_technology: 'Engineering and Technology',
        category_natural_sciences: 'Natural Sciences',
        category_social_economic_admin_sciences: 'Social, Economic and Administrative Sciences',
        category_education_teaching: 'Education and Teaching',
        category_law_communication_humanities: 'Law, Communication and Humanities',
        category_art_design_sports: 'Arts, Design and Sports',
        programDegree: 'Degree',
        programLanguage: 'Language',
        programYears: 'Years',
        programDeadline: 'Deadline',
        programFee: 'Fee',
        programPeriod: 'Period',
        selectPeriod: 'Select Period',
        feeBeforeDiscount: 'Fee before discount',
        deposit: 'Deposit',
        cashPrice: 'Cash price',
        programCountry: 'Country',
        programCurrency: 'Currency',
        programDescription: 'Description',
        selectUniversity: 'Select University',
        noPrograms: 'No programs found',
        searchProgramNamePlaceholder: 'Search by program name...',
        searchNameInArabicPlaceholder: 'Search by name in Arabic...',
        filterAll: 'All',
        clearFilters: 'Clear filters',
        number: 'Number',
        bachelor: 'Bachelor',
        master: 'Master',
        phd: 'PhD',
        combinedPhd: 'Combined PhD',

        // Students
        studentsTitle: 'Student Management',
        addStudent: 'Add Student',
        firstName: 'First Name',
        lastName: 'Last Name',
        passportNumber: 'Passport Number',
        fatherName: "Father's Name",
        motherName: "Mother's Name",
        gender: 'Gender',
        male: 'Male',
        female: 'Female',
        phone: 'Phone',
        nationality: 'Nationality',
        degreeTarget: 'Target Degree',
        dateOfBirth: 'Date of Birth',
        residenceCountry: 'Residence Country',
        noStudents: 'No students found',
        studentDetails: 'Student Details',
        studentInfo: 'Student Name',
        studentName: 'Student Name',
        createApplication: 'Create Application',
        viewApplications: 'View Applications',

        // Applications
        applicationsTitle: 'Application Management',
        applicationsSubtitle: 'Monitor and manage university admission files',
        addApplication: 'Add Application',
        applicationNumber: 'Application Number',
        updateDate: 'Update',
        createdAt: 'Created at',
        noApplicationsInSystem: 'No applications found in the system',
        noAttachments: 'No attachments',
        attachAdditionalFiles: 'Attach additional files',
        uploadNow: 'Upload now',
        uploadToWhatsApp: 'Upload to WhatsApp',
        filesSelected: 'Files selected',
        uploadFailed: 'Upload failed',
        applicationStatus: 'Status',
        semester: 'Semester',
        selectStudent: 'Select Student',
        selectProgram: 'Select Program',
        uploadFiles: 'Upload Files',
        noApplications: 'No applications found',
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        draft: 'Draft',
        missingDocs: 'Missing Documents',
        underReview: 'Under Review',
        applicationDetails: 'Application Details',
        currentApplicationStatus: 'Current status',
        updateStatus: 'Update Status',
        sendToReview: 'Send to review',
        sendMessage: 'Send Message',
        messages: 'Messages',
        noMessages: 'No messages',
        typeMessage: 'Type a message...',
        responsible: 'Responsible',
        cost: 'Cost',
        commission: 'Commission',
        saleAmount: 'Sale amount',
        profit: 'Profit',
        currency: 'Currency',
        editApplication: 'Edit application',
        selectResponsible: 'Select responsible',

        // Users
        usersTitle: 'User Management',
        addUser: 'Add User',
        editUser: 'Edit User',
        userName: 'Name',
        userEmail: 'Email',
        userRole: 'Role',
        userPhone: 'Phone',
        countryCode: 'Country Code',
        noUsers: 'No users found',
        admin: 'Admin',
        agent: 'Agent',
        selectAgent: 'Select agent',
        hostAgent: 'Host Agent',
        user: 'User',
        changePassword: 'Change Password',
        newPassword: 'New Password',
        confirmPassword: 'Confirm Password',
        active: 'Active',
        inactive: 'Inactive',
        status: 'Status',

        // Periods
        period: 'Period',
        periodsTitle: 'Period Management',
        addPeriod: 'Add Period',
        editPeriod: 'Edit Period',
        periodName: 'Period Name',
        startDate: 'Start Date',
        endDate: 'End Date',
        noPeriods: 'No periods',

        // Notifications
        notificationsTitle: 'Notifications',
        noNotifications: 'No notifications',
        markAsRead: 'Mark as Read',
        markAllAsRead: 'Ignore all',
        newMessage: 'New Message',
        statusUpdate: 'Status Update',
        statusUpdateMessage: 'Your application #{id} status changed to {status}',
        messageFromAdmin: 'Admin: {message}',
        messageFromApp: 'App #{id}: {message}',

        // Messages
        successAdd: 'Added successfully',
        successUpdate: 'Updated successfully',
        successDelete: 'Deleted successfully',
        errorAdd: 'Failed to add',
        errorUpdate: 'Failed to update',
        errorDelete: 'Failed to delete',
        errorConnection: 'Server connection error',
        confirmDelete: 'Are you sure you want to delete?',

        // Validation
        requiredField: 'This field is required',
        invalidImageFile: 'Please select a valid image file',
        invalidEmail: 'Invalid email address',
        passwordMismatch: 'Passwords do not match',

        // Language
        language: 'Language',
        arabic: 'العربية',
        english: 'English',
        turkish: 'Türkçe',
    },

    tr: {
        // Common
        appName: 'Nokta CRM',
        welcome: 'Hoş Geldiniz',
        loading: 'Yükleniyor...',
        save: 'Kaydet',
        cancel: 'İptal',
        delete: 'Sil',
        edit: 'Düzenle',
        add: 'Ekle',
        search: 'Ara',
        filter: 'Filtrele',
        export: 'Dışa Aktar',
        import: 'İçe Aktar',
        yes: 'Evet',
        no: 'Hayır',
        confirm: 'Onayla',
        back: 'Geri',
        next: 'İleri',
        submit: 'Gönder',
        close: 'Kapat',
        optional: 'İsteğe bağlı',

        // Navigation
        dashboard: 'Kontrol Paneli',
        universities: 'Üniversiteler',
        programs: 'Programlar',
        students: 'Öğrenciler',
        applications: 'Başvurular',
        users: 'Kullanıcılar',
        account: 'Hesap',
        logout: 'Çıkış',
        notifications: 'Bildirimler',

        // Login
        login: 'Giriş',
        email: 'E-posta',
        password: 'Şifre',
        loginButton: 'Giriş Yap',
        loginError: 'Geçersiz e-posta veya şifre',
        accountDeactivated: 'Bu hesap devre dışı bırakıldı',

        // Dashboard
        dashboardTitle: 'Kontrol Paneli',
        totalStudents: 'Toplam Öğrenci',
        totalApplications: 'Toplam Başvuru',
        totalPrograms: 'Toplam Program',
        totalUniversities: 'Toplam Üniversite',
        pendingApplications: 'Bekleyen Başvurular',
        approvedApplications: 'Onaylanan Başvurular',
        rejectedApplications: 'Reddedilen Başvurular',
        recentApplications: 'Son Başvurular',
        viewDetails: 'Detayları Görüntüle',
        fromDate: 'Başlangıç tarihi',
        toDate: 'Bitiş tarihi',
        applyFilter: 'Uygula',
        clearFilter: 'Filtreyi temizle',
        applicationsDashboard: 'Başvuru Panosu',
        yesterday: 'Dün',
        last7Days: 'Son 7 gün',
        thisWeek: 'Bu hafta',
        lastWeek: 'Geçen hafta',
        thisMonth: 'Bu ay',
        lastMonth: 'Geçen ay',
        thisYear: 'Bu yıl',
        selectedCountLabel: 'seçildi',
        noOptions: 'Seçenek yok',
        byResponsible: 'Sorumluya göre',
        byAgent: 'Temsilciye göre',
        byUniversity: 'Üniversiteye göre',
        byProgram: 'Bölüme göre',
        byCountry: 'Ülkeye göre',
        byStatus: 'Duruma göre',
        others: 'Diğerleri',
        totalsByFilter: 'Toplamlar (filtreye göre)',
        totalCost: 'Toplam maliyet',
        newsAndUpdates: 'Haberler ve Güncellemeler',
        newsAndUpdatesSubtitle: 'Yönetimden son haberler ve duyurular',
        addNews: 'Haber veya güncelleme ekle',
        newsTitle: 'Başlık',
        newsContent: 'İçerik',
        noNews: 'Henüz haber yok',
        createdBy: 'Yayınlayan',

        // Universities
        universitiesTitle: 'Üniversite Yönetimi',
        addUniversity: 'Üniversite Ekle',
        universityName: 'Üniversite Adı',
        universityWebsite: 'Web Sitesi',
        universityCountry: 'Ülke',
        universityDescription: 'Açıklama',
        noUniversities: 'Üniversite bulunamadı',
        searchUniversities: 'İsimle ara...',
        searchNoResults: 'Sonuç bulunamadı',
        treeView: 'Ağaç görünümü',
        kanbanView: 'Kanban görünümü',
        visitOfficialWebsite: 'Resmi Siteyi Ziyaret Et',
        overview: 'Genel Bakış',
        programsAndFees: 'Programlar ve Ücretler',
        availableSpecialization: 'Uygun uzmanlık',
        city: 'Şehir',
        universityLogoOptional: 'Üniversite logosu (isteğe bağlı)',
        clickToUploadLogo: 'Logo yüklemek için tıklayın',
        changeLogo: 'Değiştir',
        editData: 'Verileri Düzenle',
        deleteRecord: 'Kaydı Sil',
        deleteUniversityConfirmMessage: 'Üniversite ve ilişkili tüm programlar kalıcı olarak silinecektir.',
        editUniversity: 'Üniversiteyi Düzenle',
        selectedLogo: 'Logo seçildi ✓',
        logoFormatHint: 'PNG, JPG, SVG (maks 2MB)',
        countryTurkey: 'Türkiye',
        countryCyprus: 'Kıbrıs',

        // Programs
        programsTitle: 'Program Yönetimi',
        addProgram: 'Program Ekle',
        editProgram: 'Programı Düzenle',
        programName: 'Program Adı',
        programNameInArabic: 'Arapça Ad',
        programNameInArabicPlaceholder: 'Program adı Arapça',
        programCategory: 'Kategori',
        category_medicine_health_sciences: 'Tıp ve Sağlık Bilimleri',
        category_engineering_technology: 'Mühendislik ve Teknoloji',
        category_natural_sciences: 'Fen Bilimleri',
        category_social_economic_admin_sciences: 'Sosyal, İktisadi ve İdari Bilimler',
        category_education_teaching: 'Eğitim ve Öğretmenlik',
        category_law_communication_humanities: 'Hukuk, İletişim ve Beşeri Bilimler',
        category_art_design_sports: 'Sanat, Tasarım ve Spor',
        programDegree: 'Derece',
        programLanguage: 'Dil',
        programYears: 'Yıl',
        programDeadline: 'Son Tarih',
        programFee: 'Ücret',
        programPeriod: 'Dönem',
        selectPeriod: 'Dönem Seç',
        feeBeforeDiscount: 'İndirim öncesi ücret',
        deposit: 'Depozito',
        cashPrice: 'Nakit fiyat',
        programCountry: 'Ülke',
        programCurrency: 'Para Birimi',
        programDescription: 'Açıklama',
        selectUniversity: 'Üniversite Seç',
        noPrograms: 'Program bulunamadı',
        searchProgramNamePlaceholder: 'Program adıyla ara...',
        searchNameInArabicPlaceholder: 'Arapça adla ara...',
        filterAll: 'Tümü',
        clearFilters: 'Filtreleri temizle',
        number: 'Numara',
        bachelor: 'Lisans',
        master: 'Yüksek Lisans',
        phd: 'Doktora',
        combinedPhd: 'Birleşik Doktora',

        // Students
        studentsTitle: 'Öğrenci Yönetimi',
        addStudent: 'Öğrenci Ekle',
        firstName: 'Ad',
        lastName: 'Soyad',
        passportNumber: 'Pasaport Numarası',
        fatherName: 'Baba Adı',
        motherName: 'Anne Adı',
        gender: 'Cinsiyet',
        male: 'Erkek',
        female: 'Kadın',
        phone: 'Telefon',
        nationality: 'Uyruk',
        degreeTarget: 'Hedef Derece',
        dateOfBirth: 'Doğum Tarihi',
        residenceCountry: 'İkamet Ülkesi',
        noStudents: 'Öğrenci bulunamadı',
        studentDetails: 'Öğrenci Detayları',
        studentInfo: 'Öğrenci Adı',
        studentName: 'Öğrenci Adı',
        createApplication: 'Başvuru Oluştur',
        viewApplications: 'Başvuruları Görüntüle',

        // Applications
        applicationsTitle: 'Başvuru Yönetimi',
        applicationsSubtitle: 'Üniversite kabul dosyalarını izleme ve yönetme',
        addApplication: 'Başvuru Ekle',
        applicationNumber: 'Başvuru No',
        updateDate: 'Güncelleme',
        createdAt: 'Oluşturulma tarihi',
        noApplicationsInSystem: 'Sistemde başvuru bulunamadı',
        noAttachments: 'Ek yok',
        attachAdditionalFiles: 'Ek dosya ekle',
        uploadNow: 'Şimdi yükle',
        uploadToWhatsApp: "WhatsApp'a yükle",
        filesSelected: 'Dosyalar seçildi',
        uploadFailed: 'Yükleme başarısız',
        applicationStatus: 'Durum',
        semester: 'Dönem',
        selectStudent: 'Öğrenci Seç',
        selectProgram: 'Program Seç',
        uploadFiles: 'Dosya Yükle',
        noApplications: 'Başvuru bulunamadı',
        pending: 'Beklemede',
        approved: 'Onaylandı',
        rejected: 'Reddedildi',
        draft: 'Taslak',
        missingDocs: 'Eksik Belgeler İste',
        underReview: 'Değerlendirme Aşamasında',
        applicationDetails: 'Başvuru Detayları',
        currentApplicationStatus: 'Mevcut durum',
        updateStatus: 'Durumu Güncelle',
        sendToReview: 'İncelemeye gönder',
        sendMessage: 'Mesaj Gönder',
        messages: 'Mesajlar',
        noMessages: 'Mesaj yok',
        typeMessage: 'Mesaj yazın...',
        responsible: 'Sorumlu',
        cost: 'Maliyet',
        commission: 'Komisyon',
        saleAmount: 'Satış tutarı',
        profit: 'Kâr',
        currency: 'Para birimi',
        editApplication: 'Başvuruyu düzenle',
        selectResponsible: 'Sorumlu seçin',

        // Users
        usersTitle: 'Kullanıcı Yönetimi',
        addUser: 'Kullanıcı Ekle',
        editUser: 'Kullanıcıyı Düzenle',
        userName: 'Ad',
        userEmail: 'E-posta',
        userRole: 'Rol',
        userPhone: 'Telefon',
        countryCode: 'Ülke Kodu',
        noUsers: 'Kullanıcı bulunamadı',
        admin: 'Yönetici',
        agent: 'Temsilci',
        selectAgent: 'Temsilci seçin',
        hostAgent: 'Sorumlu Temsilci',
        user: 'Kullanıcı',
        changePassword: 'Şifre Değiştir',
        newPassword: 'Yeni Şifre',
        confirmPassword: 'Şifreyi Onayla',
        active: 'Aktif',
        inactive: 'Pasif',
        status: 'Durum',

        // Periods
        period: 'Dönem',
        periodsTitle: 'Dönem Yönetimi',
        addPeriod: 'Dönem Ekle',
        editPeriod: 'Dönemi Düzenle',
        periodName: 'Dönem Adı',
        startDate: 'Başlangıç Tarihi',
        endDate: 'Bitiş Tarihi',
        noPeriods: 'Dönem yok',

        // Notifications
        notificationsTitle: 'Bildirimler',
        noNotifications: 'Bildirim yok',
        markAsRead: 'Okundu Olarak İşaretle',
        markAllAsRead: 'Tümünü okundu işaretle',
        newMessage: 'Yeni Mesaj',
        statusUpdate: 'Durum Güncellemesi',
        statusUpdateMessage: '#{id} numaralı başvurunuzun durumu {status} olarak güncellendi',
        messageFromAdmin: 'Yönetici: {message}',
        messageFromApp: 'Başvuru #{id}: {message}',

        // Messages
        successAdd: 'Başarıyla eklendi',
        successUpdate: 'Başarıyla güncellendi',
        successDelete: 'Başarıyla silindi',
        errorAdd: 'Ekleme başarısız',
        errorUpdate: 'Güncelleme başarısız',
        errorDelete: 'Silme başarısız',
        errorConnection: 'Sunucu bağlantı hatası',
        confirmDelete: 'Silmek istediğinizden emin misiniz?',

        // Validation
        requiredField: 'Bu alan gereklidir',
        invalidImageFile: 'Lütfen geçerli bir resim dosyası seçin',
        invalidEmail: 'Geçersiz e-posta adresi',
        passwordMismatch: 'Şifreler eşleşmiyor',

        // Language
        language: 'Dil',
        arabic: 'العربية',
        english: 'English',
        turkish: 'Türkçe',
    },
};
