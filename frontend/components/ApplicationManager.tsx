import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Application, Student, Program, University, ApplicationStatus, User, Period, AgencyCompany, ApplicationListFilters } from '../types';
import {
  Plus, Filter, FileText,
  MessageSquare, User as UserIcon, GraduationCap,
  Send, Upload, Paperclip, ChevronLeft, MapPin, Trash2, Mail, Phone, FileEdit,
  List, LayoutGrid, Search, X, ChevronDown, ChevronUp, ChevronRight, DollarSign
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../contexts/LanguageContext';
import { matchesCreatedAtRange } from '../utils/createdAtRangeFilter';
import { getApplicationStatusBadgeClass } from '../utils/applicationStatusStyles';
import { normalizeApplicationStatus } from '../utils/applicationStatus';
import { useNotifications } from '../contexts/NotificationContext';
import { buildNotificationEntityIndex } from '../utils/notifications';
import { NotificationUnreadDot } from './NotificationUnreadDot';
import { CreatedAtRangeFilter } from './CreatedAtRangeFilter';
import { StaffTypedFileUpload } from './StaffTypedFileUpload';
import { getStudentFileTypeLabel, type StudentFileTypeCode } from '../constants/studentFileTypes';
import { MassEditModal, type MassEditFieldDef } from './MassEditModal';
import { SearchableMultiSelect } from './SearchableMultiSelect';
import { SearchableSelect } from './SearchableSelect';

const FINANCIAL_TREE_FIELDS: { key: keyof Application; label: string }[] = [
  { key: 'annualPayment', label: 'Yıllık ödeme' },
  { key: 'educationVat', label: 'Eğitim KDV tutarı' },
  { key: 'grossCommission', label: 'Brüt komisyon' },
  { key: 'abroadVat', label: 'Yurtdışı KDV tutarı' },
  { key: 'netCommission', label: 'Net komisyon' },
  { key: 'bonusMax', label: 'Bonus Max' },
  { key: 'bonusMin', label: 'Bonus Min' },
  { key: 'agencyCommission', label: 'Acenta komisyon' },
  { key: 'agencyBonus', label: 'Acenta bonus' },
  { key: 'depositSupport', label: 'Depozito desteği' },
  { key: 'agencyContractAmount', label: 'Acenta anlaşma' },
  { key: 'currency', label: 'Para birimi' },
  { key: 'remainingMin', label: 'Kalan Min' },
  { key: 'remainingMax', label: 'Kalan Max' },
  { key: 'paymentDeserved', label: 'Ödemeyi hak etti' },
  { key: 'paymentDate', label: 'Ödeme tarihi' },
  { key: 'paymentMonth', label: 'Ödeme ayı' }
];

const FINANCIAL_TREE_BASE_COLUMN_KEYS = [
  'number',
  'status',
  'agent',
  'nationality',
  'degree',
  'program',
  'university',
  'student',
  'agencyCompany',
  'description'
] as const;

const FINANCIAL_TREE_COLUMN_KEYS = [
  ...FINANCIAL_TREE_BASE_COLUMN_KEYS,
  ...FINANCIAL_TREE_FIELDS.map((field) => String(field.key))
];

const FINANCIAL_TREE_NUMERIC_KEYS = new Set<keyof Application>([
  'annualPayment',
  'educationVat',
  'grossCommission',
  'abroadVat',
  'netCommission',
  'bonusMax',
  'bonusMin',
  'agencyCommission',
  'agencyBonus',
  'depositSupport',
  'agencyContractAmount',
  'remainingMin',
  'remainingMax'
]);

const formatApplicationFinanceValue = (app: Application, key: keyof Application): string => {
  const v = app[key];
  if (key === 'paymentDeserved') return v === true ? 'Açık' : 'Kapalı';
  if (key === 'currency') return v ? String(v) : 'USD';
  if (key === 'paymentDate' || key === 'paymentMonth') return v ? String(v) : '—';
  if (v == null || v === '') return '—';
  const n = Number(v);
  return Number.isNaN(n) ? '—' : n.toLocaleString();
};

type ApplicationChatMessage = {
  id: string;
  sender: string;
  senderUserId?: string | null;
  message: string;
  createdAt: string;
  senderName?: string | null;
};

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
  const { t } = useTranslation();
  return (
    <SearchableMultiSelect
      selected={selected}
      onChange={onChange}
      options={options}
      optionLabels={optionLabels}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder ?? t.search}
      noResultsText={t.searchNoResults}
      className={className}
    />
  );
}

interface ApplicationManagerProps {
  applications: Application[];
  students: Student[];
  programs: Program[];
  universities: University[];
  periods?: Period[];
  agencyCompanies?: AgencyCompany[];
  users?: User[];
  onAddApplication: (app: Application, files?: FileList | null) => Promise<string | null> | void;
  onUpdateStatus: (id: string, status: ApplicationStatus) => void;
  onUpdateApplication?: (id: string, payload: {
    status?: ApplicationStatus;
    responsibleId?: string | null;
    userId?: string | null;
    programId?: string | null;
    periodId?: string | null;
    annualPayment?: number | null;
    educationVatRate?: number | null;
    abroadVatRate?: number | null;
    grossCommission?: number | null;
    bonusMax?: number | null;
    bonusMin?: number | null;
    agencyCommission?: number | null;
    agencyBonus?: number | null;
    depositSupport?: number | null;
    agencyCompanyId?: string | null;
    currency?: string | null;
    paymentDeserved?: boolean;
    internalDescription?: string | null;
  }, opts?: { silent?: boolean }) => void | Promise<boolean | void>;
  onDeleteApplication?: (id: string) => void | Promise<void>;
  onSyncApplicationTimestamps?: (payload: {
    applicationId: string;
    applicationUpdatedAt: string;
    studentId?: string;
    studentUpdatedAt?: string | null;
  }) => void;
  onStudentFilesChange?: (studentId: string, fileUrls: string[]) => void;
  initialStudentId?: string | null;
  clearInitialStudent?: () => void;
  targetApplicationId?: string | null;
  clearTargetApplication?: () => void;
  initialListFilters?: ApplicationListFilters | null;
  clearInitialListFilters?: () => void;
  onOpenStudent?: (studentId: string) => void;
  currentUser?: { role: string; name?: string; id?: string; email?: string };
  /** When set, only the application detail view is shown (e.g. embedded under Students tab). */
  embedMode?: 'students';
  embedApplicationId?: string | null;
  onEmbedBack?: () => void;
}

