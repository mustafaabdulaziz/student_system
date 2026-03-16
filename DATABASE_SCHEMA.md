# Database Schema Documentation
## توثيق بنية قاعدة البيانات

هذا الملف يوثق بنية قاعدة البيانات الكاملة للنظام.

---

## الجداول - Tables

### 1. users (المستخدمون)

يحتوي على معلومات المستخدمين (الأدمن والوكلاء والمستخدمين العاديين).

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | String | PRIMARY KEY | معرّف المستخدم الفريد |
| name | String | NOT NULL | اسم المستخدم |
| email | String | UNIQUE, NOT NULL | البريد الإلكتروني |
| password | String | NOT NULL | كلمة المرور |
| role | String | NOT NULL, DEFAULT='ADMIN' | دور المستخدم (ADMIN/AGENT/USER) |
| phone | String | NULLABLE | رقم الهاتف |
| country_code | String | NULLABLE | كود الدولة للهاتف |

**العلاقات:**
- له علاقة one-to-many مع `applications` (التطبيقات)
- له علاقة one-to-many مع `notifications` (الإشعارات)

---

### 2. students (الطلاب)

يحتوي على معلومات الطلاب المسجلين.

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | String | PRIMARY KEY | معرّف الطالب الفريد |
| first_name | String | NOT NULL | الاسم الأول |
| last_name | String | NOT NULL | اسم العائلة |
| passport_number | String | UNIQUE, NOT NULL | رقم جواز السفر |
| father_name | String | NOT NULL | اسم الأب |
| mother_name | String | NOT NULL | اسم الأم |
| gender | String | NOT NULL | الجنس |
| phone | String | NOT NULL | رقم الهاتف |
| email | String | NOT NULL | البريد الإلكتروني |
| nationality | String | NOT NULL | الجنسية |
| degree_target | String | NOT NULL | الدرجة المستهدفة |
| dob | String | NOT NULL | تاريخ الميلاد |
| residence_country | String | NOT NULL | بلد الإقامة |
| user_id | String | FOREIGN KEY (users.id), NULLABLE | معرّف الوكيل المسؤول |

**العلاقات:**
- له علاقة many-to-one مع `users` (الوكيل المسؤول)
- له علاقة one-to-many مع `applications` (الطلبات)

---

### 3. universities (الجامعات)

يحتوي على معلومات الجامعات المتاحة.

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | String | PRIMARY KEY | معرّف الجامعة الفريد |
| name | String | NOT NULL | اسم الجامعة |
| website | String | NOT NULL | الموقع الإلكتروني |
| country | String | NOT NULL | البلد |
| description | Text | NOT NULL | وصف الجامعة |

**العلاقات:**
- له علاقة one-to-many مع `programs` (البرامج)

---

### 4. programs (البرامج الدراسية)

يحتوي على البرامج الدراسية المتاحة في الجامعات.

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | String | PRIMARY KEY | معرّف البرنامج الفريد |
| university_id | String | FOREIGN KEY (universities.id), NOT NULL | معرّف الجامعة |
| name | String | NOT NULL | اسم البرنامج |
| degree | String | NOT NULL | نوع الدرجة (بكالوريوس/ماجستير/دكتوراه) |
| language | String | NOT NULL | لغة التدريس |
| years | Integer | NOT NULL | عدد السنوات |
| deadline | String | NOT NULL | الموعد النهائي للتقديم |
| fee | Float | NOT NULL | الرسوم الدراسية |
| currency | String | NOT NULL, DEFAULT='USD' | العملة |
| description | Text | NULLABLE | وصف البرنامج |

**العلاقات:**
- له علاقة many-to-one مع `universities` (الجامعة)
- له علاقة one-to-many مع `applications` (الطلبات)

---

### 5. applications (طلبات التقديم)

يحتوي على طلبات التقديم للبرامج الدراسية.

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | String | PRIMARY KEY | معرّف الطلب الفريد |
| student_id | String | FOREIGN KEY (students.id), NOT NULL | معرّف الطالب |
| program_id | String | FOREIGN KEY (programs.id), NOT NULL | معرّف البرنامج |
| status | String | NOT NULL | حالة الطلب (PENDING/APPROVED/REJECTED) |
| semester | String | NOT NULL | الفصل الدراسي |
| created_at | String | NOT NULL | تاريخ الإنشاء |
| files | ARRAY(String) | NULLABLE | قائمة الملفات المرفقة |
| user_id | String | FOREIGN KEY (users.id), NULLABLE | معرّف الوكيل المسؤول |

