import React, { useMemo, useState } from 'react';
import { AgencyCompany } from '../types';
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';

interface AgencyCompanyManagerProps {
  companies: AgencyCompany[];
  onAddCompany: (name: string) => Promise<string | null>;
  onEditCompany: (company: AgencyCompany) => Promise<void>;
  onDeleteCompany: (id: string) => Promise<void>;
}

export const AgencyCompanyManager: React.FC<AgencyCompanyManagerProps> = ({
  companies,
  onAddCompany,
  onEditCompany,
  onDeleteCompany
}) => {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sortedCompanies = useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [companies]
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    const id = await onAddCompany(trimmed);
    if (id) setNewName('');
  };

  const startEdit = (company: AgencyCompany) => {
    setEditingId(company.id);
    setEditingName(company.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) return;
    await onEditCompany({ id: editingId, name: trimmed });
    cancelEdit();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Aracı Firma Listesi</h2>
          <p className="text-gray-500">Aracı firma adı ekleme, düzenleme ve silme</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Firma adı"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            Ekle
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-200">
            <tr>
              <th className="px-4 py-3">Firma Adı</th>
              <th className="px-4 py-3 w-28 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedCompanies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {editingId === company.id ? (
                    <form onSubmit={saveEdit} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-1.5"
                        required
                      />
                      <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Kaydet</button>
                      <button type="button" onClick={cancelEdit} className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg">Vazgeç</button>
                    </form>
                  ) : (
                    <span className="font-medium text-gray-900">{company.name}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId !== company.id && (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(company)}
                        className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg"
                        title="Düzenle"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(company.id)}
                        className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg"
                        title="Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedCompanies.length === 0 && (
          <div className="py-12 text-center text-gray-500 flex flex-col items-center gap-2">
            <Building2 size={40} className="opacity-40" />
            <p>Henüz aracı firma yok.</p>
          </div>
        )}
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <p className="text-gray-800 font-medium mb-4">Bu aracı firmayı silmek istiyor musun?</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDeleteCompany(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
