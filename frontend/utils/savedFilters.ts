export type SavedFilterPageKey =
  | 'dashboard'
  | 'programs'
  | 'students'
  | 'applications'
  | 'universities'
  | 'incoming-payments'
  | 'outgoing-payments'
  | 'payment-dashboard-applications';

export type SavedFilterPreset<T = Record<string, unknown>> = {
  id: string;
  name: string;
  createdAt: string;
  filters: T;
};

function storageKey(userId: string, pageKey: SavedFilterPageKey): string {
  return `saved-quick-filters:${userId || 'guest'}:${pageKey}`;
}

export function loadSavedFilters<T>(
  userId: string,
  pageKey: SavedFilterPageKey
): SavedFilterPreset<T>[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId, pageKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string' && item.filters)
      .map((item) => ({
        id: item.id,
        name: String(item.name),
        createdAt: String(item.createdAt || ''),
        filters: item.filters as T
      }));
  } catch {
    return [];
  }
}

function writeSavedFilters<T>(
  userId: string,
  pageKey: SavedFilterPageKey,
  presets: SavedFilterPreset<T>[]
): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(userId, pageKey), JSON.stringify(presets));
}

export function saveFilterPreset<T>(
  userId: string,
  pageKey: SavedFilterPageKey,
  name: string,
  filters: T
): SavedFilterPreset<T> {
  const trimmed = name.trim();
  const preset: SavedFilterPreset<T> = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: trimmed || 'Filter',
    createdAt: new Date().toISOString(),
    filters
  };
  const list = loadSavedFilters<T>(userId, pageKey);
  const existingIndex = list.findIndex((p) => p.name.toLowerCase() === preset.name.toLowerCase());
  if (existingIndex >= 0) {
    list[existingIndex] = { ...preset, id: list[existingIndex].id };
  } else {
    list.unshift(preset);
  }
  writeSavedFilters(userId, pageKey, list);
  return existingIndex >= 0 ? list[existingIndex] : preset;
}

export function deleteSavedFilter(
  userId: string,
  pageKey: SavedFilterPageKey,
  id: string
): SavedFilterPreset[] {
  const list = loadSavedFilters(userId, pageKey).filter((p) => p.id !== id);
  writeSavedFilters(userId, pageKey, list);
  return list;
}
