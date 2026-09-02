import React, { useState } from 'react';
import { Period } from '../types';
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface PeriodManagerProps {
  periods: Period[];
  onAddPeriod: (period: Omit<Period, 'id'>) => Promise<string | null>;
  onEditPeriod: (period: Period) => Promise<void>;
  onDeletePeriod: (id: string) => Promise<void>;
}

function PeriodDefaultToggle({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        checked ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
      }`}
    >
      <span
        className={`pointer-events-none absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full shadow-sm transition-transform duration-200 ease-out ${
          checked ? 'translate-x-5 bg-white' : 'translate-x-0 bg-gray-900'
        }`}
      />
    </button>
  );
}

export const PeriodManager: React.FC<PeriodManagerProps> = ({
  periods,
  onAddPeriod,
  onEditPeriod,
  onDeletePeriod
}) => {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formName, setFormName] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [togglingDefaultId, setTogglingDefaultId] = useState<string | null>(null);

  const resetForm = () => {
    setFormName('');
    setFormStartDate('');
    setFormEndDate('');
    setFormActive(true);
    setFormIsDefault(false);
    setEditingId(null);
    setIsAdding(false);
  };

  const startAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const startEdit = (p: Period) => {
    setFormName(p.name);
    setFormStartDate(p.startDate);
    setFormEndDate(p.endDate);
    setFormActive(p.active !== false);
    setFormIsDefault(p.isDefault === true);
    setEditingId(p.id);
    setIsAdding(false);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formStartDate || !formEndDate) return;
    const id = await onAddPeriod({
      name: formName.trim(),
      startDate: formStartDate,
      endDate: formEndDate,
      active: formActive,
      isDefault: formIsDefault
    });
    if (id) resetForm();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !formName.trim() || !formStartDate || !formEndDate) return;
    await onEditPeriod({
      id: editingId,
      name: formName.trim(),
      startDate: formStartDate,
      endDate: formEndDate,
      active: formActive,
      isDefault: formIsDefault
    });
    resetForm();
  };

  const handleToggleDefault = async (period: Period, nextValue: boolean) => {
    if (togglingDefaultId) return;
    setTogglingDefaultId(period.id);
    try {
      await onEditPeriod({ ...period, isDefault: nextValue });
    } finally {
      setTogglingDefaultId(null);
    }
  };

  const handleDelete = async (id: string) => {
    await onDeletePeriod(id);
    setConfirmDeleteId(null);
  };

  const sortedPeriods = [...periods].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t.periodsTitle}</h2>
          <p className="text-gray-500">{t.period}</p>
        </div>
        <button
          type="button"
          onClick={startAdd}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span>{t.addPeriod}</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">{t.addPeriod}</h3>
          <form onSubmit={handleSaveAdd} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.periodName}</label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.startDate}</label>
              <input
                type="date"
                value={formStartDate}
                onChange={e => setFormStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.endDate}</label>
              <input
                type="date"
                value={formEndDate}
                onChange={e => setFormEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.periodDefault}</label>
              <div className="flex items-center h-[42px]">
                <PeriodDefaultToggle
                  checked={formIsDefault}
                  onChange={setFormIsDefault}
                  label={t.periodDefault}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.status}</label>
              <select
                value={formActive ? 'active' : 'inactive'}
                onChange={e => setFormActive(e.target.value === 'active')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="active">{t.active}</option>
                <option value="inactive">{t.inactive}</option>
              </select>
            </div>
            <div className="flex gap-2 items-center justify-end">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {t.save}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                {t.cancel}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">{t.periodName}</th>
                <th className="px-4 py-3">{t.startDate}</th>
                <th className="px-4 py-3">{t.endDate}</th>
                <th className="px-4 py-3">{t.periodDefault}</th>
                <th className="px-4 py-3">{t.status}</th>
                <th className="px-4 py-3 w-24 text-right">{t.edit}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {editingId && (
                <tr className="bg-blue-50/50">
                  <td colSpan={6} className="p-4">
                    <form onSubmit={handleSaveEdit} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t.periodName}</label>
                        <input
                          type="text"
                          value={formName}
                          onChange={e => setFormName(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t.startDate}</label>
                        <input
                          type="date"
                          value={formStartDate}
                          onChange={e => setFormStartDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t.endDate}</label>
                        <input
                          type="date"
                          value={formEndDate}
                          onChange={e => setFormEndDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t.periodDefault}</label>
                        <div className="flex items-center h-[38px]">
                          <PeriodDefaultToggle
                            checked={formIsDefault}
                            onChange={setFormIsDefault}
                            label={t.periodDefault}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t.status}</label>
                        <select
                          value={formActive ? 'active' : 'inactive'}
                          onChange={e => setFormActive(e.target.value === 'active')}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                        >
                          <option value="active">{t.active}</option>
                          <option value="inactive">{t.inactive}</option>
                        </select>
                      </div>
                      <div className="flex gap-2 items-center justify-end">
                        <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                          {t.save}
                        </button>
                        <button type="button" onClick={resetForm} className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
                          {t.cancel}
                        </button>
                      </div>
                    </form>
                  </td>
                </tr>
              )}
              {sortedPeriods.map(p => (
                <React.Fragment key={p.id}>
                  {editingId === p.id ? null : (
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-gray-900">{p.startDate}</td>
                      <td className="px-4 py-3 text-gray-900">{p.endDate}</td>
                      <td className="px-4 py-3">
                        <PeriodDefaultToggle
                          checked={p.isDefault === true}
                          onChange={(next) => void handleToggleDefault(p, next)}
                          label={t.periodDefault}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${p.active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {p.active !== false ? t.active : t.inactive}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(p)}
                            disabled={togglingDefaultId === p.id}
                            className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg disabled:opacity-50"
                            title={t.edit}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(p.id)}
                            disabled={togglingDefaultId === p.id}
                            className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg disabled:opacity-50"
                            title={t.delete}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {periods.length === 0 && !isAdding && (
          <div className="py-12 text-center text-gray-500 flex flex-col items-center gap-2">
            <Calendar size={40} className="opacity-40" />
            <p>{t.noPeriods}</p>
          </div>
        )}
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <p className="text-gray-800 font-medium mb-4">{t.confirm} {t.delete}?</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteId)}
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
