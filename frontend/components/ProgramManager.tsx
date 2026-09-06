import React, { useState, useMemo, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import notoSansRegularUrl from '../assets/fonts/NotoSans-Regular.ttf?url';
import * as XLSX from 'xlsx';
import { Program, University, User, UserRole, Period, Application } from '../types';
import { Plus, BookOpen, DollarSign, Trash2, Pencil, Search, Filter, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowLeft, Printer, Archive, ArchiveRestore, FileEdit } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { SearchableMultiSelect } from './SearchableMultiSelect';
import { MassEditModal, type MassEditFieldDef } from './MassEditModal';
import { SavedQuickFilters } from './SavedQuickFilters';
import { canManageCatalog, isAgentRole } from '../utils/roles';

interface ProgramManagerProps {
  programs: Program[];
  universities: University[];
  periods: Period[];
  applications?: Application[];
  onAddProgram: (prog: Program) => void;
  onEditProgram?: (prog: Program, opts?: { silent?: boolean }) => void | Promise<boolean>;
  onDeleteProgram: (id: string) => void | Promise<boolean>;
  currentUser?: User | null;
}

export const ProgramManager: React.FC<ProgramManagerProps> = ({
  programs,
  universities,
  periods,
  applications = [],
  onAddProgram,
  onEditProgram,
  onDeleteProgram,
  currentUser
}) => {
  const { t, translateDegree, dir: layoutDir } = useTranslation();
  const isLtr = layoutDir === 'ltr';
  const tableAlign = isLtr ? 'text-left' : 'text-right';
  const canManage = canManageCatalog(currentUser?.role);
  const isAgent = isAgentRole(currentUser?.role);

  const [isModalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProgramForView, setSelectedProgramForView] = useState<Program | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [massEditOpen, setMassEditOpen] = useState(false);
  const [massEditApplying, setMassEditApplying] = useState(false);
  const [archiveView, setArchiveView] = useState<'active' | 'archived'>('active');
  const [searchProgramName, setSearchProgramName] = useState('');
  const [filterPeriodIds, setFilterPeriodIds] = useState<string[]>([]);
  const [filterUniversityIds, setFilterUniversityIds] = useState<string[]>([]);
  const [filterDegrees, setFilterDegrees] = useState<string[]>([]);
  const [filterLanguages, setFilterLanguages] = useState<string[]>([]);
  const [filterFeeMin, setFilterFeeMin] = useState('');
  const [filterFeeMax, setFilterFeeMax] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const [importResult, setImportResult] = useState<{
    type: 'success' | 'error';
    title: string;
    summary: string;
    details: string[];
  } | null>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const LANGUAGES = ['English', 'Turkish', 'Arabic'];
  const DEGREES = ['Bachelor', 'Master', 'PhD', 'Diploma'] as const;
  const programColumnKeys = useMemo(
    () => (isAgent
      ? ['name', 'university', 'degree', 'language', 'fee', 'cashPrice', 'deposit']
      : ['name', 'university', 'degree', 'language', 'fee', 'cashPrice', 'deposit', 'isOpen']),
    [isAgent]
  );
  const [visibleTreeColumns, setVisibleTreeColumns] = useState<string[]>(programColumnKeys);
  const [selectedProgramIds, setSelectedProgramIds] = useState<Set<string>>(() => new Set());
  const [treePage, setTreePage] = useState(1);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  const TREE_PAGE_SIZE = 50;
  const [formData, setFormData] = useState<Partial<Program>>({
    name: '',
    nameInArabic: '',
    universityId: '',
    degree: 'Bachelor',
    language: 'English',
    years: 4,
    fee: 0,
    feeBeforeDiscount: undefined,
    deposit: undefined,
    cashPrice: undefined,
    currency: 'USD',
    periodId: '',
    description: '',
    isOpen: true as boolean
  });

  useEffect(() => {
    if (!canManage) {
      setModalOpen(false);
      setSelectedProgramForView(null);
      setConfirmBulkDelete(false);
      setConfirmArchiveId(null);
      setArchiveView('active');
    }
  }, [canManage]);

  useEffect(() => {
    setSelectedProgramIds(new Set());
    setTreePage(1);
  }, [archiveView]);

  const getUniversityName = (id: string) => universities.find(u => u.id === id)?.name || t.noUniversities;
  const getPeriodName = (id: string | undefined) => (id && periods.find(p => p.id === id))?.name ?? '—';
  const visiblePrograms = useMemo(() => {
    if (!canManage) return programs.filter((p) => !p.isArchived);
    return programs.filter((p) => (archiveView === 'archived' ? !!p.isArchived : !p.isArchived));
  }, [programs, canManage, archiveView]);

  const programApplicationCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const app of applications) {
      if (!app.programId) continue;
      map.set(app.programId, (map.get(app.programId) || 0) + 1);
    }
    return map;
  }, [applications]);

  const programHasApplications = (programId: string) => (programApplicationCounts.get(programId) || 0) > 0;

  const getBlockedDeleteProgramIds = (ids: Iterable<string>) =>
    Array.from(ids).filter((id) => programHasApplications(id));

  const openBulkDeleteConfirm = () => {
    const blocked = getBlockedDeleteProgramIds(selectedProgramIds);
    if (blocked.length > 0) {
      const names = blocked
        .map((id) => programs.find((p) => p.id === id)?.name)
        .filter(Boolean)
        .join('\n• ');
      alert(`${t.programDeleteBlockedBulk}\n• ${names}`);
      return;
    }
    setConfirmBulkDelete(true);
  };
  const visibleTreeColSpan = visibleTreeColumns.length + (canManage ? 2 : 1);
  const programColumnOptions = useMemo(() => [
    { key: 'name', label: t.programName },
    { key: 'university', label: t.universities },
    { key: 'degree', label: t.programDegree },
    { key: 'language', label: t.programLanguage },
    { key: 'fee', label: t.programFee },
    { key: 'cashPrice', label: t.cashPrice },
    { key: 'deposit', label: t.deposit },
    ...(!isAgent ? [{ key: 'isOpen', label: t.programAvailability }] : [])
  ], [t, isAgent]);

  const filteredPrograms = useMemo(() => {
    const term = searchProgramName.trim().toLowerCase();
    return visiblePrograms.filter(prog => {
      const matchName = !term
        || prog.name.toLowerCase().includes(term)
        || (prog.nameInArabic || '').toLowerCase().includes(term);
      const matchPeriod = filterPeriodIds.length === 0 || (prog.periodId != null && filterPeriodIds.includes(prog.periodId));
      const matchUniversity = filterUniversityIds.length === 0 || filterUniversityIds.includes(prog.universityId);
      const matchDegree = filterDegrees.length === 0 || filterDegrees.includes(prog.degree);
      const matchLanguage = filterLanguages.length === 0 || filterLanguages.includes(prog.language);
      const feeValue = Number(prog.fee) || 0;
      const minFee = filterFeeMin.trim() === '' ? null : Number(filterFeeMin);
      const maxFee = filterFeeMax.trim() === '' ? null : Number(filterFeeMax);
      const matchMinFee = minFee == null || Number.isNaN(minFee) || feeValue >= minFee;
      const matchMaxFee = maxFee == null || Number.isNaN(maxFee) || feeValue <= maxFee;
      return matchName && matchPeriod && matchUniversity && matchDegree && matchLanguage && matchMinFee && matchMaxFee;
    });
  }, [visiblePrograms, searchProgramName, filterPeriodIds, filterUniversityIds, filterDegrees, filterLanguages, filterFeeMin, filterFeeMax]);

  let notoSansVfsPromise: Promise<void> | null = null;
  const ensurePdfFont = async (doc: jsPDF) => {
    // Load and embed TTF only once per page lifecycle
    if (!notoSansVfsPromise) {
      notoSansVfsPromise = (async () => {
        const res = await fetch(notoSansRegularUrl);
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        const base64 = btoa(binary);
        // jsPDF VFS expects base64 TTF
        doc.addFileToVFS('NotoSans-Regular.ttf', base64);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
      })();
    }
    await notoSansVfsPromise;
    doc.setFont('NotoSans', 'normal');
  };

  const sortedPrograms = useMemo(() => {
    if (!sortBy) return filteredPrograms;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filteredPrograms].sort((a, b) => {
      let va: string | number, vb: string | number;
      switch (sortBy) {
        case 'name': va = a.name.toLowerCase(); vb = b.name.toLowerCase(); return dir * (va as string).localeCompare(vb as string, 'tr');
        case 'university': va = getUniversityName(a.universityId); vb = getUniversityName(b.universityId); return dir * (va as string).localeCompare(vb as string, 'tr');
        case 'degree': va = a.degree; vb = b.degree; return dir * (va as string).localeCompare(vb as string, 'tr');
        case 'language': va = a.language; vb = b.language; return dir * (va as string).localeCompare(vb as string, 'tr');
        case 'fee': va = a.fee ?? 0; vb = b.fee ?? 0; return dir * ((va as number) - (vb as number));
        case 'deposit': va = a.deposit ?? -1; vb = b.deposit ?? -1; return dir * ((va as number) - (vb as number));
        case 'cashPrice': va = a.cashPrice ?? -1; vb = b.cashPrice ?? -1; return dir * ((va as number) - (vb as number));
        case 'isOpen': va = a.isOpen === false ? 0 : 1; vb = b.isOpen === false ? 0 : 1; return dir * ((va as number) - (vb as number));
        default: return 0;
      }
    });
  }, [filteredPrograms, sortBy, sortDir, getUniversityName]);

  const totalTreePages = Math.max(1, Math.ceil(sortedPrograms.length / TREE_PAGE_SIZE));
  const paginatedPrograms = useMemo(() => {
    const start = (treePage - 1) * TREE_PAGE_SIZE;
    return sortedPrograms.slice(start, start + TREE_PAGE_SIZE);
  }, [sortedPrograms, treePage]);
  const treeFrom = sortedPrograms.length === 0 ? 0 : (treePage - 1) * TREE_PAGE_SIZE + 1;
  const treeTo = Math.min(treePage * TREE_PAGE_SIZE, sortedPrograms.length);

  useEffect(() => {
    setTreePage(1);
  }, [searchProgramName, filterPeriodIds, filterUniversityIds, filterDegrees, filterLanguages, filterFeeMin, filterFeeMax]);

  useEffect(() => {
    setSelectedProgramIds(new Set());
  }, [treePage]);

  useEffect(() => {
    if (treePage > totalTreePages) setTreePage(totalTreePages);
  }, [treePage, totalTreePages]);

  const allOnPageSelected =
    paginatedPrograms.length > 0 && paginatedPrograms.every((p) => selectedProgramIds.has(p.id));
  const someOnPageSelected = paginatedPrograms.some((p) => selectedProgramIds.has(p.id));
  const allMatchingSelected =
    sortedPrograms.length > 0 &&
    sortedPrograms.every((p) => selectedProgramIds.has(p.id));

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected;
  }, [someOnPageSelected, allOnPageSelected]);

  const toggleProgramSelection = (id: string) => {
    setSelectedProgramIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      setSelectedProgramIds((prev) => {
        const next = new Set(prev);
        paginatedPrograms.forEach((p) => next.delete(p.id));
        return next;
      });
      return;
    }
    setSelectedProgramIds((prev) => {
      const next = new Set(prev);
      paginatedPrograms.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const selectAllMatchingPrograms = () => {
    setSelectedProgramIds(new Set(sortedPrograms.map((p) => p.id)));
  };

  const clearProgramSelection = () => {
    setSelectedProgramIds(new Set());
  };

  const toggleSort = (key: string) => {
    setSortBy(prev => (prev === key ? prev : key));
    setSortDir(prev => (sortBy === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
  };

  const storageKey = `tree-columns:programs:${currentUser?.id || 'guest'}`;

  useEffect(() => {
    if (!isAgent) return;
    setVisibleTreeColumns(prev => prev.filter(k => k !== 'isOpen'));
  }, [isAgent]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const validSet = new Set(parsed.filter((k: string) => programColumnKeys.includes(k)));
      const ordered = programColumnKeys.filter(k => validSet.has(k));
      if (ordered.length > 0) setVisibleTreeColumns(ordered);
    } catch {
      // ignore corrupted localStorage values
    }
  }, [storageKey, programColumnKeys]);

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
    if (sortBy && programColumnKeys.includes(sortBy) && !visibleTreeColumns.includes(sortBy)) {
      setSortBy(null);
      setSortDir('asc');
    }
  }, [sortBy, visibleTreeColumns, programColumnKeys]);

  const toggleTreeColumn = (key: string) => {
    setVisibleTreeColumns(prev => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter(k => k !== key);
      }
      return [...prev, key];
    });
  };

  const handlePrintPDF = async () => {
    const selected = paginatedPrograms.filter((p) => selectedProgramIds.has(p.id));
    if (selected.length === 0) {
      alert(t.pdfSelectPrograms);
      return;
    }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    await ensurePdfFont(doc);
    doc.setFontSize(14);
    doc.text(t.programsTitle, 14, 12);
    doc.setFontSize(9);
    doc.text(new Date().toLocaleDateString(undefined, { dateStyle: 'long' }), 14, 18);
    doc.text(`${selected.length} ${t.programsTitle}`, 14, 24);
    const head = [
      t.programName,
      t.universities,
      t.programDegree,
      t.programLanguage,
      t.programFee,
      t.cashPrice,
      t.deposit,
      ...(!isAgent ? [t.programAvailability] : [])
    ];
    const body = selected.map(p => [
      p.name,
      getUniversityName(p.universityId),
      translateDegree(p.degree),
      p.language,
      p.currency ? `${p.currency} ${(p.fee ?? 0).toLocaleString()}` : `${(p.fee ?? 0).toLocaleString()}`,
      p.cashPrice != null ? (p.currency ? `${p.currency} ${p.cashPrice.toLocaleString()}` : String(p.cashPrice)) : '—',
      p.deposit != null ? (p.currency ? `${p.currency} ${p.deposit.toLocaleString()}` : String(p.deposit)) : '—',
      ...(!isAgent ? [p.isOpen === false ? t.programStatusClosed : t.programStatusOpen] : [])
    ]);
    autoTable(doc, {
      head: [head],
      body,
      startY: 28,
      styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 8, cellPadding: 2 },
      headStyles: { font: 'NotoSans', fontStyle: 'normal', fillColor: [59, 130, 246], textColor: 255 },
      margin: { left: 14, right: 14 }
    });
    doc.save(`programlar-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const SortTh = ({ colKey, label, className = '' }: { colKey: string; label: string; className?: string }) => (
    <th
      className={`px-6 py-4 font-bold cursor-pointer select-none hover:bg-gray-100 transition-colors whitespace-nowrap ${tableAlign} ${className}`}
      onClick={() => toggleSort(colKey)}
    >
      <span className={`inline-flex items-center gap-1 ${isLtr ? '' : 'flex-row-reverse'}`}>
        {label}
        {sortBy === colKey ? (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <span className="opacity-30"><ChevronDown size={14} /></span>}
      </span>
    </th>
  );

  const hasActiveFilters = !!(searchProgramName.trim() || filterPeriodIds.length > 0 || filterUniversityIds.length > 0 || filterDegrees.length > 0 || filterLanguages.length > 0 || filterFeeMin.trim() || filterFeeMax.trim());

  const clearFilters = () => {
    setSearchProgramName('');
    setFilterPeriodIds([]);
    setFilterUniversityIds([]);
    setFilterDegrees([]);
    setFilterLanguages([]);
    setFilterFeeMin('');
    setFilterFeeMax('');
    setTreePage(1);
  };

  const programPaginationBar = sortedPrograms.length > 0 ? (
    <div className="px-4 py-3 border-gray-100 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 bg-gray-50/80">
      <div className="flex items-center gap-3 flex-wrap">
        {canManage && archiveView === 'active' && (
          allMatchingSelected ? (
            <button
              type="button"
              onClick={clearProgramSelection}
              disabled={sortedPrograms.length === 0}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              {t.clearSelection}
            </button>
          ) : (
            <button
              type="button"
              onClick={selectAllMatchingPrograms}
              disabled={sortedPrograms.length === 0}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              {t.selectAllMatching.replace('{count}', String(sortedPrograms.length))}
            </button>
          )
        )}
        {canManage && archiveView === 'active' && (
          <button
            type="button"
            onClick={() => setMassEditOpen(true)}
            disabled={selectedProgramIds.size === 0}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            <FileEdit size={16} />
            <span>{t.massEdit}</span>
            {selectedProgramIds.size > 0 && (
              <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{selectedProgramIds.size}</span>
            )}
          </button>
        )}
        {canManage && archiveView === 'active' && (
          <button
            type="button"
            onClick={openBulkDeleteConfirm}
            disabled={selectedProgramIds.size === 0}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            <Trash2 size={16} />
            <span>{t.deleteSelected}</span>
            {selectedProgramIds.size > 0 && (
              <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{selectedProgramIds.size}</span>
            )}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <span>{treeFrom}-{treeTo} / {sortedPrograms.length}</span>
        <span className="font-medium text-gray-500">{treePage} / {totalTreePages}</span>
        <button
          type="button"
          onClick={() => setTreePage((p) => Math.max(1, p - 1))}
          disabled={treePage <= 1}
          className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t.back}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => setTreePage((p) => Math.min(totalTreePages, p + 1))}
          disabled={treePage >= totalTreePages}
          className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t.next}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  ) : null;

  const normalizeText = (value: unknown): string =>
    String(value ?? '')
      .trim()
      .toLocaleLowerCase('tr')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i')
      .replace(/\s+/g, ' ');

  const excelColumns = [
    'üniversite',
    'program',
    'arapça ad',
    'müsaitlik',
    'derece',
    'dil',
    'yıl',
    'indirim öncesi ücret',
    'yıllık ücret',
    'nakit fiyatı',
    'para birimi',
    'depozito',
    'dönem',
    'açıklama'
  ] as const;

  const degreeMap = useMemo(() => {
    const m = new Map<string, Program['degree']>();
    const vals: Program['degree'][] = ['Bachelor', 'Master', 'PhD', 'Diploma'];
    vals.forEach(v => {
      m.set(normalizeText(v), v);
      m.set(normalizeText(translateDegree(v)), v);
    });
    m.set(normalizeText('Lisans'), 'Bachelor');
    m.set(normalizeText('Yuksek Lisans'), 'Master');
    m.set(normalizeText('Doktora'), 'PhD');
    m.set(normalizeText('önlisans'), 'Diploma');
    m.set(normalizeText('onlisans'), 'Diploma');
    return m;
  }, [translateDegree]);

  const languageMap = useMemo(() => {
    const m = new Map<string, Program['language']>();
    m.set(normalizeText('English'), 'English');
    m.set(normalizeText('Turkish'), 'Turkish');
    m.set(normalizeText('Arabic'), 'Arabic');
    m.set(normalizeText('Ingilizce'), 'English');
    m.set(normalizeText('Turkce'), 'Turkish');
    m.set(normalizeText('Arapca'), 'Arabic');
    return m;
  }, []);

  const parseNumber = (value: unknown, required = false): number | undefined => {
    const raw = String(value ?? '').trim();
    if (raw === '') return required ? undefined : undefined;
    const parsed = Number(raw.toString().replace(',', '.'));
    if (Number.isNaN(parsed)) return undefined;
    return parsed;
  };

  const exportProgramsToExcel = () => {
    const rows = sortedPrograms.map((p) => ({
      üniversite: getUniversityName(p.universityId),
      Program: p.name,
      'Arapça ad': p.nameInArabic || '',
      Müsaitlik: p.isOpen === false ? t.programStatusClosed : t.programStatusOpen,
      Derece: translateDegree(p.degree),
      Dil: p.language,
      Yıl: p.years ?? '',
      'İndirim öncesi ücret': p.feeBeforeDiscount ?? '',
      'Yıllık ücret': p.fee ?? '',
      'Nakit fiyatı': p.cashPrice ?? '',
      'Para Birimi': p.currency || 'USD',
      Depozito: p.deposit ?? '',
      Dönem: getPeriodName(p.periodId),
      Açıklama: p.description || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows, {
      header: ['üniversite', 'Program', 'Arapça ad', 'Müsaitlik', 'Derece', 'Dil', 'Yıl', 'İndirim öncesi ücret', 'Yıllık ücret', 'Nakit fiyatı', 'Para Birimi', 'Depozito', 'Dönem', 'Açıklama']
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Programlar');
    XLSX.writeFile(wb, 'programlar.xlsx');
  };

  const handleImportProgramsExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingExcel(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as Array<Array<string | number>>;
      if (matrix.length === 0) {
        setImportResult({
          type: 'error',
          title: 'Import Hatası',
          summary: 'Excel dosyası boş.',
          details: []
        });
        return;
      }

      const header = (matrix[0] || []).map(normalizeText);
      const expected = [...excelColumns].map(normalizeText);
      const headerOk = expected.every((h, i) => header[i] === h);
      if (!headerOk) {
        setImportResult({
          type: 'error',
          title: 'Import Hatası',
          summary: 'Sütun sırası hatalı.',
          details: [`Beklenen sıra: ${excelColumns.join(', ')}`]
        });
        return;
      }

      const uniMap = new Map(universities.map((u) => [normalizeText(u.name), u]));
      const periodMap = new Map(periods.map((p) => [normalizeText(p.name), p]));

      const errors: string[] = [];
      const operations: Array<{ type: 'create' | 'update'; payload: Program }> = [];

      for (let i = 1; i < matrix.length; i += 1) {
        const row = matrix[i] || [];
        const rowNo = i + 1;
        const uniNameRaw = String(row[0] ?? '').trim();
        const programName = String(row[1] ?? '').trim();
        const nameAr = String(row[2] ?? '').trim();
        const availabilityRaw = String(row[3] ?? '').trim();
        const degreeRaw = String(row[4] ?? '').trim();
        const languageRaw = String(row[5] ?? '').trim();
        const yearsRaw = row[6];
        const feeBeforeRaw = row[7];
        const feeRaw = row[8];
        const cashRaw = row[9];
        const currencyRaw = String(row[10] ?? '').trim();
        const depositRaw = row[11];
        const periodRaw = String(row[12] ?? '').trim();
        const description = String(row[13] ?? '').trim();

        const isEmpty = [uniNameRaw, programName, nameAr, availabilityRaw, degreeRaw, languageRaw, yearsRaw, feeBeforeRaw, feeRaw, cashRaw, currencyRaw, depositRaw, periodRaw, description]
          .every((v) => String(v ?? '').trim() === '');
        if (isEmpty) continue;

        const uni = uniMap.get(normalizeText(uniNameRaw));
        if (!uni) {
          errors.push(`Satır ${rowNo}: Üniversite bulunamadı (${uniNameRaw}).`);
          continue;
        }
        if (!programName) {
          errors.push(`Satır ${rowNo}: Program adı boş.`);
          continue;
        }

        const availabilityNorm = normalizeText(availabilityRaw);
        const isOpen =
          availabilityNorm === normalizeText(t.programStatusOpen) || availabilityNorm === normalizeText('acik') || availabilityNorm === normalizeText('open')
            ? true
            : availabilityNorm === normalizeText(t.programStatusClosed) || availabilityNorm === normalizeText('kapali') || availabilityNorm === normalizeText('closed')
              ? false
              : null;
        if (isOpen === null) {
          errors.push(`Satır ${rowNo}: Müsaitlik Açık/Kapalı olmalı.`);
          continue;
        }

        const degree = degreeMap.get(normalizeText(degreeRaw));
        if (!degree) {
          errors.push(`Satır ${rowNo}: Derece geçersiz (${degreeRaw}).`);
          continue;
        }

        const language = languageMap.get(normalizeText(languageRaw));
        if (!language) {
          errors.push(`Satır ${rowNo}: Dil geçersiz (${languageRaw}).`);
          continue;
        }

        const currency = String(currencyRaw).toUpperCase();
        if (!['USD', 'EUR', 'TRY'].includes(currency)) {
          errors.push(`Satır ${rowNo}: Para birimi USD/EUR/TRY olmalı.`);
          continue;
        }

        const period = periodRaw ? periodMap.get(normalizeText(periodRaw)) : undefined;
        if (periodRaw && !period) {
          errors.push(`Satır ${rowNo}: Dönem bulunamadı (${periodRaw}).`);
          continue;
        }

        const years = parseNumber(yearsRaw, true);
        const fee = parseNumber(feeRaw, true);
        const feeBeforeDiscount = parseNumber(feeBeforeRaw);
        const cashPrice = parseNumber(cashRaw);
        const deposit = parseNumber(depositRaw);
        if (years == null || Number.isNaN(years)) {
          errors.push(`Satır ${rowNo}: Yıl sayı olmalı.`);
          continue;
        }
        if (fee == null || Number.isNaN(fee)) {
          errors.push(`Satır ${rowNo}: Yıllık ücret sayı olmalı.`);
          continue;
        }

        const existing = programs.find((p) =>
          !p.isArchived &&
          p.universityId === uni.id &&
          normalizeText(p.name) === normalizeText(programName) &&
          (p.periodId ?? '') === (period?.id ?? '')
        );

        const payload: Program = {
          id: existing?.id || `${Date.now()}-${i}`,
          universityId: uni.id,
          name: programName,
          nameInArabic: nameAr || undefined,
          isOpen,
          degree,
          language,
          years,
          fee,
          feeBeforeDiscount,
          cashPrice,
          currency,
          deposit,
          periodId: period?.id,
          description: description || undefined
        };

        if (existing && onEditProgram) operations.push({ type: 'update', payload: { ...existing, ...payload } });
        else operations.push({ type: 'create', payload });
      }

      if (errors.length > 0) {
        setImportResult({
          type: 'error',
          title: 'Import Başarısız',
          summary: `Dosyada ${errors.length} hata bulundu. Hiçbir satır içe aktarılmadı.`,
          details: errors
        });
      } else {
        let created = 0;
        let updated = 0;
        operations.forEach((op) => {
          if (op.type === 'update') {
            onEditProgram?.(op.payload);
            updated += 1;
          } else {
            onAddProgram(op.payload);
            created += 1;
          }
        });
        setImportResult({
          type: 'success',
          title: 'Import Başarılı',
          summary: `Yeni: ${created} | Güncellenen: ${updated}`,
          details: []
        });
      }
    } catch {
      setImportResult({
        type: 'error',
        title: 'Import Hatası',
        summary: t.errorConnection,
        details: []
      });
    } finally {
      setImportingExcel(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.universityId && formData.name) {
      const progData: Program = {
        id: editingId || Date.now().toString(),
        universityId: formData.universityId,
        name: formData.name,
        nameInArabic: formData.nameInArabic || undefined,
        degree: formData.degree as any,
        language: formData.language as any,
        years: formData.years || 4,
        fee: formData.fee || 0,
        feeBeforeDiscount: formData.feeBeforeDiscount,
        deposit: formData.deposit,
        cashPrice: formData.cashPrice,
        currency: formData.currency || 'USD',
        periodId: formData.periodId || undefined,
        description: formData.description,
        isOpen: formData.isOpen !== false
      };

      if (modalMode === 'edit' && onEditProgram) {
        onEditProgram(progData);
        setSelectedProgramForView(progData);
      } else {
        onAddProgram(progData);
      }
      closeFormModal();
    }
  };

  const openAddModal = () => {
    if (!canManage) return;
    setSelectedProgramForView(null);
    setModalMode('add');
    setEditingId(null);
    setFormData({
      name: '', nameInArabic: '', universityId: '', degree: 'Bachelor', language: 'English',
      years: 4, fee: 0, feeBeforeDiscount: undefined, deposit: undefined, cashPrice: undefined, currency: 'USD', periodId: '', description: '', isOpen: true
    });
    setModalOpen(true);
  };

  const openEditModal = (prog: Program) => {
    if (!canManage) return;
    setSelectedProgramForView(null);
    setModalMode('edit');
    setEditingId(prog.id);
    setFormData({ ...prog });
    setModalOpen(true);
  };

  const closeFormModal = () => {
    const shouldReturnToDetail = modalMode === 'edit';
    const editedProgram = shouldReturnToDetail && editingId
      ? programs.find(p => p.id === editingId) || null
      : null;

    setModalOpen(false);
    setEditingId(null);
    setModalMode('add');
    setFormData({
      name: '', nameInArabic: '', universityId: '', degree: 'Bachelor', language: 'English',
      years: 4, fee: 0, feeBeforeDiscount: undefined, deposit: undefined, cashPrice: undefined, currency: 'USD', periodId: '', description: '', isOpen: true
    });
    if (shouldReturnToDetail) {
      setSelectedProgramForView(editedProgram);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedProgramIds.size === 0) return;
    const blocked = getBlockedDeleteProgramIds(selectedProgramIds);
    if (blocked.length > 0) {
      openBulkDeleteConfirm();
      return;
    }
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedProgramIds);
      const remaining = new Set(ids);
      for (const id of ids) {
        const ok = await Promise.resolve(onDeleteProgram(id));
        if (!ok) break;
        remaining.delete(id);
      }
      setSelectedProgramIds(remaining);
      if (remaining.size === 0) {
        setConfirmBulkDelete(false);
        if (selectedProgramForView && ids.includes(selectedProgramForView.id)) {
          setSelectedProgramForView(null);
        }
      }
    } finally {
      setBulkDeleting(false);
    }
  };

  const programToArchive = programs.find(p => p.id === confirmArchiveId);

  const programMassEditFields = useMemo((): MassEditFieldDef[] => {
    if (!canManage) return [];
    return [
      { key: 'periodId', label: t.period, type: 'select', nullable: true, options: periods.map(p => ({ value: p.id, label: p.name })) },
      { key: 'universityId', label: t.universities, type: 'select', options: universities.map(u => ({ value: u.id, label: u.name })) },
      { key: 'degree', label: t.programDegree, type: 'select', options: DEGREES.map(d => ({ value: d, label: translateDegree(d) })) },
      { key: 'language', label: t.programLanguage, type: 'select', options: LANGUAGES.map(l => ({ value: l, label: l })) },
      { key: 'currency', label: t.currency, type: 'select', options: [{ value: 'USD', label: 'USD' }, { value: 'TRY', label: 'TRY' }, { value: 'EUR', label: 'EUR' }] },
      { key: 'fee', label: t.programFee, type: 'number' },
      { key: 'feeBeforeDiscount', label: t.feeBeforeDiscount, type: 'number', nullable: true },
      { key: 'deposit', label: t.deposit, type: 'number', nullable: true },
      { key: 'cashPrice', label: t.cashPrice, type: 'number', nullable: true },
      { key: 'years', label: t.programYears, type: 'number' },
      { key: 'isOpen', label: t.programAvailability, type: 'boolean' }
    ];
  }, [canManage, periods, universities, t, translateDegree]);

  const handleProgramMassEditApply = async (fieldKey: string, value: unknown) => {
    if (!onEditProgram || selectedProgramIds.size === 0) return;
    setMassEditApplying(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const id of Array.from(selectedProgramIds)) {
        const program = programs.find(p => p.id === id);
        if (!program) {
          fail++;
          continue;
        }
        const updated = { ...program, [fieldKey]: value } as Program;
        const success = await Promise.resolve(onEditProgram(updated, { silent: true }));
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

  const handleArchiveToggle = async () => {
    if (!confirmArchiveId || !onEditProgram) return;
    const program = programs.find((p) => p.id === confirmArchiveId);
    if (!program) return;
    const nextArchived = !program.isArchived;
    await Promise.resolve(onEditProgram({ ...program, isArchived: nextArchived }));
    setSelectedProgramIds((prev) => {
      const next = new Set(prev);
      next.delete(confirmArchiveId);
      return next;
    });
    setConfirmArchiveId(null);
  };

  return (
    <div className="space-y-6">
      {/* Full-screen view */}
      {canManage && selectedProgramForView && (
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
            {canManage && (
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
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{t.programAvailability}</p>
                    <p className="text-gray-900">
                      {selectedProgramForView.isOpen === false ? t.programStatusClosed : t.programStatusOpen}
                    </p>
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
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{t.cashPrice}</p>
                    <p className="text-gray-900">{selectedProgramForView.cashPrice != null ? `${selectedProgramForView.currency || 'USD'} ${selectedProgramForView.cashPrice.toLocaleString()}` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">{t.deposit}</p>
                    <p className="text-gray-900">{selectedProgramForView.deposit != null ? `${selectedProgramForView.currency || 'USD'} ${selectedProgramForView.deposit.toLocaleString()}` : '—'}</p>
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
      {canManage && isModalOpen && (
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
            <div className="max-w-6xl mx-auto">
              <section className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
                  <div className="sm:col-span-2 xl:col-span-1">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.programAvailability}</label>
                    <select
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.isOpen === false ? 'closed' : 'open'}
                      onChange={e => setFormData({ ...formData, isOpen: e.target.value === 'open' })}
                    >
                      <option value="open">{t.programStatusOpen}</option>
                      <option value="closed">{t.programStatusClosed}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.programDegree}</label>
                    <select
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={(DEGREES as readonly string[]).includes(formData.degree || '') ? formData.degree : 'Bachelor'}
                      onChange={e => setFormData({ ...formData, degree: e.target.value as Program['degree'] })}
                    >
                      {DEGREES.map((d) => (
                        <option key={d} value={d}>{translateDegree(d)}</option>
                      ))}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.cashPrice}</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.cashPrice ?? ''}
                      onChange={e => setFormData({ ...formData, cashPrice: e.target.value === '' ? undefined : parseInt(e.target.value) })}
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
                  <div className="sm:col-span-2 xl:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.programDescription}</label>
                    <textarea
                      rows={4}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.description || ''}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
              </section>
            </div>
          </form>
        </div>
      )}

      {/* Main: list only when not viewing and not in form */}
      {!selectedProgramForView && !isModalOpen && (
        <div dir={layoutDir}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t.programsTitle}</h2>
          <p className="text-gray-500">{t.programsTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportProgramsExcel}
              style={{ display: 'none' }}
            />
          )}
          <div className="relative" ref={columnsRef}>
            <button
              type="button"
              onClick={() => setColumnsOpen(prev => !prev)}
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter size={16} />
              <span>{t.columns}</span>
            </button>
            {columnsOpen && (
              <div className={`absolute ${isLtr ? 'right-0' : 'left-0'} mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-30`}>
                {programColumnOptions.map(col => (
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
            onClick={handlePrintPDF}
            disabled={selectedProgramIds.size === 0}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer size={20} />
            <span>{t.printResult}</span>
            {selectedProgramIds.size > 0 && (
              <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{selectedProgramIds.size}</span>
            )}
          </button>
          {canManage && archiveView === 'active' && (
            <>
              <button
                type="button"
                onClick={exportProgramsToExcel}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <span>Export Excel</span>
              </button>
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                disabled={importingExcel}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                <span>{importingExcel ? t.loading : 'Import Excel'}</span>
              </button>
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                <span>{t.addProgram}</span>
              </button>
            </>
          )}
          {canManage && archiveView === 'archived' && (
            <button
              type="button"
              onClick={exportProgramsToExcel}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <span>Export Excel</span>
            </button>
          )}
        </div>
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
          {canManage && (
            <>
              <div className="h-6 w-px bg-gray-200 hidden sm:block" />
              <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setArchiveView('active')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${archiveView === 'active' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {t.activePrograms}
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveView('archived')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${archiveView === 'archived' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {t.archivedPrograms}
                </button>
              </div>
            </>
          )}
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
          <SavedQuickFilters
              pageKey="programs"
              userId={currentUser?.id}
              className="ml-1"
              getFilters={() => ({
                searchProgramName,
                filterPeriodIds,
                filterUniversityIds,
                filterDegrees,
                filterLanguages,
                filterFeeMin,
                filterFeeMax
              })}
              onApply={(f) => {
                setSearchProgramName(typeof f.searchProgramName === 'string' ? f.searchProgramName : '');
                setFilterPeriodIds(Array.isArray(f.filterPeriodIds) ? f.filterPeriodIds as string[] : []);
                setFilterUniversityIds(Array.isArray(f.filterUniversityIds) ? f.filterUniversityIds as string[] : []);
                setFilterDegrees(Array.isArray(f.filterDegrees) ? f.filterDegrees as string[] : []);
                setFilterLanguages(Array.isArray(f.filterLanguages) ? f.filterLanguages as string[] : []);
                setFilterFeeMin(typeof f.filterFeeMin === 'string' ? f.filterFeeMin : '');
                setFilterFeeMax(typeof f.filterFeeMax === 'string' ? f.filterFeeMax : '');
              }}
            />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.programPeriod}</label>
            <SearchableMultiSelect
              options={periods.map(p => ({ value: p.id, label: p.name }))}
              selected={filterPeriodIds}
              onChange={setFilterPeriodIds}
              placeholder={t.filterAll}
              searchPlaceholder={t.search}
              noResultsText={t.searchNoResults}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.universities}</label>
            <SearchableMultiSelect
              options={universities.map(u => ({ value: u.id, label: u.name }))}
              selected={filterUniversityIds}
              onChange={setFilterUniversityIds}
              placeholder={t.filterAll}
              searchPlaceholder={t.search}
              noResultsText={t.searchNoResults}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.programDegree}</label>
            <SearchableMultiSelect
              options={DEGREES.map(d => ({ value: d, label: translateDegree(d) }))}
              selected={filterDegrees}
              onChange={setFilterDegrees}
              placeholder={t.filterAll}
              searchPlaceholder={t.search}
              noResultsText={t.searchNoResults}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.programLanguage}</label>
            <SearchableMultiSelect
              options={LANGUAGES.map(lang => ({ value: lang, label: lang }))}
              selected={filterLanguages}
              onChange={setFilterLanguages}
              placeholder={t.filterAll}
              searchPlaceholder={t.search}
              noResultsText={t.searchNoResults}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.programFee} (Min - Max)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={0}
                value={filterFeeMin}
                onChange={e => setFilterFeeMin(e.target.value)}
                placeholder="Min"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <input
                type="number"
                min={0}
                value={filterFeeMax}
                onChange={e => setFilterFeeMax(e.target.value)}
                placeholder="Max"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {programPaginationBar && <div className="border-b">{programPaginationBar}</div>}
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${tableAlign}`}>
            <thead className="bg-gray-50 text-gray-900 border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 w-12 text-center">
                  <input
                    ref={selectAllCheckboxRef}
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                    disabled={paginatedPrograms.length === 0}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    aria-label={t.filterAll}
                  />
                </th>
                {visibleTreeColumns.includes('name') && <SortTh colKey="name" label={t.programName} />}
                {visibleTreeColumns.includes('university') && <SortTh colKey="university" label={t.universities} />}
                {visibleTreeColumns.includes('degree') && <SortTh colKey="degree" label={t.programDegree} />}
                {visibleTreeColumns.includes('language') && <SortTh colKey="language" label={t.programLanguage} />}
                {visibleTreeColumns.includes('fee') && <SortTh colKey="fee" label={t.programFee} />}
                {visibleTreeColumns.includes('cashPrice') && <SortTh colKey="cashPrice" label={t.cashPrice} />}
                {visibleTreeColumns.includes('deposit') && <SortTh colKey="deposit" label={t.deposit} />}
                {!isAgent && visibleTreeColumns.includes('isOpen') && <SortTh colKey="isOpen" label={t.programAvailability} className="text-center" />}
                {canManage && <th className="px-6 py-4 font-bold text-center whitespace-nowrap">{t.edit}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedPrograms.map((program) => (
                <tr
                  key={program.id}
                  onClick={canManage && archiveView === 'active' ? () => openEditModal(program) : undefined}
                  className={`hover:bg-gray-50 transition-colors group ${canManage && archiveView === 'active' ? 'cursor-pointer' : ''} ${selectedProgramIds.has(program.id) ? 'bg-blue-50/40' : ''}`}
                >
                  <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedProgramIds.has(program.id)}
                      onChange={() => toggleProgramSelection(program.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      aria-label={program.name}
                    />
                  </td>
                  {visibleTreeColumns.includes('name') && <td className="px-6 py-4 font-medium text-gray-900">{program.name}</td>}
                  {visibleTreeColumns.includes('university') && <td className="px-6 py-4 text-gray-900">{getUniversityName(program.universityId)}</td>}
                  {visibleTreeColumns.includes('degree') && (
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">
                        {translateDegree(program.degree)}
                      </span>
                    </td>
                  )}
                  {visibleTreeColumns.includes('language') && <td className="px-6 py-4 text-gray-900">{program.language}</td>}
                  {visibleTreeColumns.includes('fee') && (
                    <td className="px-6 py-4 font-bold text-gray-900 tabular-nums" dir="ltr">
                      {program.currency ? `${program.currency} ${program.fee.toLocaleString()}` : `$${program.fee.toLocaleString()}`}
                    </td>
                  )}
                  {visibleTreeColumns.includes('cashPrice') && (
                    <td className="px-6 py-4 text-gray-900 tabular-nums" dir="ltr">
                      {program.cashPrice != null ? (program.currency ? `${program.currency} ${program.cashPrice.toLocaleString()}` : program.cashPrice.toLocaleString()) : '—'}
                    </td>
                  )}
                  {visibleTreeColumns.includes('deposit') && (
                    <td className="px-6 py-4 text-gray-900 tabular-nums" dir="ltr">
                      {program.deposit != null ? (program.currency ? `${program.currency} ${program.deposit.toLocaleString()}` : program.deposit.toLocaleString()) : '—'}
                    </td>
                  )}
                  {!isAgent && visibleTreeColumns.includes('isOpen') && (
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border-2 ${program.isOpen === false ? 'bg-gray-200 text-gray-800 border-gray-400' : 'bg-emerald-400 text-emerald-950 border-emerald-600'}`}>
                        {program.isOpen === false ? t.programStatusClosed : t.programStatusOpen}
                      </span>
                    </td>
                  )}
                  {canManage && (
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      {archiveView === 'active' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(program);
                        }}
                        title={t.edit}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      )}
                      {archiveView === 'active' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmArchiveId(program.id);
                        }}
                        title={t.archive}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-800 transition-colors"
                      >
                        <Archive size={15} />
                      </button>
                      ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmArchiveId(program.id);
                        }}
                        title={t.unarchive}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
                      >
                        <ArchiveRestore size={15} />
                      </button>
                      )}
                    </div>
                  </td>
                  )}
                </tr>
              ))}
              {sortedPrograms.length === 0 && (
                <tr>
                  <td colSpan={visibleTreeColSpan} className="px-6 py-8 text-center text-gray-400">
                    {hasActiveFilters ? t.searchNoResults : t.noPrograms}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {programPaginationBar && <div className="border-t">{programPaginationBar}</div>}
      </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmBulkDelete && selectedProgramIds.size > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">{t.confirmDelete}</h3>
            </div>
            <p className="text-gray-700 text-sm font-medium mb-2">
              {selectedProgramIds.size} {t.programsTitle.toLowerCase()}
            </p>
            <p className="text-amber-700 text-xs mb-6">{t.bulkDeleteConfirmPrograms}</p>
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
        selectedCount={selectedProgramIds.size}
        fields={programMassEditFields}
        onApply={handleProgramMassEditApply}
        applying={massEditApplying}
      />

      {confirmArchiveId && programToArchive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${programToArchive.isArchived ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                {programToArchive.isArchived ? (
                  <ArchiveRestore size={20} className="text-emerald-600" />
                ) : (
                  <Archive size={20} className="text-amber-600" />
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-800">
                {programToArchive.isArchived ? t.confirmUnarchive : t.confirmArchive}
              </h3>
            </div>
            <p className="text-gray-700 text-sm font-medium mb-1">{programToArchive.name}</p>
            <p className="text-gray-400 text-xs mb-6">
              {getUniversityName(programToArchive.universityId)} — {translateDegree(programToArchive.degree)}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmArchiveId(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleArchiveToggle}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${programToArchive.isArchived ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}
              >
                {programToArchive.isArchived ? t.unarchive : t.archive}
              </button>
            </div>
          </div>
        </div>
      )}

      {importResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className={`text-lg font-bold ${importResult.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
                {importResult.title}
              </h3>
              <button
                type="button"
                onClick={() => setImportResult(null)}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-700 mb-4">{importResult.summary}</p>
            {importResult.details.length > 0 && (
              <div className="max-h-72 overflow-auto border border-gray-200 rounded-lg bg-gray-50 p-3">
                <ul className="space-y-1 text-sm text-gray-700">
                  {importResult.details.map((line, idx) => (
                    <li key={`${line}-${idx}`}>• {line}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setImportResult(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};