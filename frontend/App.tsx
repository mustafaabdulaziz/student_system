import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
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
  AgencyCompany,
  PaymentSource,
  AppState,
  UserRole,
  ApplicationStatus,
  ApplicationListFilters
} from './types';
import { PeriodManager } from './components/PeriodManager';
import { PaymentsManager } from './components/PaymentsManager';
import { PaymentDashboard } from './components/PaymentDashboard';
import { AgencyCompanyManager } from './components/AgencyCompanyManager';
import { PaymentSourceManager } from './components/PaymentSourceManager';
import { NotificationsPage } from './components/NotificationsPage';
import { NotificationProvider } from './contexts/NotificationContext';

const NewsAndUpdates = lazy(() => import('./components/NewsAndUpdates').then(m => ({ default: m.NewsAndUpdates })));

const INITIAL_STATE: AppState = {
  users: [],
  universities: [],
  programs: [],
  students: [],
  applications: [],
  periods: [],
  agencyCompanies: [],
  paymentSources: [],
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
  '/incoming-payments': 'incoming-payments',
  '/outgoing-payments': 'outgoing-payments',
  '/payment-dashboard': 'payment-dashboard',
  '/agency-companies': 'agency-companies',
  '/payment-sources': 'payment-sources',
  '/news': 'news',
  '/account': 'account',
  '/notifications': 'notifications'
};