export const ApplicationManager: React.FC<ApplicationManagerProps> = ({
  applications, students, programs, universities, periods = [], agencyCompanies = [], users = [], onAddApplication, onUpdateStatus, onUpdateApplication, onDeleteApplication,
  onSyncApplicationTimestamps, onStudentFilesChange,
  initialStudentId, clearInitialStudent, targetApplicationId, clearTargetApplication,
  initialListFilters, clearInitialListFilters,
  onOpenStudent, currentUser,
  embedMode, embedApplicationId, onEmbedBack
}) => {
  const { t, translateStatus, translateDegree } = useTranslation();
  const { notifications, markAsReadForApplication } = useNotifications();
  const notificationIndex = useMemo(
    () => buildNotificationEntityIndex(notifications, applications),
    [notifications, applications]
  );
  const { language } = useLanguage();
  const dateLocale = { ar: 'ar-EG', en: 'en-GB', tr: 'tr-TR' }[language] || 'en-GB';
  const scrollContentTop = () => {
    const container = document.getElementById('app-scroll-container');
    if (container) container.scrollTo({ top: 0, behavior: 'auto' });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [listViewMode, setListViewMode] = useState<'tree' | 'kanban'>('tree');
  const [treeDataMode, setTreeDataMode] = useState<'general' | 'financial'>('general');
  const [searchApplicationNumber, setSearchApplicationNumber] = useState('');
  const [searchStudentName, setSearchStudentName] = useState('');
  const [filterAgents, setFilterAgents] = useState<string[]>([]);
  const [filterResponsibles, setFilterResponsibles] = useState<string[]>([]);
  const [filterUniversities, setFilterUniversities] = useState<string[]>([]);
  const [filterPrograms, setFilterPrograms] = useState<string[]>([]);
  const [filterNationalities, setFilterNationalities] = useState<string[]>([]);
  const [filterCurrencies, setFilterCurrencies] = useState<string[]>([]);
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
  const applicationColumnKeys = useMemo(
    () => ['number', 'status', 'agent', 'responsible', 'student', 'nationality', 'program', 'university', 'degree', 'agencyCompany', 'description', 'createdAt', 'updatedAt'],
    []
  );
  const [visibleTreeColumns, setVisibleTreeColumns] = useState<string[]>(applicationColumnKeys);
  const [visibleFinancialColumns, setVisibleFinancialColumns] = useState<string[]>(FINANCIAL_TREE_COLUMN_KEYS);

  const [messages, setMessages] = React.useState<ApplicationChatMessage[]>([]);
  const [newMessage, setNewMessage] = React.useState('');
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const [internalMessages, setInternalMessages] = React.useState<ApplicationChatMessage[]>([]);
  const [newInternalMessage, setNewInternalMessage] = React.useState('');
  const internalChatMessagesRef = useRef<HTMLDivElement>(null);
  const [internalDescription, setInternalDescription] = useState('');
  const [detailFiles, setDetailFiles] = React.useState<Array<{ url: string; name: string; filename?: string; fileType?: string; description?: string }>>([]);
  const [attachFiles, setAttachFiles] = React.useState<FileList | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);

  // Create Form State
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [selectedResponsibleId, setSelectedResponsibleId] = useState('');
  const [selectedAgencyCompanyId, setSelectedAgencyCompanyId] = useState('');

  // Inline edit in detail: financial fields (admin only), synced when app changes
  const [detailFinance, setDetailFinance] = useState({
    annualPayment: '',
    educationVatRate: '',
    abroadVatRate: '10',
    grossCommission: '',
    abroadVat: '',
    netCommission: '',
    bonusMax: '',
    bonusMin: '',
    agencyCommission: '',
    agencyBonus: '',
    depositSupport: '',
    agencyContractAmount: '',
    currency: 'USD',
    remainingMin: '',
    remainingMax: '',
    paymentDeserved: false,
    paymentDate: '',
    paymentMonth: ''
  });
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [massEditOpen, setMassEditOpen] = useState(false);
  const [massEditApplying, setMassEditApplying] = useState(false);
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<Set<string>>(() => new Set());
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  const [editFormAgentId, setEditFormAgentId] = useState('');
  const [editFormResponsibleId, setEditFormResponsibleId] = useState('');
  const [editFormAgencyCompanyId, setEditFormAgencyCompanyId] = useState('');
  const [editFormStatus, setEditFormStatus] = useState<ApplicationStatus>(ApplicationStatus.NEW);
  const [editFilterPeriod, setEditFilterPeriod] = useState('');
  const [editFilterUni, setEditFilterUni] = useState('');
  const [editFilterDegree, setEditFilterDegree] = useState('');
  const [editFilterLang, setEditFilterLang] = useState('');
  const [editFilterProgramName, setEditFilterProgramName] = useState('');

  const seedEditProgramFilters = (app: Application) => {
    const program = programs.find(p => p.id === app.programId);
    setEditFilterPeriod(app.periodId || program?.periodId || '');
    setEditFilterUni(program?.universityId || '');
    setEditFilterDegree(program?.degree || '');
    setEditFilterLang(program?.language || '');
    setEditFilterProgramName(program?.name || '');
  };

  const agentUsers = useMemo(() => users.filter(u => (u.role || '').toString().toLowerCase() === 'agent'), [users]);
  const responsibleUsers = useMemo(() => users.filter(u => { const r = (u.role || '').toString().toUpperCase(); return r === 'ADMIN' || r === 'USER'; }), [users]);
  const isAdminOrUser = currentUser && ((currentUser.role || '').toString().toUpperCase() === 'ADMIN' || (currentUser.role || '').toString().toUpperCase() === 'USER');
  const canSeeAgentColumn = !!isAdminOrUser;
  const isAdmin = currentUser && (currentUser.role || '').toString().toUpperCase() === 'ADMIN';
  const isAgent = currentUser && (currentUser.role || '').toString().toLowerCase() === 'agent';
  const displayStatus = (status: string) => translateStatus(status, currentUser?.role);
  const showFinancialTree = !!(isAdmin && listViewMode === 'tree' && treeDataMode === 'financial');

  useEffect(() => {
    if (!isAdmin && treeDataMode === 'financial') setTreeDataMode('general');
  }, [isAdmin, treeDataMode]);

  useEffect(() => {
    if (showFinancialTree) setColumnsOpen(false);
  }, [showFinancialTree]);

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
    educationVatRate: app.educationVatRate != null ? String(app.educationVatRate) : '',
    abroadVatRate: app.abroadVatRate != null ? String(app.abroadVatRate) : '10',
    grossCommission: app.grossCommission != null ? String(app.grossCommission) : '',
    abroadVat: app.abroadVat != null ? String(app.abroadVat) : '',
    netCommission: app.netCommission != null ? String(app.netCommission) : '',
    bonusMax: app.bonusMax != null ? String(app.bonusMax) : '',
    bonusMin: app.bonusMin != null ? String(app.bonusMin) : '',
    agencyCommission: app.agencyCommission != null ? String(app.agencyCommission) : '',
    agencyBonus: app.agencyBonus != null ? String(app.agencyBonus) : '',
    depositSupport: app.depositSupport != null ? String(app.depositSupport) : '',
    agencyContractAmount: app.agencyContractAmount != null ? String(app.agencyContractAmount) : '',
    currency: (app.currency && ['USD', 'TRY', 'EUR'].includes(app.currency)) ? app.currency : 'USD',
    remainingMin: app.remainingMin != null ? String(app.remainingMin) : '',
    remainingMax: app.remainingMax != null ? String(app.remainingMax) : '',
    paymentDeserved: app.paymentDeserved === true,
    paymentDate: app.paymentDate || '',
    paymentMonth: app.paymentMonth || ''
  });
  const numOrZero = (v: string) => {
    const n = parseFloat(v);
    return Number.isNaN(n) ? 0 : n;
  };
  const computedEducationVatAmount = useMemo(() => {
    const annual = parseFloat(detailFinance.annualPayment);
    const rate = parseFloat(detailFinance.educationVatRate);
    if (Number.isNaN(annual) || Number.isNaN(rate)) return '';
    return String((annual * rate) / 100);
  }, [detailFinance.annualPayment, detailFinance.educationVatRate]);
  const computedAgencyContractAmount = useMemo(() => {
    const total = numOrZero(detailFinance.agencyCommission) + numOrZero(detailFinance.agencyBonus);
    return String(total);
  }, [detailFinance.agencyCommission, detailFinance.agencyBonus]);
  const computedAbroadVatAmount = useMemo(() => {
    const gross = numOrZero(detailFinance.grossCommission);
    const rate = numOrZero(detailFinance.abroadVatRate);
    return String((gross * rate) / 100);
  }, [detailFinance.grossCommission, detailFinance.abroadVatRate]);
  const computedNetCommission = useMemo(() => {
    const gross = numOrZero(detailFinance.grossCommission);
    const abroad = numOrZero(computedAbroadVatAmount);
    return String(gross - abroad);
  }, [detailFinance.grossCommission, computedAbroadVatAmount]);
  const computedRemainingMin = useMemo(() => {
    const net = numOrZero(computedNetCommission);
    const bonusMin = numOrZero(detailFinance.bonusMin);
    const contract = numOrZero(computedAgencyContractAmount);
    return String((net + bonusMin) - contract);
  }, [computedNetCommission, detailFinance.bonusMin, computedAgencyContractAmount]);
  const computedRemainingMax = useMemo(() => {
    const net = numOrZero(computedNetCommission);
    const bonusMax = numOrZero(detailFinance.bonusMax);
    const contract = numOrZero(computedAgencyContractAmount);
    return String((net + bonusMax) - contract);
  }, [computedNetCommission, detailFinance.bonusMax, computedAgencyContractAmount]);
  // Derived filters: first by period (active only), then by degree
  const availablePrograms = useMemo(() => {
    return programs.filter(p =>
      p.isOpen !== false &&
      !p.isArchived &&
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

  const editAvailablePrograms = useMemo(() => {
    const currentProgramId = selectedAppId
      ? applications.find(a => a.id === selectedAppId)?.programId
      : undefined;
    return programs.filter(p =>
      ((p.isOpen !== false && !p.isArchived) || p.id === currentProgramId) &&
      (!editFilterPeriod || p.periodId === editFilterPeriod)
    );
  }, [programs, editFilterPeriod, selectedAppId, applications]);

  const editAvailableUnis = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    editAvailablePrograms.forEach(p => {
      const uni = universities.find(u => u.id === p.universityId);
      if (uni && !byId.has(uni.id)) byId.set(uni.id, { id: uni.id, name: uni.name });
    });
    return Array.from(byId.values());
  }, [editAvailablePrograms, universities]);

  const editAvailableDegrees = useMemo(() => {
    return Array.from(new Set(
      editAvailablePrograms
        .filter(p => !editFilterUni || p.universityId === editFilterUni)
        .map(p => p.degree)
    ));
  }, [editAvailablePrograms, editFilterUni]);

  const editAvailableLanguages = useMemo(() => {
    return Array.from(new Set(
      editAvailablePrograms
        .filter(p =>
          (!editFilterUni || p.universityId === editFilterUni) &&
          (!editFilterDegree || p.degree === editFilterDegree)
        )
        .map(p => p.language)
    ));
  }, [editAvailablePrograms, editFilterUni, editFilterDegree]);

  const editAvailableProgramNames = useMemo(() => {
    return Array.from(new Set(
      editAvailablePrograms
        .filter(p =>
          (!editFilterUni || p.universityId === editFilterUni) &&
          (!editFilterDegree || p.degree === editFilterDegree) &&
          (!editFilterLang || p.language === editFilterLang)
        )
        .map(p => p.name)
    ));
  }, [editAvailablePrograms, editFilterUni, editFilterDegree, editFilterLang]);

  const editFinalProgramId = useMemo(() => {
    if (!editFilterPeriod || !editFilterUni || !editFilterDegree || !editFilterLang || !editFilterProgramName) return null;
    return programs.find(p =>
      p.periodId === editFilterPeriod &&
      p.universityId === editFilterUni &&
      p.degree === editFilterDegree &&
      p.language === editFilterLang &&
      p.name === editFilterProgramName
    )?.id || null;
  }, [editFilterPeriod, editFilterUni, editFilterDegree, editFilterLang, editFilterProgramName, programs]);

  const editProgramFormComplete = !!(editFilterPeriod && editFilterUni && editFilterDegree && editFilterLang && editFilterProgramName && editFinalProgramId);

  const editPeriodOptions = useMemo(() => {
    const list = [...activePeriods];
    if (editFilterPeriod && !list.some(p => p.id === editFilterPeriod)) {
      const current = periods.find(p => p.id === editFilterPeriod);
      if (current) list.unshift(current);
    }
    return list;
  }, [activePeriods, periods, editFilterPeriod]);


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
        status: ApplicationStatus.NEW,
        semester: 'Fall 2024',
        createdAt: new Date().toISOString().split('T')[0],
        files: [],
        userId: agentId || undefined,
        ...(selectedResponsibleId && { responsibleId: selectedResponsibleId }),
        ...(selectedAgencyCompanyId && { agencyCompanyId: selectedAgencyCompanyId })
      }, files);
      if (newId) {
        setSelectedAppId(newId);
        setView('detail');
        setSelectedStudent(''); setFilterPeriod(''); setFilterDegree(''); setFilterName(''); setFilterLang(''); setFilterUni(''); setFiles(null); setSelectedAgentId(''); setSelectedResponsibleId(''); setSelectedAgencyCompanyId('');
      }
    }
  };

  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudent(initialStudentId);
      setView('create');
      scrollContentTop();
      if (typeof clearInitialStudent === 'function') clearInitialStudent();
    }
  }, [initialStudentId, clearInitialStudent]);

  useEffect(() => {
    if (targetApplicationId) {
      setSelectedAppId(targetApplicationId);
      setView('detail');
      scrollContentTop();
      if (typeof clearTargetApplication === 'function') clearTargetApplication();
    }
  }, [targetApplicationId, clearTargetApplication]);

  useEffect(() => {
    if (embedMode === 'students' && embedApplicationId) {
      setSelectedAppId(embedApplicationId);
      setView('detail');
      scrollContentTop();
    }
  }, [embedMode, embedApplicationId]);

  useEffect(() => {
    if (view !== 'detail' || !selectedAppId) return;
    void markAsReadForApplication(selectedAppId);
  }, [view, selectedAppId, notifications, markAsReadForApplication]);

  useEffect(() => {
    if (!initialListFilters) return;
    setView('list');
    setSelectedAppId(null);
    setSearchApplicationNumber('');
    setSearchStudentName('');
    if (!isAgent) {
      setFilterAgents(initialListFilters.agents ?? []);
      setFilterResponsibles(initialListFilters.responsibles ?? []);
      setFilterCurrencies(initialListFilters.currencies ?? []);
    }
    setFilterUniversities(initialListFilters.universityIds ?? []);
    setFilterPrograms(initialListFilters.programIds ?? []);
    setFilterNationalities(initialListFilters.nationalities ?? []);
    setFilterStatuses(initialListFilters.statuses ?? []);
    setFilterDegrees(initialListFilters.degrees ?? []);
    setFilterAppCreatedFrom(initialListFilters.createdFrom ?? '');
    setFilterAppCreatedTo(initialListFilters.createdTo ?? '');
    scrollContentTop();
    if (typeof clearInitialListFilters === 'function') clearInitialListFilters();
  }, [initialListFilters, clearInitialListFilters, isAgent]);

  useEffect(() => {
    if (!isAgent) return;
    setFilterAgents([]);
    setFilterResponsibles([]);
    setFilterCurrencies([]);
  }, [isAgent]);

  useEffect(() => {
    if (view === 'create' || view === 'detail') {
      scrollContentTop();
    }
  }, [view, selectedAppId]);

  // Sync inline financial fields when detail app changes; exit edit mode when app changes
  useEffect(() => {
    if (!selectedAppId) return;
    const app = applications.find(a => a.id === selectedAppId);
    if (app) {
      setDetailFinance(financeFromApplication(app));
      setEditFormAgentId(app.userId || '');
      setEditFormResponsibleId(app.responsibleId || '');
      setEditFormAgencyCompanyId(app.agencyCompanyId || '');
      setEditFormStatus(app.status);
      setInternalDescription(app.internalDescription || '');
      seedEditProgramFilters(app);
    }
    setDetailEditMode(false);
  }, [selectedAppId, applications, programs]);

  useEffect(() => {
    if (view !== 'detail') return;
    const el = chatMessagesRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, selectedAppId, view]);

  useEffect(() => {
    if (view !== 'detail' || !isAdminOrUser) return;
    const el = internalChatMessagesRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [internalMessages, selectedAppId, view, isAdminOrUser]);

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
      if (isAdminOrUser && currentUser?.id) {
        fetch(`/api/applications/${selectedAppId}/internal-messages?actorUserId=${encodeURIComponent(currentUser.id)}`)
          .then(async res => {
            const data = await res.json();
            if (res.ok) setInternalMessages(data);
          })
          .catch(err => console.error('Failed to load internal messages', err));
      } else {
        setInternalMessages([]);
      }
      (async () => {
        try {
          const r = await fetch(`/api/applications/${selectedAppId}/files`);
          if (r.ok) {
            const list = await r.json();
            setDetailFiles(list.map((x: { url: string; name?: string; filename?: string; fileType?: string; description?: string }) => ({
              url: x.url,
              name: x.name || x.url.split('/').pop() || '',
              filename: x.filename,
              fileType: x.fileType,
              description: x.description
            })));
          } else { setDetailFiles([]); }
        } catch (e) {
          console.error('Failed to load application files', e);
          setDetailFiles([]);
        }
      })();
    }
  }, [view, selectedAppId, isAdminOrUser, currentUser?.id]);

  // Helpers
  const getStudent = (id: string) => students.find(s => s.id === id);
  const getProgram = (id: string) => programs.find(p => p.id === id);
  const getUni = (id: string) => universities.find(u => u.id === id);

  const getAgentName = (app: Application) => app.agentName || (app.userId && users.find(u => u.id === app.userId)?.name) || '—';

  const getResponsibleLabel = (app: Application) =>
    (app.responsibleName && app.responsibleName.trim()) ||
    (app.responsibleId ? users.find(u => u.id === app.responsibleId)?.name : '') ||
    '—';

  const refreshDetailFiles = async (appId: string) => {
    const r = await fetch(`/api/applications/${appId}/files`);
    if (!r.ok) return;
    const list = await r.json();
    setDetailFiles(list.map((x: { url: string; name?: string; filename?: string; fileType?: string; description?: string }) => ({
      url: x.url,
      name: x.name || x.url.split('/').pop() || '',
      filename: x.filename,
      fileType: x.fileType,
      description: x.description
    })));
  };

  const uploadTypedApplicationFile = async (file: File, fileType: StudentFileTypeCode, description: string) => {
    if (!selectedAppId || !currentUser) return false;
    const fd = new FormData();
    fd.append('files', file);
    fd.append('fileType', fileType);
    if (fileType === 'other') fd.append('fileDescription', description);
    fd.append('user_id', currentUser.id);
    if (currentUser.role) fd.append('role', currentUser.role);
    try {
      const r = await fetch(`/api/applications/${selectedAppId}/files`, { method: 'POST', body: fd });
      const data = await r.json();
      if (!r.ok) {
        alert(data.message || t.uploadFailed);
        return false;
      }
      await refreshDetailFiles(selectedAppId);
      if (data.studentId && onStudentFilesChange) {
        onStudentFilesChange(data.studentId, data.files.map((x: { url: string }) => x.url));
      }
      if (data.updatedAt && onSyncApplicationTimestamps) {
        onSyncApplicationTimestamps({
          applicationId: selectedAppId,
          applicationUpdatedAt: data.updatedAt,
          studentId: data.studentId,
          studentUpdatedAt: data.studentUpdatedAt ?? undefined
        });
      }
      return true;
    } catch {
      alert(t.errorConnection);
      return false;
    }
  };

  const uploadApplicationReceipt = async (file: File) => {
    setReceiptUploading(true);
    try {
      return await uploadTypedApplicationFile(file, 'receipt', '');
    } finally {
      setReceiptUploading(false);
    }
  };

  const uniqueAgents = useMemo(() => {
    const names = new Set<string>();
    applications.forEach(app => {
      const name = app.agentName || (app.userId && users.find(u => u.id === app.userId)?.name);
      if (name) names.add(name);
    });
    return Array.from(names).sort();
  }, [applications, users]);

  const uniqueResponsibles = useMemo(() => {
    const names = new Set<string>();
    applications.forEach(app => {
      const name = getResponsibleLabel(app);
      if (name && name !== '—') names.add(name);
    });
    return Array.from(names).sort();
  }, [applications, users]);

  const uniqueNationalities = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.nationality) set.add(s.nationality);
    });
    return Array.from(set).sort();
  }, [students]);

  const uniqueCurrencies = useMemo(() => {
    const set = new Set<string>();
    applications.forEach(app => {
      set.add((app.currency || 'USD').toUpperCase());
    });
    return Array.from(set).sort();
  }, [applications]);

  const programFilterOptions = useMemo(
    () => programs.map(p => p.id),
    [programs]
  );
  const programFilterLabels = useMemo(
    () => Object.fromEntries(programs.map(p => [p.id, p.name])),
    [programs]
  );

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
      const responsibleName = getResponsibleLabel(app);
      const matchAgent = filterAgents.length === 0 || filterAgents.includes(agentName);
      const matchResponsible = filterResponsibles.length === 0 || filterResponsibles.includes(responsibleName);
      const matchUniversity = filterUniversities.length === 0 || (p?.universityId && filterUniversities.includes(p.universityId));
      const matchProgram = filterPrograms.length === 0 || filterPrograms.includes(app.programId);
      const matchNationality = filterNationalities.length === 0 || (s?.nationality && filterNationalities.includes(s.nationality));
      const matchCurrency = filterCurrencies.length === 0 || filterCurrencies.includes((app.currency || 'USD').toUpperCase());
      const appStatusNorm = normalizeApplicationStatus(app.status);
      const selectedNorm = filterStatuses.map((s) => normalizeApplicationStatus(s));
      const matchStatus = filterStatuses.length === 0 || selectedNorm.includes(appStatusNorm);
      const matchDegree = filterDegrees.length === 0 || (p?.degree && filterDegrees.includes(p.degree));
      const matchCreated = matchesCreatedAtRange(app.createdAt, filterAppCreatedFrom, filterAppCreatedTo);
      return matchNumber && matchName && matchAgent && matchResponsible && matchUniversity && matchProgram && matchNationality && matchCurrency && matchStatus && matchDegree && matchCreated;
    });
    return list;
  }, [applications, students, programs, universities, users, searchApplicationNumber, searchStudentName, filterAgents, filterResponsibles, filterUniversities, filterPrograms, filterNationalities, filterCurrencies, filterStatuses, filterDegrees, filterAppCreatedFrom, filterAppCreatedTo]);

  const sortedApplications = useMemo(() => {
    const list = [...filteredApplications];
    if (!sortBy) {
      list.sort((a, b) => {
        const tA = new Date(a.createdAt || 0).getTime();
        const tB = new Date(b.createdAt || 0).getTime();
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
        case 'nationality': va = (sA?.nationality || '').toLowerCase(); vb = (sB?.nationality || '').toLowerCase(); return dir * (va as string).localeCompare(vb as string);
        case 'program': va = (pA?.name || '').toLowerCase(); vb = (pB?.name || '').toLowerCase(); return dir * (va as string).localeCompare(vb as string);
        case 'university': va = (pA ? getUni(pA.universityId)?.name || '' : '').toLowerCase(); vb = (pB ? getUni(pB.universityId)?.name || '' : '').toLowerCase(); return dir * (va as string).localeCompare(vb as string);
        case 'degree': va = (pA?.degree || '').toLowerCase(); vb = (pB?.degree || '').toLowerCase(); return dir * (va as string).localeCompare(vb as string);
        case 'agencyCompany': va = (a.agencyCompanyName || '').toLowerCase(); vb = (b.agencyCompanyName || '').toLowerCase(); return dir * (va as string).localeCompare(vb as string);
        case 'description': va = (a.internalDescription || '').toLowerCase(); vb = (b.internalDescription || '').toLowerCase(); return dir * (va as string).localeCompare(vb as string);
        case 'createdAt': va = new Date(a.createdAt || 0).getTime(); vb = new Date(b.createdAt || 0).getTime(); return dir * ((va as number) - (vb as number));
        case 'updatedAt': va = new Date(a.updatedAt || a.createdAt || 0).getTime(); vb = new Date(b.updatedAt || b.createdAt || 0).getTime(); return dir * ((va as number) - (vb as number));
        case 'status': va = (a.status || '').toLowerCase(); vb = (b.status || '').toLowerCase(); return dir * (va as string).localeCompare(vb as string);
        default: return 0;
      }
    });
    return list;
  }, [filteredApplications, sortBy, sortDir, users]);

  const financialTreeTotals = useMemo(() => {
    const totals: Partial<Record<keyof Application, number>> = {};
    FINANCIAL_TREE_NUMERIC_KEYS.forEach((key) => {
      totals[key] = sortedApplications.reduce((sum, application) => {
        const value = Number(application[key]);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0);
    });
    return totals;
  }, [sortedApplications]);
  const visibleFinancialFields = FINANCIAL_TREE_FIELDS.filter((field) =>
    visibleFinancialColumns.includes(String(field.key))
  );
  const visibleFinancialBaseCount = FINANCIAL_TREE_BASE_COLUMN_KEYS.filter((key) =>
    visibleFinancialColumns.includes(key)
  ).length;

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
    setSelectedApplicationIds(new Set());
  }, [treePage]);

  const allOnPageSelected =
    pagedApplications.length > 0 && pagedApplications.every((a) => selectedApplicationIds.has(a.id));
  const someOnPageSelected = pagedApplications.some((a) => selectedApplicationIds.has(a.id));
  const allMatchingSelected =
    sortedApplications.length > 0 &&
    sortedApplications.every((a) => selectedApplicationIds.has(a.id));
  const showBulkDelete = !!(isAdmin && onDeleteApplication && listViewMode === 'tree' && view === 'list');
  const showMassEdit = !!(isAdminOrUser && onUpdateApplication && listViewMode === 'tree' && view === 'list');
  const showBulkSelect = showBulkDelete || showMassEdit;

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected;
  }, [someOnPageSelected, allOnPageSelected]);

  const toggleApplicationSelection = (id: string) => {
    setSelectedApplicationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllApplicationsOnPage = () => {
    if (allOnPageSelected) {
      setSelectedApplicationIds((prev) => {
        const next = new Set(prev);
        pagedApplications.forEach((a) => next.delete(a.id));
        return next;
      });
      return;
    }
    setSelectedApplicationIds((prev) => {
      const next = new Set(prev);
      pagedApplications.forEach((a) => next.add(a.id));
      return next;
    });
  };

  const selectAllMatchingApplications = () => {
    setSelectedApplicationIds(new Set(sortedApplications.map((a) => a.id)));
  };

  const clearApplicationSelection = () => {
    setSelectedApplicationIds(new Set());
  };

  const handleBulkDeleteConfirm = async () => {
    if (!onDeleteApplication || selectedApplicationIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedApplicationIds);
      const detailId = selectedAppId;
      for (const id of ids) {
        await onDeleteApplication(id);
      }
      setConfirmBulkDelete(false);
      setSelectedApplicationIds(new Set());
      if (detailId && ids.includes(detailId)) {
        setSelectedAppId(null);
        setDetailEditMode(false);
        if (embedMode === 'students' && onEmbedBack) onEmbedBack();
        else setView('list');
      }
    } finally {
      setBulkDeleting(false);
    }
  };

  const applicationMassEditFields = useMemo((): MassEditFieldDef[] => {
    if (!isAdminOrUser) return [];
    const fin = (key: keyof Application) => FINANCIAL_TREE_FIELDS.find(f => f.key === key)?.label || String(key);
    const fields: MassEditFieldDef[] = [
      {
        key: 'status',
        label: t.applicationStatus,
        type: 'select',
        options: Object.values(ApplicationStatus).map(st => ({ value: st, label: displayStatus(st) }))
          .filter(option => option.label)
      },
      { key: 'currency', label: fin('currency'), type: 'select', options: [{ value: 'USD', label: 'USD' }, { value: 'TRY', label: 'TRY' }, { value: 'EUR', label: 'EUR' }] },
      { key: 'paymentDeserved', label: fin('paymentDeserved'), type: 'boolean' },
      { key: 'annualPayment', label: fin('annualPayment'), type: 'number', nullable: true },
      { key: 'educationVatRate', label: 'Eğitim KDV %', type: 'number', nullable: true },
      { key: 'grossCommission', label: fin('grossCommission'), type: 'number', nullable: true },
      { key: 'abroadVatRate', label: 'Yurtdışı KDV %', type: 'number', nullable: true },
      { key: 'bonusMax', label: fin('bonusMax'), type: 'number', nullable: true },
      { key: 'bonusMin', label: fin('bonusMin'), type: 'number', nullable: true },
      { key: 'agencyCommission', label: fin('agencyCommission'), type: 'number', nullable: true },
      { key: 'agencyBonus', label: fin('agencyBonus'), type: 'number', nullable: true },
      { key: 'depositSupport', label: fin('depositSupport'), type: 'number', nullable: true }
    ];
    if (agentUsers.length > 0) {
      fields.splice(1, 0, {
        key: 'userId',
        label: t.agent,
        type: 'select',
        nullable: true,
        options: agentUsers.map(u => ({ value: u.id, label: u.name }))
      });
    }
    if (responsibleUsers.length > 0) {
      fields.splice(agentUsers.length > 0 ? 2 : 1, 0, {
        key: 'responsibleId',
        label: t.responsible,
        type: 'select',
        nullable: true,
        options: responsibleUsers.map(u => ({ value: u.id, label: u.name }))
      });
    }
    if (agencyCompanies.length > 0) {
      fields.push({
        key: 'agencyCompanyId',
        label: 'Aracı firma',
        type: 'select',
        nullable: true,
        options: agencyCompanies.map(c => ({ value: c.id, label: c.name }))
      });
    }
    return fields;
  }, [isAdminOrUser, agentUsers, responsibleUsers, agencyCompanies, t, translateStatus]);

  const handleApplicationMassEditApply = async (fieldKey: string, value: unknown) => {
    if (!onUpdateApplication || selectedApplicationIds.size === 0) return;
    setMassEditApplying(true);
    let ok = 0;
    let fail = 0;
    try {
      const payload = { [fieldKey]: value } as Parameters<NonNullable<typeof onUpdateApplication>>[1];
      for (const id of Array.from(selectedApplicationIds)) {
        const success = await Promise.resolve(onUpdateApplication(id, payload, { silent: true }));
        if (success) ok++;
        else fail++;
      }
      if (fail > 0) {
        alert(t.massEditPartialResult.replace('{ok}', String(ok)).replace('{fail}', String(fail)));
      }
      if (ok > 0) setMassEditOpen(false);
    } finally {
      setMassEditApplying(false);
    }
  };

  useEffect(() => {
    if (kanbanPage > totalKanbanPages) setKanbanPage(totalKanbanPages);
  }, [kanbanPage, totalKanbanPages]);

  useEffect(() => {
    setTreePage(1);
    setKanbanPage(1);
  }, [searchApplicationNumber, searchStudentName, filterAgents, filterResponsibles, filterUniversities, filterPrograms, filterNationalities, filterCurrencies, filterStatuses, filterDegrees, filterAppCreatedFrom, filterAppCreatedTo, sortBy, sortDir, listViewMode]);
  const applicationColumnOptions = [
    { key: 'number', label: t.number },
    { key: 'status', label: t.applicationStatus },
    { key: 'agent', label: t.agent },
    { key: 'responsible', label: t.responsible },
    { key: 'student', label: t.studentInfo },
    { key: 'nationality', label: t.nationality },
    { key: 'program', label: t.program },
    { key: 'university', label: t.universityName },
    { key: 'degree', label: t.programDegree },
    { key: 'agencyCompany', label: t.agencyCompany },
    { key: 'description', label: t.internalDescription },
    { key: 'createdAt', label: t.createdAt },
    { key: 'updatedAt', label: t.lastUpdatedAt }
  ];
  const financialColumnOptions = [
    { key: 'number', label: t.number },
    { key: 'status', label: t.applicationStatus },
    { key: 'agent', label: t.agent },
    { key: 'nationality', label: t.nationality },
    { key: 'degree', label: t.programDegree },
    { key: 'program', label: t.program },
    { key: 'university', label: t.universityName },
    { key: 'student', label: t.studentInfo },
    { key: 'agencyCompany', label: t.agencyCompany },
    { key: 'description', label: t.internalDescription },
    ...FINANCIAL_TREE_FIELDS.map((field) => ({ key: String(field.key), label: field.label }))
  ];
  const storageKey = `tree-columns:applications:${currentUser?.id || 'guest'}`;
  const financialStorageKey = `tree-columns:applications-financial:${currentUser?.id || 'guest'}`;
  const newColumnsMigrationKey = `${storageKey}:degree-nationality-v1`;
  const agencyDescriptionMigrationKey = `${storageKey}:agency-description-v1`;
  const depositSupportMigrationKey = `${financialStorageKey}:deposit-support-v1`;
  const financialAgencyDescriptionMigrationKey = `${financialStorageKey}:agency-description-v1`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        window.localStorage.setItem(newColumnsMigrationKey, '1');
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter((k: string) => applicationColumnKeys.includes(k));
      if (valid.includes('program') && !valid.includes('university')) {
        valid.splice(valid.indexOf('program') + 1, 0, 'university');
      }
      if (!window.localStorage.getItem(newColumnsMigrationKey)) {
        if (!valid.includes('nationality')) {
          const studentIndex = valid.indexOf('student');
          valid.splice(studentIndex >= 0 ? studentIndex + 1 : valid.length, 0, 'nationality');
        }
        if (!valid.includes('degree')) {
          const universityIndex = valid.indexOf('university');
          valid.splice(universityIndex >= 0 ? universityIndex + 1 : valid.length, 0, 'degree');
        }
        window.localStorage.setItem(newColumnsMigrationKey, '1');
      }
      if (!window.localStorage.getItem(agencyDescriptionMigrationKey)) {
        if (!valid.includes('agencyCompany')) {
          const degreeIndex = valid.indexOf('degree');
          valid.splice(degreeIndex >= 0 ? degreeIndex + 1 : valid.length, 0, 'agencyCompany');
        }
        if (!valid.includes('description')) {
          const agencyIndex = valid.indexOf('agencyCompany');
          valid.splice(agencyIndex >= 0 ? agencyIndex + 1 : valid.length, 0, 'description');
        }
        window.localStorage.setItem(agencyDescriptionMigrationKey, '1');
      }
      if (valid.length > 0) setVisibleTreeColumns(valid);
    } catch {
      // ignore corrupted localStorage values
    }
  }, [storageKey, newColumnsMigrationKey, agencyDescriptionMigrationKey, applicationColumnKeys]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify(visibleTreeColumns));
  }, [storageKey, visibleTreeColumns]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(financialStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter((key: string) => FINANCIAL_TREE_COLUMN_KEYS.includes(key));
      if (!window.localStorage.getItem(depositSupportMigrationKey)) {
        if (!valid.includes('depositSupport')) valid.push('depositSupport');
        window.localStorage.setItem(depositSupportMigrationKey, '1');
      }
      if (!window.localStorage.getItem(financialAgencyDescriptionMigrationKey)) {
        if (!valid.includes('agencyCompany')) {
          const studentIndex = valid.indexOf('student');
          valid.splice(studentIndex >= 0 ? studentIndex + 1 : valid.length, 0, 'agencyCompany');
        }
        if (!valid.includes('description')) {
          const agencyIndex = valid.indexOf('agencyCompany');
          valid.splice(agencyIndex >= 0 ? agencyIndex + 1 : valid.length, 0, 'description');
        }
        window.localStorage.setItem(financialAgencyDescriptionMigrationKey, '1');
      }
      if (valid.length > 0) setVisibleFinancialColumns(valid);
    } catch {
      // ignore corrupted localStorage values
    }
  }, [financialStorageKey, depositSupportMigrationKey, financialAgencyDescriptionMigrationKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(financialStorageKey, JSON.stringify(visibleFinancialColumns));
  }, [financialStorageKey, visibleFinancialColumns]);

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
    const hiddenByRole = ((sortBy === 'responsible' || sortBy === 'agent' || sortBy === 'agencyCompany' || sortBy === 'description') && !canSeeAgentColumn) || (sortBy === 'updatedAt' && isAgent);
    if (hiddenByConfig || hiddenByRole) {
      setSortBy(null);
      setSortDir('asc');
    }
  }, [sortBy, visibleTreeColumns, canSeeAgentColumn, isAgent, applicationColumnKeys]);

  const toggleTreeColumn = (key: string) => {
    setVisibleTreeColumns(prev => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter(k => k !== key);
      }
      return [...prev, key];
    });
  };

  const toggleFinancialColumn = (key: string) => {
    setVisibleFinancialColumns((current) => {
      if (current.includes(key)) {
        if (current.length === 1) return current;
        return current.filter((column) => column !== key);
      }
      return [...current, key];
    });
  };

  useEffect(() => {
    let allowed = canSeeAgentColumn
      ? applicationColumnKeys
      : applicationColumnKeys.filter(k => k !== 'agent' && k !== 'responsible' && k !== 'agencyCompany' && k !== 'description');
    if (isAgent) allowed = allowed.filter(k => k !== 'updatedAt');
    const normalized = visibleTreeColumns.filter(k => allowed.includes(k));
    if (normalized.length !== visibleTreeColumns.length) {
      setVisibleTreeColumns(normalized.length > 0 ? normalized : allowed);
      return;
    }
    if (normalized.length === 0) setVisibleTreeColumns(allowed);
  }, [canSeeAgentColumn, isAgent, applicationColumnKeys, visibleTreeColumns]);
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

        {isAdminOrUser && (
          <div>
            <label className="block font-semibold mb-2 text-gray-700">Aracı Firma</label>
            <select
              className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white border-gray-200 transition-all"
              value={selectedAgencyCompanyId}
              onChange={e => setSelectedAgencyCompanyId(e.target.value)}
            >
              <option value="">Aracı firma seç</option>
              {agencyCompanies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
              <SearchableSelect
                value={filterUni}
                onChange={(value) => { setFilterUni(value); setFilterDegree(''); setFilterLang(''); setFilterName(''); }}
                options={createAvailableUnis.map((university) => ({ value: university.id, label: university.name }))}
                placeholder={t.selectUniversity}
                searchPlaceholder={t.search}
                noResultsText={t.searchNoResults}
                disabled={!filterPeriod}
              />
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
              <SearchableSelect
                value={filterName}
                onChange={setFilterName}
                options={createAvailableProgramNames.map((name) => ({ value: name, label: name }))}
                placeholder={t.selectProgram}
                searchPlaceholder={t.search}
                noResultsText={t.searchNoResults}
                disabled={!filterLang}
              />
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

    const sendInternalMessage = async () => {
      if (!newInternalMessage.trim() || !selectedAppId || !currentUser?.id || !isAdminOrUser) return;
      try {
        const messageText = newInternalMessage.trim();
        const res = await fetch(`/api/applications/${selectedAppId}/internal-messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actorUserId: currentUser.id,
            message: messageText
          })
        });
        const data = await res.json();
        if (res.ok) {
          setInternalMessages(prev => [...prev, {
            id: data.id,
            sender: data.sender,
            senderUserId: currentUser.id,
            message: messageText,
            createdAt: data.createdAt || new Date().toISOString(),
            senderName: data.senderName ?? currentUser.name ?? null
          }]);
          setNewInternalMessage('');
          if (data.updatedAt && onSyncApplicationTimestamps) {
            onSyncApplicationTimestamps({
              applicationId: selectedAppId,
              applicationUpdatedAt: data.updatedAt,
              studentId: data.studentId,
              studentUpdatedAt: data.studentUpdatedAt ?? undefined
            });
          }
        } else {
          alert(data.message || t.errorConnection);
        }
      } catch {
        alert(t.errorConnection);
      }
    };

    // --- Status Bar Steps ---
    const getStatusBadgeClass = (status: ApplicationStatus, size: 'header' | 'default' | 'compact' = 'default') =>
      getApplicationStatusBadgeClass(status, size);

    return (
      <div className="max-w-[1400px] mx-auto space-y-3 -mt-1 animate-in slide-in-from-bottom duration-500">
        {/* Header Actions */}
        <div className="bg-white px-3 py-1.5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between gap-2">
          <div className="flex items-center">
            <button
              onClick={() => {
                if (embedMode === 'students' && onEmbedBack) onEmbedBack();
                else setView('list');
              }}
              className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors font-bold"
            >
              <ChevronLeft size={20} />
              <span>{t.back}</span>
            </button>
          </div>
          <div className="flex-1 flex justify-start pl-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-mono font-bold text-gray-800 text-xl">#{app.id}</span>
              {detailEditMode && onUpdateApplication ? (
                <select
                  value={editFormStatus}
                  onChange={(e) => setEditFormStatus(e.target.value as ApplicationStatus)}
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {Object.values(ApplicationStatus).map((st) => (
                    <option key={st} value={st}>{displayStatus(st)}</option>
                  ))}
                </select>
              ) : (
                <span className={getStatusBadgeClass(app.status, 'header')}>
                  {displayStatus(app.status)}
                </span>
              )}
            </div>
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
                      setEditFormAgencyCompanyId(app.agencyCompanyId || '');
                      setEditFormStatus(app.status);
                      setInternalDescription(app.internalDescription || '');
                      seedEditProgramFilters(app);
                      setDetailEditMode(false);
                    }}
                    className="px-4 py-2 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm whitespace-nowrap"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editProgramFormComplete || !editFinalProgramId) {
                        alert(`${t.period}, ${t.university}, ${t.programDegree}, ${t.programLanguage}, ${t.program}`);
                        return;
                      }
                      const num = (v: string) => { const n = parseFloat(v); return (v === '' || Number.isNaN(n)) ? null : n; };
                      onUpdateApplication(app.id, {
                        status: editFormStatus,
                        userId: editFormAgentId || null,
                        responsibleId: editFormResponsibleId || null,
                        agencyCompanyId: editFormAgencyCompanyId || null,
                        programId: editFinalProgramId,
                        periodId: editFilterPeriod,
                        annualPayment: num(detailFinance.annualPayment),
                        educationVatRate: num(detailFinance.educationVatRate),
                        abroadVatRate: num(detailFinance.abroadVatRate),
                        grossCommission: num(detailFinance.grossCommission),
                        bonusMax: num(detailFinance.bonusMax),
                        bonusMin: num(detailFinance.bonusMin),
                        agencyCommission: num(detailFinance.agencyCommission),
                        agencyBonus: num(detailFinance.agencyBonus),
                        depositSupport: num(detailFinance.depositSupport),
                        currency: ['USD', 'TRY', 'EUR'].includes(detailFinance.currency) ? detailFinance.currency : 'USD',
                        paymentDeserved: detailFinance.paymentDeserved,
                        internalDescription
                      });
                      setDetailEditMode(false);
                    }}
                    disabled={!editProgramFormComplete}
                    className="px-4 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors text-sm flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t.save}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    seedEditProgramFilters(app);
                    setDetailEditMode(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  <FileEdit size={16} />
                  {t.editApplication}
                </button>
              )
            )}
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-600 font-medium" title={t.createdAt}>
                {t.createdAt}: {app.createdAt ? new Date(app.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
              </span>
              {!isAgent && (
              <span className="text-xs bg-blue-50 px-3 py-1 rounded-full text-blue-800 font-medium" title={t.lastUpdatedAt}>
                {t.lastUpdatedAt}: {(app.updatedAt || app.createdAt) ? new Date(app.updatedAt || app.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
              </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Main Body: left general info, right files + chat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col gap-6">
            {/* Program Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-purple-50 p-4 rounded-xl text-purple-600 shrink-0">
                  <GraduationCap size={24} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{t.programsTitle}</h3>
                  {!detailEditMode && (
                    <p className="text-xl font-bold text-gray-800 leading-tight">{program?.name}</p>
                  )}
                </div>
              </div>
              {detailEditMode && onUpdateApplication ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-purple-500 uppercase tracking-wider">{t.period}</label>
                    <select
                      required
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={editFilterPeriod}
                      onChange={e => {
                        setEditFilterPeriod(e.target.value);
                        setEditFilterUni('');
                        setEditFilterDegree('');
                        setEditFilterLang('');
                        setEditFilterProgramName('');
                      }}
                    >
                      <option value="">{t.selectPeriod}</option>
                      {editPeriodOptions.map(per => (
                        <option key={per.id} value={per.id}>{per.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-purple-500 uppercase tracking-wider">{t.universities}</label>
                    <SearchableSelect
                      value={editFilterUni}
                      onChange={(value) => {
                        setEditFilterUni(value);
                        setEditFilterDegree('');
                        setEditFilterLang('');
                        setEditFilterProgramName('');
                      }}
                      options={editAvailableUnis.map((university) => ({ value: university.id, label: university.name }))}
                      placeholder={t.selectUniversity}
                      searchPlaceholder={t.search}
                      noResultsText={t.searchNoResults}
                      disabled={!editFilterPeriod}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-purple-500 uppercase tracking-wider">{t.programDegree}</label>
                    <select
                      required
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                      value={editFilterDegree}
                      onChange={e => {
                        setEditFilterDegree(e.target.value);
                        setEditFilterLang('');
                        setEditFilterProgramName('');
                      }}
                      disabled={!editFilterUni}
                    >
                      <option value="">{t.selectDegree}</option>
                      {editAvailableDegrees.map(d => <option key={d} value={d}>{translateDegree(d)}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-purple-500 uppercase tracking-wider">{t.programLanguage}</label>
                    <select
                      required
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                      value={editFilterLang}
                      onChange={e => {
                        setEditFilterLang(e.target.value);
                        setEditFilterProgramName('');
                      }}
                      disabled={!editFilterDegree}
                    >
                      <option value="">{t.selectLanguage}</option>
                      {editAvailableLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-purple-500 uppercase tracking-wider">{t.programName}</label>
                    <SearchableSelect
                      value={editFilterProgramName}
                      onChange={setEditFilterProgramName}
                      options={editAvailableProgramNames.map((name) => ({ value: name, label: name }))}
                      placeholder={t.selectProgram}
                      searchPlaceholder={t.search}
                      noResultsText={t.searchNoResults}
                      disabled={!editFilterLang}
                    />
                  </div>
                  {!editProgramFormComplete && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      {t.period}, {t.university}, {t.programDegree}, {t.programLanguage}, {t.program}
                    </p>
                  )}
                </div>
              ) : (
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
              )}
            </div>

            {/* Student Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-xl text-blue-600 shrink-0">
                  <UserIcon size={24} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{t.studentInfo}</h3>
                  {student?.id && onOpenStudent ? (
                    <button
                      type="button"
                      onClick={() => onOpenStudent(student.id)}
                      className="text-xl font-bold text-blue-700 leading-tight hover:text-blue-800 hover:underline text-left"
                    >
                      {student.firstName} {student.lastName}
                    </button>
                  ) : (
                    <p className="text-xl font-bold text-gray-800 leading-tight">{student?.firstName} {student?.lastName}</p>
                  )}
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
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Aracı Firma</p>
                        {detailEditMode && onUpdateApplication ? (
                          <select
                            value={editFormAgencyCompanyId}
                            onChange={(e) => setEditFormAgencyCompanyId(e.target.value)}
                            className="w-full max-w-xs p-2.5 border border-gray-200 rounded-xl text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                          >
                            <option value="">Aracı firma seç</option>
                            {agencyCompanies.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-lg font-bold text-gray-800 leading-tight">{app.agencyCompanyName || '—'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isAdminOrUser && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={18} className="text-amber-600" />
                  <h3 className="font-bold text-gray-800">{t.internalDescription}</h3>
                </div>
                {detailEditMode && onUpdateApplication ? (
                  <textarea
                    value={internalDescription}
                    onChange={event => setInternalDescription(event.target.value)}
                    maxLength={10000}
                    rows={5}
                    placeholder={t.internalDescriptionPlaceholder}
                    className="w-full resize-y rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  />
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm text-gray-700">
                    {app.internalDescription || '—'}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Files on right (desktop), above chat on mobile */}
            <div className="order-1 lg:order-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Paperclip size={18} className="text-gray-400" />
                <h4 className="font-bold text-gray-800 text-sm">{t.uploadFiles} ({detailFiles.length})</h4>
              </div>
              <p className="text-[11px] text-gray-500 mb-3">{t.sharedStudentAttachmentsNote}</p>

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
                          {getStudentFileTypeLabel(f.fileType, t, f.description) && (
                            <span className="text-sm font-semibold text-purple-900 bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg mb-1 inline-block">
                              {getStudentFileTypeLabel(f.fileType, t, f.description)}
                            </span>
                          )}
                          <p className="text-[11px] font-bold text-gray-700 truncate" dir="ltr">{f.name}</p>
                          <span className="text-[9px] text-gray-400 uppercase block mt-0.5">View File</span>
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
                                const remaining = detailFiles.filter(file => file.filename !== f.filename);
                                setDetailFiles(remaining);
                                if (delData.studentId && onStudentFilesChange) {
                                  onStudentFilesChange(delData.studentId, remaining.map(file => file.url));
                                }
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

                  <input
                    type="file"
                    id="attach-receipt-det"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    disabled={receiptUploading}
                    onChange={async (event) => {
                      const input = event.currentTarget;
                      const file = input.files?.[0];
                      if (file) await uploadApplicationReceipt(file);
                      input.value = '';
                    }}
                  />
                  <label
                    htmlFor="attach-receipt-det"
                    className={`flex items-center justify-center gap-2 border border-dashed border-emerald-300 rounded-xl p-3 transition-all ${
                      receiptUploading
                        ? 'cursor-wait opacity-50'
                        : 'cursor-pointer hover:border-emerald-500 hover:bg-emerald-50'
                    }`}
                  >
                    <Upload size={14} className="text-emerald-600" />
                    <span className="text-[11px] font-bold text-emerald-700">
                      {receiptUploading ? t.loading : t.uploadReceipt}
                    </span>
                  </label>
                </div>
                <button
                  onClick={async () => {
                    if (!attachFiles || !selectedAppId) return;
                    const fd = new FormData();
                    Array.from(attachFiles as FileList).forEach(f => fd.append('files', f));
                    if (currentUser?.id) {
                      fd.append('user_id', currentUser.id);
                      if (currentUser.role) fd.append('role', currentUser.role);
                    }
                    try {
                      const r = await fetch(`/api/applications/${selectedAppId}/files`, { method: 'POST', body: fd });
                      const data = await r.json();
                      if (r.ok) {
                        setDetailFiles(data.files.map((x: { url: string; name?: string; filename?: string; fileType?: string; description?: string }) => ({
                          url: x.url,
                          name: x.name || x.url.split('/').pop() || '',
                          filename: x.filename,
                          fileType: x.fileType,
                          description: x.description
                        })));
                        if (data.studentId && onStudentFilesChange) {
                          onStudentFilesChange(data.studentId, data.files.map((x: { url: string }) => x.url));
                        }
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
                {isAdminOrUser && (
                  <StaffTypedFileUpload onUpload={uploadTypedApplicationFile} />
                )}
              </div>
            </div>

            {/* Chat in middle (desktop), bottom on mobile */}
            <div className="order-2 lg:order-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[390px] lg:h-[530px]">
              <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MessageSquare className="text-blue-600" size={20} />
                  <h3 className="font-bold text-gray-800">{t.chat}</h3>
                </div>
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

              <div ref={chatMessagesRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-2">
                    <MessageSquare size={48} className="opacity-10" />
                    <p className="text-sm">{t.noMessages}</p>
                  </div>
                ) : (
                  messages.map(m => {
                    const isAdmin = m.sender === 'ADMIN';
                    const isUser = m.sender === 'USER';
                    return (
                      <div key={m.id} className={`flex w-full ${isAdmin ? 'justify-end' : isUser ? 'justify-center font-bold' : 'justify-start'}`}>
                        <div className={`max-w-[80%] flex flex-col ${isAdmin ? 'items-end' : isUser ? 'items-center' : 'items-start'}`}>
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

            {isAdminOrUser && (
              <div className="order-3 lg:col-span-2 flex flex-col bg-amber-50/40 rounded-2xl shadow-sm border border-amber-200 overflow-hidden h-[390px]">
                <div className="p-4 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="text-amber-700" size={20} />
                    <h3 className="font-bold text-amber-950">{t.internalChat}</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-700">{t.staffOnly}</span>
                </div>

                <div ref={internalChatMessagesRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                  {internalMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-amber-300 space-y-2">
                      <MessageSquare size={48} className="opacity-30" />
                      <p className="text-sm">{t.noInternalMessages}</p>
                    </div>
                  ) : (
                    internalMessages.map(message => {
                      const isOwnMessage = message.senderUserId === currentUser?.id;
                      return (
                        <div key={message.id} className={`flex w-full ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-2 mb-1 px-1">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                                {message.senderName || message.sender}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {new Date(message.createdAt).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm break-words leading-relaxed ${
                              isOwnMessage
                                ? 'bg-amber-600 text-white rounded-br-none'
                                : 'bg-white text-gray-800 border border-amber-100 rounded-bl-none'
                            }`} dir="auto">
                              {message.message}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-4 border-t border-amber-100 bg-white">
                  <div className="flex gap-2 items-center bg-amber-50/60 p-1 rounded-2xl border border-amber-200 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
                    <input
                      value={newInternalMessage}
                      onChange={event => setNewInternalMessage(event.target.value)}
                      onKeyDown={event => event.key === 'Enter' && !event.shiftKey && (event.preventDefault(), sendInternalMessage())}
                      maxLength={10000}
                      className="flex-1 bg-transparent p-3 outline-none text-sm placeholder:text-gray-400"
                      placeholder={t.typeInternalMessage}
                    />
                    <button
                      type="button"
                      onClick={sendInternalMessage}
                      disabled={!newInternalMessage.trim()}
                      className="bg-amber-600 text-white p-3 rounded-xl hover:bg-amber-700 disabled:opacity-30 transition-all active:scale-90"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                    <label className="text-gray-500 text-xs font-medium">Eğitim KDV Oranı (%)</label>
                    <input
                      type="number"
                      step="any"
                      value={detailFinance.educationVatRate}
                      onChange={(e) => setDetailFinance(prev => ({ ...prev, educationVatRate: e.target.value }))}
                      className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Eğitim KDV Tutarı</label>
                    <input
                      type="number"
                      step="any"
                      value={computedEducationVatAmount}
                      readOnly
                      className="w-full min-w-0 p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed outline-none"
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
                    <label className="text-gray-500 text-xs font-medium">Yurtdışı KDV Oranı (%)</label>
                    <input type="number" step="any" value={detailFinance.abroadVatRate} onChange={(e) => setDetailFinance(prev => ({ ...prev, abroadVatRate: e.target.value }))} className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Yurtdışı KDV Tutarı</label>
                    <input type="number" step="any" value={computedAbroadVatAmount} readOnly className="w-full min-w-0 p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed outline-none" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Net Komisyon</label>
                    <input type="number" step="any" value={computedNetCommission} readOnly className="w-full min-w-0 p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed outline-none" />
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
                    <label className="text-gray-500 text-xs font-medium">Depozito Desteği</label>
                    <input type="number" min="0" step="any" value={detailFinance.depositSupport} onChange={(e) => setDetailFinance(prev => ({ ...prev, depositSupport: e.target.value }))} className="w-full min-w-0 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Acenta Anlaşma Miktarı</label>
                    <input type="number" step="any" value={computedAgencyContractAmount} readOnly className="w-full min-w-0 p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed outline-none" />
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
                    <input type="number" step="any" value={computedRemainingMin} readOnly className="w-full min-w-0 p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed outline-none" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Kalan Max</label>
                    <input type="number" step="any" value={computedRemainingMax} readOnly className="w-full min-w-0 p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed outline-none" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1 sm:col-span-2 lg:col-span-4">
                    <span className="text-gray-500 text-xs font-medium">Ödemeyi hak etti</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={detailFinance.paymentDeserved}
                        aria-label="Ödemeyi hak etti"
                        onClick={() => setDetailFinance(prev => ({ ...prev, paymentDeserved: !prev.paymentDeserved }))}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                          detailFinance.paymentDeserved ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                        }`}
                      >
                        <span
                          className={`pointer-events-none absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full shadow-sm transition-transform duration-200 ease-out ${
                            detailFinance.paymentDeserved ? 'translate-x-5 bg-white' : 'translate-x-0 bg-gray-900'
                          }`}
                        />
                      </button>
                      <span className="text-sm font-medium text-gray-800 tabular-nums">
                        {detailFinance.paymentDeserved ? 'Açık' : 'Kapalı'}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Ödeme Tarihi</label>
                    <input
                      type="text"
                      value={detailFinance.paymentDate}
                      readOnly
                      className="w-full min-w-0 p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed outline-none"
                    />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <label className="text-gray-500 text-xs font-medium">Ödeme Ayı</label>
                    <input
                      type="text"
                      value={detailFinance.paymentMonth}
                      readOnly
                      className="w-full min-w-0 p-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="min-w-0 py-1">
                    <p className="text-gray-500 text-xs font-medium">Yıllık Ödeme</p>
                    <p className="font-medium text-gray-900 mt-0.5">{app.annualPayment != null ? Number(app.annualPayment) : '—'}</p>
                  </div>
                  <div className="min-w-0 py-1">
                    <p className="text-gray-500 text-xs font-medium">Eğitim KDV Oranı (%)</p>
                    <p className="font-medium text-gray-900 mt-0.5">{app.educationVatRate != null ? Number(app.educationVatRate) : '—'}</p>
                  </div>
                  <div className="min-w-0 py-1">
                    <p className="text-gray-500 text-xs font-medium">Eğitim KDV Tutarı</p>
                    <p className="font-medium text-gray-900 mt-0.5">{app.educationVat != null ? Number(app.educationVat) : '—'}</p>
                  </div>
                  <div className="min-w-0 py-1">
                    <p className="text-gray-500 text-xs font-medium">Brüt Komisyon</p>
                    <p className="font-medium text-gray-900 mt-0.5">{app.grossCommission != null ? Number(app.grossCommission) : '—'}</p>
                  </div>
                  <div className="min-w-0 py-1">
                    <p className="text-gray-500 text-xs font-medium">Yurtdışı KDV Oranı (%)</p>
                    <p className="font-medium text-gray-900 mt-0.5">{app.abroadVatRate != null ? Number(app.abroadVatRate) : 10}</p>
                  </div>
                  <div className="min-w-0 py-1">
                    <p className="text-gray-500 text-xs font-medium">Yurtdışı KDV Tutarı</p>
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
                  <div className="min-w-0 py-1"><p className="text-gray-500 text-xs font-medium">Depozito Desteği</p><p className="font-medium text-gray-900 mt-0.5">{app.depositSupport != null ? Number(app.depositSupport) : '—'}</p></div>
                  <div className="min-w-0 py-1"><p className="text-gray-500 text-xs font-medium">Acenta Anlaşma Miktarı</p><p className="font-medium text-gray-900 mt-0.5">{app.agencyContractAmount != null ? Number(app.agencyContractAmount) : '—'}</p></div>
                  <div className="min-w-0 py-1"><p className="text-gray-500 text-xs font-medium">Currency</p><p className="font-medium text-gray-900 mt-0.5">{app.currency || 'USD'}</p></div>
                  <div className="min-w-0 py-1"><p className="text-gray-500 text-xs font-medium">Kalan Min</p><p className="font-medium text-gray-900 mt-0.5">{app.remainingMin != null ? Number(app.remainingMin) : '—'}</p></div>
                  <div className="min-w-0 py-1"><p className="text-gray-500 text-xs font-medium">Kalan Max</p><p className="font-medium text-gray-900 mt-0.5">{app.remainingMax != null ? Number(app.remainingMax) : '—'}</p></div>
                  <div className="min-w-0 py-1 sm:col-span-2 lg:col-span-4">
                    <p className="text-gray-500 text-xs font-medium">Ödemeyi hak etti</p>
                    <div className="mt-1 flex items-center gap-3">
                      <span
                        aria-hidden
                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 ${
                          app.paymentDeserved === true ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                        }`}
                      >
                        <span
                          className={`pointer-events-none absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full shadow-sm ${
                            app.paymentDeserved === true ? 'translate-x-5 bg-white' : 'translate-x-0 bg-gray-900'
                          }`}
                        />
                      </span>
                      <span className="text-sm font-medium text-gray-900">{app.paymentDeserved === true ? 'Açık' : 'Kapalı'}</span>
                    </div>
                  </div>
                  <div className="min-w-0 py-1">
                    <p className="text-gray-500 text-xs font-medium">Ödeme Tarihi</p>
                    <p className="font-medium text-gray-900 mt-0.5">{app.paymentDate || '—'}</p>
                  </div>
                  <div className="min-w-0 py-1">
                    <p className="text-gray-500 text-xs font-medium">Ödeme Ayı</p>
                    <p className="font-medium text-gray-900 mt-0.5">{app.paymentMonth || '—'}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (embedMode === 'students' && embedApplicationId) {
    return (
      <div className="space-y-6">
        {view === 'detail' && renderDetail()}
      </div>
    );
  }

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
                {(searchApplicationNumber || searchStudentName || (!isAgent && (filterAgents.length > 0 || filterResponsibles.length > 0 || filterCurrencies.length > 0)) || filterUniversities.length > 0 || filterPrograms.length > 0 || filterNationalities.length > 0 || filterStatuses.length > 0 || filterDegrees.length > 0 || filterAppCreatedFrom || filterAppCreatedTo) && (
                  <button
                    type="button"
                    onClick={() => { setSearchApplicationNumber(''); setSearchStudentName(''); setFilterAgents([]); setFilterResponsibles([]); setFilterUniversities([]); setFilterPrograms([]); setFilterNationalities([]); setFilterCurrencies([]); setFilterStatuses([]); setFilterDegrees([]); setFilterAppCreatedFrom(''); setFilterAppCreatedTo(''); }}
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
                    <div className="absolute right-0 mt-2 w-64 max-h-80 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-30">
                      {(showFinancialTree
                        ? financialColumnOptions
                        : applicationColumnOptions.filter(col => {
                            if (!canSeeAgentColumn && (col.key === 'agent' || col.key === 'responsible' || col.key === 'agencyCompany' || col.key === 'description')) return false;
                            if (isAgent && col.key === 'updatedAt') return false;
                            return true;
                          })
                      ).map(col => (
                        <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-md cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(showFinancialTree ? visibleFinancialColumns : visibleTreeColumns).includes(col.key)}
                            onChange={() => showFinancialTree ? toggleFinancialColumn(col.key) : toggleTreeColumn(col.key)}
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
              {!isAgent && (
              <MultiSelectFilter
                selected={filterAgents}
                onChange={setFilterAgents}
                options={uniqueAgents}
                placeholder={`${t.agent} (${t.filterAll})`}
                searchPlaceholder={t.search}
              />
              )}
              <MultiSelectFilter
                selected={filterUniversities}
                onChange={setFilterUniversities}
                options={universities.map(u => u.id)}
                optionLabels={Object.fromEntries(universities.map(u => [u.id, u.name]))}
                placeholder={`${t.universitiesTitle} (${t.filterAll})`}
                searchPlaceholder={t.search}
              />
              <MultiSelectFilter
                selected={filterPrograms}
                onChange={setFilterPrograms}
                options={programFilterOptions}
                optionLabels={programFilterLabels}
                placeholder={`${t.programsTitle} (${t.filterAll})`}
                searchPlaceholder={t.searchProgramNamePlaceholder}
              />
              <MultiSelectFilter
                selected={filterNationalities}
                onChange={setFilterNationalities}
                options={uniqueNationalities}
                placeholder={`${t.nationality} (${t.filterAll})`}
                searchPlaceholder={t.search}
              />
              {!isAgent && (
              <MultiSelectFilter
                selected={filterCurrencies}
                onChange={setFilterCurrencies}
                options={uniqueCurrencies}
                placeholder={`${t.currency} (${t.filterAll})`}
                searchPlaceholder={t.search}
              />
              )}
              <MultiSelectFilter
                selected={filterStatuses}
                onChange={setFilterStatuses}
                options={Object.values(ApplicationStatus)}
                optionLabels={Object.fromEntries(Object.values(ApplicationStatus).map((st) => [st, displayStatus(st)]).filter(([, label]) => Boolean(label)))}
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
              {isAgent && (
                <div className="sm:col-span-2">
                  <CreatedAtRangeFilter
                    from={filterAppCreatedFrom}
                    to={filterAppCreatedTo}
                    onFromChange={setFilterAppCreatedFrom}
                    onToChange={setFilterAppCreatedTo}
                  />
                </div>
              )}
            </div>
            {!isAgent && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t.responsible}</label>
                <MultiSelectFilter
                  selected={filterResponsibles}
                  onChange={setFilterResponsibles}
                  options={uniqueResponsibles}
                  placeholder={`${t.responsible} (${t.filterAll})`}
                  searchPlaceholder={t.search}
                />
              </div>
              <div className="sm:col-span-2">
                <CreatedAtRangeFilter
                  from={filterAppCreatedFrom}
                  to={filterAppCreatedTo}
                  onFromChange={setFilterAppCreatedFrom}
                  onToChange={setFilterAppCreatedTo}
                />
              </div>
            </div>
            )}
          </div>

          {listViewMode === 'tree' && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-4 overflow-x-auto">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                {isAdmin ? (
                  <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                    <button
                      type="button"
                      onClick={() => setTreeDataMode('general')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors rounded-md ${treeDataMode === 'general' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      <List size={15} />
                      <span>{t.generalTree}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTreeDataMode('financial')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors rounded-md ${treeDataMode === 'financial' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      <DollarSign size={15} />
                      <span>{t.financialTree}</span>
                    </button>
                  </div>
                ) : null}
                {showBulkSelect && (
                  allMatchingSelected ? (
                    <button
                      type="button"
                      onClick={clearApplicationSelection}
                      disabled={sortedApplications.length === 0}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium text-sm"
                    >
                      {t.clearSelection}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={selectAllMatchingApplications}
                      disabled={sortedApplications.length === 0}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium text-sm"
                    >
                      {t.selectAllMatching.replace('{count}', String(sortedApplications.length))}
                    </button>
                  )
                )}
                {showMassEdit && (
                  <button
                    type="button"
                    onClick={() => setMassEditOpen(true)}
                    disabled={selectedApplicationIds.size === 0}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium text-sm"
                  >
                    <FileEdit size={16} />
                    <span>{t.massEdit}</span>
                    {selectedApplicationIds.size > 0 && (
                      <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{selectedApplicationIds.size}</span>
                    )}
                  </button>
                )}
                {showBulkDelete && (
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDelete(true)}
                    disabled={selectedApplicationIds.size === 0}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium text-sm"
                  >
                    <Trash2 size={16} />
                    <span>{t.deleteSelected}</span>
                    {selectedApplicationIds.size > 0 && (
                      <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{selectedApplicationIds.size}</span>
                    )}
                  </button>
                )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 ml-auto">
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
              </div>
              {showFinancialTree ? (
              <table
                dir={language === 'ar' ? 'rtl' : 'ltr'}
                style={{ minWidth: `${Math.max(700, visibleFinancialColumns.length * 140)}px` }}
                className={`w-full text-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}
              >
                <thead style={{ fontWeight: 700 }} className="bg-gray-50/50 text-gray-900 border-b border-gray-100">
                  <tr>
                    {showBulkSelect && (
                      <th className="px-4 py-4 w-12 text-center">
                        <input
                          ref={selectAllCheckboxRef}
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={toggleSelectAllApplicationsOnPage}
                          disabled={pagedApplications.length === 0}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          aria-label={t.filterAll}
                        />
                      </th>
                    )}
                    {visibleFinancialColumns.includes('number') && <SortTh colKey="number" label={t.number} />}
                    {visibleFinancialColumns.includes('status') && <SortTh colKey="status" label={t.applicationStatus} className="text-center w-[170px] max-w-[170px]" />}
                    {visibleFinancialColumns.includes('agent') && <SortTh colKey="agent" label={t.agent} />}
                    {visibleFinancialColumns.includes('nationality') && <SortTh colKey="nationality" label={t.nationality} />}
                    {visibleFinancialColumns.includes('degree') && <SortTh colKey="degree" label={t.programDegree} />}
                    {visibleFinancialColumns.includes('program') && <SortTh colKey="program" label={t.program} />}
                    {visibleFinancialColumns.includes('university') && <SortTh colKey="university" label={t.universityName} />}
                    {visibleFinancialColumns.includes('student') && <SortTh colKey="student" label={t.studentInfo} />}
                    {isAdminOrUser && visibleFinancialColumns.includes('agencyCompany') && <SortTh colKey="agencyCompany" label={t.agencyCompany} />}
                    {isAdminOrUser && visibleFinancialColumns.includes('description') && <SortTh colKey="description" label={t.internalDescription} />}
                    {visibleFinancialFields.map((col) => (
                      <th key={col.key} className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pagedApplications.map((app) => {
                    const s = getStudent(app.studentId);
                    const p = getProgram(app.programId);
                    const uni = p ? getUni(p.universityId) : null;
                    const hasUnreadNotifications = notificationIndex.unreadApplicationIds.has(app.id);
                    return (
                      <tr
                        key={app.id}
                        className={`hover:bg-blue-50/30 cursor-pointer transition-colors group ${hasUnreadNotifications ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''} ${selectedApplicationIds.has(app.id) ? 'bg-blue-50/40' : ''}`}
                        onClick={() => { setSelectedAppId(app.id); setView('detail'); }}
                      >
                        {showBulkSelect && (
                          <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedApplicationIds.has(app.id)}
                              onChange={() => toggleApplicationSelection(app.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              aria-label={`#${app.id}`}
                            />
                          </td>
                        )}
                        {visibleFinancialColumns.includes('number') && <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2 font-mono font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-xs">
                            #{app.id}
                            {hasUnreadNotifications && (
                              <NotificationUnreadDot title={t.unreadNotifications} />
                            )}
                          </span>
                        </td>}
                        {visibleFinancialColumns.includes('status') && <td className="px-2 py-3 text-center w-[170px] max-w-[170px]">
                          <span className={`${getApplicationStatusBadgeClass(app.status, 'compact')} inline-block max-w-[160px] whitespace-normal break-words leading-tight`}>
                            {displayStatus(app.status)}
                          </span>
                        </td>}
                        {visibleFinancialColumns.includes('agent') && <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{getAgentName(app)}</td>}
                        {visibleFinancialColumns.includes('nationality') && <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{s?.nationality || '—'}</td>}
                        {visibleFinancialColumns.includes('degree') && <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                          {p?.degree ? translateDegree(p.degree) : '—'}
                        </td>}
                        {visibleFinancialColumns.includes('program') && <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{p?.name || '—'}</td>}
                        {visibleFinancialColumns.includes('university') && <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{uni?.name || '—'}</td>}
                        {visibleFinancialColumns.includes('student') && <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{s?.firstName} {s?.lastName}</td>}
                        {isAdminOrUser && visibleFinancialColumns.includes('agencyCompany') && (
                          <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{app.agencyCompanyName || '—'}</td>
                        )}
                        {isAdminOrUser && visibleFinancialColumns.includes('description') && (
                          <td className="px-4 py-3 text-gray-900 max-w-[220px]">
                            <span className="line-clamp-2" title={app.internalDescription || ''}>{app.internalDescription || '—'}</span>
                          </td>
                        )}
                        {visibleFinancialFields.map((col) => (
                          <td key={col.key} className="px-4 py-3 text-gray-900 tabular-nums whitespace-nowrap text-xs">
                            {formatApplicationFinanceValue(app, col.key)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-blue-200 bg-blue-50/70">
                  <tr>
                    {(showBulkSelect || visibleFinancialBaseCount > 0) && (
                      <td
                        colSpan={(showBulkSelect ? 1 : 0) + visibleFinancialBaseCount}
                        className="px-4 py-4 font-bold text-blue-900 whitespace-nowrap"
                      >
                        {t.totals}
                      </td>
                    )}
                    {visibleFinancialFields.map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-4 font-bold text-blue-900 tabular-nums whitespace-nowrap text-xs"
                      >
                        {FINANCIAL_TREE_NUMERIC_KEYS.has(col.key)
                          ? (financialTreeTotals[col.key] || 0).toLocaleString()
                          : '—'}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
              ) : (
              <table
                dir={language === 'ar' ? 'rtl' : 'ltr'}
                className={`w-full text-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}
              >
                <thead style={{ fontWeight: 700 }} className="bg-gray-50/50 text-gray-900 border-b border-gray-100">
                  <tr>
                    {showBulkSelect && (
                      <th className="px-4 py-5 w-12 text-center">
                        <input
                          ref={selectAllCheckboxRef}
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={toggleSelectAllApplicationsOnPage}
                          disabled={pagedApplications.length === 0}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          aria-label={t.filterAll}
                        />
                      </th>
                    )}
                    <th className="px-6 py-5"></th>
                    {visibleTreeColumns.includes('number') && <SortTh colKey="number" label={t.number} />}
                    {visibleTreeColumns.includes('status') && <SortTh colKey="status" label={t.applicationStatus} className="text-center w-[170px] max-w-[170px]" />}
                    {canSeeAgentColumn && visibleTreeColumns.includes('agent') && <SortTh colKey="agent" label={t.agent} />}
                    {isAdminOrUser && visibleTreeColumns.includes('responsible') && <SortTh colKey="responsible" label={t.responsible} />}
                    {visibleTreeColumns.includes('student') && <SortTh colKey="student" label={t.studentInfo} />}
                    {visibleTreeColumns.includes('nationality') && <SortTh colKey="nationality" label={t.nationality} />}
                    {visibleTreeColumns.includes('program') && <SortTh colKey="program" label={t.program} />}
                    {visibleTreeColumns.includes('university') && <SortTh colKey="university" label={t.universityName} />}
                    {visibleTreeColumns.includes('degree') && <SortTh colKey="degree" label={t.programDegree} />}
                    {isAdminOrUser && visibleTreeColumns.includes('agencyCompany') && <SortTh colKey="agencyCompany" label={t.agencyCompany} />}
                    {isAdminOrUser && visibleTreeColumns.includes('description') && <SortTh colKey="description" label={t.internalDescription} />}
                    {visibleTreeColumns.includes('createdAt') && <SortTh colKey="createdAt" label={t.createdAt} />}
                    {!isAgent && visibleTreeColumns.includes('updatedAt') && <SortTh colKey="updatedAt" label={t.lastUpdatedAt} />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pagedApplications.map((app) => {
                    const s = getStudent(app.studentId);
                    const p = getProgram(app.programId);
                    const uni = p ? getUni(p.universityId) : null;
                    const period = getPeriod(app.periodId || p?.periodId);
                    const isExpanded = expandedAppIds.has(app.id);
                    const hasUnreadNotifications = notificationIndex.unreadApplicationIds.has(app.id);
                    const treeColSpan =
                      (showBulkSelect ? 1 : 0) +
                      (visibleTreeColumns.includes('number') ? 1 : 0) +
                      (visibleTreeColumns.includes('status') ? 1 : 0) +
                      (canSeeAgentColumn && visibleTreeColumns.includes('agent') ? 1 : 0) +
                      (isAdminOrUser && visibleTreeColumns.includes('responsible') ? 1 : 0) +
                      (visibleTreeColumns.includes('student') ? 1 : 0) +
                      (visibleTreeColumns.includes('nationality') ? 1 : 0) +
                      (visibleTreeColumns.includes('program') ? 1 : 0) +
                      (visibleTreeColumns.includes('university') ? 1 : 0) +
                      (visibleTreeColumns.includes('degree') ? 1 : 0) +
                      (isAdminOrUser && visibleTreeColumns.includes('agencyCompany') ? 1 : 0) +
                      (isAdminOrUser && visibleTreeColumns.includes('description') ? 1 : 0) +
                      (visibleTreeColumns.includes('createdAt') ? 1 : 0) +
                      (!isAgent && visibleTreeColumns.includes('updatedAt') ? 1 : 0) +
                      1; // expand toggle column
                    return (
                      <React.Fragment key={app.id}>
                        <tr
                          className={`hover:bg-blue-50/30 cursor-pointer transition-colors group ${hasUnreadNotifications ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''} ${selectedApplicationIds.has(app.id) ? 'bg-blue-50/40' : ''}`}
                          onClick={() => { setSelectedAppId(app.id); setView('detail'); }}
                        >
                          {showBulkSelect && (
                            <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedApplicationIds.has(app.id)}
                                onChange={() => toggleApplicationSelection(app.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                aria-label={`#${app.id}`}
                              />
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
                          {visibleTreeColumns.includes('number') && (
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-2 font-mono font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                #{app.id}
                                {hasUnreadNotifications && (
                                  <NotificationUnreadDot title={t.unreadNotifications} />
                                )}
                              </span>
                            </td>
                          )}
                          {visibleTreeColumns.includes('status') && (
                            <td className="px-2 py-4 text-center w-[170px] max-w-[170px]">
                              <div className="flex justify-center">
                                <span className={`${getApplicationStatusBadgeClass(app.status, 'compact')} inline-block max-w-[160px] whitespace-normal break-words leading-tight text-center`}>
                                  {displayStatus(app.status)}
                                </span>
                              </div>
                            </td>
                          )}
                          {canSeeAgentColumn && visibleTreeColumns.includes('agent') && <td className="px-6 py-4 text-gray-900">{getAgentName(app)}</td>}
                          {isAdminOrUser && visibleTreeColumns.includes('responsible') && (
                            <td className="px-6 py-4 text-gray-900">{getResponsibleLabel(app)}</td>
                          )}
                          {visibleTreeColumns.includes('student') && <td className="px-6 py-4 font-bold text-gray-900">{s?.firstName} {s?.lastName}</td>}
                          {visibleTreeColumns.includes('nationality') && (
                            <td className="px-6 py-4 text-gray-900">{s?.nationality || '—'}</td>
                          )}
                          {visibleTreeColumns.includes('program') && (
                            <td className="px-6 py-4">
                              <span className="font-bold text-gray-900">{p?.name || '—'}</span>
                            </td>
                          )}
                          {visibleTreeColumns.includes('university') && (
                            <td className="px-6 py-4 text-gray-900">
                              {uni?.name || '—'}
                            </td>
                          )}
                          {visibleTreeColumns.includes('degree') && (
                            <td className="px-6 py-4 text-gray-900">{p?.degree ? translateDegree(p.degree) : '—'}</td>
                          )}
                          {isAdminOrUser && visibleTreeColumns.includes('agencyCompany') && (
                            <td className="px-6 py-4 text-gray-900">{app.agencyCompanyName || '—'}</td>
                          )}
                          {isAdminOrUser && visibleTreeColumns.includes('description') && (
                            <td className="px-6 py-4 text-gray-900 max-w-[240px]">
                              <span className="line-clamp-2" title={app.internalDescription || ''}>{app.internalDescription || '—'}</span>
                            </td>
                          )}
                          {visibleTreeColumns.includes('createdAt') && (
                            <td className="px-6 py-4 text-gray-900 font-medium">
                              {app.createdAt ? new Date(app.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                            </td>
                          )}
                          {!isAgent && visibleTreeColumns.includes('updatedAt') && (
                            <td className="px-6 py-4 text-gray-900 font-medium">
                              {(app.updatedAt || app.createdAt) ? new Date(app.updatedAt || app.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                            </td>
                          )}
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
              )}
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
                          {!isAgent && (
                            <>
                              <br />
                              {t.lastUpdatedAt}: {(app.updatedAt || app.createdAt) ? new Date(app.updatedAt || app.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                            </>
                          )}
                        </p>
                        <span className={`inline-block mt-2 ${getApplicationStatusBadgeClass(app.status, 'compact')}`}>
                          {displayStatus(app.status)}
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

      {confirmBulkDelete && selectedApplicationIds.size > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">{t.confirmDelete}</h3>
            </div>
            <p className="text-gray-700 text-sm font-medium mb-2">
              {selectedApplicationIds.size} {t.applicationsTitle.toLowerCase()}
            </p>
            <p className="text-amber-700 text-xs mb-6">{t.bulkDeleteConfirmApplications}</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmBulkDelete(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteConfirm}
                disabled={bulkDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {bulkDeleting ? t.loading : t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      <MassEditModal
        open={massEditOpen}
        onClose={() => setMassEditOpen(false)}
        selectedCount={selectedApplicationIds.size}
        fields={applicationMassEditFields}
        onApply={handleApplicationMassEditApply}
        applying={massEditApplying}
      />
    </div>
  );
};