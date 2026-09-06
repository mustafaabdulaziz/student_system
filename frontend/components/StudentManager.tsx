import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Student, Application, Program, University, ApplicationStatus, Period, AgencyCompany } from '../types';
import { Plus, User, Search, Eye, X, List, LayoutGrid, Pencil, ArrowLeft, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Filter, Upload, FileText, Paperclip, Trash2 } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { COUNTRIES } from '../constants/countries';
import { matchesCreatedAtRange } from '../utils/createdAtRangeFilter';
import { matchesMultiFilter, type MultiFilterMode } from '../utils/multiFilter';
import { getApplicationStatusBadgeClass } from '../utils/applicationStatusStyles';
import { ApplicationManager } from './ApplicationManager';
import { useNotifications } from '../contexts/NotificationContext';
import { buildNotificationEntityIndex } from '../utils/notifications';
import { NotificationUnreadDot } from './NotificationUnreadDot';
import { CreatedAtRangeFilter } from './CreatedAtRangeFilter';
import { SearchableMultiSelect } from './SearchableMultiSelect';
import { SearchableSelect } from './SearchableSelect';
import { isStaffRole, canManageCatalog, isAdminRole, isAgentRole } from '../utils/roles';
import { SavedQuickFilters } from './SavedQuickFilters';
import { StaffTypedFileUpload } from './StaffTypedFileUpload';
import { getStudentFileTypeLabel, type StudentFileTypeCode } from '../constants/studentFileTypes';

const BULK_DELETE_MAX = 50;

interface StudentManagerProps {
  students: Student[];
  applications: Application[];
  programs: Program[];
  universities: University[];
  periods?: Period[];
  users?: { id: string; name: string; email?: string; role?: string; phone?: string; countryCode?: string }[];
  onAddStudent: (student: Student) => Promise<string | null> | string | null;
  onEditStudent?: (student: Student) => Promise<Student | undefined> | Student | undefined;
  onDeleteStudent?: (id: string) => void | Promise<void>;
  onUploadStudentFiles?: (studentId: string, files: File[]) => Promise<string[]>;
  onUploadApplicationFiles?: (applicationId: string, files: File[]) => Promise<string[]>;
  onStudentFilesChange?: (studentId: string, fileUrls: string[]) => void;
  onCreateApplicationForStudent?: (studentId: string) => void;
  onAddApplicationForStudent?: (app: Application, files?: File[] | FileList | null) => Promise<string | null> | string | null;
  onViewApplication?: (applicationId: string) => void;
  agencyCompanies?: AgencyCompany[];
  onUpdateApplicationStatus?: (id: string, status: ApplicationStatus) => void;
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
  }) => void | Promise<void>;
  onDeleteApplication?: (id: string) => void | Promise<void>;
  onSyncApplicationTimestamps?: (payload: {
    applicationId: string;
    applicationUpdatedAt: string;
    studentId?: string;
    studentUpdatedAt?: string | null;
  }) => void;
  currentUser: { id: string; role: string; name?: string; email?: string } | null;
  targetStudentId?: string | null;
  clearTargetStudent?: () => void;
}

