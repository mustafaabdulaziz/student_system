# Quick Start Guide - دليل البدء السريع

## للمستخدم الجديد - For New Users

### 1. المتطلبات - Requirements
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+

### 2. إعداد قاعدة البيانات - Database Setup
```bash
# إنشاء قاعدة البيانات
psql -U postgres
CREATE DATABASE studentdb;
\q
```

### 3. إعداد Backend
```bash
# إنشاء وتفعيل البيئة الافتراضية
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows PowerShell

# تثبيت المكتبات
pip install -r backend/requirements.txt
pip install flask-cors

# إنشاء ملف .env في مجلد backend
# أضف: DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/studentdb
```

### 4. إعداد Frontend
```bash
# إذا قمت بتشغيل reorganize.ps1 فانتقل إلى مجلد frontend
cd frontend
npm install
```

### 5. التشغيل - Run
```bash
# Terminal 1 - Backend
cd backend
python run.py

# Terminal 2 - Frontend (من مجلد frontend إذا كان المشروع منظمًا)
cd frontend
npm run dev
```

**ملاحظة:** لتنظيم المشروع بالهيكل `backend/`, `frontend/`, `uploads/` شغّل من الجذر: `.\reorganize.ps1` ثم راجع [RUN.md](./RUN.md).

### 6. تسجيل الدخول - Login
- URL: http://localhost:5173
- Email: admin@admin.com
- Password: admin

---

## للمطورين - For Developers

راجع الملف الكامل: [SETUP_GUIDE.md](./SETUP_GUIDE.md)

---

## الملفات المهمة - Important Files

- `backend/requirements.txt` - مكتبات Python
- `package.json` - مكتبات Node.js
- `backend/.env` - إعدادات قاعدة البيانات (يجب إنشاؤه)
- `backend/.env.example` - مثال لملف .env