const PAGE_TO_PATH: Record<string, string> = {
  dashboard: '/dashboard',
  universities: '/universities',
  programs: '/programs',
  students: '/students',
  applications: '/applications',
  periods: '/periods',
  users: '/users',
  'incoming-payments': '/incoming-payments',
  'outgoing-payments': '/outgoing-payments',
  'payment-dashboard': '/payment-dashboard',
  'agency-companies': '/agency-companies',
  'payment-sources': '/payment-sources',
  news: '/news',
  account: '/account',
  notifications: '/notifications'
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
  const [targetStudentId, setTargetStudentId] = useState<string | null>(null);
  const [applicationListFilters, setApplicationListFilters] = useState<ApplicationListFilters | null>(null);
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
    const restoreSession = async () => {
      const savedSession = localStorage.getItem('userSession');
      if (savedSession) {
        try {
          const stored = JSON.parse(savedSession);
          const now = Date.now();
          const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

          if (now - stored.timestamp < TWENTY_FOUR_HOURS) {
            const response = await fetch('/api/session');
            const data = await response.json();
            if (response.ok && data.user) {
              const nextSession = { user: data.user, timestamp: stored.timestamp };
              localStorage.setItem('userSession', JSON.stringify(nextSession));
              setState(prev => ({ ...prev, currentUser: data.user }));
            } else {
              localStorage.removeItem('userSession');
            }
          } else {
            localStorage.removeItem('userSession');
          }
        } catch {
          localStorage.removeItem('userSession');
        }
      }
      setIsLoaded(true);
    };
    void restoreSession();
  }, []);

  useEffect(() => {
    const role = state.currentUser?.role;
    const shouldBlockPage = (
      (role !== UserRole.ADMIN && (
        activePage === 'users' ||
        activePage === 'periods' ||
        activePage === 'incoming-payments' ||
        activePage === 'outgoing-payments' ||
        activePage === 'payment-dashboard' ||
        activePage === 'agency-companies' ||
        activePage === 'payment-sources'
      ))
    );
    if (state.currentUser && shouldBlockPage) {
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
    void fetch('/api/logout', { method: 'POST' }).catch(() => undefined);
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

  const openStudentDetails = (studentId: string) => {
    setTargetStudentId(studentId);
    navigateTo('students');
  };

  const openApplicationsWithFilters = (filters: ApplicationListFilters) => {
    setTargetApplicationId(null);
    setPrefillStudentIdForApp(null);
    setApplicationListFilters(filters);
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

  const editUniversity = async (uni: University): Promise<boolean> => {
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
        return true;
      } else {
        alert(data.message || t.errorUpdate);
        return false;
      }
    } catch (err) {
      alert(t.errorConnection);
      return false;
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

  const deleteProgram = async (id: string): Promise<boolean> => {
    try {
      const role = state.currentUser?.role ?? '';
      const res = await fetch(`/api/programs/${id}?role=${encodeURIComponent(role)}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({ ...prev, programs: prev.programs.filter(p => p.id !== id) }));
        return true;
      }
      if (data.code === 'PROGRAM_HAS_APPLICATIONS') {
        alert(t.programDeleteHasApplications);
      } else {
        alert(data.message || t.errorDelete);
      }
      return false;
    } catch {
      alert(t.errorConnection);
      return false;
    }
  };

  const addProgram = async (prog: Program) => {
    try {
      const res = await fetch('/api/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prog, role: state.currentUser?.role })
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

  const editProgram = async (prog: Program, opts?: { silent?: boolean }): Promise<boolean> => {
    try {
      const res = await fetch(`/api/programs/${prog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prog, role: state.currentUser?.role })
      });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({
          ...prev,
          programs: prev.programs.map(p => p.id === prog.id ? prog : p)
        }));
        return true;
      }
      if (!opts?.silent) alert(data.message || t.errorUpdate);
      return false;
    } catch {
      if (!opts?.silent) alert(t.errorConnection);
      return false;
    }
  };

  const addStudent = async (stud: Student) => {
    try {
      const userIdToSend = stud.userId ?? state.currentUser?.id ?? '';
      const actorUserId = state.currentUser?.id ?? '';
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...stud,
          role: state.currentUser?.role,
          user_id: userIdToSend,
          actorUserId
        })
      });
      let data: {
        id?: string;
        createdAt?: string;
        updatedAt?: string;
        createdBy?: string;
        createdByName?: string | null;
        message?: string;
        code?: string;
      } = {};
      try {
        data = await res.json();
      } catch {
        // non-JSON error body
      }
      if (res.ok) {
        const creator = data.createdBy
          ? state.users.find(u => u.id === data.createdBy)
          : (actorUserId ? state.users.find(u => u.id === actorUserId) : undefined);
        const newStudent = {
          ...stud,
          id: data.id,
          userId: userIdToSend || undefined,
          createdBy: data.createdBy || actorUserId || undefined,
          createdByName: data.createdByName ?? creator?.name ?? undefined,
          ...(data.createdAt && { createdAt: data.createdAt }),
          ...(data.updatedAt && { updatedAt: data.updatedAt })
        };
        setState(prev => ({ ...prev, students: [...prev.students, newStudent] }));
        return data.id;
      }
      if (data.code === 'passport_exists') {
        alert(t.passportAlreadyExists);
      } else {
        alert(data.message || t.errorAdd);
      }
    } catch (err) {
      alert(t.errorConnection);
    }
    return null;
  };

  const updateStudent = async (student: Student): Promise<Student | undefined> => {
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...student,
          role: state.currentUser?.role
        })
      });
      let data: { updatedAt?: string; message?: string; code?: string } = {};
      try {
        data = await res.json();
      } catch {
        // non-JSON error body
      }
      if (res.ok) {
        const merged: Student = { ...student, ...(data.updatedAt ? { updatedAt: data.updatedAt } : {}) };
        setState(prev => ({
          ...prev,
          students: prev.students.map(s => s.id === student.id ? merged : s)
        }));
        return merged;
      }
      if (data.code === 'passport_exists') {
        alert(t.passportAlreadyExists);
      } else {
        alert(data.message || t.errorUpdate);
      }
    } catch (err) {
      alert(t.errorConnection);
    }
    return undefined;
  };

  const deleteStudent = async (id: string) => {
    try {
      const role = state.currentUser?.role ?? '';
      const res = await fetch(`/api/students/${id}?role=${encodeURIComponent(role)}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        const deletedAppIds = new Set<string>(data.deletedApplicationIds || []);
        setState(prev => ({
          ...prev,
          students: prev.students.filter(s => s.id !== id),
          applications: prev.applications.filter(a => a.studentId !== id && !deletedAppIds.has(a.id))
        }));
      } else {
        alert(data.message || t.errorDelete);
      }
    } catch {
      alert(t.errorConnection);
    }
  };

  const deleteApplication = async (id: string) => {
    try {
      const role = state.currentUser?.role ?? '';
      const res = await fetch(`/api/applications/${id}?role=${encodeURIComponent(role)}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({
          ...prev,
          applications: prev.applications.filter(a => a.id !== id),
          students: data.studentId && data.studentUpdatedAt
            ? prev.students.map(s => s.id === data.studentId ? { ...s, updatedAt: data.studentUpdatedAt } : s)
            : prev.students
        }));
      } else {
        alert(data.message || t.errorDelete);
      }
    } catch {
      alert(t.errorConnection);
    }
  };

  const syncStudentFiles = useCallback((studentId: string, fileUrls: string[]) => {
    setState(prev => ({
      ...prev,
      students: prev.students.map(s => s.id === studentId ? { ...s, files: fileUrls } : s),
      applications: prev.applications.map(a => a.studentId === studentId ? { ...a, files: fileUrls } : a)
    }));
  }, []);

  const appendUploaderToFormData = (fd: FormData) => {
    if (state.currentUser?.id) {
      fd.append('user_id', state.currentUser.id);
      if (state.currentUser.role) fd.append('role', state.currentUser.role);
    }
  };

  const uploadStudentFiles = async (studentId: string, files: File[]): Promise<string[]> => {
    if (!files.length) return [];
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    appendUploaderToFormData(fd);
    try {
      const res = await fetch(`/api/students/${studentId}/files`, { method: 'POST', body: fd });
      let data: { files?: { url: string }[]; message?: string } = {};
      try { data = await res.json(); } catch { /* non-json */ }
      if (res.ok) {
        const urls = (data.files || []).map((x) => x.url);
        if (!urls.length) {
          alert(t.uploadFailed);
          return [];
        }
        syncStudentFiles(studentId, urls);
        return urls;
      }
      alert(data.message || t.uploadFailed);
    } catch {
      alert(t.errorConnection);
    }
    return [];
  };

  /** Same endpoint as başvuru detayı — proven upload path */
  const uploadApplicationFiles = async (applicationId: string, files: File[]): Promise<string[]> => {
    if (!files.length) return [];
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    appendUploaderToFormData(fd);
    try {
      const res = await fetch(`/api/applications/${applicationId}/files`, { method: 'POST', body: fd });
      let data: { files?: { url: string }[]; message?: string; studentId?: string } = {};
      try { data = await res.json(); } catch { /* non-json */ }
      if (res.ok) {
        const urls = (data.files || []).map((x) => x.url);
        if (!urls.length) {
          alert(t.uploadFailed);
          return [];
        }
        if (data.studentId) syncStudentFiles(data.studentId, urls);
        return urls;
      }
      alert(data.message || t.uploadFailed);
    } catch {
      alert(t.errorConnection);
    }
    return [];
  };

  const addApplication = async (app: Application, files?: FileList | File[] | null): Promise<string | null> => {
    const formData = new FormData();
    formData.append('studentId', app.studentId);
    formData.append('programId', app.programId);
    if (app.periodId) formData.append('periodId', app.periodId);
    formData.append('status', app.status);
    formData.append('semester', app.semester);
    if (files && (Array.isArray(files) ? files.length : files.length)) {
      const arr = Array.isArray(files) ? files : Array.from(files);
      arr.forEach(f => formData.append('files', f));
    }
    const userIdToSend = app.userId ?? state.currentUser?.id ?? '';
    if (userIdToSend) formData.append('user_id', userIdToSend);
    if (app.responsibleId) formData.append('responsible_id', app.responsibleId);
    if (app.agencyCompanyId) formData.append('agency_company_id', app.agencyCompanyId);
    if (state.currentUser) formData.append('role', state.currentUser.role);
    if (state.currentUser?.id) formData.append('actorUserId', state.currentUser.id);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        const savedFiles = data.files || [];
        const agentId = app.userId || state.currentUser?.id;
        const agentUser = state.users.find(u => u.id === agentId);
        const responsibleUser = app.responsibleId ? state.users.find(u => u.id === app.responsibleId) : null;
        const agencyCompany = app.agencyCompanyId ? state.agencyCompanies.find(c => c.id === app.agencyCompanyId) : null;
        const fromApi = data.application || {};
        const creatorId = fromApi.createdBy || state.currentUser?.id;
        const creatorUser = creatorId ? state.users.find(u => u.id === creatorId) : undefined;
        const newApp = {
          ...app,
          ...fromApi,
          id: data.id,
          files: savedFiles,
          createdAt: data.createdAt != null ? data.createdAt : app.createdAt,
          updatedAt: data.updatedAt != null ? data.updatedAt : (data.createdAt != null ? data.createdAt : app.createdAt),
          createdBy: creatorId,
          createdByName: fromApi.createdByName ?? creatorUser?.name ?? undefined,
          ...(agentId && { userId: agentId }),
          ...(agentUser && {
            agentName: agentUser.name,
            agentPhone: agentUser.phone,
            agentCountryCode: agentUser.countryCode
          }),
          ...(app.responsibleId && { responsibleId: app.responsibleId, responsibleName: responsibleUser?.name }),
          ...(app.agencyCompanyId && { agencyCompanyId: app.agencyCompanyId, agencyCompanyName: agencyCompany?.name }),
          currency: app.currency && ['USD', 'TRY', 'EUR'].includes(app.currency) ? app.currency : 'USD'
        };
        setState(prev => ({
          ...prev,
          applications: [
            ...prev.applications.map(a =>
              a.studentId === data.studentId && savedFiles.length ? { ...a, files: savedFiles } : a
            ),
            newApp
          ],
          students: data.studentId
            ? prev.students.map(s => s.id === data.studentId ? {
              ...s,
              updatedAt: data.studentUpdatedAt || s.updatedAt,
              ...(savedFiles.length ? { files: savedFiles } : {})
            } : s)
            : prev.students
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
          applications: prev.applications.map(a => a.id === id ? {
            ...a,
            status,
            ...(data.paymentDate !== undefined && { paymentDate: data.paymentDate ?? undefined }),
            ...(data.paymentMonth !== undefined && { paymentMonth: data.paymentMonth ?? undefined }),
            ...(data.updatedAt ? { updatedAt: data.updatedAt } : {})
          } : a),
          students: data.studentId && data.studentUpdatedAt
            ? prev.students.map(s => s.id === data.studentId ? { ...s, updatedAt: data.studentUpdatedAt } : s)
            : prev.students
        }));
      } else {
        alert(data.message || 'فشل تحديث الحالة');
      }
    } catch (err) {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  const updateApplication = async (id: string, payload: {
    status?: ApplicationStatus;
    userId?: string | null;
    responsibleId?: string | null;
    programId?: string | null;
    periodId?: string | null;
    annualPayment?: number | null;
    educationVatRate?: number | null;
    abroadVatRate?: number | null;
    grossCommissionKind?: 'amount' | 'rate';
    grossCommissionRate?: number | null;
    grossCommission?: number | null;
    bonusMax?: number | null;
    bonusMin?: number | null;
    agencyCommissionKind?: 'amount' | 'rate';
    agencyCommissionRate?: number | null;
    agencyCommission?: number | null;
    agencyBonus?: number | null;
    depositSupport?: number | null;
    agencyCompanyId?: string | null;
    currency?: string | null;
    paymentDeserved?: boolean;
    internalDescription?: string | null;
  }, opts?: { silent?: boolean }): Promise<boolean> => {
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          actorUserId: state.currentUser?.id
        })
      });
      const data = await res.json();
      if (res.ok) {
        const responsibleUser = payload.responsibleId != null ? state.users.find(u => u.id === payload.responsibleId) : undefined;
        const agentUser = payload.userId != null ? state.users.find(u => u.id === payload.userId) : undefined;
        const agencyCompany = payload.agencyCompanyId != null ? state.agencyCompanies.find(c => c.id === payload.agencyCompanyId) : undefined;
        setState(prev => ({
          ...prev,
          applications: prev.applications.map(a => a.id === id ? {
            ...a,
            ...(payload.status != null && { status: payload.status }),
            ...(payload.programId !== undefined && { programId: payload.programId || a.programId }),
            ...(payload.periodId !== undefined && { periodId: payload.periodId || undefined }),
            ...(data.programId !== undefined && { programId: data.programId || a.programId }),
            ...(data.periodId !== undefined && { periodId: data.periodId || undefined }),
            ...(payload.userId !== undefined && {
              userId: payload.userId || undefined,
              agentName: agentUser?.name,
              agentPhone: agentUser?.phone,
              agentCountryCode: agentUser?.countryCode
            }),
            ...(payload.responsibleId !== undefined && { responsibleId: payload.responsibleId || undefined, responsibleName: responsibleUser?.name }),
            ...(payload.agencyCompanyId !== undefined && { agencyCompanyId: payload.agencyCompanyId || undefined, agencyCompanyName: agencyCompany?.name }),
            ...(payload.annualPayment !== undefined && { annualPayment: payload.annualPayment ?? undefined }),
            ...(payload.educationVatRate !== undefined && { educationVatRate: payload.educationVatRate ?? undefined }),
            ...(payload.abroadVatRate !== undefined && { abroadVatRate: payload.abroadVatRate ?? undefined }),
            ...(payload.grossCommissionKind !== undefined && { grossCommissionKind: payload.grossCommissionKind }),
            ...(payload.grossCommissionRate !== undefined && { grossCommissionRate: payload.grossCommissionRate ?? undefined }),
            ...(payload.grossCommission !== undefined && { grossCommission: payload.grossCommission ?? undefined }),
            ...(payload.bonusMax !== undefined && { bonusMax: payload.bonusMax ?? undefined }),
            ...(payload.bonusMin !== undefined && { bonusMin: payload.bonusMin ?? undefined }),
            ...(payload.agencyCommissionKind !== undefined && { agencyCommissionKind: payload.agencyCommissionKind }),
            ...(payload.agencyCommissionRate !== undefined && { agencyCommissionRate: payload.agencyCommissionRate ?? undefined }),
            ...(payload.agencyCommission !== undefined && { agencyCommission: payload.agencyCommission ?? undefined }),
            ...(payload.agencyBonus !== undefined && { agencyBonus: payload.agencyBonus ?? undefined }),
            ...(payload.depositSupport !== undefined && { depositSupport: payload.depositSupport ?? undefined }),
            ...(payload.currency !== undefined && { currency: payload.currency ?? undefined }),
            ...(payload.paymentDeserved !== undefined && { paymentDeserved: payload.paymentDeserved }),
            ...(payload.internalDescription !== undefined && { internalDescription: payload.internalDescription }),
            ...(data.annualPayment !== undefined && { annualPayment: data.annualPayment ?? undefined }),
            ...(data.educationVatRate !== undefined && { educationVatRate: data.educationVatRate ?? undefined }),
            ...(data.educationVat !== undefined && { educationVat: data.educationVat ?? undefined }),
            ...(data.grossCommissionKind !== undefined && { grossCommissionKind: data.grossCommissionKind || 'amount' }),
            ...(data.grossCommissionRate !== undefined && { grossCommissionRate: data.grossCommissionRate ?? undefined }),
            ...(data.grossCommission !== undefined && { grossCommission: data.grossCommission ?? undefined }),
            ...(data.abroadVatRate !== undefined && { abroadVatRate: data.abroadVatRate ?? undefined }),
            ...(data.abroadVat !== undefined && { abroadVat: data.abroadVat ?? undefined }),
            ...(data.netCommission !== undefined && { netCommission: data.netCommission ?? undefined }),
            ...(data.agencyCommissionKind !== undefined && { agencyCommissionKind: data.agencyCommissionKind || 'amount' }),
            ...(data.agencyCommissionRate !== undefined && { agencyCommissionRate: data.agencyCommissionRate ?? undefined }),
            ...(data.agencyCommission !== undefined && { agencyCommission: data.agencyCommission ?? undefined }),
            ...(data.depositSupport !== undefined && { depositSupport: data.depositSupport ?? undefined }),
            ...(data.agencyContractAmount !== undefined && { agencyContractAmount: data.agencyContractAmount ?? undefined }),
            ...(data.remainingMin !== undefined && { remainingMin: data.remainingMin ?? undefined }),
            ...(data.remainingMax !== undefined && { remainingMax: data.remainingMax ?? undefined }),
            ...(data.paymentDate !== undefined && { paymentDate: data.paymentDate ?? undefined }),
            ...(data.paymentMonth !== undefined && { paymentMonth: data.paymentMonth ?? undefined }),
            ...(data.internalDescription !== undefined && { internalDescription: data.internalDescription }),
            ...(data.updatedAt ? { updatedAt: data.updatedAt } : {})
          } : a),
          students: data.studentId && data.studentUpdatedAt
            ? prev.students.map(s => s.id === data.studentId ? { ...s, updatedAt: data.studentUpdatedAt } : s)
            : prev.students
        }));
        return true;
      }
      if (!opts?.silent) alert(data.message || 'Update failed');
      return false;
    } catch {
      if (!opts?.silent) alert('Connection error');
      return false;
    }
  };

  const addAgencyCompany = async (name: string) => {
    try {
      const res = await fetch('/api/agency-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role: state.currentUser?.role })
      });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({
          ...prev,
          agencyCompanies: [...prev.agencyCompanies, { id: data.id, name }]
        }));
        return data.id as string;
      }
      alert(data.message || 'Aracı firma eklenemedi');
    } catch (err) {
      alert('Connection error');
    }
    return null;
  };

  const editAgencyCompany = async (company: AgencyCompany) => {
    try {
      const res = await fetch(`/api/agency-companies/${company.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: company.name, role: state.currentUser?.role })
      });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({
          ...prev,
          agencyCompanies: prev.agencyCompanies.map(c => c.id === company.id ? company : c),
          applications: prev.applications.map(a => a.agencyCompanyId === company.id ? { ...a, agencyCompanyName: company.name } : a)
        }));
      } else {
        alert(data.message || 'Aracı firma güncellenemedi');
      }
    } catch (err) {
      alert('Connection error');
    }
  };

  const deleteAgencyCompany = async (id: string) => {
    try {
      const res = await fetch(`/api/agency-companies/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: state.currentUser?.role })
      });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({
          ...prev,
          agencyCompanies: prev.agencyCompanies.filter(c => c.id !== id)
        }));
      } else {
        alert(data.message || 'Aracı firma silinemedi');
      }
    } catch (err) {
      alert('Connection error');
    }
  };

  const addPaymentSource = async (name: string) => {
    try {
      const res = await fetch('/api/payment-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role: state.currentUser?.role })
      });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({
          ...prev,
          paymentSources: [...prev.paymentSources, { id: data.id, name }]
        }));
        return data.id as string;
      }
      alert(data.message || 'Ödeme kaynağı eklenemedi');
    } catch (err) {
      alert('Connection error');
    }
    return null;
  };

  const editPaymentSource = async (source: PaymentSource) => {
    try {
      const res = await fetch(`/api/payment-sources/${source.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: source.name, role: state.currentUser?.role })
      });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({
          ...prev,
          paymentSources: prev.paymentSources.map(s => s.id === source.id ? source : s)
        }));
      } else {
        alert(data.message || 'Ödeme kaynağı güncellenemedi');
      }
    } catch (err) {
      alert('Connection error');
    }
  };

  const deletePaymentSource = async (id: string) => {
    try {
      const res = await fetch(`/api/payment-sources/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: state.currentUser?.role })
      });
      const data = await res.json();
      if (res.ok) {
        setState(prev => ({
          ...prev,
          paymentSources: prev.paymentSources.filter(s => s.id !== id)
        }));
      } else {
        alert(data.message || 'Ödeme kaynağı silinemedi');
      }
    } catch (err) {
      alert('Connection error');
    }
  };

  const onSyncApplicationTimestamps = useCallback((payload: {
    applicationId: string;
    applicationUpdatedAt: string;
    studentId?: string;
    studentUpdatedAt?: string | null;
  }) => {
    setState(prev => ({
      ...prev,
      applications: prev.applications.map(a =>
        a.id === payload.applicationId ? { ...a, updatedAt: payload.applicationUpdatedAt } : a
      ),
      students: payload.studentId && payload.studentUpdatedAt
        ? prev.students.map(s => s.id === payload.studentId ? { ...s, updatedAt: payload.studentUpdatedAt as string } : s)
        : prev.students
    }));
  }, []);

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
        setState(prev => ({
          ...prev,
          periods: prev.periods.map(p => p.id === period.id ? period : p),
          programs: prev.programs.map(p =>
            p.periodId === period.id ? { ...p, isArchived: period.active === false } : p
          )
        }));
        if (typeof data.programsUpdated === 'number' && data.programsUpdated > 0) {
          const action = period.active === false ? 'arşivlendi' : 'aktifleştirildi';
          alert(`${data.programsUpdated} program ${action}.`);
        }
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
      const role = state.currentUser?.role || 'ADMIN';
      const res = await fetch(`/api/users/${id}?role=${encodeURIComponent(role)}`, {
        method: 'DELETE'
      });
      let data: { message?: string } = {};
      try {
        data = await res.json();
      } catch {
        /* non-JSON error body */
      }
      if (res.ok) {
        setState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== id) }));
      } else {
        alert(data.message || t.errorDelete);
      }
    } catch {
      alert(t.errorConnection);
    }
  };

  const editUser = async (user: User & { password?: string }) => {
    try {
      const role = state.currentUser?.role || 'ADMIN';
      const res = await fetch(`/api/users/${user.id}?role=${encodeURIComponent(role)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          countryCode: user.countryCode,
          agentCommissions: user.agentCommissions ?? [],
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
      const role = state.currentUser?.role || 'ADMIN';
      const res = await fetch(`/api/users/${id}?role=${encodeURIComponent(role)}`, {
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
        const buildBaseUrl = (base: string) => {
          const params = new URLSearchParams();
          if (state.currentUser?.id) {
            params.set('role', state.currentUser.role);
            params.set('user_id', state.currentUser.id);
          }
          const query = params.toString();
          return query ? `${base}?${query}` : base;
        };

        const fetchPaginatedAll = async (base: string, pageSize = 500) => {
          let page = 1;
          let totalPages = 1;
          const items: any[] = [];
          do {
            const delimiter = base.includes('?') ? '&' : '?';
            const url = `${base}${delimiter}page=${page}&pageSize=${pageSize}`;
            const res = await fetch(url);
            const data = await res.json();
            if (Array.isArray(data)) {
              return data;
            }
            const batch = Array.isArray(data?.items) ? data.items : [];
            items.push(...batch);
            const parsedTotalPages = Number(data?.totalPages);
            totalPages = Number.isFinite(parsedTotalPages) && parsedTotalPages > 0 ? parsedTotalPages : 1;
            page += 1;
          } while (page <= totalPages);
          return items;
        };

        const programsBaseUrl = state.currentUser?.role === UserRole.ADMIN
          ? '/api/programs?role=ADMIN&includeArchived=1'
          : '/api/programs';
        const studentsBaseUrl = buildBaseUrl('/api/students');
        const applicationsBaseUrl = buildBaseUrl('/api/applications');

        const sharedRequests: Promise<any>[] = [
          fetch('/api/universities').then(r => r.json()),
          fetchPaginatedAll(programsBaseUrl),
          fetchPaginatedAll(studentsBaseUrl),
          fetchPaginatedAll(applicationsBaseUrl),
          fetch('/api/periods').then(r => r.json()),
          fetch('/api/agency-companies').then(r => r.json()),
          fetch('/api/payment-sources').then(r => r.json())
        ];
        const canLoadUsers =
          state.currentUser.role === UserRole.ADMIN || state.currentUser.role === UserRole.USER;
        if (canLoadUsers) {
          sharedRequests.push(fetch('/api/users').then(r => r.json()));
        }
        const responses = await Promise.all(sharedRequests);
        setState(prev => ({
          ...prev,
          universities: responses[0],
          programs: responses[1],
          students: responses[2],
          applications: responses[3],
          periods: responses[4] || [],
          agencyCompanies: responses[5] || [],
          paymentSources: responses[6] || [],
          users: canLoadUsers ? (responses[7] || []).map((u: any) => ({ ...u, active: u.active !== false })) : []
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
            universities={state.universities}
            periods={state.periods}
            users={state.users}
            agencyCompanies={state.agencyCompanies}
            currentUser={state.currentUser}
            onDrilldownToApplications={openApplicationsWithFilters}
          />
        );
      case 'universities':
        return <UniversityManager universities={state.universities} programs={state.programs} onAddUniversity={addUniversity} onEditUniversity={editUniversity} onDeleteUniversity={deleteUniversity} currentUser={state.currentUser} />;
      case 'programs':
        return <ProgramManager programs={state.programs} universities={state.universities} periods={state.periods} applications={state.applications} onAddProgram={addProgram} onEditProgram={editProgram} onDeleteProgram={deleteProgram} currentUser={state.currentUser} />;
      case 'students':
        return <StudentManager students={state.students} applications={state.applications} programs={state.programs} universities={state.universities} periods={state.periods} users={state.users} agencyCompanies={state.agencyCompanies} onAddStudent={addStudent} onEditStudent={updateStudent} onDeleteStudent={deleteStudent} onUploadStudentFiles={uploadStudentFiles} onUploadApplicationFiles={uploadApplicationFiles} onStudentFilesChange={syncStudentFiles} onCreateApplicationForStudent={openCreateApplicationForStudent} onAddApplicationForStudent={(app) => addApplication(app)} onUpdateApplicationStatus={updateAppStatus} onUpdateApplication={updateApplication} onDeleteApplication={deleteApplication} onSyncApplicationTimestamps={onSyncApplicationTimestamps} onViewApplication={openApplicationDetails} currentUser={state.currentUser} targetStudentId={targetStudentId} clearTargetStudent={() => setTargetStudentId(null)} />;
      case 'applications':
        return <ApplicationManager applications={state.applications} students={state.students} programs={state.programs} universities={state.universities} periods={state.periods} agencyCompanies={state.agencyCompanies} users={state.users} onAddApplication={addApplication} onUpdateStatus={updateAppStatus} onUpdateApplication={updateApplication} onDeleteApplication={deleteApplication} onSyncApplicationTimestamps={onSyncApplicationTimestamps} onStudentFilesChange={syncStudentFiles} initialStudentId={prefillStudentIdForApp} clearInitialStudent={() => setPrefillStudentIdForApp(null)} targetApplicationId={targetApplicationId} clearTargetApplication={() => setTargetApplicationId(null)} initialListFilters={applicationListFilters} clearInitialListFilters={() => setApplicationListFilters(null)} onOpenStudent={openStudentDetails} currentUser={state.currentUser} />;
      case 'news':
        return (
          <Suspense fallback={<div className="p-6 text-gray-500">{state.currentUser ? t.loading : ''}</div>}>
            <NewsAndUpdates currentUser={state.currentUser} />
          </Suspense>
        );
      case 'notifications':
        return (
          <NotificationsPage
            onNavigate={(page, entityId) => {
              if (page === 'applications' && entityId) openApplicationDetails(entityId);
              else if (page === 'students' && entityId) openStudentDetails(entityId);
              else navigateTo(page);
            }}
          />
        );
      case 'periods':
        if (state.currentUser?.role !== UserRole.ADMIN) {
          return (
            <Dashboard
              students={state.students}
              applications={state.applications}
              programs={state.programs}
              universities={state.universities}
              users={state.users}
              agencyCompanies={state.agencyCompanies}
              currentUser={state.currentUser}
              onDrilldownToApplications={openApplicationsWithFilters}
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
              universities={state.universities}
              users={state.users}
              agencyCompanies={state.agencyCompanies}
              currentUser={state.currentUser}
              onDrilldownToApplications={openApplicationsWithFilters}
            />
          );
        }
        return (
          <UserManagementPage
            users={state.users}
            agencyCompanies={state.agencyCompanies}
            universities={state.universities}
            currentUser={state.currentUser}
            onAddUser={addUser}
            onEditUser={editUser}
            onDeleteUser={deleteUser}
            onSetUserActive={setUserActive}
          />
        );
      case 'incoming-payments':
        if (state.currentUser?.role !== UserRole.ADMIN) {
          return (
            <Dashboard
              students={state.students}
              applications={state.applications}
              programs={state.programs}
              universities={state.universities}
              users={state.users}
              agencyCompanies={state.agencyCompanies}
              currentUser={state.currentUser}
              onDrilldownToApplications={openApplicationsWithFilters}
            />
          );
        }
        return <PaymentsManager mode="incoming" currentUser={state.currentUser} paymentSources={state.paymentSources} />;
      case 'payment-dashboard':
        if (state.currentUser?.role !== UserRole.ADMIN) {
          return (
            <Dashboard
              students={state.students}
              applications={state.applications}
              programs={state.programs}
              universities={state.universities}
              users={state.users}
              agencyCompanies={state.agencyCompanies}
              currentUser={state.currentUser}
              onDrilldownToApplications={openApplicationsWithFilters}
            />
          );
        }
        return <PaymentDashboard currentUser={state.currentUser} />;
      case 'outgoing-payments':
        if (state.currentUser?.role !== UserRole.ADMIN) {
          return (
            <Dashboard
              students={state.students}
              applications={state.applications}
              programs={state.programs}
              universities={state.universities}
              users={state.users}
              agencyCompanies={state.agencyCompanies}
              currentUser={state.currentUser}
              onDrilldownToApplications={openApplicationsWithFilters}
            />
          );
        }
        return <PaymentsManager mode="outgoing" currentUser={state.currentUser} paymentSources={state.paymentSources} />;
      case 'agency-companies':
        if (state.currentUser?.role !== UserRole.ADMIN) {
          return (
            <Dashboard
              students={state.students}
              applications={state.applications}
              programs={state.programs}
              universities={state.universities}
              users={state.users}
              agencyCompanies={state.agencyCompanies}
              currentUser={state.currentUser}
              onDrilldownToApplications={openApplicationsWithFilters}
            />
          );
        }
        return (
          <AgencyCompanyManager
            companies={state.agencyCompanies}
            onAddCompany={addAgencyCompany}
            onEditCompany={editAgencyCompany}
            onDeleteCompany={deleteAgencyCompany}
          />
        );
      case 'payment-sources':
        if (state.currentUser?.role !== UserRole.ADMIN) {
          return (
            <Dashboard
              students={state.students}
              applications={state.applications}
              programs={state.programs}
              universities={state.universities}
              users={state.users}
              agencyCompanies={state.agencyCompanies}
              currentUser={state.currentUser}
              onDrilldownToApplications={openApplicationsWithFilters}
            />
          );
        }
        return (
          <PaymentSourceManager
            sources={state.paymentSources}
            onAddSource={addPaymentSource}
            onEditSource={editPaymentSource}
            onDeleteSource={deletePaymentSource}
          />
        );
      default:
        return (
          <Dashboard
            students={state.students}
            applications={state.applications}
            programs={state.programs}
            universities={state.universities}
            users={state.users}
            agencyCompanies={state.agencyCompanies}
            currentUser={state.currentUser}
            onDrilldownToApplications={openApplicationsWithFilters}
          />
        );
    }
  };

  return (
    <NotificationProvider userId={state.currentUser?.id ?? null}>
      <Layout
        activePage={activePage}
        onNavigate={navigateTo}
        onNavigateToApp={openApplicationDetails}
        onNavigateToStudent={openStudentDetails}
        currentUser={state.currentUser}
        onLogout={handleLogout}
      >
        {renderContent()}
      </Layout>
    </NotificationProvider>
  );
}