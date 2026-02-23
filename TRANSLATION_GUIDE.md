# دليل إكمال الترجمة للمكونات المتبقية

## المكونات التي تم ترجمتها بالكامل ✅

1. **Login.tsx** - صفحة تسجيل الدخول
2. **Layout.tsx** - القالب الرئيسي مع القائمة الجانبية
3. **Dashboard.tsx** - لوحة التحكم
4. **UniversityManager.tsx** - إدارة الجامعات
5. **NotificationDropdown.tsx** - قائمة الإشعارات

---

## المكونات المتبقية (تحتاج نفس الطريقة)

### 1. ProgramManager.tsx
### 2. StudentManager.tsx  
### 3. ApplicationManager.tsx
### 4. UserManager.tsx

---

## طريقة الترجمة (نفس الخطوات لكل مكون)

### الخطوة 1: إضافة الـ Import

```tsx
import { useTranslation } from '../hooks/useTranslation';
```

### الخطوة 2: استخدام الـ Hook

```tsx
export const ComponentName = () => {
  const { t, dir, translateStatus } = useTranslation();
  // ... rest of code
```

### الخطوة 3: استبدال النصوص

**قبل:**
```tsx
<h2>إدارة البرامج</h2>
<button>إضافة</button>
<label>الاسم</label>
```

**بعد:**
```tsx
<h2>{t.programsTitle}</h2>
<button>{t.add}</button>
<label>{t.programName}</label>
```

### الخطوة 4: استخدام Helper Functions

```tsx
// للحالات (Status)
{translateStatus(app.status)}

// للدرجات (Degree)
{translateDegree(program.degree)}

// للجنس (Gender)
{translateGender(student.gender)}

// للأدوار (Role)
{translateRole(user.role)}
```

---

## مفاتيح الترجمة المتوفرة

جميع المفاتيح موجودة في `i18n/translations.ts`:

### للبرامج (Programs)
- `t.programsTitle`
- `t.addProgram`
- `t.programName`
- `t.programDegree`
- `t.programLanguage`
- `t.programYears`
- `t.programDeadline`
- `t.programFee`
- `t.programCurrency`
- `t.bachelor`, `t.master`, `t.phd`

### للطلاب (Students)
- `t.studentsTitle`
- `t.addStudent`
- `t.firstName`, `t.lastName`
- `t.passportNumber`
- `t.fatherName`, `t.motherName`
- `t.gender`, `t.male`, `t.female`
- `t.phone`, `t.nationality`
- `t.degreeTarget`
- `t.dateOfBirth`
- `t.residenceCountry`

### للطلبات (Applications)
- `t.applicationsTitle`
- `t.addApplication`
- `t.applicationStatus`
- `t.semester`
- `t.selectStudent`, `t.selectProgram`
- `t.uploadFiles`
- `t.pending`, `t.approved`, `t.rejected`
- `t.sendMessage`, `t.messages`
- `t.typeMessage`

### للمستخدمين (Users)
- `t.usersTitle`
- `t.addUser`
- `t.userName`, `t.userEmail`
- `t.userRole`, `t.userPhone`
- `t.admin`, `t.agent`, `t.user`
- `t.changePassword`
- `t.newPassword`, `t.confirmPassword`

### عامة (Common)
- `t.save`, `t.cancel`, `t.delete`
- `t.add`, `t.edit`, `t.search`
- `t.loading`
- `t.yes`, `t.no`, `t.confirm`
- `t.successAdd`, `t.errorAdd`
- `t.errorConnection`

---

## مثال كامل: ترجمة ProgramManager

```tsx
import { useTranslation } from '../hooks/useTranslation';

export const ProgramManager = ({ programs, universities, onAddProgram }) => {
  const { t, translateDegree } = useTranslation();
  
  return (
    <div>
      <h2>{t.programsTitle}</h2>
      <button onClick={() => setModalOpen(true)}>
        {t.addProgram}
      </button>
      
      {/* في الجدول */}
      <th>{t.programName}</th>
      <th>{t.programDegree}</th>
      <th>{t.programFee}</th>
      
      {/* عرض الدرجة */}
      <td>{translateDegree(program.degree)}</td>
      
      {/* في النموذج */}
      <label>{t.programName}</label>
      <input placeholder={t.programName} />
      
      <select>
        <option value="Bachelor">{t.bachelor}</option>
        <option value="Master">{t.master}</option>
        <option value="PhD">{t.phd}</option>
      </select>
      
      <button type="submit">{t.save}</button>
      <button onClick={closeModal}>{t.cancel}</button>
    </div>
  );
};
```

---

## ملاحظات مهمة

1. **استخدم `dir` للعناصر الرئيسية** إذا كان المكون يحتوي على نصوص كثيرة
2. **لا تنسى ترجمة رسائل `alert()`** - استخدم `t.successAdd`, `t.errorAdd`, إلخ
3. **التواريخ**: استخدم `toLocaleString()` مع اللغة المناسبة
4. **الأرقام**: يمكن استخدام `toLocaleString()` أيضاً للأرقام

---

## الاختبار

بعد ترجمة كل مكون:

1. شغل التطبيق: `npm run dev`
2. سجل دخول
3. غير اللغة من القائمة العلوية
4. تأكد من:
   - تغيير جميع النصوص
   - عمل الأزرار والنماذج
   - ظهور الرسائل بشكل صحيح
   - عدم وجود أخطاء في Console

---

**جميع الترجمات جاهزة ومتوفرة - فقط استبدل النصوص!** 🚀
