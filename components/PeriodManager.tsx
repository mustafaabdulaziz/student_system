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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const resetForm = () => {
    setFormName('');
    setFormStartDate('');
    setFormEndDate('');
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
    setEditingId(p.id);
    setIsAdding(false);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formStartDate || !formEndDate) return;
    const id = await onAddPeriod({ name: formName.trim(), startDate: formStartDate, endDate: formEndDate });
    if (id) resetForm();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !formName.trim() || !formStartDate || !formEndDate) return;
    await onEditPeriod({ id: editingId, name: formName.trim(), startDate: formStartDate, endDate: formEndDate });
    resetForm();
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

      {/* Add form */}
      {isAdding && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">{t.addPeriod}</h3>
          <form onSubmit={handleSaveAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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

      {/* Tree view table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">{t.periodName}</th>
                <th className="px-4 py-3">{t.startDate}</th>
                <th className="px-4 py-3">{t.endDate}</th>
                <th className="px-4 py-3 w-24 text-right">{t.edit}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {editingId && (
                <tr className="bg-blue-50/50">
                  <td colSpan={4} className="p-4">
                    <form onSubmit={handleSaveEdit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
                      <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                      <td className="px-4 py-3 text-gray-600">{p.startDate}</td>
                      <td className="px-4 py-3 text-gray-600">{p.endDate}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(p)}
                            className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg"
                            title={t.edit}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(p.id)}
                            className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg"
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

      {/* Delete confirmation */}
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
