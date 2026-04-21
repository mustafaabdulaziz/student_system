import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Student, Application, Program, University, ApplicationStatus, Period } from '../types';
import { Plus, User, Search, Eye, X, List, LayoutGrid, Pencil, ArrowLeft, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { COUNTRIES } from '../constants/countries';
import { matchesCreatedAtRange } from '../utils/createdAtRangeFilter';

function NationalityMultiSelect({
  selected,
  onChange,
  placeholder
}: {
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter(s => s !== value) : [...selected, value]);
  };
  const remove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(s => s !== value));
  };
  const options = Array.from(new Set([...selected.filter(s => !COUNTRIES.includes(s)), ...COUNTRIES]));
  return (
    <div ref={ref} className="relative min-w-[180px]">
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
              {value}
              <button type="button" onClick={e => remove(value, e)} className="hover:bg-blue-100 rounded p-0.5">
                <X size={12} />
              </button>
            </span>
          ))
        )}
        <ChevronDown size={16} className="ml-auto text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-[200px] rounded-lg border border-gray-200 bg-white shadow-lg py-1 max-h-48 overflow-auto">
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${selected.includes(opt) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface StudentManagerProps {
  students: Student[];
  applications: Application[];
  programs: Program[];
  universities: University[];
  periods?: Period[];
  users?: { id: string; name: string; email?: string; role?: string; phone?: string; countryCode?: string }[];
  onAddStudent: (student: Student) => Promise<string | null> | string | null;
  onEditStudent?: (student: Student) => Promise<Student | undefined> | Student | undefined;
  onCreateApplicationForStudent?: (studentId: string) => void;
  onAddApplicationForStudent?: (app: Application) => Promise<string | null> | string | null;
  onViewApplication?: (applicationId: string) => void;
  currentUser: { id: string; role: string } | null;
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
  onCreateApplicationForStudent,
  onAddApplicationForStudent,
  onViewApplication,
  currentUser,
  targetStudentId,
  clearTargetStudent
}) => {
  const { t, translateGender, translateStatus, translateDegree } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNationalities, setFilterNationalities] = useState<string[]>([]);
  const [filterGender, setFilterGender] = useState('');
  const [filterStudentCreatedFrom, setFilterStudentCreatedFrom] = useState('');
  const [filterStudentCreatedTo, setFilterStudentCreatedTo] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'kanban'>('tree');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [treePage, setTreePage] = useState(1);
  const [kanbanPage, setKanbanPage] = useState(1);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);
  const studentColumnKeys = useMemo(() => ['name', 'passport', 'nationality', 'gender', 'email', 'agent', 'createdAt', 'updatedAt'], []);
  const [visibleTreeColumns, setVisibleTreeColumns] = useState<string[]>(studentColumnKeys);
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<Student | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [quickAppOpen, setQuickAppOpen] = useState(false);
  const [quickAppStudentId, setQuickAppStudentId] = useState<string | null>(null);
  const [quickFilterPeriod, setQuickFilterPeriod] = useState('');
  const [quickFilterUni, setQuickFilterUni] = useState('');
  const [quickFilterDegree, setQuickFilterDegree] = useState('');
  const [quickFilterLang, setQuickFilterLang] = useState('');
  const [quickFilterProgramName, setQuickFilterProgramName] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);

  useEffect(() => {
    if (!targetStudentId) return;
    const s = students.find(st => st.id === targetStudentId);
    if (s) {
      setSelectedStudentForDetails(s);
      setModalOpen(false);
    }
    if (typeof clearTargetStudent === 'function') clearTargetStudent();
  }, [targetStudentId, students, clearTargetStudent]);

  const agentUsers = useMemo(() => users.filter(u => (u.role || '').toString().toLowerCase() === 'agent'), [users]);
  const isAdminOrUser = currentUser && ((currentUser.role || '').toString().toUpperCase() === 'ADMIN' || (currentUser.role || '').toString().toUpperCase() === 'USER');
  const isAgent = currentUser && (currentUser.role || '').toString().toLowerCase() === 'agent';
  const getAgentName = (student: Student) => (student.userId && users.find(u => u.id === student.userId)?.name) || '—';
  const activePeriods = useMemo(() => periods.filter(p => p.active !== false), [periods]);
  const studentColumnOptions = [
    { key: 'name', label: t.userName },
    { key: 'passport', label: t.passportNumber },
    { key: 'nationality', label: t.nationality },
    { key: 'gender', label: t.gender },
    { key: 'email', label: t.email },
    { key: 'agent', label: t.agent },
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

  const openQuickApplicationModal = (studentId: string) => {
    setQuickAppStudentId(studentId);
    setQuickFilterPeriod('');
    setQuickFilterUni('');
    setQuickFilterDegree('');
    setQuickFilterLang('');
    setQuickFilterProgramName('');
    setQuickAppOpen(true);
  };

  const closeQuickApplicationModal = () => {
    setQuickAppOpen(false);
    setQuickAppStudentId(null);
    setQuickSaving(false);
  };

  const quickAvailablePrograms = useMemo(() => {
    return programs.filter(p => p.isOpen !== false && (!quickFilterPeriod || p.periodId === quickFilterPeriod));
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
    setQuickSaving(true);
    try {
      await onAddApplicationForStudent({
        id: Date.now().toString(),
        studentId: quickAppStudentId,
        programId: quickFinalProgram.id,
        periodId: quickFilterPeriod || quickFinalProgram.periodId,
        status: ApplicationStatus.DRAFT,
        semester: 'Fall 2024',
        createdAt: new Date().toISOString().split('T')[0],
        files: [],
        userId: agentId || undefined
      });
      closeQuickApplicationModal();
    } finally {
      setQuickSaving(false);
    }
  };

  const openAddModal = () => {
    setSelectedStudentForEdit(null);
    setSelectedAgentId('');
    setFormData({
      firstName: '', lastName: '', passportNumber: '', nationality: '', email: '', phone: '',
      fatherName: '', motherName: '', gender: 'Male', degreeTarget: '', dob: '', residenceCountry: ''
    });
    setModalOpen(true);
  };

  const openEditModal = (student: Student) => {
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
        const updated = await onEditStudent?.(payload);
        if (updated) {
          closeFormModal();
          setSelectedStudentForDetails(updated);
        }
      } else {
        const newId = await onAddStudent({ ...payload, id: payload.id } as Student);
        if (newId) {
          closeFormModal();
          setViewMode('tree');
          setSelectedStudentForDetails({ ...payload, id: newId });
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
    const matchNationality = filterNationalities.length === 0 || filterNationalities.includes(student.nationality);
    const matchGender = !filterGender || student.gender === filterGender;
    const matchCreated = matchesCreatedAtRange(student.createdAt, filterStudentCreatedFrom, filterStudentCreatedTo);
    return matchSearch && matchNationality && matchGender && matchCreated;
  }), [students, searchTerm, filterNationalities, filterGender, filterStudentCreatedFrom, filterStudentCreatedTo]);

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
    if (kanbanPage > totalKanbanPages) setKanbanPage(totalKanbanPages);
  }, [kanbanPage, totalKanbanPages]);

  useEffect(() => {
    setTreePage(1);
    setKanbanPage(1);
  }, [searchTerm, filterNationalities, filterGender, filterStudentCreatedFrom, filterStudentCreatedTo, sortBy, sortDir, viewMode]);

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
    const hiddenByRole = sortBy === 'agent' && !isAdminOrUser;
    if (hiddenByConfig || hiddenByRole) {
      setSortBy(null);
      setSortDir('asc');
    }
  }, [sortBy, visibleTreeColumns, isAdminOrUser, studentColumnKeys]);

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
    const allowed = isAdminOrUser ? studentColumnKeys : studentColumnKeys.filter(k => k !== 'agent');
    const hasVisibleAllowed = visibleTreeColumns.some(k => allowed.includes(k));
    if (!hasVisibleAllowed) setVisibleTreeColumns(allowed);
  }, [isAdminOrUser, studentColumnKeys, visibleTreeColumns]);
  const SortTh = ({ colKey, label, className = '' }: { colKey: string; label: string; className?: string }) => (
    <th className={`px-4 py-3 font-bold cursor-pointer select-none hover:bg-gray-100 transition-colors ${className}`} onClick={() => toggleSort(colKey)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sortBy === colKey ? (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <span className="opacity-30"><ChevronDown size={14} /></span>}
      </span>
    </th>
  );

  const hasActiveFilters = !!(searchTerm.trim() || filterNationalities.length > 0 || filterGender || filterStudentCreatedFrom || filterStudentCreatedTo);
  const clearFilters = () => {
    setSearchTerm('');
    setFilterNationalities([]);
    setFilterGender('');
    setFilterStudentCreatedFrom('');
    setFilterStudentCreatedTo('');
  };

  const getStudentApplications = (studentId: string) => {
    return applications
      .filter(a => a.studentId === studentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case ApplicationStatus.ACCEPTED: return <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">{t.approved}</span>;
      case ApplicationStatus.REJECTED: return <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">{t.rejected}</span>;
      case ApplicationStatus.DRAFT: return <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">{t.draft}</span>;
      case ApplicationStatus.MISSING_DOCS: return <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">{t.pending}</span>;
      default: return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">{t.pending}</span>;
    }
  };

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
              {selectedStudentForEdit && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="flex items-center gap-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl px-4 py-2.5 border border-gray-200 hover:border-blue-200 font-medium transition-colors"
                >
                  <Plus size={18} />
                  <span>{t.addStudent}</span>
                </button>
              )}
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
                disabled={!selectedStudentForEdit && isAdminOrUser && agentUsers.length > 0 && !selectedAgentId}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.save}
              </button>
            </div>
          </div>

          <form id="student-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8">
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
                    <select
                      required
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-shadow"
                      value={formData.nationality}
                      onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                    >
                      <option value="">Select...</option>
                      {[...(formData.nationality && !COUNTRIES.includes(formData.nationality) ? [formData.nationality] : []), ...COUNTRIES].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.residenceCountry}</label>
                    <select
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-shadow"
                      value={formData.residenceCountry}
                      onChange={e => setFormData({ ...formData, residenceCountry: e.target.value })}
                    >
                      <option value="">Select...</option>
                      {[...(formData.residenceCountry && !COUNTRIES.includes(formData.residenceCountry) ? [formData.residenceCountry] : []), ...COUNTRIES].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
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

              {/* Academic */}
              <section className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{t.degreeTarget}</h3>
                <div className="max-w-xs">
                  <select
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-shadow"
                    value={formData.degreeTarget}
                    onChange={e => setFormData({ ...formData, degreeTarget: e.target.value })}
                  >
                    <option value="">{t.selectDegree}</option>
                    <option value="Bachelor">{t.bachelor}</option>
                    <option value="Master">{t.master}</option>
                    <option value="PhD">{t.phd}</option>
                    <option value="CombinedPhD">{t.combinedPhd}</option>
                    <option value="Diploma">Diploma</option>
                  </select>
                </div>
              </section>
            </div>
          </form>
        </div>
      )}

      {/* Full-screen view (Student details) */}
      {!isModalOpen && selectedStudentForDetails && (
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
              {selectedStudentForDetails.createdAt && (
                <div>{t.createdAt}: {new Date(selectedStudentForDetails.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</div>
              )}
              {(selectedStudentForDetails.updatedAt || selectedStudentForDetails.createdAt) && (
                <div className="text-blue-700 font-medium">{t.lastUpdatedAt}: {new Date(selectedStudentForDetails.updatedAt || selectedStudentForDetails.createdAt || 0).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</div>
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
              <button
                type="button"
                onClick={() => { setSelectedStudentForDetails(null); openAddModal(); }}
                className="flex items-center gap-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl px-4 py-2.5 font-medium transition-colors"
              >
                <Plus size={18} />
                <span>{t.addStudent}</span>
              </button>
              <button
                type="button"
                onClick={() => { openEditModal(selectedStudentForDetails); setSelectedStudentForDetails(null); }}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl px-4 py-2.5 font-medium border border-transparent hover:border-blue-200 transition-colors"
              >
                <Pencil size={18} />
                <span>{t.edit}</span>
              </button>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.degreeTarget}</label>
                      <div className="w-full rounded-xl px-4 py-2.5 text-gray-900 bg-white border border-gray-200">{selectedStudentForDetails.degreeTarget ? translateDegree(selectedStudentForDetails.degreeTarget) : '-'}</div>
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
                            onClick={() => onViewApplication?.(app.id)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{info.programName}</div>
                              {getStatusBadge(app.status)}
                            </div>
                            <div className="text-sm text-gray-600 mb-1">{info.universityName} - <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">{info.degree}</span></div>
                            <div className="text-xs text-gray-400 mt-2 flex justify-between">
                              <span>{t.applicationDetails}: #{app.id}</span>
                              <span>{t.dateOfBirth}: {new Date(app.createdAt).toLocaleDateString()}</span>
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

      {/* List view (header + search + tree/kanban) */}
      {!isModalOpen && !selectedStudentForDetails ? (
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
                      {studentColumnOptions.filter(col => isAdminOrUser || col.key !== 'agent').map(col => (
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
                <NationalityMultiSelect
                  selected={filterNationalities}
                  onChange={setFilterNationalities}
                  placeholder={`${t.nationality} (${t.filterAll})`}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t.filterCreatedFrom}</label>
                <input
                  type="date"
                  value={filterStudentCreatedFrom}
                  onChange={e => setFilterStudentCreatedFrom(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t.filterCreatedTo}</label>
                <input
                  type="date"
                  value={filterStudentCreatedTo}
                  onChange={e => setFilterStudentCreatedTo(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
              </div>
            </div>
          </div>

          {viewMode === 'tree' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-end gap-2 text-sm text-gray-600">
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-900 font-bold border-b border-gray-200">
                    <tr>
                      {visibleTreeColumns.includes('name') && <SortTh colKey="name" label={t.userName} />}
                      {visibleTreeColumns.includes('passport') && <SortTh colKey="passport" label={t.passportNumber} />}
                      {visibleTreeColumns.includes('nationality') && <SortTh colKey="nationality" label={t.nationality} />}
                      {visibleTreeColumns.includes('gender') && <SortTh colKey="gender" label={t.gender} />}
                      {visibleTreeColumns.includes('email') && <SortTh colKey="email" label={t.email} />}
                      {isAdminOrUser && visibleTreeColumns.includes('agent') && <SortTh colKey="agent" label={t.agent} />}
                      {visibleTreeColumns.includes('createdAt') && <SortTh colKey="createdAt" label={t.createdAt} />}
                      {visibleTreeColumns.includes('updatedAt') && <SortTh colKey="updatedAt" label={t.lastUpdatedAt} />}
                      <th className="px-4 py-3 font-bold w-[110px] text-right">{t.actions || 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedStudents.map(student => (
                      <tr
                        key={student.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedStudentForDetails(student)}
                      >
                        {visibleTreeColumns.includes('name') && (
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {student.firstName} {student.lastName}
                          </td>
                        )}
                        {visibleTreeColumns.includes('passport') && <td className="px-4 py-3 font-mono text-gray-900">{student.passportNumber}</td>}
                        {visibleTreeColumns.includes('nationality') && <td className="px-4 py-3 text-gray-900">{student.nationality}</td>}
                        {visibleTreeColumns.includes('gender') && <td className="px-4 py-3 text-gray-900">{student.gender === 'Female' ? t.female : t.male}</td>}
                        {visibleTreeColumns.includes('email') && <td className="px-4 py-3 text-gray-900">{student.email}</td>}
                        {isAdminOrUser && visibleTreeColumns.includes('agent') && <td className="px-4 py-3 text-gray-900">{getAgentName(student)}</td>}
                        {visibleTreeColumns.includes('createdAt') && (
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                            {student.createdAt ? new Date(student.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </td>
                        )}
                        {visibleTreeColumns.includes('updatedAt') && (
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                            {(student.updatedAt || student.createdAt) ? new Date(student.updatedAt || student.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2 flex-nowrap">
                            <button
                              type="button"
                              onClick={() => openEditModal(student)}
                              className="inline-flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg p-2"
                              title={t.edit}
                            >
                              <Pencil size={18} />
                            </button>
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
                    ))}
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
                    {student.createdAt && (
                      <div className="flex justify-between">
                        <span>{t.createdAt}:</span>
                        <span>{new Date(student.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    )}
                    {(student.updatedAt || student.createdAt) && (
                      <div className="flex justify-between">
                        <span>{t.lastUpdatedAt}:</span>
                        <span>{new Date(student.updatedAt || student.createdAt!).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
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
                    <select
                      className="w-full p-2.5 border border-blue-100 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                      value={quickFilterUni}
                      onChange={e => { setQuickFilterUni(e.target.value); setQuickFilterDegree(''); setQuickFilterLang(''); setQuickFilterProgramName(''); }}
                      disabled={!quickFilterPeriod}
                    >
                      <option value="">{t.selectUniversity}</option>
                      {quickAvailableUnis.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
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
                    <select
                      className="w-full p-2.5 border border-blue-100 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                      value={quickFilterProgramName}
                      onChange={e => setQuickFilterProgramName(e.target.value)}
                      disabled={!quickFilterLang}
                    >
                      <option value="">{t.selectProgram}</option>
                      {quickAvailableProgramNames.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
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
    </div>
  );
};