export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  applications = [],
  programs = [],
  universities = [],
  periods = [],
  users = [],
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onUploadStudentFiles,
  onUploadApplicationFiles,
  onStudentFilesChange,
  onCreateApplicationForStudent,
  onAddApplicationForStudent,
  agencyCompanies = [],
  onUpdateApplicationStatus,
  onUpdateApplication,
  onDeleteApplication,
  onSyncApplicationTimestamps,
  currentUser,
  targetStudentId,
  clearTargetStudent
}) => {
  const { t, language, translateGender, translateStatus, translateDegree } = useTranslation();
  const displayStatus = (status: string) => translateStatus(status, currentUser?.role);
  const { notifications } = useNotifications();
  const notificationIndex = useMemo(
    () => buildNotificationEntityIndex(notifications, applications),
    [notifications, applications]
  );
  const dateLocale = { ar: 'ar-EG', en: 'en-GB', tr: 'tr-TR' }[language] || 'en-GB';
  const scrollContentTop = () => {
    const container = document.getElementById('app-scroll-container');
    if (container) container.scrollTo({ top: 0, behavior: 'auto' });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNationalities, setFilterNationalities] = useState<string[]>([]);
  const [filterGender, setFilterGender] = useState('');
  const [filterAgents, setFilterAgents] = useState<string[]>([]);
  const [filterNationalitiesMode, setFilterNationalitiesMode] = useState<MultiFilterMode>('include');
  const [filterAgentsMode, setFilterAgentsMode] = useState<MultiFilterMode>('include');
  const [filterStudentCreatedFrom, setFilterStudentCreatedFrom] = useState('');
  const [filterStudentCreatedTo, setFilterStudentCreatedTo] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'kanban'>('tree');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [treePage, setTreePage] = useState(1);
  const [kanbanPage, setKanbanPage] = useState(1);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);
  const studentColumnKeys = useMemo(() => ['name', 'passport', 'nationality', 'gender', 'email', 'agent', 'createdBy', 'createdAt', 'updatedAt'], []);
  const [visibleTreeColumns, setVisibleTreeColumns] = useState<string[]>(studentColumnKeys);
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<Student | null>(null);
  const [embeddedApplicationId, setEmbeddedApplicationId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [selectedAgencyCompanyId, setSelectedAgencyCompanyId] = useState('');
  const [quickAppOpen, setQuickAppOpen] = useState(false);
  const [quickAppStudentId, setQuickAppStudentId] = useState<string | null>(null);
  const [quickFilterPeriod, setQuickFilterPeriod] = useState('');
  const [quickFilterUni, setQuickFilterUni] = useState('');
  const [quickFilterDegree, setQuickFilterDegree] = useState('');
  const [quickFilterLang, setQuickFilterLang] = useState('');
  const [quickFilterProgramName, setQuickFilterProgramName] = useState('');
  const [quickAgencyCompanyId, setQuickAgencyCompanyId] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const pendingFilesRef = useRef<File[]>([]);
  const [addFilterPeriod, setAddFilterPeriod] = useState('');
  const [addFilterUni, setAddFilterUni] = useState('');
  const [addFilterDegree, setAddFilterDegree] = useState('');
  const [addFilterLang, setAddFilterLang] = useState('');
  const [addFilterProgramName, setAddFilterProgramName] = useState('');
  const [detailStudentFiles, setDetailStudentFiles] = useState<{ url: string; name: string; filename: string; fileType?: string; description?: string }[]>([]);
  const [detailAttachFiles, setDetailAttachFiles] = useState<FileList | null>(null);
  const [detailFilesUploading, setDetailFilesUploading] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(() => new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!targetStudentId) return;
    const s = students.find(st => st.id === targetStudentId);
    if (s) {
      setSelectedStudentForDetails(s);
      setModalOpen(false);
      scrollContentTop();
    }
    if (typeof clearTargetStudent === 'function') clearTargetStudent();
  }, [targetStudentId, students, clearTargetStudent]);

  useEffect(() => {
    if (isModalOpen || selectedStudentForDetails || embeddedApplicationId) {
      scrollContentTop();
    }
  }, [isModalOpen, selectedStudentForDetails, embeddedApplicationId]);

  const openEmbeddedApplication = (applicationId: string) => {
    setEmbeddedApplicationId(applicationId);
    scrollContentTop();
  };

  const agentUsers = useMemo(() => users.filter(u => (u.role || '').toString().toLowerCase() === 'agent'), [users]);
  const isAdminOrUser = isStaffRole(currentUser?.role);
  const isAdmin = isAdminRole(currentUser?.role);
  const canManage = canManageCatalog(currentUser?.role);
  const isUser = currentUser && (currentUser.role || '').toString().toUpperCase() === 'USER';
  const isAgent = isAgentRole(currentUser?.role);
  const canEditStudent = !isAgent;
  const getAgentName = (student: Student) => (student.userId && users.find(u => u.id === student.userId)?.name) || '—';
  const getCreatedByName = (student: Student) =>
    student.createdByName || (student.createdBy && users.find(u => u.id === student.createdBy)?.name) || '—';
  const uniqueAgents = useMemo(() => {
    const names = new Set<string>();
    agentUsers.forEach(u => {
      if (u.name) names.add(u.name);
    });
    students.forEach(s => {
      const name = getAgentName(s);
      if (name && name !== '—') names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [students, agentUsers, users]);
  const activePeriods = useMemo(() => periods.filter(p => p.active !== false), [periods]);
  const studentColumnOptions = [
    { key: 'name', label: t.userName },
    { key: 'passport', label: t.passportNumber },
    { key: 'nationality', label: t.nationality },
    { key: 'gender', label: t.gender },
    { key: 'email', label: t.email },
    { key: 'agent', label: t.agent },
    { key: 'createdBy', label: t.createdByUser },
    { key: 'createdAt', label: t.createdAt },
    { key: 'updatedAt', label: t.lastUpdatedAt }
  ];
  const storageKey = `tree-columns:students:${currentUser?.id || 'guest'}`;

  const [formData, setFormData] = useState<Partial<Student>>({
    firstName: '',
    lastName: '',
    passportNumber: '',
    nationality: '',
    email: '',
    phone: '',
    fatherName: '',
    motherName: '',
    gender: 'Male',
    degreeTarget: '',
    dob: '',
    residenceCountry: ''
  });

  const countryOptions = useMemo(() => COUNTRIES.map((c) => ({ value: c, label: c })), []);
  const nationalityOptions = useMemo(() => {
    const current = formData.nationality;
    if (current && !COUNTRIES.includes(current)) {
      return [{ value: current, label: current }, ...countryOptions];
    }
    return countryOptions;
  }, [countryOptions, formData.nationality]);
  const residenceCountryOptions = useMemo(() => {
    const current = formData.residenceCountry;
    if (current && !COUNTRIES.includes(current)) {
      return [{ value: '', label: '—' }, { value: current, label: current }, ...countryOptions];
    }
    return [{ value: '', label: '—' }, ...countryOptions];
  }, [countryOptions, formData.residenceCountry]);

  const openQuickApplicationModal = (studentId: string) => {
    setQuickAppStudentId(studentId);
    setQuickFilterPeriod('');
    setQuickFilterUni('');
    setQuickFilterDegree('');
    setQuickFilterLang('');
    setQuickFilterProgramName('');
    setQuickAgencyCompanyId('');
    setQuickAppOpen(true);
  };

  const closeQuickApplicationModal = () => {
    setQuickAppOpen(false);
    setQuickAppStudentId(null);
    setQuickAgencyCompanyId('');
    setQuickSaving(false);
  };

  const quickAvailablePrograms = useMemo(() => {
    return programs.filter(p => p.isOpen !== false && !p.isArchived && (!quickFilterPeriod || p.periodId === quickFilterPeriod));
  }, [programs, quickFilterPeriod]);

  const quickAvailableUnis = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    quickAvailablePrograms.forEach(p => {
      const uni = universities.find(u => u.id === p.universityId);
      if (uni && !byId.has(uni.id)) byId.set(uni.id, { id: uni.id, name: uni.name });
    });
    return Array.from(byId.values());
  }, [quickAvailablePrograms, universities]);

  const quickAvailableDegrees = useMemo(() => {
    return Array.from(new Set(
      quickAvailablePrograms
        .filter(p => !quickFilterUni || p.universityId === quickFilterUni)
        .map(p => p.degree)
    ));
  }, [quickAvailablePrograms, quickFilterUni]);

  const quickAvailableLanguages = useMemo(() => {
    return Array.from(new Set(
      quickAvailablePrograms
        .filter(p =>
          (!quickFilterUni || p.universityId === quickFilterUni) &&
          (!quickFilterDegree || p.degree === quickFilterDegree)
        )
        .map(p => p.language)
    ));
  }, [quickAvailablePrograms, quickFilterUni, quickFilterDegree]);

  const quickAvailableProgramNames = useMemo(() => {
    return Array.from(new Set(
      quickAvailablePrograms
        .filter(p =>
          (!quickFilterUni || p.universityId === quickFilterUni) &&
          (!quickFilterDegree || p.degree === quickFilterDegree) &&
          (!quickFilterLang || p.language === quickFilterLang)
        )
        .map(p => p.name)
    ));
  }, [quickAvailablePrograms, quickFilterUni, quickFilterDegree, quickFilterLang]);

  const quickFinalProgram = useMemo(() => {
    if (!quickFilterUni || !quickFilterDegree || !quickFilterLang || !quickFilterProgramName) return null;
    return programs.find(p =>
      (!quickFilterPeriod || p.periodId === quickFilterPeriod) &&
      p.universityId === quickFilterUni &&
      p.degree === quickFilterDegree &&
      p.language === quickFilterLang &&
      p.name === quickFilterProgramName
    ) || null;
  }, [programs, quickFilterPeriod, quickFilterUni, quickFilterDegree, quickFilterLang, quickFilterProgramName]);

  const resetAddApplicationFilters = () => {
    setAddFilterPeriod('');
    setAddFilterUni('');
    setAddFilterDegree('');
    setAddFilterLang('');
    setAddFilterProgramName('');
    setSelectedAgencyCompanyId('');
    setPendingFiles([]);
    pendingFilesRef.current = [];
  };

  const handleAddFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    if (picked.length > 0) {
      pendingFilesRef.current = [...pendingFilesRef.current, ...picked];
      setPendingFiles([...pendingFilesRef.current]);
    }
    e.target.value = '';
  };

  const removePendingFile = (index: number) => {
    pendingFilesRef.current = pendingFilesRef.current.filter((_, i) => i !== index);
    setPendingFiles([...pendingFilesRef.current]);
  };

  const addAvailablePrograms = useMemo(() => {
    return programs.filter(p => p.isOpen !== false && !p.isArchived && (!addFilterPeriod || p.periodId === addFilterPeriod));
  }, [programs, addFilterPeriod]);

  const addAvailableUnis = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    addAvailablePrograms.forEach(p => {
      const uni = universities.find(u => u.id === p.universityId);
      if (uni && !byId.has(uni.id)) byId.set(uni.id, { id: uni.id, name: uni.name });
    });
    return Array.from(byId.values());
  }, [addAvailablePrograms, universities]);

  const addAvailableDegrees = useMemo(() => {
    return Array.from(new Set(
      addAvailablePrograms
        .filter(p => !addFilterUni || p.universityId === addFilterUni)
        .map(p => p.degree)
    ));
  }, [addAvailablePrograms, addFilterUni]);

  const addAvailableLanguages = useMemo(() => {
    return Array.from(new Set(
      addAvailablePrograms
        .filter(p =>
          (!addFilterUni || p.universityId === addFilterUni) &&
          (!addFilterDegree || p.degree === addFilterDegree)
        )
        .map(p => p.language)
    ));
  }, [addAvailablePrograms, addFilterUni, addFilterDegree]);

  const addAvailableProgramNames = useMemo(() => {
    return Array.from(new Set(
      addAvailablePrograms
        .filter(p =>
          (!addFilterUni || p.universityId === addFilterUni) &&
          (!addFilterDegree || p.degree === addFilterDegree) &&
          (!addFilterLang || p.language === addFilterLang)
        )
        .map(p => p.name)
    ));
  }, [addAvailablePrograms, addFilterUni, addFilterDegree, addFilterLang]);

  const addFinalProgram = useMemo(() => {
    if (!addFilterUni || !addFilterDegree || !addFilterLang || !addFilterProgramName) return null;
    return programs.find(p =>
      (!addFilterPeriod || p.periodId === addFilterPeriod) &&
      p.universityId === addFilterUni &&
      p.degree === addFilterDegree &&
      p.language === addFilterLang &&
      p.name === addFilterProgramName
    ) || null;
  }, [programs, addFilterPeriod, addFilterUni, addFilterDegree, addFilterLang, addFilterProgramName]);

  const submitQuickApplication = async () => {
    if (!quickAppStudentId) return;
    if (!quickFinalProgram) return;
    if (!onAddApplicationForStudent) {
      onCreateApplicationForStudent?.(quickAppStudentId);
      closeQuickApplicationModal();
      return;
    }
    const student = students.find(s => s.id === quickAppStudentId);
    const agentId = student?.userId || currentUser?.id || '';
    const responsibleId = isUser ? currentUser?.id : undefined;
    setQuickSaving(true);
    try {
      await onAddApplicationForStudent({
        id: Date.now().toString(),
        studentId: quickAppStudentId,
        programId: quickFinalProgram.id,
        periodId: quickFilterPeriod || quickFinalProgram.periodId,
        status: ApplicationStatus.NEW,
        semester: 'Fall 2024',
        createdAt: new Date().toISOString().split('T')[0],
        files: [],
        userId: agentId || undefined,
        responsibleId,
        ...(isAdminOrUser && quickAgencyCompanyId ? { agencyCompanyId: quickAgencyCompanyId } : {})
      });
      closeQuickApplicationModal();
    } finally {
      setQuickSaving(false);
    }
  };

  useEffect(() => {
    if (!selectedStudentForDetails) return;
    const fresh = students.find(s => s.id === selectedStudentForDetails.id);
    if (fresh) setSelectedStudentForDetails(fresh);
  }, [students, selectedStudentForDetails?.id]);

  useEffect(() => {
    if (!selectedStudentForDetails) {
      setDetailStudentFiles([]);
      return;
    }
    (async () => {
      try {
        const r = await fetch(`/api/students/${selectedStudentForDetails.id}/files`);
        if (r.ok) {
          const list = await r.json();
          setDetailStudentFiles(list.map((x: { url: string; name?: string; filename: string; fileType?: string; description?: string }) => ({
            url: x.url,
            name: x.name || x.url.split('/').pop() || x.filename,
            filename: x.filename,
            fileType: x.fileType,
            description: x.description
          })));
        } else {
          setDetailStudentFiles([]);
        }
      } catch {
        setDetailStudentFiles([]);
      }
    })();
  }, [selectedStudentForDetails?.id]);

  const openAddModal = () => {
    setSelectedStudentForEdit(null);
    setSelectedAgentId('');
    setFormData({
      firstName: '', lastName: '', passportNumber: '', nationality: '', email: '', phone: '',
      fatherName: '', motherName: '', gender: 'Male', degreeTarget: '', dob: '', residenceCountry: ''
    });
    resetAddApplicationFilters();
    setModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    if (!canEditStudent) return;
    setFormData({
      firstName: student.firstName,
      lastName: student.lastName,
      passportNumber: student.passportNumber,
      nationality: student.nationality,
      email: student.email,
      phone: student.phone,
      fatherName: student.fatherName || '',
      motherName: student.motherName || '',
      gender: student.gender,
      degreeTarget: student.degreeTarget || '',
      dob: student.dob || '',
      residenceCountry: student.residenceCountry || ''
    });
    setSelectedStudentForEdit(student);
    setModalOpen(true);
  };

  const closeFormModal = () => {
    setModalOpen(false);
    setSelectedStudentForEdit(null);
    setFormData({
      firstName: '', lastName: '', passportNumber: '', nationality: '', email: '', phone: '',
      fatherName: '', motherName: '', gender: 'Male', degreeTarget: '', dob: '', residenceCountry: ''
    });
    resetAddApplicationFilters();
  };

  /** Close add/edit form; if user was editing, return to that student's detail view instead of the list. */
  const leaveFormModal = () => {
    const editing = selectedStudentForEdit;
    closeFormModal();
    if (editing) {
      setSelectedStudentForDetails(editing);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredFields = ['firstName', 'lastName', 'passportNumber', 'nationality'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof Student]);

    if (missingFields.length > 0) {
      alert(`${t.fillRequired}: ${missingFields.join(', ')}`);
      return;
    }

    const isEdit = !!selectedStudentForEdit;
    const agentId = selectedAgentId || (currentUser?.id ?? '');
    const payload: Student = {
      id: selectedStudentForEdit?.id ?? Date.now().toString(),
      firstName: formData.firstName!,
      lastName: formData.lastName!,
      passportNumber: formData.passportNumber!,
      nationality: formData.nationality!,
      email: formData.email || '',
      phone: formData.phone || '',
      fatherName: formData.fatherName || '',
      motherName: formData.motherName || '',
      gender: formData.gender as 'Male' | 'Female' || 'Male',
      degreeTarget: formData.degreeTarget || '',
      dob: formData.dob || '',
      residenceCountry: formData.residenceCountry || '',
      ...(!isEdit && agentId ? { userId: agentId } : {}),
      ...(isEdit && selectedStudentForEdit?.userId ? { userId: selectedStudentForEdit.userId } : {}),
      ...(isEdit && selectedStudentForEdit?.createdAt ? { createdAt: selectedStudentForEdit.createdAt } : {}),
      ...(isEdit && selectedStudentForEdit?.updatedAt ? { updatedAt: selectedStudentForEdit.updatedAt } : {})
    };

    try {
      if (isEdit) {
        if (!canEditStudent) return;
        const updated = await onEditStudent?.(payload);
        if (updated) {
          closeFormModal();
          setSelectedStudentForDetails(updated);
        }
      } else {
        setSubmitting(true);
        const filesToUpload = [...pendingFilesRef.current];
        try {
          const newId = await onAddStudent({ ...payload, id: payload.id } as Student);
          if (newId) {
            const agentIdForApp = selectedAgentId || currentUser?.id || '';
            const responsibleIdForApp = isUser ? currentUser?.id : undefined;
            let appId: string | null = null;
            if (addFinalProgram && onAddApplicationForStudent) {
              const createdAppId = await onAddApplicationForStudent({
                id: Date.now().toString(),
                studentId: newId,
                programId: addFinalProgram.id,
                periodId: addFilterPeriod || addFinalProgram.periodId,
                status: ApplicationStatus.NEW,
                semester: 'Fall 2024',
                createdAt: new Date().toISOString().split('T')[0],
                files: [],
                userId: agentIdForApp || undefined,
                responsibleId: responsibleIdForApp,
                ...(isAdminOrUser && selectedAgencyCompanyId ? { agencyCompanyId: selectedAgencyCompanyId } : {})
              });
              appId = createdAppId ?? null;
            }
            if (filesToUpload.length) {
              let urls: string[] = [];
              if (appId && onUploadApplicationFiles) {
                urls = await onUploadApplicationFiles(appId, filesToUpload);
              } else if (onUploadStudentFiles) {
                urls = await onUploadStudentFiles(newId, filesToUpload);
              }
              if (!urls.length) {
                alert(t.uploadFailed);
              }
            }
            closeFormModal();
            setViewMode('tree');
            if (appId) {
              openEmbeddedApplication(appId);
            } else {
              setSelectedStudentForDetails({ ...payload, id: newId });
            }
          }
        } finally {
          setSubmitting(false);
        }
      }
    } catch (error) {
      alert(isEdit ? (t.errorUpdate || 'Update failed') : t.errorAdd);
    }
  };

  const filteredStudents = useMemo(() => students.filter(student => {
    const matchSearch = !searchTerm.trim() ||
      student.firstName.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
      student.passportNumber.includes(searchTerm.trim());
    const matchNationality = matchesMultiFilter(student.nationality, filterNationalities, filterNationalitiesMode);
    const matchGender = !filterGender || student.gender === filterGender;
    const matchCreated = matchesCreatedAtRange(student.createdAt, filterStudentCreatedFrom, filterStudentCreatedTo);
    const agentName = getAgentName(student);
    const matchAgent = matchesMultiFilter(agentName, filterAgents, filterAgentsMode);
    return matchSearch && matchNationality && matchGender && matchCreated && matchAgent;
  }), [students, searchTerm, filterNationalities, filterNationalitiesMode, filterGender, filterStudentCreatedFrom, filterStudentCreatedTo, filterAgents, filterAgentsMode, users]);

  const sortedStudents = useMemo(() => {
    const list = [...filteredStudents];
    const sortKey = sortBy || 'createdAt';
    const sortDesc = sortBy ? sortDir : 'desc';
    const d = sortDesc === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'createdAt':
          cmp = (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()) * d;
          break;
        case 'updatedAt':
          cmp = (new Date(a.updatedAt || a.createdAt || 0).getTime() - new Date(b.updatedAt || b.createdAt || 0).getTime()) * d;
          break;
        case 'name':
          cmp = d * `${a.firstName} ${a.lastName}`.toLowerCase().localeCompare(`${b.firstName} ${b.lastName}`.toLowerCase());
          break;
        case 'passport':
          cmp = d * (a.passportNumber || '').localeCompare(b.passportNumber || '');
          break;
        case 'nationality':
          cmp = d * (a.nationality || '').toLowerCase().localeCompare((b.nationality || '').toLowerCase());
          break;
        case 'gender':
          cmp = d * (a.gender || '').toLowerCase().localeCompare((b.gender || '').toLowerCase());
          break;
        case 'email':
          cmp = d * (a.email || '').toLowerCase().localeCompare((b.email || '').toLowerCase());
          break;
        case 'agent':
          cmp = d * getAgentName(a).toLowerCase().localeCompare(getAgentName(b).toLowerCase());
          break;
        case 'createdBy':
          cmp = d * getCreatedByName(a).toLowerCase().localeCompare(getCreatedByName(b).toLowerCase());
          break;
        default:
          cmp = 0;
      }
      return cmp;
    });
    return list;
  }, [filteredStudents, sortBy, sortDir, users]);

  const TREE_PAGE_SIZE = 80;
  const totalTreePages = Math.max(1, Math.ceil(sortedStudents.length / TREE_PAGE_SIZE));
  const pagedStudents = useMemo(() => {
    const start = (treePage - 1) * TREE_PAGE_SIZE;
    return sortedStudents.slice(start, start + TREE_PAGE_SIZE);
  }, [sortedStudents, treePage]);
  const treeFrom = sortedStudents.length === 0 ? 0 : ((treePage - 1) * TREE_PAGE_SIZE) + 1;
  const treeTo = Math.min(treePage * TREE_PAGE_SIZE, sortedStudents.length);
  const KANBAN_PAGE_SIZE = 80;
  const totalKanbanPages = Math.max(1, Math.ceil(sortedStudents.length / KANBAN_PAGE_SIZE));
  const pagedKanbanStudents = useMemo(() => {
    const start = (kanbanPage - 1) * KANBAN_PAGE_SIZE;
    return sortedStudents.slice(start, start + KANBAN_PAGE_SIZE);
  }, [sortedStudents, kanbanPage]);
  const kanbanFrom = sortedStudents.length === 0 ? 0 : ((kanbanPage - 1) * KANBAN_PAGE_SIZE) + 1;
  const kanbanTo = Math.min(kanbanPage * KANBAN_PAGE_SIZE, sortedStudents.length);

  const toggleSort = (key: string) => {
    setSortBy(prev => (prev === key ? prev : key));
    setSortDir(prev => (sortBy === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
  };

  useEffect(() => {
    if (treePage > totalTreePages) setTreePage(totalTreePages);
  }, [treePage, totalTreePages]);

  useEffect(() => {
    setSelectedStudentIds(new Set());
  }, [treePage]);

  const allOnPageSelected =
    pagedStudents.length > 0 && pagedStudents.every((s) => selectedStudentIds.has(s.id));
  const someOnPageSelected = pagedStudents.some((s) => selectedStudentIds.has(s.id));

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected;
  }, [someOnPageSelected, allOnPageSelected]);

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= BULK_DELETE_MAX) {
        alert(t.bulkDeleteMaxRecords);
        return prev;
      }
      next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        pagedStudents.forEach((s) => next.delete(s.id));
        return next;
      });
      return;
    }
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      for (const s of pagedStudents) {
        if (next.size >= BULK_DELETE_MAX) break;
        next.add(s.id);
      }
      if (next.size >= BULK_DELETE_MAX && pagedStudents.some((s) => !next.has(s.id))) {
        alert(t.bulkDeleteMaxRecords);
      }
      return next;
    });
  };

  const selectedStudentsAppCount = useMemo(() => {
    let count = 0;
    selectedStudentIds.forEach((id) => {
      count += applications.filter((a) => a.studentId === id).length;
    });
    return count;
  }, [selectedStudentIds, applications]);

  useEffect(() => {
    if (kanbanPage > totalKanbanPages) setKanbanPage(totalKanbanPages);
  }, [kanbanPage, totalKanbanPages]);

  useEffect(() => {
    setTreePage(1);
    setKanbanPage(1);
  }, [searchTerm, filterNationalities, filterGender, filterAgents, filterStudentCreatedFrom, filterStudentCreatedTo, sortBy, sortDir, viewMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter((k: string) => studentColumnKeys.includes(k));
      if (valid.length > 0) setVisibleTreeColumns(valid);
    } catch {
      // ignore corrupted localStorage values
    }
  }, [storageKey, studentColumnKeys]);

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
    const hiddenByConfig = sortBy && studentColumnKeys.includes(sortBy) && !visibleTreeColumns.includes(sortBy);
    const hiddenByRole = (sortBy === 'agent' && !isAdminOrUser) || (sortBy === 'updatedAt' && isAgent);
    if (hiddenByConfig || hiddenByRole) {
      setSortBy(null);
      setSortDir('asc');
    }
  }, [sortBy, visibleTreeColumns, isAdminOrUser, isAgent, studentColumnKeys]);

  const toggleTreeColumn = (key: string) => {
    setVisibleTreeColumns(prev => {
      if (prev.includes(key)) {
        const minVisible = isAdminOrUser ? 1 : 1;
        if (prev.length <= minVisible) return prev;
        return prev.filter(k => k !== key);
      }
      return [...prev, key];
    });
  };

  useEffect(() => {
    let allowed = isAdminOrUser ? studentColumnKeys : studentColumnKeys.filter(k => k !== 'agent');
    if (isAgent) allowed = allowed.filter(k => k !== 'updatedAt');
    const normalized = visibleTreeColumns.filter(k => allowed.includes(k));
    if (normalized.length !== visibleTreeColumns.length) {
      setVisibleTreeColumns(normalized.length > 0 ? normalized : allowed);
      return;
    }
    const hasVisibleAllowed = visibleTreeColumns.some(k => allowed.includes(k));
    if (!hasVisibleAllowed) setVisibleTreeColumns(allowed);
  }, [isAdminOrUser, isAgent, studentColumnKeys, visibleTreeColumns]);
  const SortTh = ({ colKey, label, className = '' }: { colKey: string; label: string; className?: string }) => (
    <th className={`px-4 py-3 font-bold cursor-pointer select-none hover:bg-gray-100 transition-colors ${className}`} onClick={() => toggleSort(colKey)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sortBy === colKey ? (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <span className="opacity-30"><ChevronDown size={14} /></span>}
      </span>
    </th>
  );

  const hasActiveFilters = !!(searchTerm.trim() || filterNationalities.length > 0 || filterGender || filterAgents.length > 0 || filterStudentCreatedFrom || filterStudentCreatedTo);
  const clearFilters = () => {
    setSearchTerm('');
    setFilterNationalities([]);
    setFilterGender('');
    setFilterAgents([]);
    setFilterNationalitiesMode('include');
    setFilterAgentsMode('include');
    setFilterStudentCreatedFrom('');
    setFilterStudentCreatedTo('');
  };

  const getStudentApplications = (studentId: string) => {
    return applications
      .filter(a => a.studentId === studentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const handleBulkDeleteConfirm = async () => {
    if (!onDeleteStudent || selectedStudentIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedStudentIds);
      const detailId = selectedStudentForDetails?.id;
      for (const id of ids) {
        await onDeleteStudent(id);
      }
      setConfirmBulkDelete(false);
      setSelectedStudentIds(new Set());
      if (detailId && ids.includes(detailId)) {
        setSelectedStudentForDetails(null);
        setEmbeddedApplicationId(null);
      }
      setModalOpen(false);
      setSelectedStudentForEdit(null);
    } finally {
      setBulkDeleting(false);
    }
  };

  const refreshDetailStudentFiles = async (studentId: string) => {
    const r = await fetch(`/api/students/${studentId}/files`);
    if (!r.ok) return;
    const list = await r.json();
    setDetailStudentFiles(list.map((x: { url: string; name?: string; filename: string; fileType?: string; description?: string }) => ({
      url: x.url,
      name: x.name || x.url.split('/').pop() || x.filename,
      filename: x.filename,
      fileType: x.fileType,
      description: x.description
    })));
  };

  const uploadTypedStudentFile = async (file: File, fileType: StudentFileTypeCode, description: string) => {
    if (!selectedStudentForDetails || !currentUser) return false;
    const fd = new FormData();
    fd.append('files', file);
    fd.append('fileType', fileType);
    if (fileType === 'other') fd.append('fileDescription', description);
    fd.append('user_id', currentUser.id);
    fd.append('role', currentUser.role);
    try {
      const r = await fetch(`/api/students/${selectedStudentForDetails.id}/files`, { method: 'POST', body: fd });
      const data = await r.json();
      if (!r.ok) {
        alert(data.message || t.uploadFailed);
        return false;
      }
      await refreshDetailStudentFiles(selectedStudentForDetails.id);
      if (data.studentId && data.files) {
        onStudentFilesChange?.(data.studentId, data.files.map((x: { url: string }) => x.url));
      }
      return true;
    } catch {
      alert(t.errorConnection);
      return false;
    }
  };

  const getProgramInfo = (programId: string) => {
    const program = programs.find(p => p.id === programId);
    const university = program ? universities.find(u => u.id === program.universityId) : null;
    return {
      programName: program ? program.name : t.noPrograms,
      universityName: university ? university.name : t.noUniversities,
      degree: program ? program.degree : ''
    };
  };

  const getStatusBadge = (status: string) => (
    <span className={getApplicationStatusBadgeClass(status, 'default')}>
      {displayStatus(status)}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Full-screen form (Add / Edit) */}
      {isModalOpen && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
          {/* Top bar: Back, Title, Add New Student, Cancel, Save */}
          <div className="flex items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-50 to-white border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={leaveFormModal}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-xl px-3 py-2.5 border border-gray-200 hover:border-gray-300 transition-colors shadow-sm"
              >
                <ArrowLeft size={20} />
                <span className="font-medium">{t.back}</span>
              </button>
              <h2 className="text-xl font-bold text-gray-800 truncate">
                {selectedStudentForEdit ? `${t.edit} – ${selectedStudentForEdit.firstName} ${selectedStudentForEdit.lastName}` : t.addStudent}
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={leaveFormModal}
                className="px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-colors shadow-sm"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                form="student-form"
                disabled={(!selectedStudentForEdit && isAdminOrUser && agentUsers.length > 0 && !selectedAgentId) || submitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? t.loading : t.save}
              </button>
            </div>
          </div>

          <form id="student-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8">
            {selectedStudentForEdit ? (
            <div className="max-w-4xl mx-auto space-y-8">
              {!selectedStudentForEdit && isAdminOrUser && agentUsers.length > 0 && (
                <section className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.agent}</label>
                  <select
                    required
                    className="w-full max-w-md border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={selectedAgentId}
                    onChange={e => setSelectedAgentId(e.target.value)}
                  >
                    <option value="">{t.selectAgent}</option>
                    {agentUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name} {u.email ? `(${u.email})` : ''}</option>
                    ))}
                  </select>
                </section>
              )}

              {/* Personal info */}
              <section className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User size={16} />
                  {t.userName}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.firstName}</label>
                    <input
                      type="text"
                      required
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-shadow"
                      value={formData.firstName}
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.lastName}</label>
                    <input
                      type="text"
                      required
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-shadow"
                      value={formData.lastName}
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.fatherName}</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-shadow"
                      value={formData.fatherName}
                      onChange={e => setFormData({ ...formData, fatherName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.motherName}</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-shadow"
                      value={formData.motherName}
                      onChange={e => setFormData({ ...formData, motherName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.passportNumber}</label>
                    <input
                      type="text"
                      required
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-shadow"
                      value={formData.passportNumber}
                      onChange={e => setFormData({ ...formData, passportNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.dateOfBirth}</label>
                    <input
                      type="date"
                      required
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-shadow"
                      value={formData.dob}
                      onChange={e => setFormData({ ...formData, dob: e.target.value })}
                    />
                  </div>
                </div>
              </section>

              {/* Demographics */}
              <section className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{t.nationality} & {t.residenceCountry}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.gender}</label>
                    <select
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-shadow"
                      value={formData.gender}
                      onChange={e => setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' })}
                    >
                      <option value="Male">{t.male}</option>
                      <option value="Female">{t.female}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.nationality}</label>
                    <SearchableSelect
                      value={formData.nationality || ''}
                      onChange={(value) => setFormData({ ...formData, nationality: value })}
                      options={nationalityOptions}
                      placeholder="Select..."
                      searchPlaceholder={t.search}
                      noResultsText={t.searchNoResults}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.residenceCountry}</label>
                    <SearchableSelect
                      value={formData.residenceCountry || ''}
                      onChange={(value) => setFormData({ ...formData, residenceCountry: value })}
                      options={residenceCountryOptions}
                      placeholder="Select..."
                      searchPlaceholder={t.search}
                      noResultsText={t.searchNoResults}
                    />
                  </div>
                </div>
              </section>

              {/* Contact */}
              <section className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{t.email} & {t.phone}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.email}</label>
                    <input
                      type="email"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-shadow"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.phone}</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-shadow"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </section>
            </div>
            ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-[1600px] mx-auto items-start">
              {/* Column 1: Student info */}
              <div className="space-y-5">
                <section className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <User size={16} />
                    {t.studentInfoSection}
                  </h3>
                  {isAdminOrUser && agentUsers.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.agent}</label>
                      <SearchableSelect
                        value={selectedAgentId}
                        onChange={setSelectedAgentId}
                        options={agentUsers.map(u => ({
                          value: u.id,
                          label: `${u.name}${u.email ? ` (${u.email})` : ''}`
                        }))}
                        placeholder={t.selectAgent}
                        searchPlaceholder={t.search}
                        noResultsText={t.searchNoResults}
                      />
                    </div>
                  )}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.firstName}</label>
                        <input type="text" required className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.lastName}</label>
                        <input type="text" required className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.fatherName}</label>
                        <input type="text" className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.fatherName} onChange={e => setFormData({ ...formData, fatherName: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.motherName}</label>
                        <input type="text" className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.motherName} onChange={e => setFormData({ ...formData, motherName: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.passportNumber}</label>
                        <input type="text" required className="w-full border border-gray-300 rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-blue-500 outline-none" value={formData.passportNumber} onChange={e => setFormData({ ...formData, passportNumber: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.dateOfBirth}</label>
                        <input type="date" required className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.gender}</label>
                        <select className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' })}>
                          <option value="Male">{t.male}</option>
                          <option value="Female">{t.female}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.nationality}</label>
                        <SearchableSelect
                          value={formData.nationality || ''}
                          onChange={(value) => setFormData({ ...formData, nationality: value })}
                          options={nationalityOptions}
                          placeholder="Select..."
                          searchPlaceholder={t.search}
                          noResultsText={t.searchNoResults}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.residenceCountry}</label>
                        <SearchableSelect
                          value={formData.residenceCountry || ''}
                          onChange={(value) => setFormData({ ...formData, residenceCountry: value })}
                          options={residenceCountryOptions}
                          placeholder="Select..."
                          searchPlaceholder={t.search}
                          noResultsText={t.searchNoResults}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.phone}</label>
                        <input type="text" className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
                      <input type="email" className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                  </div>
                </section>
              </div>

              {/* Column 2: First application */}
              <div className="space-y-5">
                <section className="bg-blue-50/40 rounded-2xl p-5 border border-blue-100 h-full">
                  <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider mb-1">{t.firstApplicationSection}</h3>
                  <p className="text-xs text-blue-700/80 mb-4">{t.firstApplicationOptional}</p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-blue-600 uppercase tracking-wider px-1">{t.period}</label>
                      <select className="w-full mt-1 p-2.5 border border-blue-100 rounded-xl bg-white focus:ring-2 focus:ring-blue-400 outline-none" value={addFilterPeriod} onChange={e => { setAddFilterPeriod(e.target.value); setAddFilterUni(''); setAddFilterDegree(''); setAddFilterLang(''); setAddFilterProgramName(''); }}>
                        <option value="">{t.selectPeriod}</option>
                        {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-blue-600 uppercase tracking-wider px-1">{t.universities}</label>
                      <SearchableSelect
                        className="mt-1"
                        value={addFilterUni}
                        onChange={(value) => { setAddFilterUni(value); setAddFilterDegree(''); setAddFilterLang(''); setAddFilterProgramName(''); }}
                        options={addAvailableUnis.map((university) => ({ value: university.id, label: university.name }))}
                        placeholder={t.selectUniversity}
                        searchPlaceholder={t.search}
                        noResultsText={t.searchNoResults}
                        disabled={!addFilterPeriod}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-blue-600 uppercase tracking-wider px-1">{t.programDegree}</label>
                      <select className="w-full mt-1 p-2.5 border border-blue-100 rounded-xl bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50" value={addFilterDegree} onChange={e => { setAddFilterDegree(e.target.value); setAddFilterLang(''); setAddFilterProgramName(''); }} disabled={!addFilterUni}>
                        <option value="">{t.selectDegree}</option>
                        {addAvailableDegrees.map(d => <option key={d} value={d}>{translateDegree(d)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-blue-600 uppercase tracking-wider px-1">{t.programLanguage}</label>
                      <select className="w-full mt-1 p-2.5 border border-blue-100 rounded-xl bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50" value={addFilterLang} onChange={e => { setAddFilterLang(e.target.value); setAddFilterProgramName(''); }} disabled={!addFilterDegree}>
                        <option value="">{t.selectLanguage}</option>
                        {addAvailableLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-blue-600 uppercase tracking-wider px-1">{t.programName}</label>
                      <SearchableSelect
                        className="mt-1"
                        value={addFilterProgramName}
                        onChange={setAddFilterProgramName}
                        options={addAvailableProgramNames.map((name) => ({ value: name, label: name }))}
                        placeholder={t.selectProgram}
                        searchPlaceholder={t.search}
                        noResultsText={t.searchNoResults}
                        disabled={!addFilterLang}
                      />
                    </div>
                    {isAdminOrUser && (
                      <div>
                        <label className="text-xs font-bold text-blue-600 uppercase tracking-wider px-1">{t.agencyCompany}</label>
                        <select
                          className="w-full mt-1 p-2.5 border border-blue-100 rounded-xl bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                          value={selectedAgencyCompanyId}
                          onChange={e => setSelectedAgencyCompanyId(e.target.value)}
                        >
                          <option value="">{t.agencyCompany}</option>
                          {agencyCompanies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {addFinalProgram && (
                      <div className="rounded-xl bg-white border border-blue-200 p-3 text-sm text-gray-700">
                        <p className="font-semibold text-blue-900">{addFinalProgram.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{translateDegree(addFinalProgram.degree)} · {addFinalProgram.language}</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Column 3: Attachments */}
              <div className="space-y-5">
                <section className="bg-amber-50/30 rounded-2xl p-5 border border-amber-100 h-full">
                  <h3 className="text-sm font-semibold text-amber-950 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Paperclip size={16} />
                    {t.attachmentsSection}
                  </h3>
                  <p className="text-xs text-amber-900/70 mb-4">{t.sharedStudentAttachmentsNote}</p>
                  {pendingFiles.length > 0 ? (
                    <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                      {pendingFiles.map((file, i) => (
                        <div key={`${file.name}-${file.size}-${i}`} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-100">
                          <FileText size={14} className="text-amber-700 shrink-0" />
                          <span className="text-xs text-gray-700 truncate flex-1" dir="ltr">{file.name}</span>
                          <button type="button" onClick={() => removePendingFile(i)} className="text-red-500 hover:text-red-700 p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-800/60 mb-3">{t.noAttachments}</p>
                  )}
                  <div className="relative border border-dashed border-amber-200 rounded-xl p-6 hover:border-amber-400 hover:bg-amber-50/50 transition-all">
                    <input
                      type="file"
                      multiple
                      accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={handleAddFilesPicked}
                    />
                    <div className="flex flex-col items-center justify-center pointer-events-none">
                      <Upload size={24} className="text-amber-600 mb-2" />
                      <span className="text-sm font-medium text-amber-900">
                        {pendingFiles.length > 0 ? `${pendingFiles.length} ${t.filesSelected}` : t.uploadFiles}
                      </span>
                      <span className="text-xs text-amber-800/60 mt-1">PDF, JPG, PNG</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
            )}
          </form>
        </div>
      )}

      {/* Full-screen view (Student details) */}
      {!isModalOpen && selectedStudentForDetails && !embeddedApplicationId && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
          <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-50 to-white border-b border-gray-200 p-6 flex items-center justify-between shrink-0 flex-wrap gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={() => setSelectedStudentForDetails(null)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-xl px-3 py-2.5 border border-gray-200 hover:border-gray-300 transition-colors shadow-sm"
              >
                <ArrowLeft size={20} />
                <span className="font-medium">{t.back}</span>
              </button>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-800 truncate">{selectedStudentForDetails.firstName} {selectedStudentForDetails.lastName}</h2>
                <p className="text-gray-500 text-sm">{t.passportNumber}: {selectedStudentForDetails.passportNumber}</p>
              </div>
            </div>
            <div className="text-sm text-gray-500 shrink-0 text-right space-y-0.5">
              <div>{t.createdByUser}: {getCreatedByName(selectedStudentForDetails)}</div>
              {selectedStudentForDetails.createdAt && (
                <div>{t.createdAt}: {new Date(selectedStudentForDetails.createdAt).toLocaleString(dateLocale, { dateStyle: 'medium', timeStyle: 'short' })}</div>
              )}
              {(selectedStudentForDetails.updatedAt || selectedStudentForDetails.createdAt) && !isAgent && (
                <div className="text-blue-700 font-medium">{t.lastUpdatedAt}: {new Date(selectedStudentForDetails.updatedAt || selectedStudentForDetails.createdAt || 0).toLocaleString(dateLocale, { dateStyle: 'medium', timeStyle: 'short' })}</div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => openQuickApplicationModal(selectedStudentForDetails.id)}
                className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl px-4 py-2.5 font-medium transition-colors shadow-sm"
              >
                <Plus size={18} />
                <span>{t.addApplication}</span>
              </button>
              {canEditStudent && (
              <button
                type="button"
                onClick={() => { openEditModal(selectedStudentForDetails); setSelectedStudentForDetails(null); }}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl px-4 py-2.5 font-medium border border-transparent hover:border-blue-200 transition-colors"
              >
                <Pencil size={18} />
                <span>{t.edit}</span>
              </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-6">
                <section className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <User size={16} />
                    {t.userName}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.firstName}</label>
                      <div className="w-full rounded-xl px-4 py-2.5 text-gray-900 bg-white border border-gray-200">{selectedStudentForDetails.firstName}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.lastName}</label>
                      <div className="w-full rounded-xl px-4 py-2.5 text-gray-900 bg-white border border-gray-200">{selectedStudentForDetails.lastName}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.passportNumber}</label>
                      <div className="w-full rounded-xl px-4 py-2.5 text-gray-900 bg-white border border-gray-200 font-mono">{selectedStudentForDetails.passportNumber}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.fatherName}</label>
                      <div className="w-full rounded-xl px-4 py-2.5 text-gray-900 bg-white border border-gray-200">{selectedStudentForDetails.fatherName || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.motherName}</label>
                      <div className="w-full rounded-xl px-4 py-2.5 text-gray-900 bg-white border border-gray-200">{selectedStudentForDetails.motherName || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.dateOfBirth}</label>
                      <div className="w-full rounded-xl px-4 py-2.5 text-gray-900 bg-white border border-gray-200">{selectedStudentForDetails.dob || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.gender}</label>
                      <div className="w-full rounded-xl px-4 py-2.5 text-gray-900 bg-white border border-gray-200">{selectedStudentForDetails.gender === 'Female' ? t.female : t.male}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.nationality}</label>
                      <div className="w-full rounded-xl px-4 py-2.5 text-gray-900 bg-white border border-gray-200">{selectedStudentForDetails.nationality || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.residenceCountry}</label>
                      <div className="w-full rounded-xl px-4 py-2.5 text-gray-900 bg-white border border-gray-200">{selectedStudentForDetails.residenceCountry || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.email}</label>
                      <div className="w-full rounded-xl px-4 py-2.5 text-gray-900 bg-white border border-gray-200">{selectedStudentForDetails.email || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.phone}</label>
                      <div className="w-full rounded-xl px-4 py-2.5 text-gray-900 bg-white border border-gray-200">{selectedStudentForDetails.phone || '-'}</div>
                    </div>
                  </div>
                </section>

                {isAdminOrUser && selectedStudentForDetails.userId && (
                  <section className="bg-white rounded-2xl p-6 border border-orange-100">
                    <h3 className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-2">{t.hostAgent}</h3>
                    <p className="text-lg font-bold text-gray-800">{getAgentName(selectedStudentForDetails)}</p>
                    {(users.find(u => u.id === selectedStudentForDetails.userId)?.phone) && (
                      <p className="text-sm text-gray-600 mt-1 font-mono">
                        {users.find(u => u.id === selectedStudentForDetails.userId)?.countryCode || ''} {users.find(u => u.id === selectedStudentForDetails.userId)?.phone}
                      </p>
                    )}
                  </section>
                )}

                <section className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{t.createdByUser}</h3>
                  <p className="text-lg font-bold text-gray-800">{getCreatedByName(selectedStudentForDetails)}</p>
                </section>

                <section className="bg-white rounded-2xl p-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Paperclip size={18} className="text-gray-400" />
                    <h4 className="font-bold text-gray-800 text-sm">{t.uploadFiles} ({detailStudentFiles.length})</h4>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-4">{t.sharedStudentAttachmentsNote}</p>
                  {detailStudentFiles.length > 0 ? (
                    <div className="space-y-2 mb-4 max-h-56 overflow-y-auto">
                      {detailStudentFiles.map((f) => (
                        <div key={f.filename} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-all group">
                          <a href={f.url} target="_blank" rel="noreferrer" className="flex-1 flex items-center gap-3 min-w-0">
                            <FileText size={16} className="text-gray-400 shrink-0" />
                            <div className="min-w-0">
                              {getStudentFileTypeLabel(f.fileType, t, f.description) && (
                                <span className="text-sm font-semibold text-purple-900 bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg mb-1 inline-block">
                                  {getStudentFileTypeLabel(f.fileType, t, f.description)}
                                </span>
                              )}
                              <span className="text-xs font-medium text-gray-700 truncate block" dir="ltr">{f.name}</span>
                            </div>
                          </a>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm(t.confirmDelete)) return;
                              try {
                                const r = await fetch(`/api/students/${selectedStudentForDetails.id}/files/${f.filename}`, { method: 'DELETE' });
                                const data = await r.json();
                                if (r.ok) {
                                  const remaining = detailStudentFiles.filter(x => x.filename !== f.filename);
                                  setDetailStudentFiles(remaining);
                                  onStudentFilesChange?.(selectedStudentForDetails.id, remaining.map(x => x.url));
                                } else {
                                  alert(data.message || t.errorDelete);
                                }
                              } catch {
                                alert(t.errorConnection);
                              }
                            }}
                            className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center border-2 border-dashed border-gray-100 rounded-xl mb-4">
                      <p className="text-xs text-gray-400">{t.noAttachments}</p>
                    </div>
                  )}
                  <input type="file" id="student-detail-files" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setDetailAttachFiles(e.target.files)} />
                  <label htmlFor="student-detail-files" className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-xl p-3 cursor-pointer hover:border-blue-300 hover:bg-blue-50/20 transition-all mb-2">
                    <span className="text-[11px] font-bold text-blue-600">
                      {detailAttachFiles && detailAttachFiles.length > 0 ? `${detailAttachFiles.length} ${t.filesSelected}` : t.attachAdditionalFiles}
                    </span>
                  </label>
                  {isAdminOrUser && (
                    <div className="mb-2">
                      <StaffTypedFileUpload
                        onUpload={uploadTypedStudentFile}
                        disabled={detailFilesUploading}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!detailAttachFiles || detailFilesUploading}
                    onClick={async () => {
                      if (!detailAttachFiles || !selectedStudentForDetails || !onUploadStudentFiles) return;
                      setDetailFilesUploading(true);
                      try {
                        await onUploadStudentFiles(selectedStudentForDetails.id, Array.from(detailAttachFiles));
                        await refreshDetailStudentFiles(selectedStudentForDetails.id);
                        setDetailAttachFiles(null);
                        const inp = document.getElementById('student-detail-files') as HTMLInputElement;
                        if (inp) inp.value = '';
                      } finally {
                        setDetailFilesUploading(false);
                      }
                    }}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-30"
                  >
                    {detailFilesUploading ? t.loading : t.uploadNow}
                  </button>
                </section>
              </div>

              <div className="lg:col-span-5">
                <section className="bg-white rounded-2xl p-6 border border-gray-100 h-full">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b">
                    <h4 className="flex items-center gap-2 font-bold text-gray-700">
                      <Eye size={18} />
                      {t.applicationsTitle} ({getStudentApplications(selectedStudentForDetails.id).length})
                    </h4>
                    <button
                      onClick={() => openQuickApplicationModal(selectedStudentForDetails.id)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + {t.addApplication}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {getStudentApplications(selectedStudentForDetails.id).length > 0 ? (
                      getStudentApplications(selectedStudentForDetails.id).map(app => {
                        const info = getProgramInfo(app.programId);
                        return (
                          <div
                            key={app.id}
                            className="border rounded-lg p-4 bg-gray-50 hover:bg-white hover:shadow-sm transition-all cursor-pointer group"
                            onClick={() => openEmbeddedApplication(app.id)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{info.universityName}</div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(app.status)}
                                {canManage && onDeleteApplication && (
                                  <button
                                    type="button"
                                    title={t.delete}
                                    aria-label={t.delete}
                                    onClick={async (event) => {
                                      event.stopPropagation();
                                      if (!window.confirm(t.confirmDelete)) return;
                                      await onDeleteApplication(app.id);
                                    }}
                                    className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 mb-1">{info.programName} - <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">{info.degree}</span></div>
                            <div className="text-xs text-gray-400 mt-2">
                              <span>{t.applicationDetails}: #{app.id}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg text-gray-400 border border-dashed">
                        {t.noApplications}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isModalOpen && embeddedApplicationId && onAddApplicationForStudent && onUpdateApplicationStatus && (
        <ApplicationManager
          embedMode="students"
          embedApplicationId={embeddedApplicationId}
          onEmbedBack={() => setEmbeddedApplicationId(null)}
          applications={applications}
          students={students}
          programs={programs}
          universities={universities}
          periods={periods}
          agencyCompanies={agencyCompanies}
          users={users}
          onAddApplication={(app, files) => onAddApplicationForStudent(app, files)}
          onUpdateStatus={onUpdateApplicationStatus}
          onUpdateApplication={onUpdateApplication}
          onDeleteApplication={onDeleteApplication}
          onSyncApplicationTimestamps={onSyncApplicationTimestamps}
          onStudentFilesChange={onStudentFilesChange}
          onOpenStudent={(studentId) => {
            setEmbeddedApplicationId(null);
            const s = students.find(st => st.id === studentId);
            if (s) setSelectedStudentForDetails(s);
          }}
          currentUser={currentUser ?? undefined}
        />
      )}

      {/* List view (header + search + tree/kanban) */}
      {!isModalOpen && !selectedStudentForDetails && !embeddedApplicationId ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{t.studentsTitle}</h2>
              <p className="text-gray-500">{t.studentsTitle}</p>
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center space-x-2 space-x-reverse bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              <span>{t.addStudent}</span>
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            {/* Top row: Search | Filter (left) + Tree/Kanban toggle (right) */}
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
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X size={14} />
                    {t.clearFilters}
                  </button>
                )}
                <SavedQuickFilters
                    pageKey="students"
                    userId={currentUser?.id}
                    getFilters={() => ({
                      searchTerm,
                      filterNationalities,
                      filterGender,
                      filterAgents,
                      filterNationalitiesMode,
                      filterAgentsMode,
                      filterStudentCreatedFrom,
                      filterStudentCreatedTo
                    })}
                    onApply={(f) => {
                      setSearchTerm(typeof f.searchTerm === 'string' ? f.searchTerm : '');
                      setFilterNationalities(Array.isArray(f.filterNationalities) ? f.filterNationalities as string[] : []);
                      setFilterGender(typeof f.filterGender === 'string' ? f.filterGender : '');
                      setFilterAgents(Array.isArray(f.filterAgents) ? f.filterAgents as string[] : []);
                      setFilterNationalitiesMode((f.filterNationalitiesMode as MultiFilterMode) || 'include');
                      setFilterAgentsMode((f.filterAgentsMode as MultiFilterMode) || 'include');
                      setFilterStudentCreatedFrom(typeof f.filterStudentCreatedFrom === 'string' ? f.filterStudentCreatedFrom : '');
                      setFilterStudentCreatedTo(typeof f.filterStudentCreatedTo === 'string' ? f.filterStudentCreatedTo : '');
                    }}
                  />
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
                      {studentColumnOptions.filter(col => {
                        if (!isAdminOrUser && col.key === 'agent') return false;
                        if (isAgent && col.key === 'updatedAt') return false;
                        return true;
                      }).map(col => (
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
                  onClick={() => setViewMode('tree')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors rounded-md ${viewMode === 'tree' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  title={t.treeView}
                >
                  <List size={16} />
                  <span className="hidden sm:inline">{t.treeView}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors rounded-md ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  title={t.kanbanView}
                >
                  <LayoutGrid size={16} />
                  <span className="hidden sm:inline">{t.kanbanView}</span>
                </button>
              </div>
            </div>
            {/* Bottom row: search and filter inputs full width */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              <div className="sm:col-span-1">
                <input
                  type="text"
                  placeholder={t.search}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="sm:col-span-1">
                <SearchableMultiSelect
                  selected={filterNationalities}
                  onChange={setFilterNationalities}
                  mode={filterNationalitiesMode}
                  onModeChange={setFilterNationalitiesMode}
                  options={Array.from(new Set([...filterNationalities.filter(s => !COUNTRIES.includes(s)), ...COUNTRIES]))}
                  placeholder={`${t.nationality} (${t.filterAll})`}
                  searchPlaceholder={t.search}
                  noResultsText={t.searchNoResults}
                  className="min-w-[180px]"
                />
              </div>
              <div className="sm:col-span-1">
                <select
                  value={filterGender}
                  onChange={e => setFilterGender(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">{t.gender} ({t.filterAll || 'All'})</option>
                  <option value="Male">{t.male}</option>
                  <option value="Female">{t.female}</option>
                </select>
              </div>
            </div>
            <div className="w-full mt-3">
              <CreatedAtRangeFilter
                from={filterStudentCreatedFrom}
                to={filterStudentCreatedTo}
                onFromChange={setFilterStudentCreatedFrom}
                onToChange={setFilterStudentCreatedTo}
                leadingFilter={isAdminOrUser ? (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t.agent}</label>
                    <SearchableMultiSelect
                      selected={filterAgents}
                      onChange={setFilterAgents}
                      mode={filterAgentsMode}
                      onModeChange={setFilterAgentsMode}
                      options={uniqueAgents}
                      placeholder={`${t.agent} (${t.filterAll})`}
                      searchPlaceholder={t.search}
                      noResultsText={t.searchNoResults}
                    />
                  </div>
                ) : undefined}
              />
            </div>
          </div>

          {viewMode === 'tree' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 text-sm text-gray-600">
                {canManage && onDeleteStudent ? (
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDelete(true)}
                    disabled={selectedStudentIds.size === 0}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                  >
                    <Trash2 size={16} />
                    <span>{t.deleteSelected}</span>
                    {selectedStudentIds.size > 0 && (
                      <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{selectedStudentIds.size}</span>
                    )}
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                <span>{treeFrom}-{treeTo} / {sortedStudents.length}</span>
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-900 font-bold border-b border-gray-200">
                    <tr>
                      {canManage && onDeleteStudent && (
                        <th className="px-4 py-3 w-12 text-center">
                          <input
                            ref={selectAllCheckboxRef}
                            type="checkbox"
                            checked={allOnPageSelected}
                            onChange={toggleSelectAllOnPage}
                            disabled={pagedStudents.length === 0}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                            aria-label={t.filterAll}
                          />
                        </th>
                      )}
                      {visibleTreeColumns.includes('name') && <SortTh colKey="name" label={t.userName} />}
                      {visibleTreeColumns.includes('passport') && <SortTh colKey="passport" label={t.passportNumber} />}
                      {visibleTreeColumns.includes('nationality') && <SortTh colKey="nationality" label={t.nationality} />}
                      {visibleTreeColumns.includes('gender') && <SortTh colKey="gender" label={t.gender} />}
                      {visibleTreeColumns.includes('email') && <SortTh colKey="email" label={t.email} />}
                      {isAdminOrUser && visibleTreeColumns.includes('agent') && <SortTh colKey="agent" label={t.agent} />}
                      {visibleTreeColumns.includes('createdBy') && <SortTh colKey="createdBy" label={t.createdByUser} />}
                      {visibleTreeColumns.includes('createdAt') && <SortTh colKey="createdAt" label={t.createdAt} />}
                      {!isAgent && visibleTreeColumns.includes('updatedAt') && <SortTh colKey="updatedAt" label={t.lastUpdatedAt} />}
                      <th className="px-4 py-3 font-bold w-[110px] text-right">{t.actions || 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedStudents.map(student => {
                      const hasUnreadNotifications = notificationIndex.unreadStudentIds.has(student.id);
                      return (
                      <tr
                        key={student.id}
                        className={`hover:bg-gray-50 cursor-pointer ${hasUnreadNotifications ? 'bg-blue-50/40 hover:bg-blue-50/60 border-l-4 border-l-blue-500' : ''} ${selectedStudentIds.has(student.id) ? 'bg-blue-50/40' : ''}`}
                        onClick={() => setSelectedStudentForDetails(student)}
                      >
                        {canManage && onDeleteStudent && (
                          <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.has(student.id)}
                              onChange={() => toggleStudentSelection(student.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              aria-label={`${student.firstName} ${student.lastName}`}
                            />
                          </td>
                        )}
                        {visibleTreeColumns.includes('name') && (
                          <td className="px-4 py-3 font-medium text-gray-900">
                            <span className="inline-flex items-center gap-2 min-w-0">
                              <span className="truncate">{student.firstName} {student.lastName}</span>
                              {hasUnreadNotifications && (
                                <NotificationUnreadDot title={t.unreadNotifications} />
                              )}
                            </span>
                          </td>
                        )}
                        {visibleTreeColumns.includes('passport') && <td className="px-4 py-3 font-mono text-gray-900">{student.passportNumber}</td>}
                        {visibleTreeColumns.includes('nationality') && <td className="px-4 py-3 text-gray-900">{student.nationality}</td>}
                        {visibleTreeColumns.includes('gender') && <td className="px-4 py-3 text-gray-900">{student.gender === 'Female' ? t.female : t.male}</td>}
                        {visibleTreeColumns.includes('email') && <td className="px-4 py-3 text-gray-900">{student.email}</td>}
                        {isAdminOrUser && visibleTreeColumns.includes('agent') && <td className="px-4 py-3 text-gray-900">{getAgentName(student)}</td>}
                        {visibleTreeColumns.includes('createdBy') && (
                          <td className="px-4 py-3 text-gray-900 whitespace-nowrap text-xs">
                            {getCreatedByName(student)}
                          </td>
                        )}
                        {visibleTreeColumns.includes('createdAt') && (
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                            {student.createdAt ? new Date(student.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </td>
                        )}
                        {!isAgent && visibleTreeColumns.includes('updatedAt') && (
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                            {(student.updatedAt || student.createdAt) ? new Date(student.updatedAt || student.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2 flex-nowrap">
                            {canEditStudent && (
                            <button
                              type="button"
                              onClick={() => openEditModal(student)}
                              className="inline-flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg p-2"
                              title={t.edit}
                            >
                              <Pencil size={18} />
                            </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openQuickApplicationModal(student.id)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium whitespace-nowrap"
                            >
                              {t.addApplication}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
              {sortedStudents.length === 0 && (
                <div className="text-center py-12 text-gray-500">{t.noStudents || 'No students'}</div>
              )}
            </div>
          )}

          {viewMode === 'kanban' && (
            <>
              <div className="mb-3 flex items-center justify-end gap-2 text-sm text-gray-600">
                <span>{kanbanFrom}-{kanbanTo} / {sortedStudents.length}</span>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pagedKanbanStudents.map(student => (
                <div
                  key={student.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedStudentForDetails(student)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedStudentForDetails(student); } }}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer text-left"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <User className="text-blue-600" size={24} />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-800 mb-2">{student.firstName} {student.lastName}</h3>

                  <div className="space-y-2 text-sm text-gray-600 mb-6">
                    <div className="flex justify-between gap-2">
                      <span>{t.createdByUser}:</span>
                      <span className="text-right">{getCreatedByName(student)}</span>
                    </div>
                    {student.createdAt && (
                      <div className="flex justify-between">
                        <span>{t.createdAt}:</span>
                        <span>{new Date(student.createdAt).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    )}
                    {!isAgent && (student.updatedAt || student.createdAt) && (
                      <div className="flex justify-between">
                        <span>{t.lastUpdatedAt}:</span>
                        <span>{new Date(student.updatedAt || student.createdAt!).toLocaleString(dateLocale, { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>{t.passportNumber}:</span>
                      <span className="font-mono">{student.passportNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.nationality}:</span>
                      <span>{student.nationality}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.email}:</span>
                      <span>{student.email}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); openQuickApplicationModal(student.id); }}
                    className="w-full py-2 bg-gray-50 text-blue-600 rounded-lg hover:bg-blue-50 font-medium transition-colors"
                  >
                    {t.addApplication}
                  </button>
                </div>
              ))}
              </div>
            </>
          )}
        </div>
      ) : null}

      {quickAppOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">{t.addApplication}</h3>
              <button
                type="button"
                onClick={closeQuickApplicationModal}
                className="text-gray-500 hover:text-gray-700 p-1"
                aria-label={t.close}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 bg-blue-50/40 border-y border-blue-100">
              <h4 className="font-semibold text-gray-800 mb-4">2. {t.selectProgram}</h4>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-blue-500 uppercase tracking-wider px-1">{t.period}</label>
                  <select
                    className="w-full p-2.5 border border-blue-100 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                    value={quickFilterPeriod}
                    onChange={e => { setQuickFilterPeriod(e.target.value); setQuickFilterUni(''); setQuickFilterDegree(''); setQuickFilterLang(''); setQuickFilterProgramName(''); }}
                  >
                    <option value="">{t.selectPeriod}</option>
                    {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-blue-500 uppercase tracking-wider px-1">{t.universities}</label>
                    <SearchableSelect
                      value={quickFilterUni}
                      onChange={(value) => { setQuickFilterUni(value); setQuickFilterDegree(''); setQuickFilterLang(''); setQuickFilterProgramName(''); }}
                      options={quickAvailableUnis.map((university) => ({ value: university.id, label: university.name }))}
                      placeholder={t.selectUniversity}
                      searchPlaceholder={t.search}
                      noResultsText={t.searchNoResults}
                      disabled={!quickFilterPeriod}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-blue-500 uppercase tracking-wider px-1">{t.programDegree}</label>
                    <select
                      className="w-full p-2.5 border border-blue-100 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                      value={quickFilterDegree}
                      onChange={e => { setQuickFilterDegree(e.target.value); setQuickFilterLang(''); setQuickFilterProgramName(''); }}
                      disabled={!quickFilterUni}
                    >
                      <option value="">{t.selectDegree}</option>
                      {quickAvailableDegrees.map(d => <option key={d} value={d}>{translateDegree(d)}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-blue-500 uppercase tracking-wider px-1">{t.programLanguage}</label>
                    <select
                      className="w-full p-2.5 border border-blue-100 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                      value={quickFilterLang}
                      onChange={e => { setQuickFilterLang(e.target.value); setQuickFilterProgramName(''); }}
                      disabled={!quickFilterDegree}
                    >
                      <option value="">{t.selectLanguage}</option>
                      {quickAvailableLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-blue-500 uppercase tracking-wider px-1">{t.programName}</label>
                    <SearchableSelect
                      value={quickFilterProgramName}
                      onChange={setQuickFilterProgramName}
                      options={quickAvailableProgramNames.map((name) => ({ value: name, label: name }))}
                      placeholder={t.selectProgram}
                      searchPlaceholder={t.search}
                      noResultsText={t.searchNoResults}
                      disabled={!quickFilterLang}
                    />
                  </div>
                </div>
                {isAdminOrUser && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-blue-500 uppercase tracking-wider px-1">{t.agencyCompany}</label>
                    <select
                      className="w-full p-2.5 border border-blue-100 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                      value={quickAgencyCompanyId}
                      onChange={e => setQuickAgencyCompanyId(e.target.value)}
                    >
                      <option value="">{t.agencyCompany}</option>
                      {agencyCompanies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeQuickApplicationModal}
                className="px-5 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={submitQuickApplication}
                disabled={!quickFinalProgram || quickSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {quickSaving ? t.loading : t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmBulkDelete && selectedStudentIds.size > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">{t.confirmDelete}</h3>
            </div>
            <p className="text-gray-700 text-sm font-medium mb-2">
              {selectedStudentIds.size} {t.studentsTitle.toLowerCase()}
            </p>
            <p className="text-amber-700 text-xs mb-2">{t.bulkDeleteConfirmStudents}</p>
            {selectedStudentsAppCount > 0 && (
              <p className="text-amber-700 text-xs mb-4">
                {selectedStudentsAppCount} {t.applicationsTitle.toLowerCase()} {language === 'tr' ? 'da silinecek.' : language === 'ar' ? 'سيتم حذفها أيضاً.' : 'will also be deleted.'}
              </p>
            )}
            <div className="flex justify-end gap-3 mt-6">
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
    </div>
  );
};