**العلاقات:**
- له علاقة many-to-one مع `students` (الطالب)
- له علاقة many-to-one مع `programs` (البرنامج)
- له علاقة many-to-one مع `users` (الوكيل)
- له علاقة one-to-many مع `application_messages` (الرسائل)

---

### 6. application_messages (رسائل الطلبات)

يحتوي على الرسائل المتبادلة حول طلبات التقديم.

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | String | PRIMARY KEY | معرّف الرسالة الفريد |
| application_id | String | FOREIGN KEY (applications.id), NOT NULL | معرّف الطلب |
| sender | String | NOT NULL | المرسل (ADMIN/USER) |
| message | Text | NOT NULL | محتوى الرسالة |
| created_at | String | NOT NULL | تاريخ الإرسال |

**العلاقات:**
- له علاقة many-to-one مع `applications` (الطلب)

---

### 7. notifications (الإشعارات)

يحتوي على إشعارات المستخدمين.

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | String | PRIMARY KEY | معرّف الإشعار الفريد |
| user_id | String | FOREIGN KEY (users.id), NOT NULL | معرّف المستخدم |
| title | String | NOT NULL | عنوان الإشعار |
| message | String | NOT NULL | محتوى الإشعار |
| link | String | NULLABLE | رابط ذو صلة |
| is_read | Boolean | DEFAULT=False | هل تم قراءة الإشعار |
| created_at | String | NOT NULL | تاريخ الإنشاء |
| type | String | NOT NULL | نوع الإشعار (MESSAGE/STATUS) |

**العلاقات:**
- له علاقة many-to-one مع `users` (المستخدم)

---

## مخطط العلاقات - Entity Relationship Diagram

```
users (1) ----< (many) applications
users (1) ----< (many) notifications
students (1) ----< (many) applications
students (many) >---- (1) users (agent)
universities (1) ----< (many) programs
programs (1) ----< (many) applications
applications (1) ----< (many) application_messages
```

---

## البيانات الافتراضية - Default Data

عند التشغيل الأول، يتم إنشاء حساب أدمن افتراضي:

```sql
INSERT INTO users (id, name, email, password, role)
VALUES ('1', 'admin', 'admin@admin.com', 'admin', 'ADMIN');
```

**⚠️ تحذير أمني**: يُنصح بشدة بتغيير كلمة المرور الافتراضية بعد أول تسجيل دخول!

---

## ملاحظات مهمة - Important Notes

### 1. إنشاء الجداول التلقائي
البرنامج يقوم بإنشاء جميع الجداول تلقائياً عند التشغيل الأول باستخدام:
```python
db.create_all()
```

### 2. الترحيلات (Migrations)
البرنامج يحتوي على منطق بسيط للترحيل في `run.py` لإضافة الأعمدة الجديدة:
- `phone` و `country_code` في جدول `users`

### 3. أنواع البيانات
- **String**: نص متغير الطول
- **Text**: نص طويل
- **Integer**: أرقام صحيحة
- **Float**: أرقام عشرية
- **Boolean**: قيم منطقية (True/False)
- **ARRAY(String)**: مصفوفة من النصوص (PostgreSQL specific)

### 4. القيود (Constraints)
- **PRIMARY KEY**: مفتاح أساسي فريد
- **FOREIGN KEY**: مفتاح خارجي يربط بجدول آخر
- **UNIQUE**: قيمة فريدة في الجدول
- **NOT NULL**: لا يمكن أن تكون القيمة فارغة
- **DEFAULT**: قيمة افتراضية

---

## استعلامات مفيدة - Useful Queries

### عرض جميع الجداول
```sql
\dt
```

### عرض بنية جدول معين
```sql
\d users
\d students
\d applications
```

### عدد السجلات في كل جدول
```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM students;
SELECT COUNT(*) FROM applications;
```

### حذف جميع البيانات (احذر!)
```sql
TRUNCATE users, students, universities, programs, applications, application_messages, notifications CASCADE;
```

### إعادة تعيين قاعدة البيانات
```sql
DROP DATABASE studentdb;
CREATE DATABASE studentdb;
```

---

## النسخ الاحتياطي والاستعادة

### إنشاء نسخة احتياطية
```bash
pg_dump -U postgres studentdb > backup_$(date +%Y%m%d).sql
```

### استعادة من نسخة احتياطية
```bash
psql -U postgres studentdb < backup_20260217.sql
```

### تصدير جدول معين
```bash
pg_dump -U postgres -t students studentdb > students_backup.sql
```
