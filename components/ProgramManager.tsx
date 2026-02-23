import React, { useState, useMemo } from 'react';
import { Program, University, User, UserRole, PROGRAM_CATEGORIES } from '../types';
import { Plus, BookOpen, Clock, DollarSign, Calendar, Trash2, Pencil, Search, Filter, X } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface ProgramManagerProps {
  programs: Program[];
  universities: University[];
  onAddProgram: (prog: Program) => void;
  onEditProgram?: (prog: Program) => void;
  onDeleteProgram: (id: string) => void;
  currentUser?: User | null;
}

export const ProgramManager: React.FC<ProgramManagerProps> = ({
  programs,
  universities,
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchProgramName, setSearchProgramName] = useState('');
  const [searchNameInArabic, setSearchNameInArabic] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterUniversityId, setFilterUniversityId] = useState<string>('');
  const [filterDegree, setFilterDegree] = useState<string>('');
  const [filterLanguage, setFilterLanguage] = useState<string>('');
  const [formData, setFormData] = useState<Partial<Program>>({
    name: '',
    nameInArabic: '',
    universityId: '',
    category: undefined,
    degree: 'Bachelor',
    language: 'English',
    years: 4,
    fee: 0,
    currency: 'USD',
    deadline: '',
    description: ''
  });

  const getUniversityName = (id: string) => universities.find(u => u.id === id)?.name || t.noUniversities;

  const filteredPrograms = useMemo(() => {
    return programs.filter(prog => {
      const matchName = !searchProgramName.trim() || prog.name.toLowerCase().includes(searchProgramName.trim().toLowerCase());
      const matchNameAr = !searchNameInArabic.trim() || (prog.nameInArabic || '').toLowerCase().includes(searchNameInArabic.trim().toLowerCase());
      const matchCategory = !filterCategory || prog.category === filterCategory;
      const matchUniversity = !filterUniversityId || prog.universityId === filterUniversityId;
      const matchDegree = !filterDegree || prog.degree === filterDegree;
      const matchLanguage = !filterLanguage || prog.language === filterLanguage;
      return matchName && matchNameAr && matchCategory && matchUniversity && matchDegree && matchLanguage;
    });
  }, [programs, searchProgramName, searchNameInArabic, filterCategory, filterUniversityId, filterDegree, filterLanguage]);

  const hasActiveFilters = !!(searchProgramName.trim() || searchNameInArabic.trim() || filterCategory || filterUniversityId || filterDegree || filterLanguage);

  const clearFilters = () => {
    setSearchProgramName('');
    setSearchNameInArabic('');
    setFilterCategory('');
    setFilterUniversityId('');
    setFilterDegree('');
    setFilterLanguage('');
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
        currency: formData.currency || 'USD',
        deadline: formData.deadline || new Date().toISOString().split('T')[0],
        description: formData.description
      };

      if (modalMode === 'edit' && onEditProgram) {
        onEditProgram(progData);
      } else {
        onAddProgram(progData);
      }

      setModalOpen(false);
      setEditingId(null);
      setFormData({
        name: '', nameInArabic: '', universityId: '', category: undefined, degree: 'Bachelor', language: 'English',
        years: 4, fee: 0, currency: 'USD', deadline: '', description: ''
      });
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    setEditingId(null);
    setFormData({
      name: '', nameInArabic: '', universityId: '', category: undefined, degree: 'Bachelor', language: 'English',
      years: 4, fee: 0, currency: 'USD', deadline: '', description: ''
    });
    setModalOpen(true);
  };

  const openEditModal = (prog: Program) => {
    setModalMode('edit');
    setEditingId(prog.id);
    setFormData({ ...prog });
    setModalOpen(true);
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
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <input
            type="text"
            placeholder={t.searchProgramNamePlaceholder}
            value={searchProgramName}
            onChange={e => setSearchProgramName(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <input
            type="text"
            dir="rtl"
            placeholder={t.searchNameInArabicPlaceholder}
            value={searchNameInArabic}
            onChange={e => setSearchNameInArabic(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">{t.filterAll}</option>
            {PROGRAM_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{translateCategory(cat)}</option>
            ))}
          </select>
          <select
            value={filterUniversityId}
            onChange={e => setFilterUniversityId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">{t.filterAll}</option>
            {universities.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select
            value={filterDegree}
            onChange={e => setFilterDegree(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">{t.filterAll}</option>
            <option value="Bachelor">{t.bachelor}</option>
            <option value="Master">{t.master}</option>
            <option value="PhD">{t.phd}</option>
            <option value="CombinedPhD">{t.combinedPhd}</option>
            <option value="Diploma">Diploma</option>
          </select>
          <select
            value={filterLanguage}
            onChange={e => setFilterLanguage(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">{t.filterAll}</option>
            <option value="English">English</option>
            <option value="Turkish">Turkish</option>
            <option value="Arabic">Arabic</option>
          </select>
        </div>
        {hasActiveFilters && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={14} />
              {t.clearFilters}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-medium">{t.programName}</th>
                <th className="px-6 py-4 font-medium">{t.programNameInArabic}</th>
                <th className="px-6 py-4 font-medium">{t.programCategory}</th>
                <th className="px-6 py-4 font-medium">{t.universities}</th>
                <th className="px-6 py-4 font-medium">{t.programDegree}</th>
                <th className="px-6 py-4 font-medium">{t.programLanguage}</th>
                <th className="px-6 py-4 font-medium">{t.programFee}</th>
                <th className="px-6 py-4 font-medium">{t.programDeadline}</th>
                {isAdmin && <th className="px-6 py-4 font-medium text-center">{t.edit}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPrograms.map((program) => (
                <tr key={program.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-gray-900">{program.name}</td>
                  <td className="px-6 py-4 text-gray-700" dir="rtl">{program.nameInArabic || '—'}</td>
                  <td className="px-6 py-4 text-gray-600">{program.category ? translateCategory(program.category) : '—'}</td>
                  <td className="px-6 py-4 text-blue-600">{getUniversityName(program.universityId)}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                      {translateDegree(program.degree)}
                    </span>
                  </td>
                  <td className="px-6 py-4">{program.language}</td>
                  <td className="px-6 py-4 font-bold text-gray-700">
                    {program.currency ? `${program.currency} ${program.fee.toLocaleString()}` : `$${program.fee.toLocaleString()}`}
                  </td>
                  <td className="px-6 py-4 text-red-500 text-xs">{program.deadline}</td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(program)}
                          title="تعديل"
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
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredPrograms.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="px-6 py-8 text-center text-gray-400">
                    {hasActiveFilters ? t.searchNoResults : t.noPrograms}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{modalMode === 'add' ? t.addProgram : t.editProgram}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.universities}</label>
                  <select
                    required
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
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
                    type="text" required
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.programNameInArabic}</label>
                  <input
                    type="text"
                    dir="rtl"
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.nameInArabic || ''}
                    onChange={e => setFormData({ ...formData, nameInArabic: e.target.value })}
                    placeholder={t.programNameInArabicPlaceholder}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.programCategory}</label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.category || ''}
                  onChange={e => setFormData({ ...formData, category: e.target.value ? (e.target.value as Program['category']) : undefined })}
                >
                  <option value="">—</option>
                  {PROGRAM_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{translateCategory(cat)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.programDegree}</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
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
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
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
                    type="number" min="1"
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.years}
                    onChange={e => setFormData({ ...formData, years: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.programFee}</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.fee}
                    onChange={e => setFormData({ ...formData, fee: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.programCurrency}</label>
                  <select
                    value={formData.currency}
                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="TRY">TRY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.programDeadline}</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.deadline}
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.programDescription}</label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
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