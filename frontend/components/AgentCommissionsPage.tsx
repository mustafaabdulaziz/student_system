import React, { useMemo, useState } from 'react';
import { AgentCommissionListRow, University, User } from '../types';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { SearchableSelect } from './SearchableSelect';
import { SearchableMultiSelect } from './SearchableMultiSelect';

type FormState = {
  userId: string;
  universityId: string;
  degree: '' | 'Diploma' | 'Bachelor' | 'Master' | 'PhD';
  commissionKind: 'rate' | 'amount' | '';
  commissionValue: string;
  depositSupport: string;
};

const EMPTY_FORM: FormState = {
  userId: '',
  universityId: '',
  degree: '',
  commissionKind: '',
  commissionValue: '',
  depositSupport: ''
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
    depositSupport?: number | null;
  }) => Promise<boolean>;
  onEdit: (id: string, payload: {
    userId: string;
    universityId: string;
    degree?: string;
    commissionKind: 'rate' | 'amount';
    commissionValue: number;
    depositSupport?: number | null;
  }) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onAddDefault: (payload: {
    universityId: string;
    degree: '' | 'Diploma' | 'Bachelor' | 'Master' | 'PhD';
    commissionKind: 'rate' | 'amount';
    commissionValue: number;
    depositSupport?: number | null;
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
    depositSupport: ''
  });
  const [defaultOpen, setDefaultOpen] = useState(false);
  const [defaultSaving, setDefaultSaving] = useState(false);
  const [defaultForm, setDefaultForm] = useState({
    universityId: '',
    degree: '' as '' | 'Diploma' | 'Bachelor' | 'Master' | 'PhD',
    commissionKind: '' as '' | 'rate' | 'amount',
    commissionValue: '',
    depositSupport: ''
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
      depositSupport: row.depositSupport != null ? String(row.depositSupport) : ''
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
    let depositSupport: number | null = null;
    if (form.depositSupport.trim() !== '') {
      depositSupport = Number(form.depositSupport);
      if (!Number.isFinite(depositSupport)) {
        alert('Depozito desteği geçerli bir sayı olmalıdır.');
        return null;
      }
    }
    const degreeKey = form.degree || '';
    const duplicate = rows.some(
      row =>
        row.id !== editingId &&
        row.userId === form.userId &&
        row.universityId === form.universityId &&
        (row.degree || '') === degreeKey
    );
    if (duplicate) {
      alert('Aynı acente, üniversite ve derece için iki satır eklenemez.');
      return null;
    }
    return {
      userId: form.userId,
      universityId: form.universityId,
      degree: form.degree || undefined,
      commissionKind: form.commissionKind as 'rate' | 'amount',
      commissionValue,
      depositSupport
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

  const kindLabel = (kind: string) => (kind === 'rate' ? 'Oran (%)' : 'Sabit Tutar');

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

  const defaultDegreeOptions = useMemo(() => {
    const taken = new Set(
      (universities.find(u => u.id === defaultForm.universityId)?.defaultAgencyCommissions || [])
        .map(row => row.degree || '')
    );
    return ([
      { value: '' as const, label: 'Tümü / Seçilmedi' },
      { value: 'Diploma' as const, label: translateDegree('Diploma') },
      { value: 'Bachelor' as const, label: translateDegree('Bachelor') },
      { value: 'Master' as const, label: translateDegree('Master') },
      { value: 'PhD' as const, label: translateDegree('PhD') }
    ]).filter(option => !taken.has(option.value));
  }, [universities, defaultForm.universityId, translateDegree]);

  const openDefault = () => {
    setDefaultForm({
      universityId: '',
      degree: '',
      commissionKind: '',
      commissionValue: '',
      depositSupport: ''
    });
    setDefaultOpen(true);
  };

  const handleDefaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defaultForm.universityId || !defaultForm.commissionKind || defaultForm.commissionValue.trim() === '') {
      alert('Üniversite, komisyon tipi ve tutar/oran zorunludur.');
      return;
    }
    if (!defaultDegreeOptions.some(option => option.value === defaultForm.degree)) {
      alert('Bu üniversite için aynı derece varsayılan acente komisyonlarında zaten var.');
      return;
    }
    const commissionValue = Number(defaultForm.commissionValue);
    if (!Number.isFinite(commissionValue)) {
      alert('Tutar/oran geçerli bir sayı olmalıdır.');
      return;
    }
    let depositSupport: number | null = null;
    if (defaultForm.depositSupport.trim() !== '') {
      depositSupport = Number(defaultForm.depositSupport);
      if (!Number.isFinite(depositSupport)) {
        alert('Depozito desteği geçerli bir sayı olmalıdır.');
        return;
      }
    }
    setDefaultSaving(true);
    try {
      const ok = await onAddDefault({
        universityId: defaultForm.universityId,
        degree: defaultForm.degree,
        commissionKind: defaultForm.commissionKind,
        commissionValue,
        depositSupport
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
    setBulkForm({ commissionKind: '', commissionValue: '', depositSupport: '' });
    setBulkOpen(true);
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const kindFilled = bulkForm.commissionKind !== '';
    const valueFilled = bulkForm.commissionValue.trim() !== '';
    const depositFilled = bulkForm.depositSupport.trim() !== '';
    if (!kindFilled && !valueFilled && !depositFilled) {
      alert('Komisyon tipi, tutar/oran veya depozito desteğinden en az birini doldurun.');
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
    let depositSupport: number | null = null;
    if (depositFilled) {
      depositSupport = Number(bulkForm.depositSupport);
      if (!Number.isFinite(depositSupport)) {
        alert('Depozito desteği geçerli bir sayı olmalıdır.');
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
          depositSupport: depositFilled ? depositSupport : (row.depositSupport ?? null)
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
                <th className="px-4 py-3 text-left">Acente</th>
                <th className="px-4 py-3 text-left">Üniversite</th>
                <th className="px-4 py-3 text-left">Derece</th>
                <th className="px-4 py-3 text-left">Komisyon Tipi</th>
                <th className="px-4 py-3 text-left">Tutar / Oran</th>
                <th className="px-4 py-3 text-left">Depozito Desteği</th>
                <th className="px-4 py-3 text-center w-28">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map(row => (
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
                  <td className="px-4 py-3 font-medium text-gray-900">{row.userName || '—'}</td>
                  <td className="px-4 py-3 text-gray-900">{row.universityName || '—'}</td>
                  <td className="px-4 py-3 text-gray-900">
                    {row.degree ? translateDegree(row.degree) : 'Tümü / Seçilmedi'}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{kindLabel(row.commissionKind)}</td>
                  <td className="px-4 py-3 text-gray-900">
                    {row.commissionKind === 'rate' ? `${row.commissionValue}%` : row.commissionValue}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {row.depositSupport != null ? row.depositSupport : '—'}
                  </td>
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
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
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
              Satır seçilen üniversitenin varsayılan acente komisyonlarına eklenir ve o dereceyi henüz olmayan temsilcilere yazılır.
            </p>
            <form onSubmit={handleDefaultSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Üniversite *</label>
                <SearchableSelect
                  value={defaultForm.universityId}
                  onChange={(value) => {
                    const taken = new Set(
                      (universities.find(u => u.id === value)?.defaultAgencyCommissions || []).map(row => row.degree || '')
                    );
                    const nextDegree = (['', 'Diploma', 'Bachelor', 'Master', 'PhD'] as const).find(degree => !taken.has(degree)) || '';
                    setDefaultForm(prev => ({ ...prev, universityId: value, degree: nextDegree }));
                  }}
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
                  disabled={!defaultForm.universityId || defaultDegreeOptions.length === 0}
                >
                  {defaultDegreeOptions.length === 0 ? (
                    <option value="">Bu üniversitede eklenecek derece kalmadı</option>
                  ) : defaultDegreeOptions.map(option => (
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
                  disabled={defaultSaving || !defaultForm.universityId || defaultDegreeOptions.length === 0}
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
              {selectedRows.length} seçili satır güncellenir. Boş bırakılan alan değişmez; bir, iki veya üç alanı birlikte doldurabilirsiniz.
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
