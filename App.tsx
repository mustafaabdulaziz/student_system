import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { useTranslation } from './hooks/useTranslation';
import { Dashboard } from './components/Dashboard';
import { UniversityManager } from './components/UniversityManager';
import { ProgramManager } from './components/ProgramManager';
import { StudentManager } from './components/StudentManager';
import { ApplicationManager } from './components/ApplicationManager';
import { AccountProfile } from './components/AccountProfile';
import { UserManagementPage } from './components/UserManagementPage';
import { Login } from './components/Login';
import {
  User,
  University,
  Program,
  Student,
  Application,
  Period,
  AppState,
  UserRole,
  ApplicationStatus
} from './types';
import { PeriodManager } from './components/PeriodManager';

const INITIAL_STATE: AppState = {
  users: [],
  universities: [],
  programs: [],
  students: [],
  applications: [],
  periods: [],
  currentUser: null
};

const PATH_TO_PAGE: Record<string, string> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/universities': 'universities',
  '/programs': 'programs',
  '/students': 'students',
  '/applications': 'applications',
  '/periods': 'periods',
  '/users': 'users',
  '/account': 'account'
};

const PAGE_TO_PATH: Record<string, string> = {
  dashboard: '/dashboard',
  universities: '/universities',
  programs: '/programs',
  students: '/students',
  applications: '/applications',
  periods: '/periods',
  users: '/users',
  account: '/account'
};

function getPageFromPath(pathname: string): string {
  const normalized = pathname.replace(/\/$/, '') || '/';
  return PATH_TO_PAGE[normalized] ?? 'dashboard';
}

function getPathFromPage(page: string): string {
  return PAGE_TO_PATH[page] ?? '/dashboard';
}

