export function getLast30DaysRange(): { from: string; to: string } {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(start), to: fmt(end) };
}

export function getMonthStartEnd(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const from = `${y}-${m}-01`;
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  const to = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export function getDatePreset(preset: string): { from: string; to: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const format = (d: Date) => d.toISOString().slice(0, 10);

  switch (preset) {
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { from: format(y), to: format(y) };
    }
    case 'last7': {
      const end = new Date(today);
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { from: format(start), to: format(end) };
    }
    case 'last30': {
      return getLast30DaysRange();
    }
    case 'thisWeek': {
      const dow = today.getDay();
      const diff = dow === 0 ? -6 : 1 - dow;
      const start = new Date(today);
      start.setDate(start.getDate() + diff);
      return { from: format(start), to: format(today) };
    }
    case 'lastWeek': {
      const dow = today.getDay();
      const diff = dow === 0 ? -6 : 1 - dow;
      const end = new Date(today);
      end.setDate(end.getDate() + diff - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { from: format(start), to: format(end) };
    }
    case 'thisMonth':
      return getMonthStartEnd();
    case 'lastMonth': {
      const d = new Date(today.getFullYear(), today.getMonth(), 0);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const last = new Date(y, d.getMonth() + 1, 0).getDate();
      return { from: `${y}-${m}-01`, to: `${y}-${m}-${String(last).padStart(2, '0')}` };
    }
    case 'thisYear': {
      const y = today.getFullYear();
      return { from: `${y}-01-01`, to: format(today) };
    }
    default:
      return getLast30DaysRange();
  }
}

export const DATE_PRESETS = [
  { id: 'yesterday', labelKey: 'yesterday' },
  { id: 'last7', labelKey: 'last7Days' },
  { id: 'last30', labelKey: 'last30Days' },
  { id: 'thisWeek', labelKey: 'thisWeek' },
  { id: 'lastWeek', labelKey: 'lastWeek' },
  { id: 'thisMonth', labelKey: 'thisMonth' },
  { id: 'lastMonth', labelKey: 'lastMonth' },
  { id: 'thisYear', labelKey: 'thisYear' }
] as const;
