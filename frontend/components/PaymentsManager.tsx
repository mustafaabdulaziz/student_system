import React, { useEffect, useMemo, useState } from 'react';
import { Download, Pencil, Plus, Trash2, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { User, UserRole } from '../types';

type PaymentsMode = 'incoming' | 'outgoing';
type CurrencyCode = 'USD' | 'TRY' | 'EUR';

interface PaymentsManagerProps {
  mode: PaymentsMode;
  currentUser: User;
}

interface IncomingPaymentRow {
  id: string;
  sequenceNumber: number;
  paymentDate: string;
  paymentAmount: number;
  paymentSource: string;
  currency: CurrencyCode;
  description1?: string;
  description2?: string;
}

interface OutgoingPaymentRow {
  id: string;
  sequenceNumber: number;
  paymentDate: string;
  paymentAmount: number;
  currency: CurrencyCode;
  paymentType: 'Cash' | 'Bank';
  paymentReason: string;
  description1?: string;
}

type Row = IncomingPaymentRow | OutgoingPaymentRow;

const endpointByMode: Record<PaymentsMode, string> = {
  incoming: '/api/incoming-payments',
  outgoing: '/api/outgoing-payments'
};

export const PaymentsManager: React.FC<PaymentsManagerProps> = ({ mode, currentUser }) => {
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    sequenceQuery: '',
    dateFrom: '',
    dateTo: '',
    currency: '',
    paymentSource: '',
    paymentType: '',
    paymentReason: '',
    descriptionQuery: '',
    amountMin: '',
    amountMax: ''
  });

  const title = mode === 'incoming' ? 'Gelen Ödemeler' : 'Giden Ödemeler';
  const endpoint = endpointByMode[mode];

  const [incomingForm, setIncomingForm] = useState({
    paymentDate: '',
    paymentAmount: '',
    paymentSource: '',
    currency: 'USD' as CurrencyCode,
    description1: '',
    description2: ''
  });
  const [outgoingForm, setOutgoingForm] = useState({
    paymentDate: '',
    paymentAmount: '',
    currency: 'USD' as CurrencyCode,
    paymentType: 'Cash' as 'Cash' | 'Bank',
    paymentReason: '',
    description1: ''
  });

  const resetForm = () => {
    setEditingId(null);
    setIncomingForm({ paymentDate: '', paymentAmount: '', paymentSource: '', currency: 'USD', description1: '', description2: '' });
    setOutgoingForm({ paymentDate: '', paymentAmount: '', currency: 'USD', paymentType: 'Cash', paymentReason: '', description1: '' });
    setFormError('');
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

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => (b.sequenceNumber || 0) - (a.sequenceNumber || 0)),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const sequenceQuery = filters.sequenceQuery.trim().toLowerCase();
    const dateFrom = filters.dateFrom;
    const dateTo = filters.dateTo;
    const currency = filters.currency;
    const descriptionQuery = filters.descriptionQuery.trim().toLowerCase();
    const paymentSource = filters.paymentSource.trim().toLowerCase();
    const paymentType = filters.paymentType;
    const paymentReason = filters.paymentReason.trim().toLowerCase();
    const amountMin = filters.amountMin !== '' ? Number(filters.amountMin) : null;
    const amountMax = filters.amountMax !== '' ? Number(filters.amountMax) : null;

    return sortedRows.filter((row) => {
      if (sequenceQuery && !String(row.sequenceNumber).toLowerCase().includes(sequenceQuery)) return false;
      if (dateFrom && row.paymentDate < dateFrom) return false;
      if (dateTo && row.paymentDate > dateTo) return false;
      if (currency && row.currency !== currency) return false;

      if (mode === 'incoming') {
        const incoming = row as IncomingPaymentRow;
        if (paymentSource && !incoming.paymentSource.toLowerCase().includes(paymentSource)) return false;
        if (descriptionQuery) {
          const haystack = `${incoming.description1 || ''} ${incoming.description2 || ''}`.toLowerCase();
          if (!haystack.includes(descriptionQuery)) return false;
        }
        if (amountMin !== null && incoming.paymentAmount < amountMin) return false;
        if (amountMax !== null && incoming.paymentAmount > amountMax) return false;
      } else {
        const outgoing = row as OutgoingPaymentRow;
        if (paymentType && outgoing.paymentType !== paymentType) return false;
        if (paymentReason && !outgoing.paymentReason.toLowerCase().includes(paymentReason)) return false;
        if (descriptionQuery && !(outgoing.description1 || '').toLowerCase().includes(descriptionQuery)) return false;
        if (amountMin !== null && outgoing.paymentAmount < amountMin) return false;
        if (amountMax !== null && outgoing.paymentAmount > amountMax) return false;
      }

      return true;
    });
  }, [sortedRows, filters, mode]);

  const selectedRows = useMemo(() => filteredRows.filter(r => selectedIds.has(r.id)), [filteredRows, selectedIds]);
  const allFilteredSelected = filteredRows.length > 0 && filteredRows.every(r => selectedIds.has(r.id));

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
    setFilters({
      sequenceQuery: '',
      dateFrom: '',
      dateTo: '',
      currency: '',
      paymentSource: '',
      paymentType: '',
      paymentReason: '',
      descriptionQuery: '',
      amountMin: '',
      amountMax: ''
    });
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
          'Odeme Kaynagi': r.paymentSource,
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
        'Odeme Sebebi': r.paymentReason,
        'Aciklama 1': r.description1 || ''
      };
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, mode === 'incoming' ? 'Gelen Odemeler' : 'Giden Odemeler');
    XLSX.writeFile(wb, `${mode}-payments-selected.xlsx`);
  };

  const openCreate = () => {
    resetForm();
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
        paymentSource: incoming.paymentSource || '',
        currency: incoming.currency || 'USD',
        description1: incoming.description1 || '',
        description2: incoming.description2 || ''
      });
    } else {
      const outgoing = row as OutgoingPaymentRow;
      setOutgoingForm({
        paymentDate: outgoing.paymentDate || '',
        paymentAmount: String(outgoing.paymentAmount ?? ''),
        currency: outgoing.currency || 'USD',
        paymentType: outgoing.paymentType || 'Cash',
        paymentReason: outgoing.paymentReason || '',
        description1: outgoing.description1 || ''
      });
    }
    setShowForm(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const payload =
        mode === 'incoming'
          ? {
              ...incomingForm,
              paymentAmount: Number(incomingForm.paymentAmount),
              role: currentUser.role
            }
          : {
              ...outgoingForm,
              paymentAmount: Number(outgoingForm.paymentAmount),
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

  if (!isAdmin) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-6 text-gray-600">
        Bu ekranı sadece admin kullanıcılar görebilir.
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            placeholder="Sequence No"
            value={filters.sequenceQuery}
            onChange={e => setFilters(prev => ({ ...prev, sequenceQuery: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={filters.currency}
            onChange={e => setFilters(prev => ({ ...prev, currency: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Tüm Currency</option>
            <option value="USD">USD</option>
            <option value="TRY">TRY</option>
            <option value="EUR">EUR</option>
          </select>

          {mode === 'incoming' ? (
            <>
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
              <input
                placeholder="Ödeme Kaynağı"
                value={filters.paymentSource}
                onChange={e => setFilters(prev => ({ ...prev, paymentSource: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                placeholder="Açıklama Ara"
                value={filters.descriptionQuery}
                onChange={e => setFilters(prev => ({ ...prev, descriptionQuery: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </>
          ) : (
            <>
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
              <select
                value={filters.paymentType}
                onChange={e => setFilters(prev => ({ ...prev, paymentType: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Ödeme Türü (Tümü)</option>
                <option value="Cash">Nakit</option>
                <option value="Bank">Banka</option>
              </select>
              <input
                placeholder="Ödeme Sebebi"
                value={filters.paymentReason}
                onChange={e => setFilters(prev => ({ ...prev, paymentReason: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                placeholder="Açıklama Ara"
                value={filters.descriptionQuery}
                onChange={e => setFilters(prev => ({ ...prev, descriptionQuery: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </>
          )}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Seçili: {selectedRows.length} / Filtreli: {filteredRows.length}</span>
          <button type="button" onClick={clearFilters} className="text-blue-600 hover:text-blue-700">
            Filtreleri Temizle
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3">
                  <input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFiltered} />
                </th>
                <th className="px-4 py-3">Sequence No</th>
                <th className="px-4 py-3">Ödeme Tarihi</th>
                {mode === 'incoming' ? (
                  <>
                    <th className="px-4 py-3">Ödeme Miktarı</th>
                    <th className="px-4 py-3">Currency</th>
                    <th className="px-4 py-3">Ödeme Kaynağı</th>
                    <th className="px-4 py-3">Açıklama 1</th>
                    <th className="px-4 py-3">Açıklama 2</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3">Ödeme Miktarı</th>
                    <th className="px-4 py-3">Currency</th>
                    <th className="px-4 py-3">Ödeme Türü</th>
                    <th className="px-4 py-3">Ödeme Sebebi</th>
                    <th className="px-4 py-3">Açıklama 1</th>
                  </>
                )}
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={mode === 'incoming' ? 9 : 9}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleRow(row.id)} />
                  </td>
                  <td className="px-4 py-3 font-mono">{row.sequenceNumber}</td>
                  <td className="px-4 py-3">{row.paymentDate}</td>
                  {mode === 'incoming' ? (
                    <>
                      <td className="px-4 py-3">{(row as IncomingPaymentRow).paymentAmount}</td>
                      <td className="px-4 py-3">{(row as IncomingPaymentRow).currency}</td>
                      <td className="px-4 py-3">{(row as IncomingPaymentRow).paymentSource}</td>
                      <td className="px-4 py-3">{(row as IncomingPaymentRow).description1 || '—'}</td>
                      <td className="px-4 py-3">{(row as IncomingPaymentRow).description2 || '—'}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">{(row as OutgoingPaymentRow).paymentAmount}</td>
                      <td className="px-4 py-3">{(row as OutgoingPaymentRow).currency}</td>
                      <td className="px-4 py-3">{(row as OutgoingPaymentRow).paymentType === 'Cash' ? 'Nakit' : 'Banka'}</td>
                      <td className="px-4 py-3">{(row as OutgoingPaymentRow).paymentReason}</td>
                      <td className="px-4 py-3">{(row as OutgoingPaymentRow).description1 || '—'}</td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => openEdit(row)} className="p-2 rounded hover:bg-gray-100 text-gray-700">
                        <Pencil size={16} />
                      </button>
                      <button type="button" onClick={() => removeRow(row.id)} className="p-2 rounded hover:bg-red-50 text-red-600">
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

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{editingId ? 'Kaydı Düzenle' : 'Yeni Kayıt'}</h3>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="p-1 rounded hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitForm} className="p-4 space-y-3">
              {mode === 'incoming' ? (
                <>
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
                    <input
                      required
                      value={incomingForm.paymentSource}
                      onChange={e => setIncomingForm(prev => ({ ...prev, paymentSource: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    />
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
                </>
              ) : (
                <>
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
                    <input
                      required
                      value={outgoingForm.paymentReason}
                      onChange={e => setOutgoingForm(prev => ({ ...prev, paymentReason: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Açıklama 1</label>
                    <input
                      value={outgoingForm.description1}
                      onChange={e => setOutgoingForm(prev => ({ ...prev, description1: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    />
                  </div>
                </>
              )}

              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-3 py-2 rounded-lg border border-gray-200">
                  İptal
                </button>
                <button type="submit" className="px-3 py-2 rounded-lg bg-blue-600 text-white">
                  {editingId ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