export default function App() {
  const { t } = useTranslation();
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [activePage, setActivePage] = useState('dashboard');
  const [prefillStudentIdForApp, setPrefillStudentIdForApp] = useState<string | null>(null);
  const [targetApplicationId, setTargetApplicationId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const navigateTo = (page: string) => {
    setActivePage(page);
    if (typeof window !== 'undefined') {
      const path = getPathFromPage(page);
      if (window.location.pathname !== path) {
        window.history.pushState({ page }, '', path);
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pathname = window.location.pathname || '/';
    const page = getPageFromPath(pathname);
    setActivePage(page);
    if (pathname === '/' || pathname === '') {
      window.history.replaceState({ page: 'dashboard' }, '', '/dashboard');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      setActivePage(getPageFromPath(window.location.pathname || '/'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  useEffect(() => {
    if (state.currentUser && state.currentUser.role !== UserRole.ADMIN && (activePage === 'users' || activePage === 'periods')) {
      setActivePage('dashboard');
      if (typeof window !== 'undefined') {
        window.history.replaceState({ page: 'dashboard' }, '', '/dashboard');
      }
    }
  }, [state.currentUser, activePage]);

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
    navigateTo('applications');
  };

  const openApplicationDetails = (appId: string) => {
    setTargetApplicationId(appId);
    navigateTo('applications');
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

  const updateStudent = async (student: Student) => {
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student)
      });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({
          ...prev,
          students: prev.students.map(s => s.id === student.id ? student : s)
        }));
      } else {
        alert(data.message || 'Failed to update student');
      }
    } catch (err) {
      alert('Connection error');
    }
  };

  const addApplication = async (app: Application, files?: FileList | null): Promise<string | null> => {
    const formData = new FormData();
    formData.append('studentId', app.studentId);
    formData.append('programId', app.programId);
    if (app.periodId) formData.append('periodId', app.periodId);
    formData.append('status', app.status);
    formData.append('semester', app.semester);
    if (files) {
      Array.from(files).forEach(f => formData.append('files', f));
    }
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
        setState(prev => ({
          ...prev,
          applications: [...prev.applications, {
            ...app,
            id: data.id,
            files: savedFiles,
            createdAt: data.createdAt != null ? data.createdAt : app.createdAt
          }]
        }));
        return data.id;
      }
      alert(data.message || 'فشل رفع الطلب');
      return null;
    } catch (err) {
      alert('خطأ في الاتصال بالخادم');
      return null;
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

  const addPeriod = async (period: Omit<Period, 'id'>) => {
    try {
      const res = await fetch('/api/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(period)
      });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({ ...prev, periods: [...prev.periods, { ...period, id: data.id }] }));
        return data.id;
      }
      alert(data.message || 'Failed to add period');
    } catch (err) {
      alert('Connection error');
    }
    return null;
  };

  const editPeriod = async (period: Period) => {
    try {
      const res = await fetch(`/api/periods/${period.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(period)
      });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({ ...prev, periods: prev.periods.map(p => p.id === period.id ? period : p) }));
      } else {
        alert(data.message || 'Failed to update period');
      }
    } catch (err) {
      alert('Connection error');
    }
  };

  const deletePeriod = async (id: string) => {
    try {
      const res = await fetch(`/api/periods/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setState(prev => ({ ...prev, periods: prev.periods.filter(p => p.id !== id) }));
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete period');
      }
    } catch (err) {
      alert('Connection error');
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
        setState(prev => ({ ...prev, users: [...prev.users, { ...user, id: data.id, active: true }] }));
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

  const editUser = async (user: User & { password?: string }) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          countryCode: user.countryCode,
          ...(user.password ? { password: user.password } : {})
        })
      });
      const data = await res.json();
      if (res.ok) {
        const updated = { ...user, password: undefined };
        setState(prev => {
          const nextUsers = prev.users.map(u => u.id === user.id ? { ...u, ...updated } : u);
          const isCurrentUser = prev.currentUser?.id === user.id;
          const nextCurrentUser = isCurrentUser ? { ...prev.currentUser, ...updated } : prev.currentUser;
          if (isCurrentUser) {
            const session = localStorage.getItem('userSession');
            if (session) {
              try {
                const parsed = JSON.parse(session);
                localStorage.setItem('userSession', JSON.stringify({ ...parsed, user: nextCurrentUser, timestamp: parsed.timestamp }));
              } catch (_) {}
            }
          }
          return { ...prev, users: nextUsers, currentUser: nextCurrentUser };
        });
      } else {
        alert(data.message || t.errorUpdate);
      }
    } catch (err) {
      alert(t.errorConnection);
    }
  };

  const setUserActive = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active })
      });
      if (res.ok) {
        setState(prev => ({ ...prev, users: prev.users.map(u => u.id === id ? { ...u, active } : u) }));
      } else {
        const data = await res.json();
        alert(data.message || t.errorUpdate);
      }
    } catch (err) {
      alert(t.errorConnection);
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
          applicationsUrl,
          '/api/periods'
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
          periods: responses[4] || [],
          users: state.currentUser?.role === UserRole.ADMIN ? (responses[5] || []).map((u: any) => ({ ...u, active: u.active !== false })) : []
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
        return <ProgramManager programs={state.programs} universities={state.universities} periods={state.periods} onAddProgram={addProgram} onEditProgram={editProgram} onDeleteProgram={deleteProgram} currentUser={state.currentUser} />;
      case 'students':
        return <StudentManager students={state.students} applications={state.applications} programs={state.programs} universities={state.universities} onAddStudent={addStudent} onEditStudent={updateStudent} onCreateApplicationForStudent={openCreateApplicationForStudent} onViewApplication={openApplicationDetails} currentUser={state.currentUser} />;
      case 'applications':
        return <ApplicationManager applications={state.applications} students={state.students} programs={state.programs} universities={state.universities} periods={state.periods} users={state.users} onAddApplication={addApplication} onUpdateStatus={updateAppStatus} initialStudentId={prefillStudentIdForApp} clearInitialStudent={() => setPrefillStudentIdForApp(null)} targetApplicationId={targetApplicationId} clearTargetApplication={() => setTargetApplicationId(null)} currentUser={state.currentUser} />;
      case 'periods':
        if (state.currentUser?.role !== UserRole.ADMIN) {
          return (
            <Dashboard
              students={state.students}
              applications={state.applications}
              programs={state.programs}
              universitiesCount={state.universities.length}
            />
          );
        }
        return (
          <PeriodManager
            periods={state.periods}
            onAddPeriod={addPeriod}
            onEditPeriod={editPeriod}
            onDeletePeriod={deletePeriod}
          />
        );
      case 'account':
        return (
          <AccountProfile
            currentUser={state.currentUser}
            onProfileUpdated={(user) => {
              setState(prev => ({
                ...prev,
                currentUser: user,
                users: prev.users.map(u => (u.id === user.id ? { ...u, ...user } : u))
              }));
              const session = localStorage.getItem('userSession');
              if (session) {
                try {
                  const parsed = JSON.parse(session);
                  localStorage.setItem('userSession', JSON.stringify({ ...parsed, user, timestamp: parsed.timestamp }));
                } catch (_) {}
              }
            }}
          />
        );
      case 'users':
        if (state.currentUser?.role !== UserRole.ADMIN) {
          return (
            <Dashboard
              students={state.students}
              applications={state.applications}
              programs={state.programs}
              universitiesCount={state.universities.length}
            />
          );
        }
        return (
          <UserManagementPage
            users={state.users}
            currentUser={state.currentUser}
            onAddUser={addUser}
            onEditUser={editUser}
            onDeleteUser={deleteUser}
            onSetUserActive={setUserActive}
          />
        );
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
      onNavigate={navigateTo}
      onNavigateToApp={openApplicationDetails}
      currentUser={state.currentUser}
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
}