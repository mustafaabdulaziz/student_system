import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AgentCommissionListRow, University, UniversityDegreeCommission, User } from '../types';
import { ChevronDown, ChevronUp, Columns3, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { SearchableSelect } from './SearchableSelect';
import { SearchableMultiSelect } from './SearchableMultiSelect';
import { amountRangeConflictMessage, formatAmountBound, parseAmountBounds } from '../utils/amountRange';

type CommissionSortKey =
  | 'userName'
  | 'universityName'
  | 'degree'
  | 'uniCommissionKind'
  | 'uniCommissionValue'
  | 'uniBonusMin'
  | 'uniBonusMax'
  | 'uniAmountFrom'
  | 'uniAmountTo'
  | 'commissionKind'
  | 'commissionValue'
  | 'amountFrom'
  | 'amountTo'
  | 'agencyBonus'
  | 'depositSupport';

const COMMISSION_COLUMNS: { key: CommissionSortKey; label: string }[] = [
  { key: 'userName', label: 'Acente' },
  { key: 'universityName', label: 'Üniversite' },
  { key: 'degree', label: 'Derece' },
  { key: 'uniCommissionKind', label: 'Üni. komisyon türü' },
  { key: 'uniCommissionValue', label: 'Üni. tutar / oran' },
  { key: 'uniBonusMin', label: 'Üni. bonus min' },
  { key: 'uniBonusMax', label: 'Üni. bonus max' },
  { key: 'uniAmountFrom', label: 'Üni. başlangıç' },
  { key: 'uniAmountTo', label: 'Üni. bitiş' },
  { key: 'commissionKind', label: 'Komisyon Tipi' },
  { key: 'commissionValue', label: 'Tutar / Oran' },
  { key: 'amountFrom', label: 'Başlangıç tutarı' },
  { key: 'amountTo', label: 'Bitiş tutarı' },
  { key: 'agencyBonus', label: 'Acente Bonus' },
  { key: 'depositSupport', label: 'Depozito Desteği' }
];

const COMMISSION_COLUMN_KEYS = COMMISSION_COLUMNS.map((column) => column.key);
const COMMISSION_COLUMNS_STORAGE_KEY = 'agentCommissions.visibleColumns';

function sameAmountBounds(
  leftFrom?: number | null,
  leftTo?: number | null,
  rightFrom?: number | null,
  rightTo?: number | null
) {
  const leftOpen = leftFrom == null || leftTo == null;
  const rightOpen = rightFrom == null || rightTo == null;
  if (leftOpen && rightOpen) return true;
  if (leftOpen || rightOpen) return false;
  return leftFrom === rightFrom && leftTo === rightTo;
}

function relatedDegreeCommission(
  universities: University[],
  universityId: string,
  degree?: string,
  amountFrom?: number | null,
  amountTo?: number | null
): UniversityDegreeCommission | null {
  const rows = (universities.find((uni) => uni.id === universityId)?.degreeCommissions || [])
    .filter((row) => (row.degree || '') === (degree || ''));
  if (rows.length === 0) return null;
  const exact = rows.find((row) => sameAmountBounds(amountFrom, amountTo, row.amountFrom, row.amountTo));
  if (exact) return exact;
  if (rows.length === 1) return rows[0];
  if (amountFrom == null || amountTo == null) return null;
  const containing = rows.filter((row) => {
    if (row.amountFrom == null || row.amountTo == null) return true;
    return row.amountFrom <= amountFrom && amountTo <= row.amountTo;
  });
  const bounded = containing.filter((row) => row.amountFrom != null && row.amountTo != null);
  const pool = bounded.length > 0 ? bounded : containing;
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => {
    const aSpan = (a.amountTo ?? Number.POSITIVE_INFINITY) - (a.amountFrom ?? 0);
    const bSpan = (b.amountTo ?? Number.POSITIVE_INFINITY) - (b.amountFrom ?? 0);
    return aSpan - bSpan;
  })[0];
}

type FormState = {
  userId: string;
  universityId: string;
  degree: '' | 'Diploma' | 'Bachelor' | 'Master' | 'PhD';
  commissionKind: 'rate' | 'amount' | '';
  commissionValue: string;
  agencyBonus: string;
  depositSupport: string;
  amountFrom: string;
  amountTo: string;
};

const EMPTY_FORM: FormState = {
  userId: '',
  universityId: '',
  degree: '',
  commissionKind: '',
  commissionValue: '',
  agencyBonus: '',
  depositSupport: '',
  amountFrom: '',
  amountTo: ''
};

