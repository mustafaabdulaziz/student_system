import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Program, University, User, UserRole, PROGRAM_CATEGORIES, Period } from '../types';
import { COUNTRIES } from '../constants/countries';
import { Plus, BookOpen, Clock, DollarSign, Calendar, Trash2, Pencil, Search, Filter, X, ChevronDown, ChevronUp, Eye, ArrowLeft } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface MultiSelectOption {
  value: string;
  label: string;
}

function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  className = ''
}: {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  className?: string;
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
  const getLabel = (value: string) => options.find(o => o.value === value)?.label ?? value;
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full min-h-[42px] border border-gray-200 rounded-lg px-3 py-2 bg-white text-left text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none flex flex-wrap items-center gap-1.5"
      >
        {selected.length === 0 ? (
          <span className="text-gray-400">{placeholder}</span>
        ) : (
          selected.map(value => (
            <span
              key={value}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium"
            >
              {getLabel(value)}
              <button type="button" onClick={e => remove(value, e)} className="hover:bg-blue-100 rounded p-0.5">
                <X size={12} />
              </button>
            </span>
          ))
        )}
        <ChevronDown size={16} className="ml-auto text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg py-1 max-h-48 overflow-auto">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${selected.includes(opt.value) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ProgramManagerProps {
  programs: Program[];
  universities: University[];
  periods: Period[];
  onAddProgram: (prog: Program) => void;
  onEditProgram?: (prog: Program) => void;
  onDeleteProgram: (id: string) => void;
  currentUser?: User | null;
}

export const ProgramManager: React.FC<ProgramManagerProps> = ({
  programs,
  universities,
  periods,
  onAddProgram,
  onEditProgram,
  onDeleteProgram,
  currentUser
}) => {
  const { t, translateDegree, translateCategory } = useTranslation();
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProgramForView, setSelectedProgramForView] = useState<Program | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchProgramName, setSearchProgramName] = useState('');
  const [searchNameInArabic, setSearchNameInArabic] = useState('');
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterUniversityIds, setFilterUniversityIds] = useState<string[]>([]);
  const [filterDegrees, setFilterDegrees] = useState<string[]>([]);
  const [filterLanguages, setFilterLanguages] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const LANGUAGES = ['English', 'Turkish', 'Arabic'];
  const DEGREES = ['Bachelor', 'Master', 'PhD', 'CombinedPhD', 'Diploma'] as const;
  const [formData, setFormData] = useState<Partial<Program>>({
    name: '',
    nameInArabic: '',
    universityId: '',
    category: undefined,
    degree: 'Bachelor',
    language: 'English',
    years: 4,
    fee: 0,
    feeBeforeDiscount: undefined,
    deposit: undefined,
    cashPrice: undefined,
    currency: 'USD',
    periodId: '',
    country: '',
    description: ''
  });

  const getUniversityName = (id: string) => universities.find(u => u.id === id)?.name || t.noUniversities;
  const getPeriodName = (id: string | undefined) => (id && periods.find(p => p.id === id))?.name ?? '—';

  const filteredPrograms = useMemo(() => {
    return programs.filter(prog => {
      const matchName = !searchProgramName.trim() || prog.name.toLowerCase().includes(searchProgramName.trim().toLowerCase());
      const matchNameAr = !searchNameInArabic.trim() || (prog.nameInArabic || '').toLowerCase().includes(searchNameInArabic.trim().toLowerCase());
      const matchCategory = filterCategories.length === 0 || (prog.category != null && filterCategories.includes(prog.category));
      const matchUniversity = filterUniversityIds.length === 0 || filterUniversityIds.includes(prog.universityId);
      const matchDegree = filterDegrees.length === 0 || filterDegrees.includes(prog.degree);
      const matchLanguage = filterLanguages.length === 0 || filterLanguages.includes(prog.language);
      return matchName && matchNameAr && matchCategory && matchUniversity && matchDegree && matchLanguage;
    });
  }, [programs, searchProgramName, searchNameInArabic, filterCategories, filterUniversityIds, filterDegrees, filterLanguages]);

  const sortedPrograms = useMemo(() => {
    if (!sortBy) return filteredPrograms;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filteredPrograms].sort((a, b) => {
      let va: string | number, vb: string | number;
      switch (sortBy) {
        case 'name': va = a.name.toLowerCase(); vb = b.name.toLowerCase(); return dir * (va as string).localeCompare(vb as string);
        case 'university': va = getUniversityName(a.universityId); vb = getUniversityName(b.universityId); return dir * (va as string).localeCompare(vb as string);
        case 'degree': va = a.degree; vb = b.degree; return dir * (va as string).localeCompare(vb as string);
        case 'language': va = a.language; vb = b.language; return dir * (va as string).localeCompare(vb as string);
        case 'fee': va = a.fee ?? 0; vb = b.fee ?? 0; return dir * ((va as number) - (vb as number));
        case 'deposit': va = a.deposit ?? -1; vb = b.deposit ?? -1; return dir * ((va as number) - (vb as number));
        case 'cashPrice': va = a.cashPrice ?? -1; vb = b.cashPrice ?? -1; return dir * ((va as number) - (vb as number));
        case 'period': va = getPeriodName(a.periodId); vb = getPeriodName(b.periodId); return dir * (va as string).localeCompare(vb as string);
        default: return 0;
      }
    });
  }, [filteredPrograms, sortBy, sortDir, getUniversityName, getPeriodName]);

  const toggleSort = (key: string) => {
    setSortBy(prev => (prev === key ? prev : key));
    setSortDir(prev => (sortBy === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
  };
  const SortTh = ({ colKey, label, className = '' }: { colKey: string; label: string; className?: string }) => (
    <th className={`px-6 py-4 font-bold cursor-pointer select-none hover:bg-gray-100 transition-colors ${className}`} onClick={() => toggleSort(colKey)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sortBy === colKey ? (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <span className="opacity-30"><ChevronDown size={14} /></span>}
      </span>
    </th>
  );

  const hasActiveFilters = !!(searchProgramName.trim() || searchNameInArabic.trim() || filterCategories.length > 0 || filterUniversityIds.length > 0 || filterDegrees.length > 0 || filterLanguages.length > 0);

  const clearFilters = () => {
    setSearchProgramName('');
    setSearchNameInArabic('');
    setFilterCategories([]);
    setFilterUniversityIds([]);
    setFilterDegrees([]);
    setFilterLanguages([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.universityId && formData.name) {
      const progData: Program = {
        id: editingId || Date.now().toString(),
        universityId: formData.universityId,
        name: formData.name,
        nameInArabic: formData.nameInArabic || undefined,
        category: formData.category,
        degree: formData.degree as any,
        language: formData.language as any,
        years: formData.years || 4,
        fee: formData.fee || 0,
        feeBeforeDiscount: formData.feeBeforeDiscount,
        deposit: formData.deposit,
        cashPrice: formData.cashPrice,
        currency: formData.currency || 'USD',
        periodId: formData.periodId || undefined,
        country: formData.country || undefined,
        description: formData.description
      };

      if (modalMode === 'edit' && onEditProgram) {
        onEditProgram(progData);
      } else {
        onAddProgram(progData);
      }
      closeFormModal();
    }
  };

  const openAddModal = () => {
    setSelectedProgramForView(null);
    setModalMode('add');
    setEditingId(null);
    setFormData({
      name: '', nameInArabic: '', universityId: '', category: undefined, degree: 'Bachelor', language: 'English',
      years: 4, fee: 0, feeBeforeDiscount: undefined, deposit: undefined, cashPrice: undefined, currency: 'USD', periodId: '', country: '', description: ''
    });
    setModalOpen(true);
  };

  const openEditModal = (prog: Program) => {
    setSelectedProgramForView(null);
    setModalMode('edit');
    setEditingId(prog.id);
    setFormData({ ...prog });
    setModalOpen(true);
  };

  const closeFormModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setFormData({
      name: '', nameInArabic: '', universityId: '', category: undefined, degree: 'Bachelor', language: 'English',
      years: 4, fee: 0, feeBeforeDiscount: undefined, deposit: undefined, cashPrice: undefined, currency: 'USD', periodId: '', country: '', description: ''
    });
  };

  const handleDeleteConfirm = () => {
    if (confirmDeleteId) {
      onDeleteProgram(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const programToDelete = programs.find(p => p.id === confirmDeleteId);

  return (
    <div className="space-y-6">
      {/* Full-screen view */}
      {selectedProgramForView && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-50 to-white border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={() => setSelectedProgramForView(null)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-xl px-3 py-2.5 border border-gray-200 hover:border-gray-300 transition-colors shadow-sm"
              >
                <ArrowLeft size={20} />
                <span className="font-medium">{t.back}</span>
              </button>
              <h2 className="text-xl font-bold text-gray-800 truncate">{selectedProgramForView.name}</h2>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => openEditModal(selectedProgramForView)}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl px-4 py-2.5 border border-gray-200 hover:border-blue-200 font-medium transition-colors"
              >
                <Pencil size={18} />
                <span>{t.edit}</span>
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
              <section className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <BookOpen size={16} />
                  {t.programName}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{t.programName}</p>
                    <p className="text-gray-900 font-medium">{selectedProgramForView.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{t.programNameInArabic}</p>
                    <p className="text-gray-900" dir="rtl">{selectedProgramForView.nameInArabic || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{t.universities}</p>
                    <p className="text-gray-900">{getUniversityName(selectedProgramForView.universityId)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{t.programCategory}</p>
                    <p className="text-gray-900">{selectedProgramForView.category ? translateCategory(selectedProgramForView.category) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{t.programDegree}</p>
                    <p className="text-gray-900">{translateDegree(selectedProgramForView.degree)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{t.programLanguage}</p>
                    <p className="text-gray-900">{selectedProgramForView.language}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{t.programYears}</p>
                    <p className="text-gray-900">{selectedProgramForView.years}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{t.programCountry}</p>
                    <p className="text-gray-900">{selectedProgramForView.country || '—'}</p>
                  </div>
                </div>
              </section>
              <section className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <DollarSign size={16} />
                  {t.programFee} / {t.programPeriod}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{t.programPeriod}</p>
                    <p className="text-gray-900 font-medium">{getPeriodName(selectedProgramForView.periodId)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{t.feeBeforeDiscount}</p>
                    <p className="text-gray-900">{selectedProgramForView.feeBeforeDiscount != null ? `${selectedProgramForView.currency || 'USD'} ${selectedProgramForView.feeBeforeDiscount.toLocaleString()}` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{t.programFee}</p>
                    <p className="text-gray-900 font-medium">
                      {selectedProgramForView.currency || 'USD'} {selectedProgramForView.fee.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{t.deposit}</p>
                    <p className="text-gray-900">{selectedProgramForView.deposit != null ? `${selectedProgramForView.currency || 'USD'} ${selectedProgramForView.deposit.toLocaleString()}` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{t.cashPrice}</p>
                    <p className="text-gray-900">{selectedProgramForView.cashPrice != null ? `${selectedProgramForView.currency || 'USD'} ${selectedProgramForView.cashPrice.toLocaleString()}` : '—'}</p>
                  </div>
                </div>
              </section>
              {selectedProgramForView.description && (
                <section className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{t.programDescription}</h3>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{selectedProgramForView.description}</p>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-screen form (Add / Edit) */}
      {isModalOpen && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-50 to-white border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={closeFormModal}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-xl px-3 py-2.5 border border-gray-200 hover:border-gray-300 transition-colors shadow-sm"
              >
                <ArrowLeft size={20} />
                <span className="font-medium">{t.back}</span>
              </button>
              <h2 className="text-xl font-bold text-gray-800 truncate">
                {modalMode === 'edit' ? `${t.editProgram} – ${formData.name}` : t.addProgram}
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={closeFormModal}
                className="px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-colors shadow-sm"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                form="program-form"
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors shadow-md shadow-blue-600/20"
              >
                {t.save}
              </button>
            </div>
          </div>
          <form id="program-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
              <section className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <BookOpen size={16} />
                  {t.programName}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.universities}</label>
                    <select
                      required
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.universityId}
                      onChange={e => setFormData({ ...formData, universityId: e.target.value })}
                    >
                      <option value="">{t.selectUniversity}</option>
                      {universities.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.programName}</label>
                    <input
                      type="text"
                      required
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.programNameInArabic}</label>
                    <input
                      type="text"
                      dir="rtl"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.nameInArabic || ''}
                      onChange={e => setFormData({ ...formData, nameInArabic: e.target.value })}
                      placeholder={t.programNameInArabicPlaceholder}
                    />
                  </div>
                </div>
              </section>
              <section className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock size={16} />
                  {t.programCategory} / {t.programDegree} / {t.programLanguage} / {t.programYears}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.programCategory}</label>
                    <select
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.category || ''}
                      onChange={e => setFormData({ ...formData, category: e.target.value ? (e.target.value as Program['category']) : undefined })}
                    >
                      <option value="">—</option>
                      {PROGRAM_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{translateCategory(cat)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.programCountry}</label>
                    <select
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.country || ''}
                      onChange={e => setFormData({ ...formData, country: e.target.value || undefined })}
                    >
                      <option value="">{t.filterAll}</option>
                      {COUNTRIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.programDegree}</label>
                    <select
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.degree}
                      onChange={e => setFormData({ ...formData, degree: e.target.value as any })}
                    >
                      <option value="Bachelor">{t.bachelor}</option>
                      <option value="Master">{t.master}</option>
                      <option value="PhD">{t.phd}</option>
                      <option value="CombinedPhD">{t.combinedPhd}</option>
                      <option value="Diploma">Diploma</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.programLanguage}</label>
                    <select
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.language}
                      onChange={e => setFormData({ ...formData, language: e.target.value as any })}
                    >
                      <option value="English">English</option>
                      <option value="Turkish">Turkish</option>
                      <option value="Arabic">Arabic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.programYears}</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.years}
                      onChange={e => setFormData({ ...formData, years: parseInt(e.target.value) || 4 })}
                    />
                  </div>
                </div>
              </section>
              <section className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <DollarSign size={16} />
                  {t.programFee} / {t.programPeriod}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.feeBeforeDiscount}</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.feeBeforeDiscount ?? ''}
                      onChange={e => setFormData({ ...formData, feeBeforeDiscount: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.programFee}</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.fee}
                      onChange={e => setFormData({ ...formData, fee: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.programCurrency}</label>
                    <select
                      value={formData.currency}
                      onChange={e => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="TRY">TRY</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.programPeriod}</label>
                    <select
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.periodId || ''}
                      onChange={e => setFormData({ ...formData, periodId: e.target.value || undefined })}
                    >
                      <option value="">{t.selectPeriod}</option>
                      {periods.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.deposit}</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.deposit ?? ''}
                      onChange={e => setFormData({ ...formData, deposit: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.cashPrice}</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.cashPrice ?? ''}
                      onChange={e => setFormData({ ...formData, cashPrice: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </section>
              <section className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{t.programDescription}</h3>
                <textarea
                  rows={4}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </section>
            </div>
          </form>
        </div>
      )}

      {/* Main: list only when not viewing and not in form */}
      {!selectedProgramForView && !isModalOpen && (
        <>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t.programsTitle}</h2>
          <p className="text-gray-500">{t.programsTitle}</p>
        </div>
        {isAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            <span>{t.addProgram}</span>
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
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
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors ml-1"
            >
              <X size={14} />
              {t.clearFilters}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.programName}</label>
            <input
              type="text"
              placeholder={t.searchProgramNamePlaceholder}
              value={searchProgramName}
              onChange={e => setSearchProgramName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.programNameInArabic}</label>
            <input
              type="text"
              dir="rtl"
              placeholder={t.searchNameInArabicPlaceholder}
              value={searchNameInArabic}
              onChange={e => setSearchNameInArabic(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.programCategory}</label>
            <MultiSelect
              options={PROGRAM_CATEGORIES.map(cat => ({ value: cat, label: translateCategory(cat) }))}
              selected={filterCategories}
              onChange={setFilterCategories}
              placeholder={t.filterAll}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.universities}</label>
            <MultiSelect
              options={universities.map(u => ({ value: u.id, label: u.name }))}
              selected={filterUniversityIds}
              onChange={setFilterUniversityIds}
              placeholder={t.filterAll}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.programDegree}</label>
            <MultiSelect
              options={DEGREES.map(d => ({ value: d, label: translateDegree(d) }))}
              selected={filterDegrees}
              onChange={setFilterDegrees}
              placeholder={t.filterAll}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.programLanguage}</label>
            <MultiSelect
              options={LANGUAGES.map(lang => ({ value: lang, label: lang }))}
              selected={filterLanguages}
              onChange={setFilterLanguages}
              placeholder={t.filterAll}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-900 border-b border-gray-200">
              <tr>
                <SortTh colKey="name" label={t.programName} />
                <SortTh colKey="university" label={t.universities} />
                <SortTh colKey="degree" label={t.programDegree} />
                <SortTh colKey="language" label={t.programLanguage} />
                <SortTh colKey="fee" label={t.programFee} />
                <SortTh colKey="deposit" label={t.deposit} />
                <SortTh colKey="cashPrice" label={t.cashPrice} />
                <SortTh colKey="period" label={t.programPeriod} />
                <th className="px-6 py-4 font-bold text-center">{t.edit}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedPrograms.map((program) => (
                <tr key={program.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-gray-900">{program.name}</td>
                  <td className="px-6 py-4 text-gray-900">{getUniversityName(program.universityId)}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                      {translateDegree(program.degree)}
                    </span>
                  </td>
                  <td className="px-6 py-4">{program.language}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">
                    {program.currency ? `${program.currency} ${program.fee.toLocaleString()}` : `$${program.fee.toLocaleString()}`}
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {program.deposit != null ? (program.currency ? `${program.currency} ${program.deposit.toLocaleString()}` : program.deposit.toLocaleString()) : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {program.cashPrice != null ? (program.currency ? `${program.currency} ${program.cashPrice.toLocaleString()}` : program.cashPrice.toLocaleString()) : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-900">{getPeriodName(program.periodId)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setSelectedProgramForView(program)}
                        title={t.viewDetails}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition-colors"
                      >
                        <Eye size={15} />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => openEditModal(program)}
                            title={t.edit}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(program.id)}
                            title={t.delete}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {sortedPrograms.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-400">
                    {hasActiveFilters ? t.searchNoResults : t.noPrograms}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">{t.confirmDelete}</h3>
            </div>
            <p className="text-gray-700 text-sm font-medium mb-1">
              {programToDelete?.name}
            </p>
            <p className="text-gray-400 text-xs mb-6">
              {getUniversityName(programToDelete?.universityId || '')} — {programToDelete && translateDegree(programToDelete.degree)}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};