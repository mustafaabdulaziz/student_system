# Çalıştırma – Run Instructions

## Klasör yapısı (reorganize sonrası)

- **student_system/backend** – Flask API (`python run.py`)
- **student_system/frontend** – Vite/React (`npm run dev`)
- **student_system/uploads** – Yüklenen dosyalar (backend bu klasörü kullanır)

## Reorganize (ilk kez yapılacaksa)

Projeyi bu yapıya getirmek için proje kökünde (student_system) PowerShell’de:

```powershell
.\reorganize.ps1
```

Bu betik:
- `frontend/` klasörünü oluşturur ve tüm frontend dosya/klasörlerini oraya taşır.
- Kökte `uploads/` oluşturur; `backend/uploads/` içindeki mevcut dosyaları oraya taşır.

## Backend çalıştırma

```bash
cd backend
python run.py
```

Varsayılan: http://127.0.0.1:5000

## Frontend çalıştırma

```bash
cd frontend
npm install
npm run dev
```

Varsayılan: http://localhost:5173 (Vite, `/api` isteklerini 5000 portuna proxy eder)

## Özet

| Ne        | Nereden çalıştırılır | Komut        |
|----------|----------------------|--------------|
| Backend  | `student_system/backend`  | `python run.py` |
| Frontend | `student_system/frontend` | `npm install` sonra `npm run dev` |