interface AgentCommissionsPageProps {
  rows: AgentCommissionListRow[];
  users: User[];
  universities: University[];
  onAdd: (payload: {
    userId: string;
    universityId: string;
    degree?: string;
    commissionKind: 'rate' | 'amount';
    commissionValue: number;
    agencyBonus?: number | null;
    depositSupport?: number | null;
    amountFrom?: number | null;
    amountTo?: number | null;
  }) => Promise<boolean>;
  onEdit: (id: string, payload: {
    userId: string;
    universityId: string;
    degree?: string;
    commissionKind: 'rate' | 'amount';
    commissionValue: number;
    agencyBonus?: number | null;
    depositSupport?: number | null;
    amountFrom?: number | null;
    amountTo?: number | null;
  }) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onAddDefault: (payload: {
    universityId: string;
    degree: '' | 'Diploma' | 'Bachelor' | 'Master' | 'PhD';
    commissionKind: 'rate' | 'amount';
    commissionValue: number;
    agencyBonus?: number | null;
    depositSupport?: number | null;
    amountFrom?: number | null;
    amountTo?: number | null;
  }) => Promise<boolean>;
}

export const AgentCommissionsPage: React.FC<AgentCommissionsPageProps> = ({
  rows,
  users,
  universities,
  onAdd,
  onEdit,
  onDelete,
  onAddDefault
}) => {
  const { t, translateDegree } = useTranslation();
  const [filterAgents, setFilterAgents] = useState<string[]>([]);
  const [filterUniversities, setFilterUniversities] = useState<string[]>([]);
  const [filterDegrees, setFilterDegrees] = useState<string[]>([]);
  const [filterKinds, setFilterKinds] = useState<string[]>([]);
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    commissionKind: '' as '' | 'rate' | 'amount',
    commissionValue: '',
    agencyBonus: '',
    depositSupport: '',
    amountFrom: '',
    amountTo: ''
  });
  const [defaultOpen, setDefaultOpen] = useState(false);
  const [defaultSaving, setDefaultSaving] = useState(false);
  const [sortBy, setSortBy] = useState<CommissionSortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<CommissionSortKey[]>(COMMISSION_COLUMN_KEYS);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);
  const [defaultForm, setDefaultForm] = useState({
    universityId: '',
    degree: '' as '' | 'Diploma' | 'Bachelor' | 'Master' | 'PhD',
    commissionKind: '' as '' | 'rate' | 'amount',
    commissionValue: '',
    agencyBonus: '',
    depositSupport: '',
    amountFrom: '',
    amountTo: ''
  });

  const agentUsers = useMemo(
    () => users.filter(u => (u.role || '').toString().toLowerCase() === 'agent' && u.active !== false)
      .sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [users]
  );

  const agentOptions = useMemo(
    () => agentUsers.map(u => ({ value: u.id, label: `${u.name}${u.email ? ` (${u.email})` : ''}` })),
    [agentUsers]
  );

  const universityOptions = useMemo(
    () => [...universities]
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
      .map(u => ({ value: u.id, label: u.name })),
    [universities]
  );

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      if (filterAgents.length > 0 && !filterAgents.includes(row.userId)) return false;
      if (filterUniversities.length > 0 && !filterUniversities.includes(row.universityId)) return false;
      if (filterDegrees.length > 0) {
        const degree = row.degree || '';
        if (!filterDegrees.includes(degree)) return false;
      }
      if (filterKinds.length > 0 && !filterKinds.includes(row.commissionKind)) return false;
      return true;
    });
  }, [rows, filterAgents, filterUniversities, filterDegrees, filterKinds]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormMode('add');
  };

  const openEdit = (row: AgentCommissionListRow) => {
    setEditingId(row.id);
    setForm({
      userId: row.userId,
      universityId: row.universityId,
      degree: (row.degree || '') as FormState['degree'],
      commissionKind: row.commissionKind,
      commissionValue: String(row.commissionValue ?? ''),
      agencyBonus: row.agencyBonus != null ? String(row.agencyBonus) : '',
      depositSupport: row.depositSupport != null ? String(row.depositSupport) : '',
      amountFrom: row.amountFrom != null ? String(row.amountFrom) : '',
      amountTo: row.amountTo != null ? String(row.amountTo) : ''
    });
    setFormMode('edit');
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const parsePayload = () => {
    if (!form.userId || !form.universityId || !form.commissionKind || form.commissionValue.trim() === '') {
      alert('Acente, üniversite, komisyon tipi ve tutar/oran zorunludur.');
      return null;
    }
    const commissionValue = Number(form.commissionValue);
    if (!Number.isFinite(commissionValue)) {
      alert('Tutar/oran geçerli bir sayı olmalıdır.');
      return null;
    }
    let agencyBonus: number | null = null;
    if (form.agencyBonus.trim() !== '') {
      agencyBonus = Number(form.agencyBonus);
      if (!Number.isFinite(agencyBonus)) {
        alert('Acente bonus geçerli bir sayı olmalıdır.');
        return null;
      }
    }
    let depositSupport: number | null = null;
    if (form.depositSupport.trim() !== '') {
      depositSupport = Number(form.depositSupport);
      if (!Number.isFinite(depositSupport)) {
        alert('Depozito desteği geçerli bir sayı olmalıdır.');
        return null;
      }
    }
    const bounds = parseAmountBounds(form.amountFrom, form.amountTo);
    if (bounds.error) {
      alert(bounds.error);
      return null;
    }
    const degreeKey = form.degree || '';
    const overlap = amountRangeConflictMessage(
      [
        ...rows
          .filter(row => row.id !== editingId && row.userId === form.userId && row.universityId === form.universityId && (row.degree || '') === degreeKey)
          .map(row => ({ key: degreeKey, from: row.amountFrom, to: row.amountTo })),
        { key: degreeKey, from: bounds.from, to: bounds.to }
      ],
      'Aynı acente, üniversite ve derece için tutar aralıkları çakışamaz.'
    );
    if (overlap) {
      alert(overlap);
      return null;
    }
    return {
      userId: form.userId,
      universityId: form.universityId,
      degree: form.degree || undefined,
      commissionKind: form.commissionKind as 'rate' | 'amount',
      commissionValue,
      agencyBonus,
      depositSupport,
      amountFrom: bounds.from,
      amountTo: bounds.to
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = parsePayload();
    if (!payload) return;
    setSaving(true);
    try {
      const ok = formMode === 'edit' && editingId
        ? await onEdit(editingId, payload)
        : await onAdd(payload);
      if (ok) closeForm();
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COMMISSION_COLUMNS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter((key: string): key is CommissionSortKey =>
        COMMISSION_COLUMN_KEYS.includes(key as CommissionSortKey)
      );
      if (valid.length > 0) setVisibleColumns(valid);
    } catch {
      // ignore invalid storage
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(COMMISSION_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    if (!columnsOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (columnsRef.current && !columnsRef.current.contains(event.target as Node)) {
        setColumnsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [columnsOpen]);

  const toggleColumn = (key: CommissionSortKey) => {
    setVisibleColumns((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  };

  const shownColumns = COMMISSION_COLUMNS.filter((column) => visibleColumns.includes(column.key));

  const kindLabel = (kind: string) => (kind === 'rate' ? 'Oran (%)' : 'Sabit Tutar');

  const degreeLabel = (degree?: string) => (degree ? translateDegree(degree) : 'Tümü / Seçilmedi');

  const displayRows = useMemo(() => {
    if (!sortBy) return filteredRows;
    const dir = sortDir === 'asc' ? 1 : -1;
    const textValue = (row: AgentCommissionListRow) => {
      if (sortBy === 'userName') return row.userName || '';
      if (sortBy === 'universityName') return row.universityName || '';
      if (sortBy === 'degree') return degreeLabel(row.degree);
      if (sortBy === 'commissionKind' || sortBy === 'uniCommissionKind') {
        const source = sortBy === 'uniCommissionKind'
          ? relatedDegreeCommission(universities, row.universityId, row.degree, row.amountFrom, row.amountTo)?.commissionKind
          : row.commissionKind;
        return source ? kindLabel(source) : '';
      }
      return '';
    };
    const numberValue = (row: AgentCommissionListRow) => {
      const related = relatedDegreeCommission(universities, row.universityId, row.degree, row.amountFrom, row.amountTo);
      if (sortBy === 'commissionValue') return Number(row.commissionValue);
      if (sortBy === 'amountFrom') return row.amountFrom == null ? null : Number(row.amountFrom);
      if (sortBy === 'amountTo') return row.amountTo == null ? null : Number(row.amountTo);
      if (sortBy === 'agencyBonus') return row.agencyBonus == null ? null : Number(row.agencyBonus);
      if (sortBy === 'depositSupport') return row.depositSupport == null ? null : Number(row.depositSupport);
      if (sortBy === 'uniCommissionValue') return related?.commissionValue == null ? null : Number(related.commissionValue);
      if (sortBy === 'uniBonusMin') return related?.bonusMin == null ? null : Number(related.bonusMin);
      if (sortBy === 'uniBonusMax') return related?.bonusMax == null ? null : Number(related.bonusMax);
      if (sortBy === 'uniAmountFrom') return related?.amountFrom == null ? null : Number(related.amountFrom);
      if (sortBy === 'uniAmountTo') return related?.amountTo == null ? null : Number(related.amountTo);
      return null;
    };
    const numeric = sortBy === 'commissionValue' || sortBy === 'amountFrom' || sortBy === 'amountTo' || sortBy === 'agencyBonus' || sortBy === 'depositSupport'
      || sortBy === 'uniCommissionValue' || sortBy === 'uniBonusMin' || sortBy === 'uniBonusMax' || sortBy === 'uniAmountFrom' || sortBy === 'uniAmountTo';
    return [...filteredRows].sort((a, b) => {
      if (numeric) {
        const va = numberValue(a);
        const vb = numberValue(b);
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return (va - vb) * dir;
      }
      return textValue(a).localeCompare(textValue(b), 'tr', { numeric: true, sensitivity: 'base' }) * dir;
    });
  }, [filteredRows, sortBy, sortDir, translateDegree, universities]);

  const toggleSort = (key: CommissionSortKey) => {
    if (sortBy === key) {
      setSortDir(current => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(key);
    const numericKeys: CommissionSortKey[] = [
      'commissionValue', 'amountFrom', 'amountTo', 'agencyBonus', 'depositSupport',
      'uniCommissionValue', 'uniBonusMin', 'uniBonusMax', 'uniAmountFrom', 'uniAmountTo'
    ];
    setSortDir(numericKeys.includes(key) ? 'desc' : 'asc');
  };

  const SortTh = ({ colKey, label }: { colKey: CommissionSortKey; label: string }) => (
    <th
      className="px-4 py-3 text-left cursor-pointer select-none hover:bg-gray-100"
      onClick={() => toggleSort(colKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortBy === colKey
          ? (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)
          : <ChevronDown size={14} className="opacity-30" />}
      </span>
    </th>
  );

  const selectedRows = useMemo(
    () => rows.filter(row => selectedIds.includes(row.id)),
    [rows, selectedIds]
  );
  const allFilteredSelected = filteredRows.length > 0 && filteredRows.every(row => selectedIds.includes(row.id));

  const toggleRow = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  };

  const toggleAllFiltered = () => {
    setSelectedIds(prev => {
      if (filteredRows.every(row => prev.includes(row.id))) {
        const visible = new Set(filteredRows.map(row => row.id));
        return prev.filter(id => !visible.has(id));
      }
      const next = new Set(prev);
      filteredRows.forEach(row => next.add(row.id));
      return [...next];
    });
  };

  const defaultDegreeOptions = useMemo(() => ([
    { value: '' as const, label: 'Tümü / Seçilmedi' },
    { value: 'Diploma' as const, label: translateDegree('Diploma') },
    { value: 'Bachelor' as const, label: translateDegree('Bachelor') },
    { value: 'Master' as const, label: translateDegree('Master') },
    { value: 'PhD' as const, label: translateDegree('PhD') }
  ]), [translateDegree]);

  const openDefault = () => {
    setDefaultForm({
      universityId: '',
      degree: '',
      commissionKind: '',
      commissionValue: '',
      agencyBonus: '',
      depositSupport: '',
      amountFrom: '',
      amountTo: ''
    });
    setDefaultOpen(true);
  };

  const handleDefaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defaultForm.universityId || !defaultForm.commissionKind || defaultForm.commissionValue.trim() === '') {
      alert('Üniversite, komisyon tipi ve tutar/oran zorunludur.');
      return;
    }
    const commissionValue = Number(defaultForm.commissionValue);
    if (!Number.isFinite(commissionValue)) {
      alert('Tutar/oran geçerli bir sayı olmalıdır.');
      return;
    }
    let agencyBonus: number | null = null;
    if (defaultForm.agencyBonus.trim() !== '') {
      agencyBonus = Number(defaultForm.agencyBonus);
      if (!Number.isFinite(agencyBonus)) {
        alert('Acente bonus geçerli bir sayı olmalıdır.');
        return;
      }
    }
    let depositSupport: number | null = null;
    if (defaultForm.depositSupport.trim() !== '') {
      depositSupport = Number(defaultForm.depositSupport);
      if (!Number.isFinite(depositSupport)) {
        alert('Depozito desteği geçerli bir sayı olmalıdır.');
        return;
      }
    }
    const bounds = parseAmountBounds(defaultForm.amountFrom, defaultForm.amountTo);
    if (bounds.error) {
      alert(bounds.error);
      return;
    }
    const existing = universities.find(u => u.id === defaultForm.universityId)?.defaultAgencyCommissions || [];
    const overlap = amountRangeConflictMessage(
      [
        ...existing
          .filter(row => (row.degree || '') === defaultForm.degree)
          .map(row => ({ key: defaultForm.degree, from: row.amountFrom, to: row.amountTo })),
        { key: defaultForm.degree, from: bounds.from, to: bounds.to }
      ],
      'Aynı derece için varsayılan acente komisyon tutar aralıkları çakışamaz.'
    );
    if (overlap) {
      alert(overlap);
      return;
    }
    setDefaultSaving(true);
    try {
      const ok = await onAddDefault({
        universityId: defaultForm.universityId,
        degree: defaultForm.degree,
        commissionKind: defaultForm.commissionKind,
        commissionValue,
        agencyBonus,
        depositSupport,
        amountFrom: bounds.from,
        amountTo: bounds.to
      });
      if (ok) setDefaultOpen(false);
    } finally {
      setDefaultSaving(false);
    }
  };

  const openBulk = () => {
    if (selectedRows.length === 0) {
      alert('Toplu düzenlemek için listeden satır seçin.');
      return;
    }
    setBulkForm({ commissionKind: '', commissionValue: '', agencyBonus: '', depositSupport: '', amountFrom: '', amountTo: '' });
    setBulkOpen(true);
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const kindFilled = bulkForm.commissionKind !== '';
    const valueFilled = bulkForm.commissionValue.trim() !== '';
    const bonusFilled = bulkForm.agencyBonus.trim() !== '';
    const depositFilled = bulkForm.depositSupport.trim() !== '';
    const fromFilled = bulkForm.amountFrom.trim() !== '';
    const toFilled = bulkForm.amountTo.trim() !== '';
    if (!kindFilled && !valueFilled && !bonusFilled && !depositFilled && !fromFilled && !toFilled) {
      alert('Komisyon tipi, tutar/oran, tutar aralığı, acente bonus veya depozito desteğinden en az birini doldurun.');
      return;
    }
    if (fromFilled !== toFilled) {
      alert('Başlangıç ve bitiş tutarı birlikte girilmelidir.');
      return;
    }
    let commissionValue: number | null = null;
    if (valueFilled) {
      commissionValue = Number(bulkForm.commissionValue);
      if (!Number.isFinite(commissionValue)) {
        alert('Tutar/oran geçerli bir sayı olmalıdır.');
        return;
      }
    }
    let agencyBonus: number | null = null;
    if (bonusFilled) {
      agencyBonus = Number(bulkForm.agencyBonus);
      if (!Number.isFinite(agencyBonus)) {
        alert('Acente bonus geçerli bir sayı olmalıdır.');
        return;
      }
    }
    let depositSupport: number | null = null;
    if (depositFilled) {
      depositSupport = Number(bulkForm.depositSupport);
      if (!Number.isFinite(depositSupport)) {
        alert('Depozito desteği geçerli bir sayı olmalıdır.');
        return;
      }
    }
    const bulkBounds = fromFilled ? parseAmountBounds(bulkForm.amountFrom, bulkForm.amountTo) : null;
    if (bulkBounds?.error) {
      alert(bulkBounds.error);
      return;
    }
    if (bulkBounds) {
      const selectedIdSet = new Set(selectedRows.map(row => row.id));
      const projected = rows.map(row => (
        selectedIdSet.has(row.id)
          ? { ...row, amountFrom: bulkBounds.from, amountTo: bulkBounds.to }
          : row
      ));
      const overlap = amountRangeConflictMessage(
        projected.map(row => ({
          key: `${row.userId}::${row.universityId}::${row.degree || ''}`,
          from: row.amountFrom,
          to: row.amountTo
        })),
        'Aynı acente, üniversite ve derece için tutar aralıkları çakışamaz.'
      );
      if (overlap) {
        alert(overlap);
        return;
      }
    }
    setBulkSaving(true);
    try {
      for (const row of selectedRows) {
        const ok = await onEdit(row.id, {
          userId: row.userId,
          universityId: row.universityId,
          degree: row.degree || undefined,
          commissionKind: kindFilled ? bulkForm.commissionKind as 'rate' | 'amount' : row.commissionKind,
          commissionValue: valueFilled ? commissionValue as number : row.commissionValue,
          agencyBonus: bonusFilled ? agencyBonus : (row.agencyBonus ?? null),
          depositSupport: depositFilled ? depositSupport : (row.depositSupport ?? null),
          amountFrom: bulkBounds ? bulkBounds.from : (row.amountFrom ?? null),
          amountTo: bulkBounds ? bulkBounds.to : (row.amountTo ?? null)
        });
        if (!ok) return;
      }
      setBulkOpen(false);
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Acente Üniversite Komisyonları</h2>
          <p className="text-gray-500">Tüm temsilci komisyonlarını tek listede görüntüle ve düzenle</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openBulk}
            disabled={selectedRows.length === 0}
            className="inline-flex items-center gap-2 bg-white text-gray-800 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Pencil size={18} />
            Toplu düzenle{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setConfirmBulkDelete(true)}
            disabled={selectedRows.length === 0 || bulkDeleting}
            className="inline-flex items-center gap-2 bg-white text-red-700 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={18} />
            Toplu sil{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
          </button>
          <div className="relative" ref={columnsRef}>
            <button
              type="button"
              onClick={() => setColumnsOpen((open) => !open)}
              className="inline-flex items-center gap-2 bg-white text-gray-800 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              <Columns3 size={18} />
              {t.columns}
            </button>
            {columnsOpen && (
              <div className="absolute right-0 z-30 mt-2 w-64 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                {COMMISSION_COLUMNS.map((column) => (
                  <label
                    key={column.key}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(column.key)}
                      onChange={() => toggleColumn(column.key)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{column.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={openDefault}
            className="inline-flex items-center gap-2 bg-white text-gray-800 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            <Plus size={18} />
            Varsayılan ekle
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            Satır Ekle
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SearchableMultiSelect
          selected={filterAgents}
          onChange={setFilterAgents}
          options={agentOptions}
          placeholder={`Acente (${t.filterAll})`}
          searchPlaceholder={t.search}
          noResultsText={t.searchNoResults}
        />
        <SearchableMultiSelect
          selected={filterUniversities}
          onChange={setFilterUniversities}
          options={universityOptions}
          placeholder={`Üniversite (${t.filterAll})`}
          searchPlaceholder={t.search}
          noResultsText={t.searchNoResults}
        />
        <SearchableMultiSelect
          selected={filterDegrees}
          onChange={setFilterDegrees}
          options={[
            { value: '', label: 'Tümü / Seçilmedi' },
            { value: 'Diploma', label: translateDegree('Diploma') },
            { value: 'Bachelor', label: translateDegree('Bachelor') },
            { value: 'Master', label: translateDegree('Master') },
            { value: 'PhD', label: translateDegree('PhD') }
          ]}
          placeholder={`Derece (${t.filterAll})`}
          searchPlaceholder={t.search}
          noResultsText={t.searchNoResults}
        />
        <SearchableMultiSelect
          selected={filterKinds}
          onChange={setFilterKinds}
          options={[
            { value: 'rate', label: 'Oran (%)' },
            { value: 'amount', label: 'Sabit Tutar' }
          ]}
          placeholder={`Komisyon tipi (${t.filterAll})`}
          searchPlaceholder={t.search}
          noResultsText={t.searchNoResults}
        />
      </div>

      {formMode && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">
              {formMode === 'add' ? 'Komisyon Ekle' : 'Komisyon Düzenle'}
            </h3>
            <button type="button" onClick={closeForm} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Acente *</label>
              <SearchableSelect
                value={form.userId}
                onChange={(value) => setForm(prev => ({ ...prev, userId: value }))}
                options={agentOptions}
                placeholder="Temsilci seçin"
                searchPlaceholder={t.search}
                noResultsText={t.searchNoResults}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Üniversite *</label>
              <SearchableSelect
                value={form.universityId}
                onChange={(value) => setForm(prev => ({ ...prev, universityId: value }))}
                options={universityOptions}
                placeholder="Üniversite seçin"
                searchPlaceholder={t.search}
                noResultsText={t.searchNoResults}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Derece</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                value={form.degree}
                onChange={(e) => setForm(prev => ({ ...prev, degree: e.target.value as FormState['degree'] }))}
              >
                <option value="">Tümü / Seçilmedi</option>
                <option value="Diploma">{translateDegree('Diploma')}</option>
                <option value="Bachelor">{translateDegree('Bachelor')}</option>
                <option value="Master">{translateDegree('Master')}</option>
                <option value="PhD">{translateDegree('PhD')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Komisyon Tipi *</label>
              <select
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                value={form.commissionKind}
                onChange={(e) => setForm(prev => ({ ...prev, commissionKind: e.target.value as FormState['commissionKind'] }))}
              >
                <option value="">Seçiniz</option>
                <option value="rate">Oran (%)</option>
                <option value="amount">Sabit Tutar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.commissionKind === 'rate' ? 'Oran (%) *' : 'Tutar / Oran *'}
              </label>
              <input
                required
                type="number"
                step="any"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                value={form.commissionValue}
                onChange={(e) => setForm(prev => ({ ...prev, commissionValue: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç tutarı</label>
              <input
                type="number"
                step="any"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                value={form.amountFrom}
                onChange={(e) => setForm(prev => ({ ...prev, amountFrom: e.target.value }))}
                placeholder="Boş = tüm tutarlar"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş tutarı</label>
              <input
                type="number"
                step="any"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                value={form.amountTo}
                onChange={(e) => setForm(prev => ({ ...prev, amountTo: e.target.value }))}
                placeholder="Boş = tüm tutarlar"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Acente Bonus</label>
              <input
                type="number"
                step="any"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                value={form.agencyBonus}
                onChange={(e) => setForm(prev => ({ ...prev, agencyBonus: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Depozito Desteği</label>
              <input
                type="number"
                step="any"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                value={form.depositSupport}
                onChange={(e) => setForm(prev => ({ ...prev, depositSupport: e.target.value }))}
                placeholder="Sabit tutar"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2">
              <button type="button" onClick={closeForm} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? t.loading : t.save}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-900 font-bold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAllFiltered}
                    aria-label="Görünen satırların tümünü seç"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                {shownColumns.map((column) => (
                  <SortTh key={column.key} colKey={column.key} label={column.label} />
                ))}
                <th className="px-4 py-3 text-center w-28">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayRows.map(row => (
                <tr key={row.id} className={`hover:bg-gray-50 ${selectedIds.includes(row.id) ? 'bg-blue-50/60' : ''}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => toggleRow(row.id)}
                      aria-label={`${row.userName || 'Satır'} seç`}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  {shownColumns.map((column) => {
                    const related = relatedDegreeCommission(
                      universities,
                      row.universityId,
                      row.degree,
                      row.amountFrom,
                      row.amountTo
                    );
                    let text = '—';
                    if (column.key === 'userName') text = row.userName || '—';
                    else if (column.key === 'universityName') text = row.universityName || '—';
                    else if (column.key === 'degree') text = degreeLabel(row.degree);
                    else if (column.key === 'commissionKind') text = kindLabel(row.commissionKind);
                    else if (column.key === 'commissionValue') {
                      text = row.commissionKind === 'rate' ? `${row.commissionValue}%` : String(row.commissionValue);
                    } else if (column.key === 'amountFrom') text = formatAmountBound(row.amountFrom);
                    else if (column.key === 'amountTo') text = formatAmountBound(row.amountTo);
                    else if (column.key === 'agencyBonus') text = row.agencyBonus != null ? String(row.agencyBonus) : '—';
                    else if (column.key === 'depositSupport') text = row.depositSupport != null ? String(row.depositSupport) : '—';
                    else if (column.key === 'uniCommissionKind') text = related ? kindLabel(related.commissionKind) : '—';
                    else if (column.key === 'uniCommissionValue') {
                      text = !related
                        ? '—'
                        : related.commissionKind === 'rate'
                          ? `${related.commissionValue}%`
                          : String(related.commissionValue);
                    } else if (column.key === 'uniBonusMin') text = related?.bonusMin != null ? String(related.bonusMin) : '—';
                    else if (column.key === 'uniBonusMax') text = related?.bonusMax != null ? String(related.bonusMax) : '—';
                    else if (column.key === 'uniAmountFrom') text = formatAmountBound(related?.amountFrom);
                    else if (column.key === 'uniAmountTo') text = formatAmountBound(related?.amountTo);
                    return (
                      <td
                        key={column.key}
                        className={`px-4 py-3 text-gray-900 ${column.key === 'userName' ? 'font-medium' : ''}`}
                      >
                        {text}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                        title={t.edit}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(row.id)}
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                        title={t.delete}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={shownColumns.length + 2} className="px-4 py-8 text-center text-gray-400">
                    Kayıt bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {defaultOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-gray-800">Varsayılan komisyon ekle</h3>
              <button type="button" onClick={() => setDefaultOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Satır seçilen üniversitenin varsayılan acente komisyonlarına eklenir. Aralık boşsa yıllık ödeme hiçbir aralığa girmiyorsa kullanılır ve çakışmayan temsilcilere yazılır.
            </p>
            <form onSubmit={handleDefaultSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Üniversite *</label>
                <SearchableSelect
                  value={defaultForm.universityId}
                  onChange={(value) => setDefaultForm(prev => ({ ...prev, universityId: value }))}
                  options={universityOptions}
                  placeholder="Üniversite seçin"
                  searchPlaceholder={t.search}
                  noResultsText={t.searchNoResults}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Derece *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                  value={defaultForm.degree}
                  onChange={(e) => setDefaultForm(prev => ({ ...prev, degree: e.target.value as typeof prev.degree }))}
                  disabled={!defaultForm.universityId}
                >
                  {defaultDegreeOptions.map(option => (
                    <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Komisyon Tipi *</label>
                <select
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                  value={defaultForm.commissionKind}
                  onChange={(e) => setDefaultForm(prev => ({ ...prev, commissionKind: e.target.value as '' | 'rate' | 'amount' }))}
                >
                  <option value="">Seçiniz</option>
                  <option value="rate">Oran (%)</option>
                  <option value="amount">Sabit Tutar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {defaultForm.commissionKind === 'rate' ? 'Oran (%) *' : 'Tutar / Oran *'}
                </label>
                <input
                  required
                  type="number"
                  step="any"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                  value={defaultForm.commissionValue}
                  onChange={(e) => setDefaultForm(prev => ({ ...prev, commissionValue: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç tutarı</label>
                <input
                  type="number"
                  step="any"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                  value={defaultForm.amountFrom}
                  onChange={(e) => setDefaultForm(prev => ({ ...prev, amountFrom: e.target.value }))}
                  placeholder="Boş = tüm tutarlar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş tutarı</label>
                <input
                  type="number"
                  step="any"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                  value={defaultForm.amountTo}
                  onChange={(e) => setDefaultForm(prev => ({ ...prev, amountTo: e.target.value }))}
                  placeholder="Boş = tüm tutarlar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Acente Bonus</label>
                <input
                  type="number"
                  step="any"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                  value={defaultForm.agencyBonus}
                  onChange={(e) => setDefaultForm(prev => ({ ...prev, agencyBonus: e.target.value }))}
                  placeholder="İsteğe bağlı"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Depozito Desteği</label>
                <input
                  type="number"
                  step="any"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                  value={defaultForm.depositSupport}
                  onChange={(e) => setDefaultForm(prev => ({ ...prev, depositSupport: e.target.value }))}
                  placeholder="İsteğe bağlı"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setDefaultOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={defaultSaving || !defaultForm.universityId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {defaultSaving ? t.loading : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {bulkOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-gray-800">Toplu düzenle</h3>
              <button type="button" onClick={() => setBulkOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {selectedRows.length} seçili satır güncellenir. Boş bırakılan alan değişmez.
            </p>
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Komisyon Tipi</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                  value={bulkForm.commissionKind}
                  onChange={(e) => setBulkForm(prev => ({ ...prev, commissionKind: e.target.value as '' | 'rate' | 'amount' }))}
                >
                  <option value="">Değiştirme</option>
                  <option value="rate">Oran (%)</option>
                  <option value="amount">Sabit Tutar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tutar / Oran</label>
                <input
                  type="number"
                  step="any"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                  value={bulkForm.commissionValue}
                  onChange={(e) => setBulkForm(prev => ({ ...prev, commissionValue: e.target.value }))}
                  placeholder="Boş bırakılırsa değişmez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç tutarı</label>
                <input
                  type="number"
                  step="any"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                  value={bulkForm.amountFrom}
                  onChange={(e) => setBulkForm(prev => ({ ...prev, amountFrom: e.target.value }))}
                  placeholder="Boş bırakılırsa değişmez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş tutarı</label>
                <input
                  type="number"
                  step="any"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                  value={bulkForm.amountTo}
                  onChange={(e) => setBulkForm(prev => ({ ...prev, amountTo: e.target.value }))}
                  placeholder="Boş bırakılırsa değişmez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Acente Bonus</label>
                <input
                  type="number"
                  step="any"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                  value={bulkForm.agencyBonus}
                  onChange={(e) => setBulkForm(prev => ({ ...prev, agencyBonus: e.target.value }))}
                  placeholder="Boş bırakılırsa değişmez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Depozito Desteği</label>
                <input
                  type="number"
                  step="any"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5"
                  value={bulkForm.depositSupport}
                  onChange={(e) => setBulkForm(prev => ({ ...prev, depositSupport: e.target.value }))}
                  placeholder="Boş bırakılırsa değişmez"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setBulkOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={bulkSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {bulkSaving ? t.loading : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmBulkDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Toplu sil</h3>
            <p className="text-gray-600 text-sm mb-4">
              Seçili {selectedRows.length} satır silinsin mi?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmBulkDelete(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={async () => {
                  setBulkDeleting(true);
                  try {
                    for (const row of selectedRows) {
                      const ok = await onDelete(row.id);
                      if (!ok) return;
                    }
                    setSelectedIds([]);
                    setConfirmBulkDelete(false);
                  } finally {
                    setBulkDeleting(false);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {bulkDeleting ? t.loading : t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">{t.confirmDelete}</h3>
            <p className="text-gray-600 text-sm mb-4">
              {rows.find(r => r.id === confirmDeleteId)?.userName} — {rows.find(r => r.id === confirmDeleteId)?.universityName}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">{t.cancel}</button>
              <button
                onClick={async () => {
                  const id = confirmDeleteId;
                  setConfirmDeleteId(null);
                  if (id) await onDelete(id);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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
