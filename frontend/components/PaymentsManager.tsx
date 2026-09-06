import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Pencil, Plus, Trash2, X, Paperclip, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { PaymentSource, PaymentCategory, Period, User, UserRole, OutgoingPaymentListFilters } from '../types';
import {
  OUTGOING_PAYMENT_REASON_LABELS,
  OUTGOING_PAYMENT_REASONS,
  COMPANY_EXPENSE_TYPE_LABELS,
  COMPANY_EXPENSE_TYPES,
  COMMISSION_SHAPE_LABELS,
  COMMISSION_SHAPES,
  formatExpenseTypeDisplay,
  formatOutgoingPaymentDisplay,
  formatCommissionShapeDisplay,
  type OutgoingPaymentReasonCode,
  type CompanyExpenseTypeCode,
  type CommissionShapeCode
} from '../constants/outgoingPayment';
import {
  INCOMING_PAYMENT_TYPES,
  formatIncomingPaymentType,
  type IncomingPaymentTypeCode
} from '../constants/incomingPayment';
import { CreatedAtRangeFilter } from './CreatedAtRangeFilter';
import { SavedQuickFilters } from './SavedQuickFilters';
import { SearchableMultiSelect } from './SearchableMultiSelect';
import { useTranslation } from '../hooks/useTranslation';
import { FILTER_DATE_PRESETS, getDatePreset } from '../utils/datePresets';
import { matchesMultiFilter } from '../utils/multiFilter';

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item !== '');
  if (typeof value === 'string' && value) return [value];
  return [];
}

const EMPTY_PAYMENT_FILTERS = {
  dateFrom: '',
  dateTo: '',
  currencies: [] as string[],
  paymentSources: [] as string[],
  paymentTypes: [] as string[],
  paymentReasons: [] as string[],
  expenseTypes: [] as string[],
  commissionShapes: [] as string[],
  descriptionQuery: '',
  amountMin: '',
  amountMax: '',
  periodIds: [] as string[],
  paymentCategoryIds: [] as string[],
  userIds: [] as string[]
};

type PaymentsMode = 'incoming' | 'outgoing';
type CurrencyCode = 'USD' | 'TRY' | 'EUR';

interface PaymentReceiptFile {
  name: string;
  filename: string;
  url: string;
}

interface PaymentsManagerProps {
  mode: PaymentsMode;
  currentUser: User;
  paymentSources?: PaymentSource[];
  paymentCategories?: PaymentCategory[];
  periods?: Period[];
  initialListFilters?: OutgoingPaymentListFilters | null;
  clearInitialListFilters?: () => void;
}

interface IncomingPaymentRow {
  id: string;
  sequenceNumber: number;
  paymentDate: string;
  paymentAmount: number;
  paymentType: IncomingPaymentTypeCode;
  paymentSource: string;
  paymentSourceId?: string | null;
  paymentCategory?: string | null;
  paymentCategoryId?: string | null;
  currency: CurrencyCode;
  description1?: string;
  description2?: string;
  periodId?: string | null;
  periodName?: string | null;
  receiptFiles?: PaymentReceiptFile[];
}

interface OutgoingPaymentRow {
  id: string;
  sequenceNumber: number;
  paymentDate: string;
  paymentAmount: number;
  currency: CurrencyCode;
  paymentType: 'Cash' | 'Bank';
  paymentReason: string;
  expenseType?: string | null;
  commissionShape?: string | null;
  description1?: string;
  periodId?: string | null;
  periodName?: string | null;
  userId?: string;
  userName?: string;
  userRole?: string;
  receiptFiles?: PaymentReceiptFile[];
}

type Row = IncomingPaymentRow | OutgoingPaymentRow;

const endpointByMode: Record<PaymentsMode, string> = {
  incoming: '/api/incoming-payments',
  outgoing: '/api/outgoing-payments'
};

