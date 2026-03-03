import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Application, Student, Program, University, ApplicationStatus, User } from '../types';
import {
  Plus, Filter, FileText, CheckCircle, XCircle, AlertCircle,
  MessageSquare, ArrowRight, User as UserIcon, GraduationCap,
  Clock, Send, Upload, Paperclip, ChevronLeft, MapPin, Trash2, Mail, Phone, FileEdit,
  List, LayoutGrid, Search, X, ChevronDown
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../contexts/LanguageContext';

function MultiSelectFilter({
  selected,
  onChange,
  options,
  optionLabels,
  placeholder,
  searchPlaceholder,
  className = ''
}: {
  selected: string[];
  onChange: (v: string[]) => void;
  options: string[];
  optionLabels?: Record<string, string>;
  placeholder: string;
  searchPlaceholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter(s => s !== value) : [...selected, value]);
  };
  const remove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(s => s !== value));
  };
  const label = (value: string) => optionLabels?.[value] ?? value;

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.trim().toLowerCase();
    return options.filter(opt => label(opt).toLowerCase().includes(q));
  }, [options, searchQuery]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full min-h-[42px] border border-gray-200 rounded-lg px-3 py-2 bg-white text-left text-sm focus:ring-2 focus:ring-blue-500 outline-none flex flex-wrap items-center gap-1.5"
      >
        {selected.length === 0 ? (
          <span className="text-gray-400">{placeholder}</span>
        ) : (
          selected.map(value => (
            <span
              key={value}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium"
            >
              {label(value)}
              <button type="button" onClick={e => remove(value, e)} className="hover:bg-blue-100 rounded p-0.5">
                <X size={12} />
              </button>
            </span>
          ))
        )}
        <ChevronDown size={16} className="ml-auto text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-[200px] rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100 bg-gray-50/50 sticky top-0">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={searchPlaceholder ?? 'Search'}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="py-1 max-h-48 overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">{searchQuery ? 'No matches' : '—'}</div>
            ) : (
              filteredOptions.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${selected.includes(opt) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                >
                  {selected.includes(opt) && <span className="text-blue-600">✓</span>}
                  {label(opt)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ApplicationManagerProps {
  applications: Application[];
  students: Student[];
  programs: Program[];
  universities: University[];
  users?: User[];
  onAddApplication: (app: Application, files?: FileList | null) => Promise<string | null> | void;
  onUpdateStatus: (id: string, status: ApplicationStatus) => void;
  initialStudentId?: string | null;
  clearInitialStudent?: () => void;
  targetApplicationId?: string | null;
  clearTargetApplication?: () => void;
  currentUser?: { role: string; name?: string; id?: string; email?: string };
}

export const ApplicationManager: React.FC<ApplicationManagerProps> = ({
  applications, students, programs, universities, users = [], onAddApplication, onUpdateStatus,
  initialStudentId, clearInitialStudent, targetApplicationId, clearTargetApplication, currentUser
}) => {
  const { t, translateStatus, translateDegree } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = { ar: 'ar-EG', en: 'en-GB', tr: 'tr-TR' }[language] || 'en-GB';

  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [listViewMode, setListViewMode] = useState<'tree' | 'kanban'>('tree');
  const [searchApplicationNumber, setSearchApplicationNumber] = useState('');
  const [searchStudentName, setSearchStudentName] = useState('');
  const [filterAgents, setFilterAgents] = useState<string[]>([]);
  const [filterUniversities, setFilterUniversities] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterDegrees, setFilterDegrees] = useState<string[]>([]);
  const hasSetDefaultStatusRef = useRef(false);

  // Default status filter on first load: Admin/User = Missing Documents + Under Review; Agent = + Draft
  useEffect(() => {
    if (hasSetDefaultStatusRef.current || !currentUser) return;
    const role = (currentUser.role ?? '').toString().toUpperCase();
    if (role === 'ADMIN' || role === 'USER') {
      hasSetDefaultStatusRef.current = true;
      setFilterStatuses([ApplicationStatus.MISSING_DOCS, ApplicationStatus.UNDER_REVIEW]);
    } else if (role === 'AGENT') {
      hasSetDefaultStatusRef.current = true;
      setFilterStatuses([ApplicationStatus.MISSING_DOCS, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.DRAFT]);
    }
  }, [currentUser]);
  const [messages, setMessages] = React.useState<Array<{ id: string; sender: string; message: string; createdAt: string }>>([]);
  const [newMessage, setNewMessage] = React.useState('');
  const [detailFiles, setDetailFiles] = React.useState<Array<{ url: string; name: string; filename?: string }>>([]);
  const [attachFiles, setAttachFiles] = React.useState<FileList | null>(null);

  // Create Form State
  const [selectedStudent, setSelectedStudent] = useState('');


  const [filterDegree, setFilterDegree] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterLang, setFilterLang] = useState('');
  const [filterUni, setFilterUni] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);

  // Derived filters
  const uniqueDegrees = useMemo(() => Array.from(new Set(programs.map(p => p.degree))), [programs]);

  const availablePrograms = useMemo(() => {
    return programs.filter(p => !filterDegree || p.degree === filterDegree);
  }, [programs, filterDegree]);

  const uniqueNames = useMemo(() => Array.from(new Set(availablePrograms.map(p => p.name))), [availablePrograms]);

  const availableLanguages = useMemo(() => {
    return availablePrograms
      .filter(p => !filterName || p.name === filterName)
      .map(p => p.language)
      .filter((v, i, a) => a.indexOf(v) === i);
  }, [availablePrograms, filterName]);

  const availableUnis = useMemo(() => {
    return availablePrograms
      .filter(p =>
        (!filterName || p.name === filterName) &&
        (!filterLang || p.language === filterLang)
      )
      .map(p => {
        const uni = universities.find(u => u.id === p.universityId);
        return uni ? { id: uni.id, name: uni.name } : null;
      })
      .filter(Boolean) as { id: string, name: string }[];
  }, [availablePrograms, filterName, filterLang, universities]);

  const finalProgramId = useMemo(() => {
    if (!filterUni || !filterName || !filterLang || !filterDegree) return null;
    return programs.find(p =>
      p.degree === filterDegree &&
      p.name === filterName &&
      p.language === filterLang &&
      p.universityId === filterUni
    )?.id;
  }, [filterDegree, filterName, filterLang, filterUni, programs]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudent && finalProgramId) {
      const newId = await onAddApplication({
        id: Date.now().toString(),
        studentId: selectedStudent,
        programId: finalProgramId,
        status: ApplicationStatus.DRAFT,
        semester: 'Fall 2024',
        createdAt: new Date().toISOString().split('T')[0],
        files: []
      }, files);
      if (newId) {
        setSelectedAppId(newId);
        setView('detail');
        setSelectedStudent(''); setFilterDegree(''); setFilterName(''); setFilterLang(''); setFilterUni(''); setFiles(null);
      }
    }
  };

  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudent(initialStudentId);
      setView('create');
      if (typeof clearInitialStudent === 'function') clearInitialStudent();
    }
  }, [initialStudentId, clearInitialStudent]);

  useEffect(() => {
    if (targetApplicationId) {
      setSelectedAppId(targetApplicationId);
      setView('detail');
      if (typeof clearTargetApplication === 'function') clearTargetApplication();
    }
  }, [targetApplicationId, clearTargetApplication]);

  // Load messages when opening a detail view
  React.useEffect(() => {
    const loadMessages = async (appId?: string | null) => {
      if (!appId) return;
      try {
        const res = await fetch(`/api/applications/${appId}/messages`);
        const data = await res.json();
        if (res.ok) setMessages(data);
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    };
    if (view === 'detail' && selectedAppId) {
      loadMessages(selectedAppId);
      (async () => {
        try {
          const r = await fetch(`/api/applications/${selectedAppId}/files`);
          if (r.ok) {
            const list = await r.json();
            setDetailFiles(list.map((x: any) => ({ url: x.url, name: x.name || x.url.split('/').pop(), filename: x.filename })));
          } else { setDetailFiles([]); }
        } catch (e) {
          console.error('Failed to load application files', e);
          setDetailFiles([]);
        }
      })();
    }
  }, [view, selectedAppId]);

  // Helpers
  const getStudent = (id: string) => students.find(s => s.id === id);
  const getProgram = (id: string) => programs.find(p => p.id === id);
  const getUni = (id: string) => universities.find(u => u.id === id);

  const getAgentName = (app: Application) => app.agentName || (app.userId && users.find(u => u.id === app.userId)?.name) || '—';

  const uniqueAgents = useMemo(() => {
    const names = new Set<string>();
    applications.forEach(app => {
      const name = app.agentName || (app.userId && users.find(u => u.id === app.userId)?.name);
      if (name) names.add(name);
    });
    return Array.from(names).sort();
  }, [applications, users]);

  const filteredApplications = useMemo(() => {
    const list = applications.filter(app => {
      const s = getStudent(app.studentId);
      const p = getProgram(app.programId);
      const matchNumber = !searchApplicationNumber.trim() || (app.id || '').toLowerCase().includes(searchApplicationNumber.trim().toLowerCase());
      const studentName = s ? `${(s.firstName || '').toLowerCase()} ${(s.lastName || '').toLowerCase()}`.trim() : '';
      const searchName = searchStudentName.trim().toLowerCase();
      const matchName = !searchName || studentName.includes(searchName) ||
        ((s?.firstName || '').toLowerCase().includes(searchName) || (s?.lastName || '').toLowerCase().includes(searchName));
      const agentName = getAgentName(app);
      const matchAgent = filterAgents.length === 0 || filterAgents.includes(agentName);
      const matchUniversity = filterUniversities.length === 0 || (p?.universityId && filterUniversities.includes(p.universityId));
      const matchStatus = filterStatuses.length === 0 || filterStatuses.includes(app.status);
      const matchDegree = filterDegrees.length === 0 || (p?.degree && filterDegrees.includes(p.degree));
      return matchNumber && matchName && matchAgent && matchUniversity && matchStatus && matchDegree;
    });
    return list.slice().sort((a, b) => {
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      return tB - tA;
    });
  }, [applications, students, programs, universities, users, searchApplicationNumber, searchStudentName, filterAgents, filterUniversities, filterStatuses, filterDegrees]);

  const renderCreate = () => (
    <div className="w-full max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Plus className="text-blue-600" /> {t.addApplication}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-semibold mb-2 text-gray-700">1. {t.selectStudent}</label>
          <select
            required
            className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white border-gray-200 transition-all"
            value={selectedStudent}
            onChange={e => setSelectedStudent(e.target.value)}
          >
            <option value="">{t.selectStudent}</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName} – {s.passportNumber}</option>
            ))}
          </select>
        </div>

        {selectedStudent && (() => {
          const student = getStudent(selectedStudent);
          if (!student) return null;
          return (
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                <UserIcon size={16} /> {t.selectStudent} – {t.userName}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-start gap-2">
                  <Mail size={18} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-500">{t.email}</p>
                    <p className="text-gray-900 font-medium">{student.email || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone size={18} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-500">{t.phone}</p>
                    <p className="text-gray-900 font-medium">{student.phone || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-[18px] h-[18px] rounded bg-slate-200 mt-0.5 shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-500">#</span>
                  <div>
                    <p className="text-xs font-medium text-slate-500">{t.passportNumber}</p>
                    <p className="text-gray-900 font-medium">{student.passportNumber || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={18} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-500">{t.nationality}</p>
                    <p className="text-gray-900 font-medium">{student.nationality || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={18} className="text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-500">{t.residenceCountry}</p>
                    <p className="text-gray-900 font-medium">{student.residenceCountry || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="bg-blue-50/50 p-6 rounded-2xl space-y-4 border border-blue-100">
          <label className="block font-semibold text-blue-900">2. {t.selectProgram}</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-wider px-1">{t.programDegree}</label>
              <select
                className="w-full p-2.5 border border-blue-100 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                value={filterDegree}
                onChange={e => { setFilterDegree(e.target.value); setFilterName(''); setFilterLang(''); setFilterUni(''); }}
                required
              >
                <option value="">{t.selectDegree}</option>
                {uniqueDegrees.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-wider px-1">{t.programName}</label>
              <select
                className="w-full p-2.5 border border-blue-100 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                value={filterName}
                onChange={e => { setFilterName(e.target.value); setFilterLang(''); setFilterUni(''); }}
                disabled={!filterDegree}
                required
              >
                <option value="">{t.selectProgram}</option>
                {uniqueNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-wider px-1">{t.programLanguage}</label>
              <select
                className="w-full p-2.5 border border-blue-100 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                value={filterLang}
                onChange={e => { setFilterLang(e.target.value); setFilterUni(''); }}
                disabled={!filterName}
                required
              >
                <option value="">{t.selectLanguage}</option>
                {availableLanguages.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-wider px-1">{t.universities}</label>
              <select
                className="w-full p-2.5 border border-blue-100 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                value={filterUni}
                onChange={e => setFilterUni(e.target.value)}
                disabled={!filterLang}
                required
              >
                <option value="">{t.selectUniversity}</option>
                {availableUnis.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
          <button type="button" onClick={() => setView('list')} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">{t.cancel}</button>
          <button type="submit" disabled={!selectedStudent || !finalProgramId} className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-200 transition-all active:scale-95">{t.save}</button>
        </div>
      </form>
    </div>
  );

  const renderDetail = () => {
    const app = applications.find(a => a.id === selectedAppId);
    if (!app) return null;

    const student = getStudent(app.studentId);
    const program = getProgram(app.programId);
    const university = program ? getUni(program.universityId) : null;

    const sendMessage = async () => {
      if (!newMessage.trim() || !selectedAppId) return;
      try {
        const senderRole = currentUser?.role || 'USER';
        const res = await fetch(`/api/applications/${selectedAppId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender: senderRole, message: newMessage.trim() })
        });
        const data = await res.json();
        if (res.ok) {
          setMessages(prev => [...prev, { id: data.id, sender: senderRole, message: newMessage.trim(), createdAt: new Date().toISOString() }]);
          setNewMessage('');
        } else { alert(data.message || 'فشل إرسال الرسالة'); }
      } catch { alert('خطأ في الاتصال'); }
    };

    // --- Status Bar Steps ---
    const getStatusStep = (status: ApplicationStatus) => {
      if (status === ApplicationStatus.ACCEPTED) return 4;
      if (status === ApplicationStatus.REJECTED) return 4;
      if (status === ApplicationStatus.MISSING_DOCS) return 2;
      if (status === ApplicationStatus.UNDER_REVIEW) return 3;
      return 1; // Draft
    };

    const currentStep = getStatusStep(app.status);
    const isError = app.status === ApplicationStatus.REJECTED || app.status === ApplicationStatus.MISSING_DOCS;

    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-in slide-in-from-bottom duration-500">
        {/* Header Actions */}
        <div className="grid grid-cols-3 items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-start">
            <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors font-bold">
              <ChevronLeft size={20} />
              <span>{t.back}</span>
            </button>
          </div>
          <div className="flex justify-center">
            <span className="font-mono font-bold text-gray-800 text-lg">#{app.id}</span>
          </div>
          <div className="flex justify-end">
            <span className="text-xs bg-gray-100 px-3 py-1.5 rounded-full text-gray-600 font-medium">
              {app.createdAt ? new Date(app.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
            </span>
          </div>
        </div>

        {/* 1. APP STATUS MANAGEMENT BAR (ERP Style) */}
        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'USER') && (
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-2">
            {[
              { id: ApplicationStatus.DRAFT, label: t.draft, icon: <FileEdit size={16} />, activeColor: 'bg-gray-600 text-white', inactiveColor: 'bg-gray-50 text-gray-700 border-gray-100 hover:bg-gray-100' },
              { id: ApplicationStatus.MISSING_DOCS, label: t.missingDocs, icon: <AlertCircle size={16} />, activeColor: 'bg-orange-600 text-white', inactiveColor: 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100' },
              { id: ApplicationStatus.UNDER_REVIEW, label: t.underReview, icon: <Clock size={16} />, activeColor: 'bg-blue-600 text-white', inactiveColor: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100' },
              { id: ApplicationStatus.ACCEPTED, label: t.approved, icon: <CheckCircle size={16} />, activeColor: 'bg-green-600 text-white', inactiveColor: 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100' },
              { id: ApplicationStatus.REJECTED, label: t.rejected, icon: <XCircle size={16} />, activeColor: 'bg-red-600 text-white', inactiveColor: 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100' },
            ].map((btn) => {
              const isActive = app.status === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => onUpdateStatus(app.id, btn.id)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all border
                    ${isActive ? btn.activeColor + ' border-transparent shadow-lg scale-105' : btn.inactiveColor + ' border-transparent opacity-60 hover:opacity-100'}
                  `}
                >
                  {btn.icon}
                  {btn.label}
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Status Indicator for Agent/Student (non-admin) */}
        {!(currentUser?.role === 'ADMIN' || currentUser?.role === 'USER') && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 font-bold text-sm">{t.currentApplicationStatus}:</span>
              <span className={`px-6 py-2 rounded-xl text-sm font-bold shadow-sm border
                ${app.status === ApplicationStatus.ACCEPTED ? 'bg-green-50 text-green-700 border-green-100' :
                  app.status === ApplicationStatus.REJECTED ? 'bg-red-50 text-red-700 border-red-100' :
                    app.status === ApplicationStatus.MISSING_DOCS ? 'bg-orange-50 text-orange-700 border-orange-100' :
                      app.status === ApplicationStatus.DRAFT ? 'bg-gray-50 text-gray-700 border-gray-200' :
                        'bg-blue-50 text-blue-700 border-blue-100'}`}>
                {translateStatus(app.status)}
              </span>
            </div>
            {(currentUser?.role === 'AGENT' || currentUser?.role === 'agent') && app.status === ApplicationStatus.DRAFT && (
              <button
                type="button"
                onClick={() => onUpdateStatus(app.id, ApplicationStatus.UNDER_REVIEW)}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Clock size={18} />
                {t.sendToReview}
              </button>
            )}
          </div>
        )}

        {/* 2. Top Info Cards: Student & Program (and Agent if Admin) */}
        <div className={`grid grid-cols-1 gap-6 ${currentUser?.role === 'ADMIN' && app.agentName ? 'lg:grid-cols-3 md:grid-cols-2' : 'md:grid-cols-2'}`}>
          {/* Student Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-blue-50 p-4 rounded-xl text-blue-600 shrink-0">
                <UserIcon size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{t.studentInfo}</h3>
                <p className="text-xl font-bold text-gray-800 leading-tight">{student?.firstName} {student?.lastName}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600 min-w-0">
                <Mail size={16} className="text-gray-400 shrink-0" />
                <span className="min-w-0 truncate" title={student?.email || undefined}>{student?.email || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 min-w-0">
                <Phone size={16} className="text-gray-400 shrink-0" />
                <span className="min-w-0 truncate" title={student?.phone || undefined}>{student?.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 min-w-0">
                <FileText size={16} className="text-gray-400 shrink-0" />
                <span className="font-mono min-w-0 truncate">{student?.passportNumber || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 min-w-0">
                <MapPin size={16} className="text-gray-400 shrink-0" />
                <span>{t.nationality}: {student?.nationality || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 min-w-0">
                <MapPin size={16} className="text-gray-400 shrink-0" />
                <span>{t.residenceCountry}: {student?.residenceCountry || '—'}</span>
              </div>
            </div>
          </div>

          {/* Program Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-purple-50 p-4 rounded-xl text-purple-600 shrink-0">
                <GraduationCap size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{t.programsTitle}</h3>
                <p className="text-xl font-bold text-gray-800 leading-tight">{program?.name}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <GraduationCap size={16} className="text-purple-400 shrink-0" />
                <span className="text-blue-600 font-semibold">{university?.name || '—'}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium">{translateDegree(program?.degree || '')}</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">{program?.language || '—'}</span>
              </div>
            </div>
          </div>

          {/* Agent Card (Visible to Admin Only) */}
          {currentUser?.role === 'ADMIN' && app.agentName && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 flex items-start gap-4 hover:shadow-md transition-shadow">
              <div className="bg-orange-50 p-4 rounded-xl text-orange-600">
                <UserIcon size={24} />
              </div>
              <div>
                <h3 className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-1">{t.hostAgent}</h3>
                <p className="text-xl font-bold text-gray-800 leading-tight">{app.agentName}</p>
                <div className="flex gap-4 mt-2 text-sm text-orange-500 font-medium font-mono">
                  {app.agentPhone && <span className="flex items-center gap-1">{app.agentCountryCode || ''} {app.agentPhone}</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Main Body: Chat (Wider) and Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* CHAT SECTION (70%) */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[600px]">
            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-blue-600" size={20} />
                <h3 className="font-bold text-gray-800">{t.chat}</h3>
              </div>
              {/* WhatsApp Helper */}
              {app.agentPhone && currentUser?.id !== app.userId ? (
                <a
                  href={`https://wa.me/${(app.agentCountryCode || '').replace('+', '')}${app.agentPhone}?text=${encodeURIComponent(`السلام عليكم، بخصوص الطلب رقم #${app.id}`)}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-green-600 hover:text-green-700 bg-green-50 px-4 py-1.5 rounded-full text-xs font-bold transition-all border border-green-100"
                >
                  <MessageSquare size={14} />
                  <span>{t.whatsappAgent}</span>
                </a>
              ) : (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`تفاصيل الطلب #${app.id}`)}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-gray-500 hover:text-green-600 bg-gray-50 px-4 py-1.5 rounded-full text-xs font-bold transition-all border border-gray-100"
                >
                  <MessageSquare size={14} />
                  <span>{t.uploadToWhatsApp}</span>
                </a>
              )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-2">
                  <MessageSquare size={48} className="opacity-10" />
                  <p className="text-sm">{t.noMessages}</p>
                </div>
              ) : (
                messages.map(m => {
                  const isAdmin = m.sender === 'ADMIN';
                  const isUser = m.sender === 'USER'; // Student owner / Agent
                  return (
                    <div key={m.id} className={`flex w-full ${isAdmin ? 'justify-end' : isUser ? 'justify-center font-bold' : 'justify-start'}`}>
                      <div className={`max-w-[80%] flex flex-col ${isAdmin ? 'items-end' : isUser ? 'items-center' : 'items-start'}`}>
                        {/* Meta */}
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${isAdmin ? 'text-blue-400' : isUser ? 'text-orange-400' : 'text-gray-400'}`}>
                            {isAdmin ? 'System Admin' : isUser ? 'Applicant' : 'Counselor'}
                          </span>
                          <span className="text-[10px] text-gray-300">{new Date(m.createdAt).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {/* Bubble */}
                        <div
                          className={`px-4 py-3 rounded-2xl shadow-sm text-sm break-words leading-relaxed
                            ${isAdmin
                              ? 'bg-blue-600 text-white rounded-br-none shadow-blue-100'
                              : isUser
                                ? 'bg-orange-50 text-orange-900 border border-orange-100 rounded-2xl text-center italic'
                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}
                          dir="auto"
                        >
                          {m.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-100 bg-white">
              <div className="flex gap-2 items-center bg-gray-50 p-1 rounded-2xl border border-gray-200 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  className="flex-1 bg-transparent p-3 outline-none text-sm placeholder:text-gray-400"
                  placeholder={t.typeMessage}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-30 disabled:hover:bg-blue-600 transition-all active:scale-90"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* SIDEBAR: Files & Status Actions (30%) */}
          <div className="w-full lg:w-[320px] space-y-6">
            {/* 1. Files Area */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Paperclip size={18} className="text-gray-400" />
                <h4 className="font-bold text-gray-800 text-sm">{t.files}</h4>
              </div>

              {detailFiles.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {detailFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-all group">
                      <a
                        href={f.url} target="_blank" rel="noreferrer"
                        className="flex-1 flex items-center gap-3 min-w-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-blue-500 group-hover:border-blue-100 shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="flex-1 min-w-0 pr-2 text-right">
                          <p className="text-[11px] font-bold text-gray-700 truncate" dir="ltr">{f.name}</p>
                          <span className="text-[9px] text-gray-400 uppercase">View File</span>
                        </div>
                      </a>
                      {f.filename && (
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            if (!window.confirm(t.confirmDelete)) return;
                            try {
                              const r = await fetch(`/api/applications/${selectedAppId}/files/${f.filename}`, { method: 'DELETE' });
                              if (r.ok) {
                                setDetailFiles(prev => prev.filter(file => file.filename !== f.filename));
                              } else {
                                const data = await r.json();
                                alert(data.message || t.errorDelete);
                              }
                            } catch (err) {
                              alert(t.errorConnection);
                            }
                          }}
                          className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shrink-0"
                          title={t.delete}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-2xl mb-4">
                  <FileText className="mx-auto opacity-10 mb-2" size={32} />
                  <p className="text-xs text-gray-400">{t.noAttachments}</p>
                </div>
              )}

              {/* Upload Subsection */}
              <div className="space-y-2">
                <input
                  type="file" id="attach-files-det" multiple accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden" onChange={e => setAttachFiles(e.target.files)}
                />
                <label
                  htmlFor="attach-files-det"
                  className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-xl p-3 cursor-pointer hover:border-blue-300 hover:bg-blue-50/20 transition-all"
                >
                  <span className="text-[11px] font-bold text-blue-600">
                    {attachFiles && attachFiles.length > 0
                      ? `${attachFiles.length} ${t.filesSelected}`
                      : t.attachAdditionalFiles
                    }
                  </span>
                </label>
                <button
                  onClick={async () => {
                    if (!attachFiles || !selectedAppId) return;
                    const fd = new FormData();
                    Array.from(attachFiles as FileList).forEach(f => fd.append('files', f));
                    try {
                      const r = await fetch(`/api/applications/${selectedAppId}/files`, { method: 'POST', body: fd });
                      const data = await r.json();
                      if (r.ok) {
                        setDetailFiles(data.files.map((x: any) => ({ url: x.url, name: x.name || x.url.split('/').pop(), filename: x.filename })));
                        setAttachFiles(null);
                        const inp = document.getElementById('attach-files-det') as HTMLInputElement;
                        if (inp) inp.value = '';
                      } else { alert(data.message || t.uploadFailed); }
                    } catch { alert(t.errorConnection); }
                  }}
                  disabled={!attachFiles}
                  className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:grayscale"
                >
                  <span className="flex items-center justify-center gap-2"><Upload size={14} /> {t.uploadNow}</span>
                </button>
              </div>
            </div>

            {/* Sidebar reserved for files and chat summary if needed */}
          </div >
        </div >
      </div >
    );
  };

  return (
    <div className="space-y-6">
      {view === 'list' && (
        <div className="animate-in fade-in duration-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{t.applicationsTitle}</h2>
              <p className="text-gray-400 font-medium">{t.applicationsSubtitle}</p>
            </div>
            <button
              onClick={() => setView('create')}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 font-bold active:scale-95"
            >
              <Plus size={22} strokeWidth={3} />
              <span>{t.addApplication}</span>
            </button>
          </div>

          {/* Filter bar + View toggle */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-gray-600">
                  <Search size={18} className="text-blue-500" />
                  <span className="text-sm font-medium">{t.search}</span>
                </div>
                <div className="h-6 w-px bg-gray-200 hidden sm:block" />
                <div className="flex items-center gap-2 text-gray-600">
                  <Filter size={18} className="text-purple-500" />
                  <span className="text-sm font-medium">{t.filter}</span>
                </div>
                {(searchApplicationNumber || searchStudentName || filterAgents.length > 0 || filterUniversities.length > 0 || filterStatuses.length > 0 || filterDegrees.length > 0) && (
                  <button
                    type="button"
                    onClick={() => { setSearchApplicationNumber(''); setSearchStudentName(''); setFilterAgents([]); setFilterUniversities([]); setFilterStatuses([]); setFilterDegrees([]); }}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X size={14} />
                    {t.clearFilters}
                  </button>
                )}
              </div>
              <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setListViewMode('tree')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors rounded-md ${listViewMode === 'tree' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  title={t.treeView}
                >
                  <List size={16} />
                  <span className="hidden sm:inline">{t.treeView}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setListViewMode('kanban')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors rounded-md ${listViewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  title={t.kanbanView}
                >
                  <LayoutGrid size={16} />
                  <span className="hidden sm:inline">{t.kanbanView}</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              <input
                type="text"
                placeholder={t.applicationNumber}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={searchApplicationNumber}
                onChange={(e) => setSearchApplicationNumber(e.target.value)}
              />
              <input
                type="text"
                placeholder={t.studentName}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={searchStudentName}
                onChange={(e) => setSearchStudentName(e.target.value)}
              />
              <MultiSelectFilter
                selected={filterAgents}
                onChange={setFilterAgents}
                options={uniqueAgents}
                placeholder={`${t.agent} (${t.filterAll})`}
                searchPlaceholder={t.search}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-3">
              <MultiSelectFilter
                selected={filterUniversities}
                onChange={setFilterUniversities}
                options={universities.map(u => u.id)}
                optionLabels={Object.fromEntries(universities.map(u => [u.id, u.name]))}
                placeholder={`${t.universitiesTitle} (${t.filterAll})`}
                searchPlaceholder={t.search}
              />
              <MultiSelectFilter
                selected={filterStatuses}
                onChange={setFilterStatuses}
                options={[ApplicationStatus.DRAFT, ApplicationStatus.MISSING_DOCS, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED]}
                optionLabels={{
                  [ApplicationStatus.DRAFT]: t.draft,
                  [ApplicationStatus.MISSING_DOCS]: t.missingDocs,
                  [ApplicationStatus.UNDER_REVIEW]: t.underReview,
                  [ApplicationStatus.ACCEPTED]: t.approved,
                  [ApplicationStatus.REJECTED]: t.rejected,
                }}
                placeholder={`${t.applicationStatus} (${t.filterAll})`}
                searchPlaceholder={t.search}
              />
              <MultiSelectFilter
                selected={filterDegrees}
                onChange={setFilterDegrees}
                options={uniqueDegrees}
                placeholder={`${t.programDegree} (${t.filterAll})`}
                searchPlaceholder={t.search}
              />
            </div>
          </div>

          {listViewMode === 'tree' && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-4 overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50/50 text-gray-400 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-5 font-bold uppercase tracking-wider">{t.number}</th>
                    <th className="px-6 py-5 font-bold uppercase tracking-wider">{t.agent}</th>
                    <th className="px-6 py-5 font-bold uppercase tracking-wider">{t.studentInfo}</th>
                    <th className="px-6 py-5 font-bold uppercase tracking-wider">{t.programsTitle}</th>
                    <th className="px-6 py-5 font-bold uppercase tracking-wider">{t.createdAt}</th>
                    <th className="px-6 py-5 font-bold uppercase tracking-wider text-center">{t.applicationStatus}</th>
                    <th className="px-6 py-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredApplications.map((app) => {
                    const s = getStudent(app.studentId);
                    const p = getProgram(app.programId);
                    return (
                      <tr
                        key={app.id}
                        className="hover:bg-blue-50/30 cursor-pointer transition-colors group"
                        onClick={() => { setSelectedAppId(app.id); setView('detail'); }}
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold text-gray-400 group-hover:text-blue-600 transition-colors">#{app.id}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{getAgentName(app)}</td>
                        <td className="px-6 py-4 font-bold text-gray-800">{s?.firstName} {s?.lastName}</td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-700">{p?.name}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 font-medium">
                          {app.createdAt ? new Date(app.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold ring-1
                              ${app.status === ApplicationStatus.ACCEPTED ? 'bg-green-50 text-green-700 ring-green-100' :
                                app.status === ApplicationStatus.REJECTED ? 'bg-red-50 text-red-700 ring-red-100' :
                                  app.status === ApplicationStatus.MISSING_DOCS ? 'bg-orange-50 text-orange-700 ring-orange-100' :
                                    app.status === ApplicationStatus.DRAFT ? 'bg-gray-50 text-gray-700 ring-gray-200' :
                                      'bg-blue-50 text-blue-700 ring-blue-100'}`}>
                              {translateStatus(app.status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-left">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <ArrowRight size={18} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredApplications.length === 0 && (
                <div className="py-20 text-center">
                  <FileText size={48} className="mx-auto text-gray-100 mb-4" />
                  <p className="text-gray-400 font-medium">{t.noApplicationsInSystem}</p>
                </div>
              )}
            </div>
          )}

          {listViewMode === 'kanban' && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredApplications.length === 0 ? (
                <div className="col-span-full py-20 text-center">
                  <FileText size={48} className="mx-auto text-gray-100 mb-4" />
                  <p className="text-gray-400 font-medium">{t.noApplicationsInSystem}</p>
                </div>
              ) : (
                filteredApplications.map((app) => {
                  const s = getStudent(app.studentId);
                  const p = getProgram(app.programId);
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => { setSelectedAppId(app.id); setView('detail'); }}
                      className="w-full text-left p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all"
                    >
                      <p className="font-bold text-gray-800 text-sm truncate">{s?.firstName} {s?.lastName}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{p?.name}</p>
                      <p className="text-[10px] text-gray-400 mt-2">{new Date(app.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' })}</p>
                      <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium
                        ${app.status === ApplicationStatus.ACCEPTED ? 'bg-green-50 text-green-700' :
                          app.status === ApplicationStatus.REJECTED ? 'bg-red-50 text-red-700' :
                            app.status === ApplicationStatus.MISSING_DOCS ? 'bg-orange-50 text-orange-700' :
                              app.status === ApplicationStatus.DRAFT ? 'bg-gray-100 text-gray-600' :
                                'bg-blue-50 text-blue-700'}`}>
                        {translateStatus(app.status)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {view === 'create' && renderCreate()}
      {view === 'detail' && renderDetail()}
    </div>
  );
};