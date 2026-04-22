import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Application, Student, Program, University, ApplicationStatus, User, Period } from '../types';
import {
  Plus, Filter, FileText, CheckCircle, XCircle, AlertCircle,
  MessageSquare, User as UserIcon, GraduationCap,
  Clock, Send, Upload, Paperclip, ChevronLeft, MapPin, Trash2, Mail, Phone, FileEdit,
  List, LayoutGrid, Search, X, ChevronDown, ChevronUp, ChevronRight
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../contexts/LanguageContext';
import { matchesCreatedAtRange } from '../utils/createdAtRangeFilter';

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
  periods?: Period[];
  users?: User[];
  onAddApplication: (app: Application, files?: FileList | null) => Promise<string | null> | void;
  onUpdateStatus: (id: string, status: ApplicationStatus) => void;
  onUpdateApplication?: (id: string, payload: {
    status?: ApplicationStatus;
    responsibleId?: string | null;
    userId?: string | null;
    annualPayment?: number | null;
    educationVat?: number | null;
    grossCommission?: number | null;
    abroadVat?: number | null;
    netCommission?: number | null;
    bonusMax?: number | null;
    bonusMin?: number | null;
    agencyCommission?: number | null;
    agencyBonus?: number | null;
    agencyContractAmount?: number | null;
    agencyPaidContractAmount?: number | null;
    agencyPaidContractDescription?: string | null;
    agencyPaidContractDescriptionDate?: string | null;
    agencyPaidContractPaymentMethod?: string | null;
    currency?: string | null;
    remainingMin?: number | null;
    remainingMax?: number | null;
  }) => void | Promise<void>;
  onSyncApplicationTimestamps?: (payload: {
    applicationId: string;
    applicationUpdatedAt: string;
    studentId?: string;
    studentUpdatedAt?: string | null;
  }) => void;
  initialStudentId?: string | null;
  clearInitialStudent?: () => void;
  targetApplicationId?: string | null;
  clearTargetApplication?: () => void;
  currentUser?: { role: string; name?: string; id?: string; email?: string };
}

