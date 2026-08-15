import React, { useEffect, useMemo, useState } from 'react';
import { Bookmark, Save, Trash2 } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import {
  deleteSavedFilter,
  loadSavedFilters,
  saveFilterPreset,
  type SavedFilterPageKey,
  type SavedFilterPreset
} from '../utils/savedFilters';

type SavedQuickFiltersProps<T extends Record<string, unknown>> = {
  pageKey: SavedFilterPageKey;
  userId?: string | null;
  isAdmin: boolean;
  /** Current filters snapshot to save */
  getFilters: () => T;
  /** Apply a saved snapshot */
  onApply: (filters: T) => void;
  /** Optional: disable save when nothing to save */
  canSave?: boolean;
  className?: string;
};

export function SavedQuickFilters<T extends Record<string, unknown>>({
  pageKey,
  userId,
  isAdmin,
  getFilters,
  onApply,
  canSave = true,
  className = ''
}: SavedQuickFiltersProps<T>) {
  const { t } = useTranslation();
  const uid = userId || 'guest';
  const [presets, setPresets] = useState<SavedFilterPreset<T>[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [nameOpen, setNameOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const refresh = () => {
    setPresets(loadSavedFilters<T>(uid, pageKey));
  };

  useEffect(() => {
    refresh();
    setSelectedId('');
    setNameOpen(false);
    setNameInput('');
  }, [uid, pageKey]);

  const selected = useMemo(
    () => presets.find((p) => p.id === selectedId) || null,
    [presets, selectedId]
  );

  if (!isAdmin) return null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (!id) return;
    const preset = presets.find((p) => p.id === id);
    if (preset) onApply(preset.filters);
  };

  const handleSave = () => {
    const name = nameInput.trim();
    if (!name) return;
    const saved = saveFilterPreset(uid, pageKey, name, getFilters());
    refresh();
    setSelectedId(saved.id);
    setNameOpen(false);
    setNameInput('');
  };

  const handleDelete = () => {
    if (!selectedId) return;
    if (!window.confirm(t.deleteSavedFilterConfirm.replace('{name}', selected?.name || ''))) return;
    deleteSavedFilter(uid, pageKey, selectedId);
    setSelectedId('');
    refresh();
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <Bookmark size={14} className="text-blue-500" />
        <span>{t.quickFilters}</span>
      </div>
      <select
        value={selectedId}
        onChange={(e) => handleSelect(e.target.value)}
        className="min-w-[160px] border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
      >
        <option value="">{t.selectQuickFilter}</option>
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {!nameOpen ? (
        <button
          type="button"
          onClick={() => setNameOpen(true)}
          disabled={!canSave}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
          title={t.saveCurrentFilter}
        >
          <Save size={15} />
          <span className="hidden sm:inline">{t.saveCurrentFilter}</span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') {
                setNameOpen(false);
                setNameInput('');
              }
            }}
            placeholder={t.savedFilterNamePlaceholder}
            className="w-40 border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={!nameInput.trim()}
            className="px-3 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {t.save}
          </button>
          <button
            type="button"
            onClick={() => {
              setNameOpen(false);
              setNameInput('');
            }}
            className="px-2 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            {t.cancel}
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={!selectedId}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
        title={t.deleteSavedFilter}
      >
        <Trash2 size={15} />
        <span className="hidden sm:inline">{t.deleteSavedFilter}</span>
      </button>
    </div>
  );
}
