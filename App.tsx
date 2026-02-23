import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { useTranslation } from './hooks/useTranslation';
import { Dashboard } from './components/Dashboard';
import { UniversityManager } from './components/UniversityManager';
import { ProgramManager } from './components/ProgramManager';
import { StudentManager } from './components/StudentManager';
import { ApplicationManager } from './components/ApplicationManager';
import { UserManager } from './components/UserManager';
import { Login } from './components/Login';
import {
  User,
  University,
  Program,
  Student,
  Application,
  AppState,
  UserRole,
  ApplicationStatus
} from './types';

const INITIAL_STATE: AppState = {
  users: [],
  universities: [],
  programs: [],
  students: [],
  applications: [],
  currentUser: null
};

export default function App() {
  const { t } = useTranslation();
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [activePage, setActivePage] = useState('dashboard');
  const [prefillStudentIdForApp, setPrefillStudentIdForApp] = useState<string | null>(null);
  const [targetApplicationId, setTargetApplicationId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedSession = localStorage.getItem('userSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        const now = Date.now();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        if (now - session.timestamp < TWENTY_FOUR_HOURS) {
          setState(prev => ({ ...prev, currentUser: session.user }));
        } else {
          localStorage.removeItem('userSession');
        }
      } catch (e) {
        localStorage.removeItem('userSession');
      }
    }
    setIsLoaded(true);
  }, []);



  const handleLogin = (user: User) => {
    const session = {
      user: user,
      timestamp: Date.now()
    };
    localStorage.setItem('userSession', JSON.stringify(session));
    setState(prev => ({
      ...prev,
      currentUser: user
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('userSession');
    setState(prev => ({ ...prev, currentUser: null }));
  };

  const openCreateApplicationForStudent = (studentId: string) => {
    setPrefillStudentIdForApp(studentId);
    setActivePage('applications');
  };

  const openApplicationDetails = (appId: string) => {
    setTargetApplicationId(appId);
    setActivePage('applications');
  };

  // State Updates
  const addUniversity = async (uni: University) => {
    try {
      const res = await fetch('/api/universities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uni)
      });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({ ...prev, universities: [...prev.universities, { ...uni, id: data.id }] }));
      } else {
        alert(data.message || t.errorAdd);
      }
    } catch (err) {
      alert(t.errorConnection);
    }
  };

  const editUniversity = async (uni: University) => {
    try {
      const res = await fetch(`/api/universities/${uni.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uni)
      });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({
          ...prev,
          universities: prev.universities.map(u => u.id === uni.id ? uni : u)
        }));
      } else {
        alert(data.message || t.errorUpdate);
      }
    } catch (err) {
      alert(t.errorConnection);
    }
  };

  const deleteUniversity = async (id: string) => {
    try {
      const res = await fetch(`/api/universities/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({
          ...prev,
          universities: prev.universities.filter(u => u.id !== id),
          programs: prev.programs.filter(p => p.universityId !== id)
        }));
      } else {
        alert(data.message || t.errorDelete);
      }
    } catch (err) {
      alert(t.errorConnection);
    }
  };

  const deleteProgram = async (id: string) => {
    try {
      const res = await fetch(`/api/programs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({ ...prev, programs: prev.programs.filter(p => p.id !== id) }));
      } else {
        alert(data.message || t.errorDelete);
      }
    } catch (err) {
      alert(t.errorConnection);
    }
  };

  const addProgram = async (prog: Program) => {
    try {
      const res = await fetch('/api/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prog)
      });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({ ...prev, programs: [...prev.programs, { ...prog, id: data.id, currency: (prog as any).currency || 'USD' }] }));
      } else {
        alert(data.message || t.errorAdd);
      }
    } catch (err) {
      alert(t.errorConnection);
    }
  };

  const editProgram = async (prog: Program) => {
    try {
      const res = await fetch(`/api/programs/${prog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prog)
      });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({
          ...prev,
          programs: prev.programs.map(p => p.id === prog.id ? prog : p)
        }));
      } else {
        alert(data.message || t.errorUpdate);
      }
    } catch (err) {
      alert(t.errorConnection);
    }
  };

  const addStudent = async (stud: Student) => {
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...stud,
          role: state.currentUser?.role,
          user_id: state.currentUser?.id
        })
      });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({ ...prev, students: [...prev.students, { ...stud, id: data.id }] }));
        return data.id;
      } else {
        alert(data.message || 'فشل إضافة الطالب');
      }
    } catch (err) {
      alert('خطأ في الاتصال بالخادم');
    }
    return null;
  };

  const addApplication = async (app: Application, files?: FileList | null) => {
    const formData = new FormData();
    formData.append('studentId', app.studentId);
    formData.append('programId', app.programId);
    formData.append('status', app.status);
    formData.append('semester', app.semester);
    if (files) {
      Array.from(files).forEach(f => formData.append('files', f));
    }
    // Append current user info for tracking
    if (state.currentUser) {
      formData.append('user_id', state.currentUser.id);
      formData.append('role', state.currentUser.role);
    }
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        const savedFiles = data.files || [];
        setState(prev => ({ ...prev, applications: [...prev.applications, { ...app, id: data.id, files: savedFiles }] }));
      } else {
        alert(data.message || 'فشل رفع الطلب');
      }
    } catch (err) {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  const updateAppStatus = async (id: string, status: ApplicationStatus) => {
    try {
      const res = await fetch(`/api/applications/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({
          ...prev,
          applications: prev.applications.map(a => a.id === id ? { ...a, status } : a)
        }));
      } else {
        alert(data.message || 'فشل تحديث الحالة');
      }
    } catch (err) {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  const addUser = async (user: User & { password?: string }) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({ ...prev, users: [...prev.users, { ...user, id: data.id }] }));
      } else {
        alert(data.message || t.errorAddUser);
      }
    } catch (err) {
      alert(t.errorConnection);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== id) }));
      } else {
        const data = await res.json();
        alert(data.message || 'فشل حذف المستخدم');
      }
    } catch (err) {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  React.useEffect(() => {
    if (!state.currentUser) return;
    const fetchAll = async () => {
      try {
        // إعداد روابط الطلبات حسب نوع المستخدم
        let studentsUrl = '/api/students';
        let applicationsUrl = '/api/applications';
        if (state.currentUser.role === UserRole.AGENT) {
          studentsUrl += `?role=agent&user_id=${state.currentUser.id}`;
          applicationsUrl += `?role=agent&user_id=${state.currentUser.id}`;
        }
        const endpoints = [
          '/api/universities',
          '/api/programs',
          studentsUrl,
          applicationsUrl
        ];
        if (state.currentUser.role === UserRole.ADMIN) {
          endpoints.push('/api/users');
        }
        const responses = await Promise.all(endpoints.map(e => fetch(e).then(r => r.json())));
        setState(prev => ({
          ...prev,
          universities: responses[0],
          programs: responses[1],
          students: responses[2],
          applications: responses[3],
          users: state.currentUser?.role === UserRole.ADMIN ? responses[4] : []
        }));
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchAll();
  }, [state.currentUser]);

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">{t.loading}</div>;
  }

  if (!state.currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard
            students={state.students}
            applications={state.applications}
            programs={state.programs}
            universitiesCount={state.universities.length}
          />
        );
      case 'universities':
        return <UniversityManager universities={state.universities} programs={state.programs} onAddUniversity={addUniversity} onEditUniversity={editUniversity} onDeleteUniversity={deleteUniversity} currentUser={state.currentUser} />;
      case 'programs':
        return <ProgramManager programs={state.programs} universities={state.universities} onAddProgram={addProgram} onEditProgram={editProgram} onDeleteProgram={deleteProgram} currentUser={state.currentUser} />;
      case 'students':
        return <StudentManager students={state.students} applications={state.applications} programs={state.programs} universities={state.universities} onAddStudent={addStudent} onCreateApplicationForStudent={openCreateApplicationForStudent} onViewApplication={openApplicationDetails} currentUser={state.currentUser} />;
      case 'applications':
        return <ApplicationManager applications={state.applications} students={state.students} programs={state.programs} universities={state.universities} onAddApplication={addApplication} onUpdateStatus={updateAppStatus} initialStudentId={prefillStudentIdForApp} clearInitialStudent={() => setPrefillStudentIdForApp(null)} targetApplicationId={targetApplicationId} clearTargetApplication={() => setTargetApplicationId(null)} currentUser={state.currentUser} />;
      case 'account':
        return <UserManager users={state.users} currentUser={state.currentUser} onAddUser={addUser} onDeleteUser={deleteUser} />;
      default:
        return (
          <Dashboard
            students={state.students}
            applications={state.applications}
            programs={state.programs}
            universitiesCount={state.universities.length}
          />
        );
    }
  };

  return (
    <Layout
      activePage={activePage}
      onNavigate={setActivePage}
      onNavigateToApp={openApplicationDetails}
      currentUser={state.currentUser}
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
}