export const ApplicationManager: React.FC<ApplicationManagerProps> = ({
  applications, students, programs, universities, periods = [], users = [], onAddApplication, onUpdateStatus, onUpdateApplication,
  onSyncApplicationTimestamps,
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
  const [filterAppCreatedFrom, setFilterAppCreatedFrom] = useState('');
  const [filterAppCreatedTo, setFilterAppCreatedTo] = useState('');
  const [expandedAppIds, setExpandedAppIds] = useState<Set<string>>(() => new Set());
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [treePage, setTreePage] = useState(1);
  const [kanbanPage, setKanbanPage] = useState(1);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);
  const applicationColumnKeys = useMemo(() => ['number', 'status', 'agent', 'responsible', 'student', 'program', 'createdAt', 'updatedAt'], []);
  const [visibleTreeColumns, setVisibleTreeColumns] = useState<string[]>(applicationColumnKeys);

  const [messages, setMessages] = React.useState<Array<{ id: string; sender: string; message: string; createdAt: string; senderName?: string | null }>>([]);
  const [newMessage, setNewMessage] = React.useState('');
  const [detailFiles, setDetailFiles] = React.useState<Array<{ url: string; name: string; filename?: string }>>([]);
  const [attachFiles, setAttachFiles] = React.useState<FileList | null>(null);

  // Create Form State
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [selectedResponsibleId, setSelectedResponsibleId] = useState('');

  // Inline edit in detail: financial fields (admin only), synced when app changes
  const [detailFinance, setDetailFinance] = useState({
    annualPayment: '',
    educationVat: '',
    grossCommission: '',
    abroadVat: '',
    netCommission: '',
    bonusMax: '',
    bonusMin: '',
    agencyCommission: '',
    agencyBonus: '',
    agencyContractAmount: '',
    agencyPaidContractAmount: '',
    agencyPaidContractDescription: '',
    agencyPaidContractDescriptionDate: '',
    agencyPaidContractPaymentMethod: '',
    currency: 'USD',
    remainingMin: '',
    remainingMax: ''
  });
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [detailLeftTab, setDetailLeftTab] = useState<'general' | 'files'>('general');
  const [editFormAgentId, setEditFormAgentId] = useState('');
  const [editFormResponsibleId, setEditFormResponsibleId] = useState('');

  const agentUsers = useMemo(() => users.filter(u => (u.role || '').toString().toLowerCase() === 'agent'), [users]);
  const responsibleUsers = useMemo(() => users.filter(u => { const r = (u.role || '').toString().toUpperCase(); return r === 'ADMIN' || r === 'USER'; }), [users]);
  const isAdminOrUser = currentUser && ((currentUser.role || '').toString().toUpperCase() === 'ADMIN' || (currentUser.role || '').toString().toUpperCase() === 'USER');
  const canSeeAgentColumn = !!isAdminOrUser;
  const isAdmin = currentUser && (currentUser.role || '').toString().toUpperCase() === 'ADMIN';
  const isAgent = currentUser && (currentUser.role || '').toString().toLowerCase() === 'agent';

  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterDegree, setFilterDegree] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterLang, setFilterLang] = useState('');
  const [filterUni, setFilterUni] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);

  const activePeriods = useMemo(() => periods.filter(p => p.active !== false), [periods]);
  const getPeriod = (id: string | undefined) => (id ? periods.find(p => p.id === id) : null);
  const financeFromApplication = (app: Application) => ({
    annualPayment: app.annualPayment != null ? String(app.annualPayment) : '',
    educationVat: app.educationVat != null ? String(app.educationVat) : '',
    grossCommission: app.grossCommission != null ? String(app.grossCommission) : '',
    abroadVat: app.abroadVat != null ? String(app.abroadVat) : '',
    netCommission: app.netCommission != null ? String(app.netCommission) : '',
    bonusMax: app.bonusMax != null ? String(app.bonusMax) : '',
    bonusMin: app.bonusMin != null ? String(app.bonusMin) : '',
    agencyCommission: app.agencyCommission != null ? String(app.agencyCommission) : '',
    agencyBonus: app.agencyBonus != null ? String(app.agencyBonus) : '',
    agencyContractAmount: app.agencyContractAmount != null ? String(app.agencyContractAmount) : '',
    agencyPaidContractAmount: app.agencyPaidContractAmount != null ? String(app.agencyPaidContractAmount) : '',
    agencyPaidContractDescription: app.agencyPaidContractDescription || '',
    agencyPaidContractDescriptionDate: app.agencyPaidContractDescriptionDate || '',
    agencyPaidContractPaymentMethod: app.agencyPaidContractPaymentMethod || '',
    currency: (app.currency && ['USD', 'TRY', 'EUR'].includes(app.currency)) ? app.currency : 'USD',
    remainingMin: app.remainingMin != null ? String(app.remainingMin) : '',
    remainingMax: app.remainingMax != null ? String(app.remainingMax) : ''
  });

  // Derived filters: first by period (active only), then by degree
  const availablePrograms = useMemo(() => {
    return programs.filter(p =>
      p.isOpen !== false &&
      (!filterPeriod || p.periodId === filterPeriod) &&
      (!filterDegree || p.degree === filterDegree)
    );
  }, [programs, filterPeriod, filterDegree]);
  const uniqueDegrees = useMemo(() => Array.from(new Set(availablePrograms.map(p => p.degree))), [availablePrograms]);

  const createAvailableUnis = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    availablePrograms.forEach(p => {
      const uni = universities.find(u => u.id === p.universityId);
      if (uni && !byId.has(uni.id)) byId.set(uni.id, { id: uni.id, name: uni.name });
    });
    return Array.from(byId.values());
  }, [availablePrograms, universities]);

  const createAvailableDegrees = useMemo(() => {
    return Array.from(new Set(
      availablePrograms
        .filter(p => !filterUni || p.universityId === filterUni)
        .map(p => p.degree)
    ));
  }, [availablePrograms, filterUni]);

  const createAvailableLanguages = useMemo(() => {
    return Array.from(new Set(
      availablePrograms
        .filter(p =>
          (!filterUni || p.universityId === filterUni) &&
          (!filterDegree || p.degree === filterDegree)
        )
        .map(p => p.language)
    ));
  }, [availablePrograms, filterUni, filterDegree]);

  const createAvailableProgramNames = useMemo(() => {
    return Array.from(new Set(
      availablePrograms
        .filter(p =>
          (!filterUni || p.universityId === filterUni) &&
          (!filterDegree || p.degree === filterDegree) &&
          (!filterLang || p.language === filterLang)
        )
        .map(p => p.name)
    ));
  }, [availablePrograms, filterUni, filterDegree, filterLang]);

  const finalProgramId = useMemo(() => {
    if (!filterUni || !filterDegree || !filterLang || !filterName) return null;
    return programs.find(p =>
      (!filterPeriod || p.periodId === filterPeriod) &&
      p.universityId === filterUni &&
      p.degree === filterDegree &&
      p.language === filterLang &&
      p.name === filterName
    )?.id;
  }, [filterPeriod, filterUni, filterDegree, filterLang, filterName, programs]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudent && finalProgramId) {
      const program = getProgram(finalProgramId);
      const agentId = selectedAgentId || (currentUser?.id ?? '');
      const newId = await onAddApplication({
        id: Date.now().toString(),
        studentId: selectedStudent,
        programId: finalProgramId,
        periodId: filterPeriod || program?.periodId,
        status: ApplicationStatus.DRAFT,
        semester: 'Fall 2024',
        createdAt: new Date().toISOString().split('T')[0],
        files: [],
        userId: agentId || undefined,
        ...(selectedResponsibleId && { responsibleId: selectedResponsibleId })
      }, files);
      if (newId) {
        setSelectedAppId(newId);
        setView('detail');
        setSelectedStudent(''); setFilterPeriod(''); setFilterDegree(''); setFilterName(''); setFilterLang(''); setFilterUni(''); setFiles(null); setSelectedAgentId(''); setSelectedResponsibleId('');
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

  // Sync inline financial fields when detail app changes; exit edit mode when app changes
  useEffect(() => {
    if (!selectedAppId) return;
    const app = applications.find(a => a.id === selectedAppId);
    if (app) {
      setDetailFinance(financeFromApplication(app));
      setEditFormAgentId(app.userId || '');
      setEditFormResponsibleId(app.responsibleId || '');
    }
    setDetailEditMode(false);
    setDetailLeftTab('general');
  }, [selectedAppId, applications]);

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

  const getResponsibleLabel = (app: Application) =>
    (app.responsibleName && app.responsibleName.trim()) ||
    (app.responsibleId ? users.find(u => u.id === app.responsibleId)?.name : '') ||
    '—';

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
      const matchCreated = matchesCreatedAtRange(app.createdAt, filterAppCreatedFrom, filterAppCreatedTo);
      return matchNumber && matchName && matchAgent && matchUniversity && matchStatus && matchDegree && matchCreated;
    });
    return list;
  }, [applications, students, programs, universities, users, searchApplicationNumber, searchStudentName, filterAgents, filterUniversities, filterStatuses, filterDegrees, filterAppCreatedFrom, filterAppCreatedTo]);

  const sortedApplications = useMemo(() => {
    const list = [...filteredApplications];
    if (!sortBy) {
      list.sort((a, b) => {
        const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return tB - tA;
      });
      return list;
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const sA = getStudent(a.studentId), sB = getStudent(b.studentId);
      const pA = getProgram(a.programId), pB = getProgram(b.programId);
      let va: string | number, vb: string | number;
      switch (sortBy) {
        case 'number': va = (a.id || '').toLowerCase(); vb = (b.id || '').toLowerCase(); return dir * (va as string).localeCompare(vb as string);
        case 'agent': va = getAgentName(a).toLowerCase(); vb = getAgentName(b).toLowerCase(); return dir * (va as string).localeCompare(vb as string);
        case 'responsible': va = getResponsibleLabel(a).toLowerCase(); vb = getResponsibleLabel(b).toLowerCase(); return dir * (va as string).localeCompare(vb as string);
        case 'student': va = `${sA?.firstName || ''} ${sA?.lastName || ''}`.trim().toLowerCase(); vb = `${sB?.firstName || ''} ${sB?.lastName || ''}`.trim().toLowerCase(); return dir * (va as string).localeCompare(vb as string);
        case 'program': va = (pA?.name || '').toLowerCase(); vb = (pB?.name || '').toLowerCase(); return dir * (va as string).localeCompare(vb as string);
        case 'createdAt': va = new Date(a.createdAt || 0).getTime(); vb = new Date(b.createdAt || 0).getTime(); return dir * ((va as number) - (vb as number));
        case 'updatedAt': va = new Date(a.updatedAt || a.createdAt || 0).getTime(); vb = new Date(b.updatedAt || b.createdAt || 0).getTime(); return dir * ((va as number) - (vb as number));
        case 'status': va = (a.status || '').toLowerCase(); vb = (b.status || '').toLowerCase(); return dir * (va as string).localeCompare(vb as string);
        default: return 0;
      }
    });
    return list;
  }, [filteredApplications, sortBy, sortDir, users]);

  const TREE_PAGE_SIZE = 80;
  const totalTreePages = Math.max(1, Math.ceil(sortedApplications.length / TREE_PAGE_SIZE));
  const pagedApplications = useMemo(() => {
    const start = (treePage - 1) * TREE_PAGE_SIZE;
    return sortedApplications.slice(start, start + TREE_PAGE_SIZE);
  }, [sortedApplications, treePage]);
  const treeFrom = sortedApplications.length === 0 ? 0 : ((treePage - 1) * TREE_PAGE_SIZE) + 1;
  const treeTo = Math.min(treePage * TREE_PAGE_SIZE, sortedApplications.length);
  const KANBAN_PAGE_SIZE = 80;
  const totalKanbanPages = Math.max(1, Math.ceil(sortedApplications.length / KANBAN_PAGE_SIZE));
  const pagedKanbanApplications = useMemo(() => {
    const start = (kanbanPage - 1) * KANBAN_PAGE_SIZE;
    return sortedApplications.slice(start, start + KANBAN_PAGE_SIZE);
  }, [sortedApplications, kanbanPage]);
  const kanbanFrom = sortedApplications.length === 0 ? 0 : ((kanbanPage - 1) * KANBAN_PAGE_SIZE) + 1;
  const kanbanTo = Math.min(kanbanPage * KANBAN_PAGE_SIZE, sortedApplications.length);

  const toggleSort = (key: string) => {
    setSortBy(prev => (prev === key ? prev : key));
    setSortDir(prev => (sortBy === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
  };

  useEffect(() => {
    if (treePage > totalTreePages) setTreePage(totalTreePages);
  }, [treePage, totalTreePages]);

  useEffect(() => {
    if (kanbanPage > totalKanbanPages) setKanbanPage(totalKanbanPages);
  }, [kanbanPage, totalKanbanPages]);

  useEffect(() => {
    setTreePage(1);
    setKanbanPage(1);
  }, [searchApplicationNumber, searchStudentName, filterAgents, filterUniversities, filterStatuses, filterDegrees, filterAppCreatedFrom, filterAppCreatedTo, sortBy, sortDir, listViewMode]);
  const applicationColumnOptions = [
    { key: 'number', label: t.number },
    { key: 'status', label: t.applicationStatus },
    { key: 'agent', label: t.agent },
    { key: 'responsible', label: t.responsible },
    { key: 'student', label: t.studentInfo },
    { key: 'program', label: t.program },
    { key: 'createdAt', label: t.createdAt },
    { key: 'updatedAt', label: t.lastUpdatedAt }
  ];
  const storageKey = `tree-columns:applications:${currentUser?.id || 'guest'}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter((k: string) => applicationColumnKeys.includes(k));
      if (valid.length > 0) setVisibleTreeColumns(valid);
    } catch {
      // ignore corrupted localStorage values
    }
  }, [storageKey, applicationColumnKeys]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify(visibleTreeColumns));
  }, [storageKey, visibleTreeColumns]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) {
        setColumnsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const hiddenByConfig = sortBy && applicationColumnKeys.includes(sortBy) && !visibleTreeColumns.includes(sortBy);
    const hiddenByRole = (sortBy === 'responsible' || sortBy === 'agent') && !canSeeAgentColumn;
    if (hiddenByConfig || hiddenByRole) {
      setSortBy(null);
      setSortDir('asc');
    }
  }, [sortBy, visibleTreeColumns, canSeeAgentColumn, applicationColumnKeys]);

  const toggleTreeColumn = (key: string) => {
    setVisibleTreeColumns(prev => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter(k => k !== key);
      }
      return [...prev, key];
    });
  };

  useEffect(() => {
    const allowed = canSeeAgentColumn ? applicationColumnKeys : applicationColumnKeys.filter(k => k !== 'agent' && k !== 'responsible');
    const normalized = visibleTreeColumns.filter(k => allowed.includes(k));
    if (normalized.length !== visibleTreeColumns.length) {
      setVisibleTreeColumns(normalized.length > 0 ? normalized : allowed);
      return;
    }
    if (normalized.length === 0) setVisibleTreeColumns(allowed);
  }, [canSeeAgentColumn, applicationColumnKeys, visibleTreeColumns]);
  const SortTh = ({ colKey, label, className = '' }: { colKey: string; label: string; className?: string }) => (
    <th style={{ fontWeight: 700 }} className={`px-6 py-5 text-gray-900 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100/80 transition-colors ${className}`} onClick={() => toggleSort(colKey)}>
      <span style={{ fontWeight: 700 }} className="inline-flex items-center gap-1 text-gray-900">
        {label}
        {sortBy === colKey ? (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <span className="opacity-30"><ChevronDown size={14} /></span>}
      </span>
    </th>
  );

  const renderCreate = () => (
    <div className="w-full max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Plus className="text-blue-600" /> {t.addApplication}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {isAdminOrUser && agentUsers.length > 0 && (
          <div>
            <label className="block font-semibold mb-2 text-gray-700">{t.agent}</label>
            <select
              required
              className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white border-gray-200 transition-all"
              value={selectedAgentId}
              onChange={e => setSelectedAgentId(e.target.value)}
            >
              <option value="">{t.selectAgent}</option>
              {agentUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} {u.email ? `(${u.email})` : ''}</option>
              ))}
            </select>
          </div>
        )}

        {isAdminOrUser && responsibleUsers.length > 0 && (
          <div>
            <label className="block font-semibold mb-2 text-gray-700">{t.responsible}</label>
            <select
              className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white border-gray-200 transition-all"
              value={selectedResponsibleId}
              onChange={e => setSelectedResponsibleId(e.target.value)}
            >
              <option value="">{t.selectResponsible}</option>
              {responsibleUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} {u.email ? `(${u.email})` : ''}</option>
              ))}
            </select>
          </div>
        )}

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
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-wider px-1">{t.period}</label>
              <select
                className="w-full p-2.5 border border-blue-100 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                value={filterPeriod}
                onChange={e => { setFilterPeriod(e.target.value); setFilterDegree(''); setFilterName(''); setFilterLang(''); setFilterUni(''); }}
                required
              >
                <option value="">{t.selectPeriod}</option>
                {activePeriods.map(per => (
                  <option key={per.id} value={per.id}>{per.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-wider px-1">{t.universities}</label>
              <select
                className="w-full p-2.5 border border-blue-100 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                value={filterUni}
                onChange={e => { setFilterUni(e.target.value); setFilterDegree(''); setFilterLang(''); setFilterName(''); }}
                disabled={!filterPeriod}
                required
              >
                <option value="">{t.selectUniversity}</option>
                {createAvailableUnis.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-wider px-1">{t.programDegree}</label>
              <select
                className="w-full p-2.5 border border-blue-100 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                value={filterDegree}
                onChange={e => { setFilterDegree(e.target.value); setFilterLang(''); setFilterName(''); }}
                disabled={!filterUni}
                required
              >
                <option value="">{t.selectDegree}</option>
                {createAvailableDegrees.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-wider px-1">{t.programLanguage}</label>
              <select
                className="w-full p-2.5 border border-blue-100 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                value={filterLang}
                onChange={e => { setFilterLang(e.target.value); setFilterName(''); }}
                disabled={!filterDegree}
                required
              >
                <option value="">{t.selectLanguage}</option>
                {createAvailableLanguages.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-wider px-1">{t.programName}</label>
              <select
                className="w-full p-2.5 border border-blue-100 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                disabled={!filterLang}
                required
              >
                <option value="">{t.selectProgram}</option>
                {createAvailableProgramNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
          <button type="button" onClick={() => setView('list')} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">{t.cancel}</button>
          <button type="submit" disabled={!selectedStudent || !finalProgramId || (isAdminOrUser && agentUsers.length > 0 && !selectedAgentId)} className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-200 transition-all active:scale-95">{t.save}</button>
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
        const senderRole = (currentUser?.role || 'USER').toString().toUpperCase();
        const res = await fetch(`/api/applications/${selectedAppId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: senderRole,
            message: newMessage.trim(),
            senderUserId: currentUser?.id ?? undefined
          })
        });
        const data = await res.json();
        if (res.ok) {
          const senderName = data.senderName ?? currentUser?.name ?? null;
          setMessages(prev => [...prev, {
            id: data.id,
            sender: senderRole,
            message: newMessage.trim(),
            createdAt: new Date().toISOString(),
            senderName: senderName
          }]);
          setNewMessage('');
          if (data.updatedAt && onSyncApplicationTimestamps) {
            onSyncApplicationTimestamps({
              applicationId: selectedAppId,
              applicationUpdatedAt: data.updatedAt,
              studentId: data.studentId,
              studentUpdatedAt: data.studentUpdatedAt ?? undefined
            });
          }
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
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center">
            <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors font-bold">
              <ChevronLeft size={20} />
              <span>{t.back}</span>
            </button>
          </div>
          <div className="flex-1 flex justify-start pl-4">
            <span className="font-mono font-bold text-gray-800 text-xl">#{app.id}</span>
          </div>
          <div className="flex items-center justify-end gap-3">
            {(isAdminOrUser || isAdmin) && onUpdateApplication && (
              detailEditMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailFinance(financeFromApplication(app));
                      setEditFormAgentId(app.userId || '');
                      setEditFormResponsibleId(app.responsibleId || '');
                      setDetailEditMode(false);
                    }}
                    className="px-4 py-2 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm whitespace-nowrap"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const num = (v: string) => { const n = parseFloat(v); return (v === '' || Number.isNaN(n)) ? null : n; };
                      onUpdateApplication(app.id, {
                        userId: editFormAgentId || null,
                        responsibleId: editFormResponsibleId || null,
                        annualPayment: num(detailFinance.annualPayment),
                        educationVat: num(detailFinance.educationVat),
                        grossCommission: num(detailFinance.grossCommission),
                        abroadVat: num(detailFinance.abroadVat),
                        netCommission: num(detailFinance.netCommission),
                        bonusMax: num(detailFinance.bonusMax),
                        bonusMin: num(detailFinance.bonusMin),
                        agencyCommission: num(detailFinance.agencyCommission),
                        agencyBonus: num(detailFinance.agencyBonus),
                        agencyContractAmount: num(detailFinance.agencyContractAmount),
                        agencyPaidContractAmount: num(detailFinance.agencyPaidContractAmount),
                        agencyPaidContractDescription: detailFinance.agencyPaidContractDescription.trim() || null,
                        agencyPaidContractDescriptionDate: detailFinance.agencyPaidContractDescriptionDate || null,
                        agencyPaidContractPaymentMethod: detailFinance.agencyPaidContractPaymentMethod.trim() || null,
                        currency: ['USD', 'TRY', 'EUR'].includes(detailFinance.currency) ? detailFinance.currency : 'USD',
                        remainingMin: num(detailFinance.remainingMin),
                        remainingMax: num(detailFinance.remainingMax)
                      });
                      setDetailEditMode(false);
                    }}
                    className="px-4 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors text-sm flex items-center gap-2 whitespace-nowrap"
                  >
                    {t.save}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setDetailEditMode(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  <FileEdit size={16} />
                  {t.editApplication}
                </button>
              )
            )}
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-xs bg-gray-100 px-3 py-1.5 rounded-full text-gray-600 font-medium" title={t.createdAt}>
                {t.createdAt}: {app.createdAt ? new Date(app.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
              </span>
              <span className="text-xs bg-blue-50 px-3 py-1.5 rounded-full text-blue-800 font-medium" title={t.lastUpdatedAt}>
                {t.lastUpdatedAt}: {(app.updatedAt || app.createdAt) ? new Date(app.updatedAt || app.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
              </span>
            </div>
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

        {/* 2. Main Body: left info/files, right chat */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white rounded-2xl p-1 border border-gray-100 shadow-sm grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setDetailLeftTab('general')}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${detailLeftTab === 'general' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {t.generalInfo}
              </button>
              <button
                type="button"
                onClick={() => setDetailLeftTab('files')}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${detailLeftTab === 'files' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {`${t.uploadFiles} (${detailFiles.length})`}
              </button>
            </div>

            {detailLeftTab === 'general' ? (
              <>
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
                    {(getPeriod(app.periodId || program?.periodId)?.name) && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="text-gray-500">{t.period}:</span>
                        <span className="font-medium text-gray-800">{getPeriod(app.periodId || program?.periodId)?.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-600 min-w-0">
                      <GraduationCap size={16} className="text-purple-400 shrink-0" />
                      <span className="text-blue-600 font-semibold">{university?.name || '—'}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium">{translateDegree(program?.degree || '')}</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">{program?.language || '—'}</span>
                    </div>
                  </div>
                </div>

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
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail size={16} className="text-gray-400 shrink-0" />
                      <span className="min-w-0 truncate" title={student?.email || undefined}>{student?.email || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone size={16} className="text-gray-400 shrink-0" />
                      <span className="min-w-0 truncate" title={student?.phone || undefined}>{student?.phone || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <FileText size={16} className="text-gray-400 shrink-0" />
                      <span className="font-mono min-w-0 truncate">{student?.passportNumber || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin size={16} className="text-gray-400 shrink-0" />
                      <span>{t.nationality}: {student?.nationality || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin size={16} className="text-gray-400 shrink-0" />
                      <span>{t.residenceCountry}: {student?.residenceCountry || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Responsible/Agent card */}
                {isAdminOrUser && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="bg-orange-50 p-4 rounded-xl text-orange-600 shrink-0">
                        <UserIcon size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-3">{t.hostAgent}</h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">{t.agent}</p>
                            {detailEditMode && onUpdateApplication ? (
                              <select
                                value={editFormAgentId}
                                onChange={(e) => setEditFormAgentId(e.target.value)}
                                className="w-full max-w-xs p-2.5 border border-gray-200 rounded-xl text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                              >
                                <option value="">{t.selectAgent}</option>
                                {agentUsers.map(u => (
                                  <option key={u.id} value={u.id}>{u.name} {u.email ? `(${u.email})` : ''}</option>
                                ))}
                              </select>
                            ) : (
                              <p className="text-lg font-bold text-gray-800 leading-tight">{getAgentName(app)}</p>
                            )}
                            {!detailEditMode && (app.agentPhone || (app.userId && users.find(u => u.id === app.userId)?.phone)) && (
                              <p className="text-sm text-orange-600 font-mono mt-0.5">
                                {app.agentCountryCode || (app.userId && users.find(u => u.id === app.userId)?.countryCode) || ''}{' '}
                                {app.agentPhone || (app.userId && users.find(u => u.id === app.userId)?.phone)}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">{t.responsible}</p>
                            {detailEditMode && onUpdateApplication ? (
                              <select
                                value={editFormResponsibleId}
                                onChange={(e) => setEditFormResponsibleId(e.target.value)}
                                className="w-full max-w-xs p-2.5 border border-gray-200 rounded-xl text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                              >
                                <option value="">{t.selectResponsible}</option>
                                {responsibleUsers.map(u => (
                                  <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                              </select>
                            ) : (
                              <p className="text-lg font-bold text-gray-800 leading-tight">{app.responsibleName || '—'}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Paperclip size={18} className="text-gray-400" />
                  <h4 className="font-bold text-gray-800 text-sm">{t.uploadFiles} ({detailFiles.length})</h4>
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
                                let delData: { message?: string; updatedAt?: string; studentId?: string; studentUpdatedAt?: string | null } = {};
                                try { delData = await r.json(); } catch { /* empty body */ }
                                if (r.ok) {
                                  setDetailFiles(prev => prev.filter(file => file.filename !== f.filename));
                                  if (delData.updatedAt && onSyncApplicationTimestamps) {
                                    onSyncApplicationTimestamps({
                                      applicationId: selectedAppId!,
                                      applicationUpdatedAt: delData.updatedAt,
                                      studentId: delData.studentId,
                                      studentUpdatedAt: delData.studentUpdatedAt ?? undefined
                                    });
                                  }
                                } else {
                                  alert(delData.message || t.errorDelete);
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
                      if (currentUser?.id) fd.append('user_id', currentUser.id);
                      try {
                        const r = await fetch(`/api/applications/${selectedAppId}/files`, { method: 'POST', body: fd });
                        const data = await r.json();
                        if (r.ok) {
                          setDetailFiles(data.files.map((x: any) => ({ url: x.url, name: x.name || x.url.split('/').pop(), filename: x.filename })));
                          setAttachFiles(null);
                          const inp = document.getElementById('attach-files-det') as HTMLInputElement;
                          if (inp) inp.value = '';
                          if (data.updatedAt && onSyncApplicationTimestamps) {
                            onSyncApplicationTimestamps({
                              applicationId: selectedAppId,
                              applicationUpdatedAt: data.updatedAt,
                              studentId: data.studentId,
                              studentUpdatedAt: data.studentUpdatedAt ?? undefined
                            });
                          }
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
            )}
          </div>

          {/* Chat on right */}
          <div className="lg:col-span-7 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[700px]">
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
                            {m.senderName != null && m.senderName !== ''
                              ? m.senderName
                              : isAdmin
                                ? (currentUser?.name || 'Admin')
                                : isUser
                                  ? 'Applicant'
                                  : (getAgentName(app) !== '—' ? getAgentName(app) : 'Temsilci')}
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
        </div>

        {/* 3. Financial block at bottom */}
        {isAdmin && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">Finansal Bilgiler</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm w-full">
              {detailEditMode ? (
                <>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Yıllık Ödeme</label>
                    <input
                      type="number"
                      step="any"
                      value={detailFinance.annualPayment}
                      onChange={(e) => setDetailFinance(prev => ({ ...prev, annualPayment: e.target.value }))}
                      className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Eğitim KDV</label>
                    <input
                      type="number"
                      step="any"
                      value={detailFinance.educationVat}
                      onChange={(e) => setDetailFinance(prev => ({ ...prev, educationVat: e.target.value }))}
                      className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Brüt Komisyon</label>
                    <input
                      type="number"
                      step="any"
                      value={detailFinance.grossCommission}
                      onChange={(e) => setDetailFinance(prev => ({ ...prev, grossCommission: e.target.value }))}
                      className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Yurtdışı KDV</label>
                    <input type="number" step="any" value={detailFinance.abroadVat} onChange={(e) => setDetailFinance(prev => ({ ...prev, abroadVat: e.target.value }))} className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Net Komisyon</label>
                    <input type="number" step="any" value={detailFinance.netCommission} onChange={(e) => setDetailFinance(prev => ({ ...prev, netCommission: e.target.value }))} className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Bonus Max</label>
                    <input type="number" step="any" value={detailFinance.bonusMax} onChange={(e) => setDetailFinance(prev => ({ ...prev, bonusMax: e.target.value }))} className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Bonus Min</label>
                    <input type="number" step="any" value={detailFinance.bonusMin} onChange={(e) => setDetailFinance(prev => ({ ...prev, bonusMin: e.target.value }))} className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Acenta Komisyon</label>
                    <input type="number" step="any" value={detailFinance.agencyCommission} onChange={(e) => setDetailFinance(prev => ({ ...prev, agencyCommission: e.target.value }))} className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Acenta Bonus</label>
                    <input type="number" step="any" value={detailFinance.agencyBonus} onChange={(e) => setDetailFinance(prev => ({ ...prev, agencyBonus: e.target.value }))} className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Acenta Anlaşma Miktarı</label>
                    <input type="number" step="any" value={detailFinance.agencyContractAmount} onChange={(e) => setDetailFinance(prev => ({ ...prev, agencyContractAmount: e.target.value }))} className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Acenta Ödenmiş Anlaşma Miktarı</label>
                    <input type="number" step="any" value={detailFinance.agencyPaidContractAmount} onChange={(e) => setDetailFinance(prev => ({ ...prev, agencyPaidContractAmount: e.target.value }))} className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1 lg:col-span-2">
                    <label className="text-gray-500 text-xs font-medium">Acenta Ödenmiş Anlaşma Miktarı Açıklaması</label>
                    <input type="text" value={detailFinance.agencyPaidContractDescription} onChange={(e) => setDetailFinance(prev => ({ ...prev, agencyPaidContractDescription: e.target.value }))} className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Açıklama Tarihi</label>
                    <input type="date" value={detailFinance.agencyPaidContractDescriptionDate} onChange={(e) => setDetailFinance(prev => ({ ...prev, agencyPaidContractDescriptionDate: e.target.value }))} className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Ödeme Şekli</label>
                    <input type="text" value={detailFinance.agencyPaidContractPaymentMethod} onChange={(e) => setDetailFinance(prev => ({ ...prev, agencyPaidContractPaymentMethod: e.target.value }))} className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Currency</label>
                    <select
                      value={detailFinance.currency}
                      onChange={(e) => setDetailFinance(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="USD">USD</option>
                      <option value="TRY">TRY</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Kalan Min</label>
                    <input type="number" step="any" value={detailFinance.remainingMin} onChange={(e) => setDetailFinance(prev => ({ ...prev, remainingMin: e.target.value }))} className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Kalan Max</label>
                    <input type="number" step="any" value={detailFinance.remainingMax} onChange={(e) => setDetailFinance(prev => ({ ...prev, remainingMax: e.target.value }))} className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </>
              ) : (
                <>
                  <div className="min-w-0 py-1">
                    <p className="text-gray-500 text-xs font-medium">Yıllık Ödeme</p>
                    <p className="font-medium text-gray-900 mt-0.5">{app.annualPayment != null ? Number(app.annualPayment) : '—'}</p>
                  </div>
                  <div className="min-w-0 py-1">
                    <p className="text-gray-500 text-xs font-medium">Eğitim KDV</p>
                    <p className="font-medium text-gray-900 mt-0.5">{app.educationVat != null ? Number(app.educationVat) : '—'}</p>
                  </div>
                  <div className="min-w-0 py-1">
                    <p className="text-gray-500 text-xs font-medium">Brüt Komisyon</p>
                    <p className="font-medium text-gray-900 mt-0.5">{app.grossCommission != null ? Number(app.grossCommission) : '—'}</p>
                  </div>
                  <div className="min-w-0 py-1">
                    <p className="text-gray-500 text-xs font-medium">Yurtdışı KDV</p>
                    <p className="font-medium text-gray-900 mt-0.5">{app.abroadVat != null ? Number(app.abroadVat) : '—'}</p>
                  </div>
                  <div className="min-w-0 py-1">
                    <p className="text-gray-500 text-xs font-medium">Net Komisyon</p>
                    <p className="font-medium text-gray-900 mt-0.5">{app.netCommission != null ? Number(app.netCommission) : '—'}</p>
                  </div>
                  <div className="min-w-0 py-1"><p className="text-gray-500 text-xs font-medium">Bonus Max</p><p className="font-medium text-gray-900 mt-0.5">{app.bonusMax != null ? Number(app.bonusMax) : '—'}</p></div>
                  <div className="min-w-0 py-1"><p className="text-gray-500 text-xs font-medium">Bonus Min</p><p className="font-medium text-gray-900 mt-0.5">{app.bonusMin != null ? Number(app.bonusMin) : '—'}</p></div>
                  <div className="min-w-0 py-1"><p className="text-gray-500 text-xs font-medium">Acenta Komisyon</p><p className="font-medium text-gray-900 mt-0.5">{app.agencyCommission != null ? Number(app.agencyCommission) : '—'}</p></div>
                  <div className="min-w-0 py-1"><p className="text-gray-500 text-xs font-medium">Acenta Bonus</p><p className="font-medium text-gray-900 mt-0.5">{app.agencyBonus != null ? Number(app.agencyBonus) : '—'}</p></div>
                  <div className="min-w-0 py-1"><p className="text-gray-500 text-xs font-medium">Acenta Anlaşma Miktarı</p><p className="font-medium text-gray-900 mt-0.5">{app.agencyContractAmount != null ? Number(app.agencyContractAmount) : '—'}</p></div>
                  <div className="min-w-0 py-1"><p className="text-gray-500 text-xs font-medium">Acenta Ödenmiş Anlaşma Miktarı</p><p className="font-medium text-gray-900 mt-0.5">{app.agencyPaidContractAmount != null ? Number(app.agencyPaidContractAmount) : '—'}</p></div>
                  <div className="min-w-0 py-1 lg:col-span-2"><p className="text-gray-500 text-xs font-medium">Acenta Ödenmiş Anlaşma Miktarı Açıklaması</p><p className="font-medium text-gray-900 mt-0.5 break-words">{app.agencyPaidContractDescription || '—'}</p></div>
                  <div className="min-w-0 py-1"><p className="text-gray-500 text-xs font-medium">Açıklama Tarihi</p><p className="font-medium text-gray-900 mt-0.5">{app.agencyPaidContractDescriptionDate || '—'}</p></div>
                  <div className="min-w-0 py-1"><p className="text-gray-500 text-xs font-medium">Ödeme Şekli</p><p className="font-medium text-gray-900 mt-0.5">{app.agencyPaidContractPaymentMethod || '—'}</p></div>
                  <div className="min-w-0 py-1"><p className="text-gray-500 text-xs font-medium">Currency</p><p className="font-medium text-gray-900 mt-0.5">{app.currency || 'USD'}</p></div>
                  <div className="min-w-0 py-1"><p className="text-gray-500 text-xs font-medium">Kalan Min</p><p className="font-medium text-gray-900 mt-0.5">{app.remainingMin != null ? Number(app.remainingMin) : '—'}</p></div>
                  <div className="min-w-0 py-1"><p className="text-gray-500 text-xs font-medium">Kalan Max</p><p className="font-medium text-gray-900 mt-0.5">{app.remainingMax != null ? Number(app.remainingMax) : '—'}</p></div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
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
                {(searchApplicationNumber || searchStudentName || filterAgents.length > 0 || filterUniversities.length > 0 || filterStatuses.length > 0 || filterDegrees.length > 0 || filterAppCreatedFrom || filterAppCreatedTo) && (
                  <button
                    type="button"
                    onClick={() => { setSearchApplicationNumber(''); setSearchStudentName(''); setFilterAgents([]); setFilterUniversities([]); setFilterStatuses([]); setFilterDegrees([]); setFilterAppCreatedFrom(''); setFilterAppCreatedTo(''); }}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X size={14} />
                    {t.clearFilters}
                  </button>
                )}
              </div>
              <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                <div className="relative mr-2" ref={columnsRef}>
                  <button
                    type="button"
                    onClick={() => setColumnsOpen(prev => !prev)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors rounded-md text-gray-600 hover:bg-gray-100"
                  >
                    <Filter size={16} />
                    <span className="hidden sm:inline">{t.columns}</span>
                  </button>
                  {columnsOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-30">
                      {applicationColumnOptions.filter(col => canSeeAgentColumn || (col.key !== 'agent' && col.key !== 'responsible')).map(col => (
                        <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-md cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleTreeColumns.includes(col.key)}
                            onChange={() => toggleTreeColumn(col.key)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{col.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t.filterCreatedFrom}</label>
                <input
                  type="date"
                  value={filterAppCreatedFrom}
                  onChange={e => setFilterAppCreatedFrom(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t.filterCreatedTo}</label>
                <input
                  type="date"
                  value={filterAppCreatedTo}
                  onChange={e => setFilterAppCreatedTo(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
              </div>
            </div>
          </div>

          {listViewMode === 'tree' && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-4 overflow-x-auto">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-end gap-2 text-sm text-gray-600">
                <span>{treeFrom}-{treeTo} / {sortedApplications.length}</span>
                <button
                  type="button"
                  onClick={() => setTreePage(p => Math.max(1, p - 1))}
                  disabled={treePage <= 1}
                  className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setTreePage(p => Math.min(totalTreePages, p + 1))}
                  disabled={treePage >= totalTreePages}
                  className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <table className="w-full text-right text-sm">
                <thead style={{ fontWeight: 700 }} className="bg-gray-50/50 text-gray-900 border-b border-gray-100">
                  <tr>
                    {visibleTreeColumns.includes('number') && <SortTh colKey="number" label={t.number} />}
                    {visibleTreeColumns.includes('status') && <SortTh colKey="status" label={t.applicationStatus} className="text-center" />}
                    {canSeeAgentColumn && visibleTreeColumns.includes('agent') && <SortTh colKey="agent" label={t.agent} />}
                    {isAdminOrUser && visibleTreeColumns.includes('responsible') && <SortTh colKey="responsible" label={t.responsible} />}
                    {visibleTreeColumns.includes('student') && <SortTh colKey="student" label={t.studentInfo} />}
                    {visibleTreeColumns.includes('program') && <SortTh colKey="program" label={t.program} />}
                    {visibleTreeColumns.includes('createdAt') && <SortTh colKey="createdAt" label={t.createdAt} />}
                    {visibleTreeColumns.includes('updatedAt') && <SortTh colKey="updatedAt" label={t.lastUpdatedAt} />}
                    <th className="px-6 py-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pagedApplications.map((app) => {
                    const s = getStudent(app.studentId);
                    const p = getProgram(app.programId);
                    const uni = p ? getUni(p.universityId) : null;
                    const period = getPeriod(app.periodId || p?.periodId);
                    const isExpanded = expandedAppIds.has(app.id);
                    const treeColSpan =
                      (visibleTreeColumns.includes('number') ? 1 : 0) +
                      (visibleTreeColumns.includes('status') ? 1 : 0) +
                      (canSeeAgentColumn && visibleTreeColumns.includes('agent') ? 1 : 0) +
                      (isAdminOrUser && visibleTreeColumns.includes('responsible') ? 1 : 0) +
                      (visibleTreeColumns.includes('student') ? 1 : 0) +
                      (visibleTreeColumns.includes('program') ? 1 : 0) +
                      (visibleTreeColumns.includes('createdAt') ? 1 : 0) +
                      (visibleTreeColumns.includes('updatedAt') ? 1 : 0) +
                      1; // expand toggle column
                    return (
                      <React.Fragment key={app.id}>
                        <tr
                          className="hover:bg-blue-50/30 cursor-pointer transition-colors group"
                          onClick={() => { setSelectedAppId(app.id); setView('detail'); }}
                        >
                          {visibleTreeColumns.includes('number') && (
                            <td className="px-6 py-4">
                              <span className="font-mono font-bold text-gray-900 group-hover:text-blue-600 transition-colors">#{app.id}</span>
                            </td>
                          )}
                          {visibleTreeColumns.includes('status') && (
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
                          )}
                          {canSeeAgentColumn && visibleTreeColumns.includes('agent') && <td className="px-6 py-4 text-gray-900">{getAgentName(app)}</td>}
                          {isAdminOrUser && visibleTreeColumns.includes('responsible') && (
                            <td className="px-6 py-4 text-gray-900">{getResponsibleLabel(app)}</td>
                          )}
                          {visibleTreeColumns.includes('student') && <td className="px-6 py-4 font-bold text-gray-900">{s?.firstName} {s?.lastName}</td>}
                          {visibleTreeColumns.includes('program') && (
                            <td className="px-6 py-4">
                              <span className="font-bold text-gray-900">{p?.name || '—'}</span>
                            </td>
                          )}
                          {visibleTreeColumns.includes('createdAt') && (
                            <td className="px-6 py-4 text-gray-900 font-medium">
                              {app.createdAt ? new Date(app.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                            </td>
                          )}
                          {visibleTreeColumns.includes('updatedAt') && (
                            <td className="px-6 py-4 text-gray-900 font-medium">
                              {(app.updatedAt || app.createdAt) ? new Date(app.updatedAt || app.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                            </td>
                          )}
                          <td className="px-6 py-4 text-left" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedAppIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(app.id)) next.delete(app.id);
                                  else next.add(app.id);
                                  return next;
                                });
                              }}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${isExpanded ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                              aria-expanded={isExpanded}
                            >
                              <ChevronDown size={18} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/90 border-b border-gray-100">
                            <td colSpan={treeColSpan} className="px-6 py-4 text-left align-top">
                              <div
                                dir="ltr"
                                className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 text-sm text-gray-700 w-full justify-items-start"
                              >
                                <div className="text-left min-w-0">
                                  <span className="block text-xs font-semibold text-gray-500 mb-1">{t.universityName}</span>
                                  <span className="font-medium text-gray-900 break-words">{uni?.name || '—'}</span>
                                </div>
                                <div className="text-left min-w-0">
                                  <span className="block text-xs font-semibold text-gray-500 mb-1">{t.period}</span>
                                  <span className="font-medium text-gray-900 break-words">{period?.name || '—'}</span>
                                </div>
                                <div className="text-left min-w-0">
                                  <span className="block text-xs font-semibold text-gray-500 mb-1">{t.program}</span>
                                  <span className="font-medium text-gray-900 break-words">{p?.name || '—'}</span>
                                  {p?.degree && (
                                    <span className="block text-xs text-gray-500 mt-1">{translateDegree(p.degree)}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              {sortedApplications.length === 0 && (
                <div className="py-20 text-center">
                  <FileText size={48} className="mx-auto text-gray-100 mb-4" />
                  <p className="text-gray-400 font-medium">{t.noApplicationsInSystem}</p>
                </div>
              )}
            </div>
          )}

          {listViewMode === 'kanban' && (
            <>
              <div className="mt-2 mb-3 flex items-center justify-end gap-2 text-sm text-gray-600">
                <span>{kanbanFrom}-{kanbanTo} / {sortedApplications.length}</span>
                <button
                  type="button"
                  onClick={() => setKanbanPage(p => Math.max(1, p - 1))}
                  disabled={kanbanPage <= 1}
                  className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setKanbanPage(p => Math.min(totalKanbanPages, p + 1))}
                  disabled={kanbanPage >= totalKanbanPages}
                  className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedApplications.length === 0 ? (
                  <div className="col-span-full py-20 text-center">
                    <FileText size={48} className="mx-auto text-gray-100 mb-4" />
                    <p className="text-gray-400 font-medium">{t.noApplicationsInSystem}</p>
                  </div>
                ) : (
                  pagedKanbanApplications.map((app) => {
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
                        {isAdminOrUser && (
                          <p className="text-[10px] text-gray-500 mt-1 truncate">
                            <span className="font-semibold text-gray-600">{t.responsible}:</span> {getResponsibleLabel(app)}
                          </p>
                        )}
                        {getPeriod(app.periodId || p?.periodId)?.name && (
                          <p className="text-[10px] text-gray-400">{getPeriod(app.periodId || p?.periodId)?.name}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-2">
                          {t.createdAt}: {app.createdAt ? new Date(app.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          <br />
                          {t.lastUpdatedAt}: {(app.updatedAt || app.createdAt) ? new Date(app.updatedAt || app.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </p>
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
            </>
          )}
        </div>
      )}

      {view === 'create' && renderCreate()}
      {view === 'detail' && renderDetail()}
    </div>
  );
};