export const PaymentsManager: React.FC<PaymentsManagerProps> = ({
  mode,
  currentUser,
  paymentSources = [],
  paymentCategories = [],
  periods = [],
  initialListFilters,
  clearInitialListFilters
}) => {
  const { t } = useTranslation();
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const [rows, setRows] = useState<Row[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [editingReceipts, setEditingReceipts] = useState<PaymentReceiptFile[]>([]);
  const [pendingReceiptFiles, setPendingReceiptFiles] = useState<File[]>([]);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({ ...EMPTY_PAYMENT_FILTERS });

  const title = mode === 'incoming' ? 'Gelen Ödemeler' : 'Giden Ödemeler';
  const endpoint = endpointByMode[mode];

  const [incomingForm, setIncomingForm] = useState({
    paymentDate: '',
    paymentAmount: '',
    paymentType: 'Cash' as IncomingPaymentTypeCode,
    paymentSource: '',
    paymentSourceId: '',
    paymentCategory: '',
    paymentCategoryId: '',
    currency: 'USD' as CurrencyCode,
    description1: '',
    description2: '',
    periodId: ''
  });
  const [outgoingForm, setOutgoingForm] = useState({
    paymentDate: '',
    paymentAmount: '',
    currency: 'USD' as CurrencyCode,
    paymentType: 'Cash' as 'Cash' | 'Bank',
    paymentReason: '' as '' | OutgoingPaymentReasonCode,
    expenseType: '' as '' | CompanyExpenseTypeCode,
    commissionShape: '' as '' | CommissionShapeCode,
    description1: '',
    userId: '',
    periodId: ''
  });

  const defaultPeriodId = useMemo(
    () => periods.find((p) => p.isDefault)?.id || '',
    [periods]
  );

  const sortedPeriods = useMemo(
    () => [...periods].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
    [periods]
  );

  const resetForm = () => {
    setEditingId(null);
    setIncomingForm({ paymentDate: '', paymentAmount: '', paymentType: 'Cash', paymentSource: '', paymentSourceId: '', paymentCategory: '', paymentCategoryId: '', currency: 'USD', description1: '', description2: '', periodId: '' });
    setOutgoingForm({
      paymentDate: '',
      paymentAmount: '',
      currency: 'USD',
      paymentType: 'Cash',
      paymentReason: '',
      expenseType: '',
      commissionShape: '',
      description1: '',
      userId: '',
      periodId: ''
    });
    setFormError('');
    setEditingReceipts([]);
    setPendingReceiptFiles([]);
  };

  const uploadReceipts = async (paymentId: string, files: File[]) => {
    if (files.length === 0) return true;
    const fd = new FormData();
    files.forEach((file) => fd.append('files', file));
    const res = await fetch(
      `${endpoint}/${paymentId}/receipts?role=${encodeURIComponent(currentUser.role)}`,
      { method: 'POST', body: fd }
    );
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || 'Dekont yüklenemedi');
      return false;
    }
    if (Array.isArray(data.receiptFiles)) {
      setEditingReceipts(data.receiptFiles);
    }
    return true;
  };

  const deleteReceipt = async (paymentId: string, filename: string) => {
    if (!window.confirm('Dekontu silmek istediğinize emin misiniz?')) return;
    setReceiptUploading(true);
    try {
      const res = await fetch(
        `${endpoint}/${paymentId}/receipts/${encodeURIComponent(filename)}?role=${encodeURIComponent(currentUser.role)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Dekont silinemedi');
        return;
      }
      setEditingReceipts(Array.isArray(data.receiptFiles) ? data.receiptFiles : []);
      await loadRows();
    } catch {
      alert('Sunucu bağlantı hatası');
    } finally {
      setReceiptUploading(false);
    }
  };

  const loadRows = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await fetch(`${endpoint}?role=${encodeURIComponent(currentUser.role)}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Kayıtlar yüklenemedi');
        return;
      }
      const normalized = (Array.isArray(data) ? data : []).map((row: any) => ({
        ...row,
        currency: (row.currency || 'USD') as CurrencyCode
      }));
      setRows(normalized);
      setSelectedIds(new Set());
    } catch {
      alert('Sunucu bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, [mode, currentUser.id, currentUser.role]);

  useEffect(() => {
    if (!isAdmin) return;
    const loadUsers = async () => {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        if (!res.ok) return;
        setAssignableUsers(Array.isArray(data) ? data : []);
      } catch {
        // ignore user list loading failure in payments form
      }
    };
    loadUsers();
  }, [isAdmin]);

  useEffect(() => {
    if (!initialListFilters || mode !== 'outgoing') return;
    setFilters((prev) => ({
      ...prev,
      dateFrom: initialListFilters.dateFrom ?? '',
      dateTo: initialListFilters.dateTo ?? '',
      currencies: asStringArray(initialListFilters.currency),
      paymentTypes: asStringArray(initialListFilters.paymentType),
      paymentReasons: asStringArray(initialListFilters.paymentReason),
      expenseTypes: asStringArray(initialListFilters.expenseType),
      commissionShapes: asStringArray(initialListFilters.commissionShape),
      periodIds: asStringArray(initialListFilters.periodId),
      userIds: asStringArray(initialListFilters.userId)
    }));
    if (typeof clearInitialListFilters === 'function') clearInitialListFilters();
  }, [initialListFilters, clearInitialListFilters, mode]);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => (b.sequenceNumber || 0) - (a.sequenceNumber || 0)),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const dateFrom = filters.dateFrom;
    const dateTo = filters.dateTo;
    const descriptionQuery = filters.descriptionQuery.trim().toLowerCase();
    const amountMin = filters.amountMin !== '' ? Number(filters.amountMin) : null;
    const amountMax = filters.amountMax !== '' ? Number(filters.amountMax) : null;

    return sortedRows.filter((row) => {
      if (dateFrom && row.paymentDate < dateFrom) return false;
      if (dateTo && row.paymentDate > dateTo) return false;
      if (!matchesMultiFilter(row.currency, filters.currencies)) return false;
      if (!matchesMultiFilter(row.periodId || '', filters.periodIds)) return false;

      if (mode === 'incoming') {
        const incoming = row as IncomingPaymentRow;
        if (filters.paymentSources.length > 0) {
          const matchesId = matchesMultiFilter(incoming.paymentSourceId || '', filters.paymentSources);
          const selectedNames = filters.paymentSources
            .map((id) => paymentSources.find((ps) => ps.id === id)?.name)
            .filter(Boolean) as string[];
          const matchesName = selectedNames.includes(incoming.paymentSource || '');
          if (!matchesId && !matchesName) return false;
        }
        if (!matchesMultiFilter(incoming.paymentType, filters.paymentTypes)) return false;
        if (!matchesMultiFilter(incoming.paymentCategoryId || '', filters.paymentCategoryIds)) return false;
        if (descriptionQuery) {
          const haystack = `${incoming.description1 || ''} ${incoming.description2 || ''}`.toLowerCase();
          if (!haystack.includes(descriptionQuery)) return false;
        }
        if (amountMin !== null && incoming.paymentAmount < amountMin) return false;
        if (amountMax !== null && incoming.paymentAmount > amountMax) return false;
      } else {
        const outgoing = row as OutgoingPaymentRow;
        if (!matchesMultiFilter(outgoing.paymentType, filters.paymentTypes)) return false;
        if (!matchesMultiFilter(outgoing.paymentReason, filters.paymentReasons)) return false;
        if (!matchesMultiFilter(outgoing.expenseType || '', filters.expenseTypes)) return false;
        if (!matchesMultiFilter(outgoing.commissionShape || '', filters.commissionShapes)) return false;
        if (!matchesMultiFilter(outgoing.userId || '', filters.userIds)) return false;
        if (descriptionQuery && !(outgoing.description1 || '').toLowerCase().includes(descriptionQuery)) return false;
        if (amountMin !== null && outgoing.paymentAmount < amountMin) return false;
        if (amountMax !== null && outgoing.paymentAmount > amountMax) return false;
      }

      return true;
    });
  }, [sortedRows, filters, mode, paymentSources]);

  const selectedRows = useMemo(() => filteredRows.filter(r => selectedIds.has(r.id)), [filteredRows, selectedIds]);
  const allFilteredSelected = filteredRows.length > 0 && filteredRows.every(r => selectedIds.has(r.id));

  const filteredTotalsByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    filteredRows.forEach((row) => {
      const currency = row.currency || 'USD';
      map.set(currency, (map.get(currency) || 0) + (Number(row.paymentAmount) || 0));
    });
    return Array.from(map.entries())
      .map(([currency, total]) => ({ currency, total }))
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }, [filteredRows]);

  const toggleRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredRows.forEach(r => next.delete(r.id));
      } else {
        filteredRows.forEach(r => next.add(r.id));
      }
      return next;
    });
  };

  const clearFilters = () => {
    setFilters({ ...EMPTY_PAYMENT_FILTERS });
  };

  const exportSelectedToExcel = () => {
    if (selectedRows.length === 0) {
      alert('Lütfen export için en az bir ödeme seçin.');
      return;
    }
    const data = selectedRows.map((row) => {
      if (mode === 'incoming') {
        const r = row as IncomingPaymentRow;
        return {
          'Sequence No': r.sequenceNumber,
          'Odeme Tarihi': r.paymentDate,
          'Odeme Miktari': r.paymentAmount,
          Currency: r.currency,
          'Odeme Turu': formatIncomingPaymentType(r.paymentType),
          'Odeme Kaynagi': r.paymentSource,
          'Odeme Kategorisi': r.paymentCategory || '',
          Donem: r.periodName || '',
          'Aciklama 1': r.description1 || '',
          'Aciklama 2': r.description2 || ''
        };
      }
      const r = row as OutgoingPaymentRow;
      return {
        'Sequence No': r.sequenceNumber,
        'Odeme Tarihi': r.paymentDate,
        'Odeme Miktari': r.paymentAmount,
        Currency: r.currency,
        'Odeme Turu': r.paymentType === 'Cash' ? 'Nakit' : 'Banka',
        'Odeme Sebebi': formatOutgoingPaymentDisplay(r.paymentReason),
        Donem: r.periodName || '',
        'Masraf Tipi': formatExpenseTypeDisplay(r.expenseType),
        'Komisyon Sekli': formatCommissionShapeDisplay(r.commissionShape),
        'Aciklama 1': r.description1 || '',
        Kullanici: r.userName ? `${r.userName} (${(r.userRole || '').toLowerCase()})` : ''
      };
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, mode === 'incoming' ? 'Gelen Odemeler' : 'Giden Odemeler');
    XLSX.writeFile(wb, `${mode}-payments-selected.xlsx`);
  };

  const openCreate = () => {
    resetForm();
    if (defaultPeriodId) {
      setIncomingForm((prev) => ({ ...prev, periodId: defaultPeriodId }));
      setOutgoingForm((prev) => ({ ...prev, periodId: defaultPeriodId }));
    }
    setShowForm(true);
  };

  const openEdit = (row: Row) => {
    setEditingId(row.id);
    setFormError('');
    if (mode === 'incoming') {
      const incoming = row as IncomingPaymentRow;
      setIncomingForm({
        paymentDate: incoming.paymentDate || '',
        paymentAmount: String(incoming.paymentAmount ?? ''),
        paymentType: incoming.paymentType || 'Cash',
        paymentSource: incoming.paymentSource || '',
        paymentSourceId: incoming.paymentSourceId || paymentSources.find(ps => ps.name === incoming.paymentSource)?.id || '',
        paymentCategory: incoming.paymentCategory || '',
        paymentCategoryId: incoming.paymentCategoryId || paymentCategories.find(pc => pc.name === incoming.paymentCategory)?.id || '',
        currency: incoming.currency || 'USD',
        description1: incoming.description1 || '',
        description2: incoming.description2 || '',
        periodId: incoming.periodId || ''
      });
      setEditingReceipts(incoming.receiptFiles || []);
    } else {
      const outgoing = row as OutgoingPaymentRow;
      const pr = outgoing.paymentReason || '';
      const reasonOk = (OUTGOING_PAYMENT_REASONS as readonly string[]).includes(pr);
      const et = (outgoing.expenseType || '').trim();
      const expenseOk = (COMPANY_EXPENSE_TYPES as readonly string[]).includes(et);
      const cs = (outgoing.commissionShape || '').trim();
      const shapeOk = (COMMISSION_SHAPES as readonly string[]).includes(cs);
      setOutgoingForm({
        paymentDate: outgoing.paymentDate || '',
        paymentAmount: String(outgoing.paymentAmount ?? ''),
        currency: outgoing.currency || 'USD',
        paymentType: outgoing.paymentType || 'Cash',
        paymentReason: (reasonOk ? pr : '') as '' | OutgoingPaymentReasonCode,
        // Keep legacy expense codes visible when editing old rows; user can re-pick from the new list
        expenseType: (expenseOk || et ? et : '') as '' | CompanyExpenseTypeCode,
        commissionShape: (shapeOk ? cs : '') as '' | CommissionShapeCode,
        description1: outgoing.description1 || '',
        userId: outgoing.userId || '',
        periodId: outgoing.periodId || ''
      });
      setEditingReceipts(outgoing.receiptFiles || []);
    }
    setPendingReceiptFiles([]);
    setShowForm(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (mode === 'outgoing') {
      if (!outgoingForm.paymentReason) {
        setFormError('Ödeme sebebi seçiniz.');
        return;
      }
      if (
        outgoingForm.paymentReason === 'company_expense' &&
        !outgoingForm.expenseType
      ) {
        setFormError('Firma masrafı için masraf tipi seçiniz.');
        return;
      }
      if (
        outgoingForm.paymentReason === 'commission' &&
        !outgoingForm.commissionShape
      ) {
        setFormError('Komisyon için komisyon şekli seçiniz.');
        return;
      }
    }
    try {
      const payload =
        mode === 'incoming'
          ? {
              ...incomingForm,
              paymentSourceId: incomingForm.paymentSourceId || null,
              paymentCategoryId: incomingForm.paymentCategoryId || null,
              paymentAmount: Number(incomingForm.paymentAmount),
              periodId: incomingForm.periodId || null,
              role: currentUser.role
            }
          : {
              paymentDate: outgoingForm.paymentDate,
              paymentAmount: Number(outgoingForm.paymentAmount),
              currency: outgoingForm.currency,
              paymentType: outgoingForm.paymentType,
              paymentReason: outgoingForm.paymentReason,
              expenseType:
                outgoingForm.paymentReason === 'company_expense' ? outgoingForm.expenseType || null : null,
              commissionShape:
                outgoingForm.paymentReason === 'commission' ? outgoingForm.commissionShape || null : null,
              description1: outgoingForm.description1,
              userId: outgoingForm.userId || null,
              periodId: outgoingForm.periodId || null,
              role: currentUser.role
            };
      const isEdit = !!editingId;
      const res = await fetch(isEdit ? `${endpoint}/${editingId}` : endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message || 'İşlem başarısız');
        return;
      }
      const paymentId = isEdit ? editingId! : data.id;
      if (pendingReceiptFiles.length > 0 && paymentId) {
        setReceiptUploading(true);
        const uploaded = await uploadReceipts(paymentId, pendingReceiptFiles);
        setReceiptUploading(false);
        if (!uploaded) return;
      }
      setShowForm(false);
      resetForm();
      await loadRows();
    } catch {
      setFormError('Sunucu bağlantı hatası');
    }
  };

  const removeRow = async (id: string) => {
    if (!window.confirm('Kaydı silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`${endpoint}/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: currentUser.role })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Silme işlemi başarısız');
        return;
      }
      await loadRows();
    } catch {
      alert('Sunucu bağlantı hatası');
    }
  };

  const closeFormView = () => {
    setShowForm(false);
    resetForm();
  };

  if (!isAdmin) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-6 text-gray-600">
        Bu ekranı sadece admin kullanıcılar görebilir.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showForm ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-50 to-white border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={closeFormView}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-xl px-3 py-2.5 border border-gray-200 hover:border-gray-300 transition-colors shadow-sm"
              >
                <ArrowLeft size={20} />
                <span className="font-medium">{t.back}</span>
              </button>
              <h2 className="text-xl font-bold text-gray-800 truncate">
                {editingId ? 'Kaydı Düzenle' : 'Yeni Kayıt'}
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={closeFormView}
                className="px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-colors shadow-sm"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                form="payment-form"
                disabled={receiptUploading}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                {receiptUploading ? 'Yükleniyor…' : editingId ? 'Güncelle' : t.save}
              </button>
            </div>
          </div>
          <form id="payment-form" onSubmit={submitForm} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4">
            {mode === 'incoming' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl">
                <div>
                  <label className="block text-sm mb-1">Ödeme Tarihi</label>
                  <input
                    required
                    type="date"
                    value={incomingForm.paymentDate}
                    onChange={e => setIncomingForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Ödeme Miktarı</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={incomingForm.paymentAmount}
                    onChange={e => setIncomingForm(prev => ({ ...prev, paymentAmount: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Ödeme Kaynağı</label>
                  <select
                    required
                    value={incomingForm.paymentSourceId}
                    onChange={e => {
                      const selectedId = e.target.value;
                      const selected = paymentSources.find(ps => ps.id === selectedId);
                      setIncomingForm(prev => ({
                        ...prev,
                        paymentSourceId: selectedId,
                        paymentSource: selected?.name || ''
                      }));
                    }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <option value="" disabled>Seçiniz…</option>
                    {paymentSources.map(ps => (
                      <option key={ps.id} value={ps.id}>{ps.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Ödeme Türü</label>
                  <select
                    value={incomingForm.paymentType}
                    onChange={e => setIncomingForm(prev => ({ ...prev, paymentType: e.target.value as IncomingPaymentTypeCode }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  >
                    {INCOMING_PAYMENT_TYPES.map((type) => (
                      <option key={type} value={type}>{formatIncomingPaymentType(type)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Currency</label>
                  <select
                    value={incomingForm.currency}
                    onChange={e => setIncomingForm(prev => ({ ...prev, currency: e.target.value as CurrencyCode }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <option value="USD">USD</option>
                    <option value="TRY">TRY</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">{t.period}</label>
                  <select
                    value={incomingForm.periodId}
                    onChange={e => setIncomingForm(prev => ({ ...prev, periodId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <option value="">Seçimsiz</option>
                    {sortedPeriods.map((period) => (
                      <option key={period.id} value={period.id}>{period.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Ödeme Kategorisi</label>
                  <select
                    value={incomingForm.paymentCategoryId}
                    onChange={e => {
                      const selectedId = e.target.value;
                      const selected = paymentCategories.find(pc => pc.id === selectedId);
                      setIncomingForm(prev => ({
                        ...prev,
                        paymentCategoryId: selectedId,
                        paymentCategory: selected?.name || ''
                      }));
                    }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <option value="">Seçimsiz</option>
                    {paymentCategories.map(pc => (
                      <option key={pc.id} value={pc.id}>{pc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Açıklama 1</label>
                  <input
                    value={incomingForm.description1}
                    onChange={e => setIncomingForm(prev => ({ ...prev, description1: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Açıklama 2</label>
                  <input
                    value={incomingForm.description2}
                    onChange={e => setIncomingForm(prev => ({ ...prev, description2: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl">
                <div>
                  <label className="block text-sm mb-1">Ödeme Tarihi</label>
                  <input
                    required
                    type="date"
                    value={outgoingForm.paymentDate}
                    onChange={e => setOutgoingForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Ödeme Miktarı</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={outgoingForm.paymentAmount}
                    onChange={e => setOutgoingForm(prev => ({ ...prev, paymentAmount: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Currency</label>
                  <select
                    value={outgoingForm.currency}
                    onChange={e => setOutgoingForm(prev => ({ ...prev, currency: e.target.value as CurrencyCode }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <option value="USD">USD</option>
                    <option value="TRY">TRY</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Ödeme Türü</label>
                  <select
                    value={outgoingForm.paymentType}
                    onChange={e => setOutgoingForm(prev => ({ ...prev, paymentType: e.target.value as 'Cash' | 'Bank' }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <option value="Cash">Nakit</option>
                    <option value="Bank">Banka</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Ödeme Sebebi</label>
                  <select
                    required
                    value={outgoingForm.paymentReason}
                    onChange={e => {
                      const v = e.target.value as OutgoingPaymentReasonCode | '';
                      setOutgoingForm(prev => ({
                        ...prev,
                        paymentReason: v,
                        expenseType: v === 'company_expense' ? prev.expenseType : '',
                        commissionShape: v === 'commission' ? prev.commissionShape : ''
                      }));
                    }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <option value="" disabled>Seçiniz…</option>
                    {OUTGOING_PAYMENT_REASONS.map(code => (
                      <option key={code} value={code}>{OUTGOING_PAYMENT_REASON_LABELS[code]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Masraf Tipi</label>
                  <select
                    required={outgoingForm.paymentReason === 'company_expense'}
                    disabled={outgoingForm.paymentReason !== 'company_expense'}
                    value={outgoingForm.expenseType}
                    onChange={e =>
                      setOutgoingForm(prev => ({
                        ...prev,
                        expenseType: e.target.value as CompanyExpenseTypeCode | ''
                      }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <option value="" disabled>Seçiniz…</option>
                    {outgoingForm.expenseType &&
                      !(COMPANY_EXPENSE_TYPES as readonly string[]).includes(outgoingForm.expenseType) && (
                        <option value={outgoingForm.expenseType}>
                          {formatExpenseTypeDisplay(outgoingForm.expenseType)}
                        </option>
                      )}
                    {COMPANY_EXPENSE_TYPES.map(code => (
                      <option key={code} value={code}>{COMPANY_EXPENSE_TYPE_LABELS[code]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Komisyon Şekli</label>
                  <select
                    required={outgoingForm.paymentReason === 'commission'}
                    disabled={outgoingForm.paymentReason !== 'commission'}
                    value={outgoingForm.commissionShape}
                    onChange={e =>
                      setOutgoingForm(prev => ({
                        ...prev,
                        commissionShape: e.target.value as CommissionShapeCode | ''
                      }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <option value="" disabled>Seçiniz…</option>
                    {COMMISSION_SHAPES.map(code => (
                      <option key={code} value={code}>{COMMISSION_SHAPE_LABELS[code]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Kullanıcı (opsiyonel)</label>
                  <select
                    value={outgoingForm.userId}
                    onChange={e => setOutgoingForm(prev => ({ ...prev, userId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <option value="">Seçimsiz</option>
                    {assignableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({String(user.role || '').toLowerCase()})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">{t.period}</label>
                  <select
                    value={outgoingForm.periodId}
                    onChange={e => setOutgoingForm(prev => ({ ...prev, periodId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <option value="">Seçimsiz</option>
                    {sortedPeriods.map((period) => (
                      <option key={period.id} value={period.id}>{period.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Açıklama 1</label>
                  <input
                    value={outgoingForm.description1}
                    onChange={e => setOutgoingForm(prev => ({ ...prev, description1: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 max-w-5xl">
              <label className="block text-sm font-medium text-gray-700 mb-2">Dekont</label>
              {editingId && editingReceipts.length > 0 && (
                <ul className="space-y-2 mb-3">
                  {editingReceipts.map((file) => (
                    <li key={file.filename} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 bg-gray-50">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline min-w-0 truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Paperclip size={14} className="shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </a>
                      <button
                        type="button"
                        disabled={receiptUploading}
                        onClick={() => deleteReceipt(editingId, file.filename)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-600 disabled:opacity-50"
                        title="Dekontu sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {pendingReceiptFiles.length > 0 && (
                <ul className="space-y-2 mb-3">
                  {pendingReceiptFiles.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-lg border border-blue-100 px-3 py-2 bg-blue-50/50">
                      <span className="inline-flex items-center gap-2 text-sm text-gray-700 min-w-0 truncate">
                        <Upload size={14} className="shrink-0 text-blue-600" />
                        <span className="truncate">{file.name}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingReceiptFiles((prev) => prev.filter((_, i) => i !== index))}
                        className="p-1.5 rounded hover:bg-red-50 text-red-600"
                        title="Kaldır"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">
                <Upload size={16} />
                <span>Dekont ekle (PDF, resim)</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const picked = Array.from(e.target.files || []);
                    if (picked.length > 0) {
                      setPendingReceiptFiles((prev) => [...prev, ...picked]);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </form>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportSelectedToExcel}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                <Download size={16} />
                Export Selected to Excel
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus size={16} />
                Yeni Kayıt
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            <SavedQuickFilters
              pageKey={mode === 'incoming' ? 'incoming-payments' : 'outgoing-payments'}
              userId={currentUser?.id}
              getFilters={() => ({ ...filters })}
              onApply={(f) => {
                setFilters({
                  dateFrom: typeof f.dateFrom === 'string' ? f.dateFrom : '',
                  dateTo: typeof f.dateTo === 'string' ? f.dateTo : '',
                  currencies: asStringArray(f.currencies ?? f.currency),
                  paymentSources: asStringArray(f.paymentSources ?? f.paymentSource),
                  paymentTypes: asStringArray(f.paymentTypes ?? f.paymentType),
                  paymentReasons: asStringArray(f.paymentReasons ?? f.paymentReason),
                  expenseTypes: asStringArray(f.expenseTypes ?? f.expenseType),
                  commissionShapes: asStringArray(f.commissionShapes ?? f.commissionShape),
                  descriptionQuery: typeof f.descriptionQuery === 'string' ? f.descriptionQuery : '',
                  amountMin: typeof f.amountMin === 'string' ? f.amountMin : '',
                  amountMax: typeof f.amountMax === 'string' ? f.amountMax : '',
                  periodIds: asStringArray(f.periodIds ?? f.periodId),
                  paymentCategoryIds: asStringArray(f.paymentCategoryIds ?? f.paymentCategoryId),
                  userIds: asStringArray(f.userIds ?? f.userId)
                });
              }}
            />
            {mode === 'incoming' ? (
              <>
                <CreatedAtRangeFilter
                  from={filters.dateFrom}
                  to={filters.dateTo}
                  onFromChange={(value) => setFilters(prev => ({ ...prev, dateFrom: value }))}
                  onToChange={(value) => setFilters(prev => ({ ...prev, dateTo: value }))}
                  presetPosition="above"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <SearchableMultiSelect
                    options={['USD', 'TRY', 'EUR']}
                    selected={filters.currencies}
                    onChange={(v) => setFilters((prev) => ({ ...prev, currencies: v }))}
                    placeholder={`Currency (${t.filterAll})`}
                    searchPlaceholder={t.search}
                    noResultsText={t.searchNoResults}
                  />
                  <SearchableMultiSelect
                    options={sortedPeriods.map((period) => ({ value: period.id, label: period.name }))}
                    selected={filters.periodIds}
                    onChange={(v) => setFilters((prev) => ({ ...prev, periodIds: v }))}
                    placeholder={`${t.period} (${t.filterAll})`}
                    searchPlaceholder={t.search}
                    noResultsText={t.searchNoResults}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Min Tutar"
                    value={filters.amountMin}
                    onChange={e => setFilters(prev => ({ ...prev, amountMin: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Max Tutar"
                    value={filters.amountMax}
                    onChange={e => setFilters(prev => ({ ...prev, amountMax: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <SearchableMultiSelect
                    options={INCOMING_PAYMENT_TYPES.map((type) => ({ value: type, label: formatIncomingPaymentType(type) }))}
                    selected={filters.paymentTypes}
                    onChange={(v) => setFilters((prev) => ({ ...prev, paymentTypes: v }))}
                    placeholder={`Ödeme Türü (${t.filterAll})`}
                    searchPlaceholder={t.search}
                    noResultsText={t.searchNoResults}
                  />
                  <SearchableMultiSelect
                    options={paymentSources.map((source) => ({ value: source.id, label: source.name }))}
                    selected={filters.paymentSources}
                    onChange={(v) => setFilters((prev) => ({ ...prev, paymentSources: v }))}
                    placeholder={`Ödeme Kaynağı (${t.filterAll})`}
                    searchPlaceholder={t.search}
                    noResultsText={t.searchNoResults}
                  />
                  <input
                    placeholder="Açıklama Ara"
                    value={filters.descriptionQuery}
                    onChange={e => setFilters(prev => ({ ...prev, descriptionQuery: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <SearchableMultiSelect
                    options={paymentCategories.map((category) => ({ value: category.id, label: category.name }))}
                    selected={filters.paymentCategoryIds}
                    onChange={(v) => setFilters((prev) => ({ ...prev, paymentCategoryIds: v }))}
                    placeholder={`Ödeme Kategorisi (${t.filterAll})`}
                    searchPlaceholder={t.search}
                    noResultsText={t.searchNoResults}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {FILTER_DATE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        const range = getDatePreset(preset.id);
                        setFilters((prev) => ({ ...prev, dateFrom: range.from, dateTo: range.to }));
                      }}
                      className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-800 transition-colors"
                    >
                      {t[preset.labelKey as keyof typeof t] as string}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t.filterCreatedFrom}</label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t.filterCreatedTo}</label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    />
                  </div>
                  <SearchableMultiSelect
                    options={['USD', 'TRY', 'EUR']}
                    selected={filters.currencies}
                    onChange={(v) => setFilters((prev) => ({ ...prev, currencies: v }))}
                    placeholder={`Currency (${t.filterAll})`}
                    searchPlaceholder={t.search}
                    noResultsText={t.searchNoResults}
                    className="self-end"
                  />
                  <SearchableMultiSelect
                    options={sortedPeriods.map((period) => ({ value: period.id, label: period.name }))}
                    selected={filters.periodIds}
                    onChange={(v) => setFilters((prev) => ({ ...prev, periodIds: v }))}
                    placeholder={`${t.period} (${t.filterAll})`}
                    searchPlaceholder={t.search}
                    noResultsText={t.searchNoResults}
                    className="self-end"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Min Tutar"
                    value={filters.amountMin}
                    onChange={e => setFilters(prev => ({ ...prev, amountMin: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Max Tutar"
                    value={filters.amountMax}
                    onChange={e => setFilters(prev => ({ ...prev, amountMax: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <SearchableMultiSelect
                    options={[
                      { value: 'Cash', label: 'Nakit' },
                      { value: 'Bank', label: 'Banka' }
                    ]}
                    selected={filters.paymentTypes}
                    onChange={(v) => setFilters((prev) => ({ ...prev, paymentTypes: v }))}
                    placeholder={`Ödeme Türü (${t.filterAll})`}
                    searchPlaceholder={t.search}
                    noResultsText={t.searchNoResults}
                  />
                  <SearchableMultiSelect
                    options={OUTGOING_PAYMENT_REASONS.map((code) => ({ value: code, label: OUTGOING_PAYMENT_REASON_LABELS[code] }))}
                    selected={filters.paymentReasons}
                    onChange={(v) => setFilters((prev) => ({ ...prev, paymentReasons: v }))}
                    placeholder={`Ödeme Sebebi (${t.filterAll})`}
                    searchPlaceholder={t.search}
                    noResultsText={t.searchNoResults}
                  />
                  <SearchableMultiSelect
                    options={COMPANY_EXPENSE_TYPES.map((code) => ({ value: code, label: COMPANY_EXPENSE_TYPE_LABELS[code] }))}
                    selected={filters.expenseTypes}
                    onChange={(v) => setFilters((prev) => ({ ...prev, expenseTypes: v }))}
                    placeholder={`Masraf Tipi (${t.filterAll})`}
                    searchPlaceholder={t.search}
                    noResultsText={t.searchNoResults}
                  />
                  <SearchableMultiSelect
                    options={COMMISSION_SHAPES.map((code) => ({ value: code, label: COMMISSION_SHAPE_LABELS[code] }))}
                    selected={filters.commissionShapes}
                    onChange={(v) => setFilters((prev) => ({ ...prev, commissionShapes: v }))}
                    placeholder={`Komisyon Şekli (${t.filterAll})`}
                    searchPlaceholder={t.search}
                    noResultsText={t.searchNoResults}
                  />
                  <SearchableMultiSelect
                    options={assignableUsers.map((user) => ({ value: user.id, label: user.name }))}
                    selected={filters.userIds}
                    onChange={(v) => setFilters((prev) => ({ ...prev, userIds: v }))}
                    placeholder={`Kullanıcı (${t.filterAll})`}
                    searchPlaceholder={t.search}
                    noResultsText={t.searchNoResults}
                  />
                  <input
                    placeholder="Açıklama Ara"
                    value={filters.descriptionQuery}
                    onChange={e => setFilters(prev => ({ ...prev, descriptionQuery: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Seçili: {selectedRows.length} / Filtreli: {filteredRows.length}</span>
              <button type="button" onClick={clearFilters} className="text-blue-600 hover:text-blue-700">
                Filtreleri Temizle
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-800">Ödeme Toplamı</span>
              {filteredTotalsByCurrency.length === 0 ? (
                <span className="text-sm text-gray-500">0</span>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  {filteredTotalsByCurrency.map(({ currency, total }) => (
                    <span key={currency} className="text-sm font-bold text-gray-900">
                      {total.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">
                      <input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFiltered} />
                    </th>
                    <th className="px-4 py-3">Sequence No</th>
                    <th className="px-4 py-3">Ödeme Tarihi</th>
                    <th className="px-4 py-3">{t.period}</th>
                    {mode === 'incoming' ? (
                      <>
                        <th className="px-4 py-3">Ödeme Miktarı</th>
                        <th className="px-4 py-3">Currency</th>
                        <th className="px-4 py-3">Ödeme Türü</th>
                        <th className="px-4 py-3">Ödeme Kaynağı</th>
                        <th className="px-4 py-3">Ödeme Kategorisi</th>
                        <th className="px-4 py-3">Açıklama 1</th>
                        <th className="px-4 py-3">Açıklama 2</th>
                        <th className="px-4 py-3">Dekont</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-3">Ödeme Miktarı</th>
                        <th className="px-4 py-3">Currency</th>
                        <th className="px-4 py-3">Ödeme Türü</th>
                        <th className="px-4 py-3">Ödeme Sebebi</th>
                        <th className="px-4 py-3">Masraf Tipi</th>
                        <th className="px-4 py-3">Komisyon Şekli</th>
                        <th className="px-4 py-3">Kullanıcı</th>
                        <th className="px-4 py-3">Açıklama 1</th>
                        <th className="px-4 py-3">Dekont</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={14} className="px-4 py-8 text-center text-gray-500">Yükleniyor...</td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-4 py-8 text-center text-gray-500">Kayıt bulunamadı</td>
                    </tr>
                  ) : filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => openEdit(row)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleRow(row.id)}
                        />
                      </td>
                      <td className="px-4 py-3">{row.sequenceNumber}</td>
                      <td className="px-4 py-3">{row.paymentDate}</td>
                      <td className="px-4 py-3">{row.periodName || '—'}</td>
                      {mode === 'incoming' ? (
                        <>
                          <td className="px-4 py-3">{(row as IncomingPaymentRow).paymentAmount}</td>
                          <td className="px-4 py-3">{(row as IncomingPaymentRow).currency}</td>
                          <td className="px-4 py-3">{formatIncomingPaymentType((row as IncomingPaymentRow).paymentType)}</td>
                          <td className="px-4 py-3">{(row as IncomingPaymentRow).paymentSource}</td>
                          <td className="px-4 py-3">{(row as IncomingPaymentRow).paymentCategory || '—'}</td>
                          <td className="px-4 py-3">{(row as IncomingPaymentRow).description1 || '—'}</td>
                          <td className="px-4 py-3">{(row as IncomingPaymentRow).description2 || '—'}</td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            {(row.receiptFiles?.length || 0) > 0 ? (
                              <span className="inline-flex items-center gap-1 text-blue-600">
                                <Paperclip size={14} />
                                <span>{row.receiptFiles!.length}</span>
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3">{(row as OutgoingPaymentRow).paymentAmount}</td>
                          <td className="px-4 py-3">{(row as OutgoingPaymentRow).currency}</td>
                          <td className="px-4 py-3">{(row as OutgoingPaymentRow).paymentType === 'Cash' ? 'Nakit' : 'Banka'}</td>
                          <td className="px-4 py-3">{formatOutgoingPaymentDisplay((row as OutgoingPaymentRow).paymentReason)}</td>
                          <td className="px-4 py-3">
                            {(row as OutgoingPaymentRow).expenseType
                              ? formatExpenseTypeDisplay((row as OutgoingPaymentRow).expenseType)
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {(row as OutgoingPaymentRow).commissionShape
                              ? formatCommissionShapeDisplay((row as OutgoingPaymentRow).commissionShape)
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {(row as OutgoingPaymentRow).userName
                              ? `${(row as OutgoingPaymentRow).userName} (${((row as OutgoingPaymentRow).userRole || '').toLowerCase()})`
                              : '—'}
                          </td>
                          <td className="px-4 py-3">{(row as OutgoingPaymentRow).description1 || '—'}</td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            {(row.receiptFiles?.length || 0) > 0 ? (
                              <span className="inline-flex items-center gap-1 text-blue-600">
                                <Paperclip size={14} />
                                <span>{row.receiptFiles!.length}</span>
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(row);
                            }}
                            className="p-2 rounded hover:bg-gray-100 text-gray-700"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRow(row.id);
                            }}
                            className="p-2 rounded hover:bg-red-50 text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
