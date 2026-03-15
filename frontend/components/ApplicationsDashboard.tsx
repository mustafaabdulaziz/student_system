import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Application, Student, Program, University, User } from '../types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from '../hooks/useTranslation';
import { Filter, DollarSign, ChevronDown, X } from 'lucide-react';

interface MultiSelectOption {
  value: string;
  label: string;
}

function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  className = '',
  selectedCountLabel = 'seçildi',
  noOptionsLabel = 'Seçenek yok',
  clearTitle = 'Temizle',
  searchPlaceholder,
  searchable = false
}: {
  options: MultiSelectOption[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  className?: string;
  selectedCountLabel?: string;
  noOptionsLabel?: string;
  clearTitle?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', fn);
    return () => document.removeEventListener('click', fn);
  }, []);
  useEffect(() => {
    if (!open) setSearchQuery('');
  }, [open]);
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const q = searchQuery.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, searchable, searchQuery]);
  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };
  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };
  const label = value.length === 0 ? placeholder : (value.length === 1
    ? options.find((o) => o.value === value[0])?.label ?? value[0]
    : `${value.length} ${selectedCountLabel}`);
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 p-2.5 border border-gray-200 rounded-lg text-sm text-left bg-white hover:border-gray-300 min-h-[40px]"
      >
        <span className={value.length === 0 ? 'text-gray-500' : ''}>{label}</span>
        <span className="flex items-center gap-1">
          {value.length > 0 && (
            <span onClick={clear} className="p-0.5 rounded hover:bg-gray-100" title={clearTitle}>
              <X size={14} className="text-gray-500" />
            </span>
          )}
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-64 overflow-hidden flex flex-col">
          {searchable && (
            <div className="p-2 border-b border-gray-100 flex-shrink-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          )}
          <div className="overflow-y-auto max-h-52">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">{noOptionsLabel}</div>
            ) : (
              filteredOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={value.includes(opt.value)}
                    onChange={() => toggle(opt.value)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span>{opt.label}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function dateOnly(iso: string | undefined): string {
  if (!iso) return '';
  return iso.split('T')[0];
}

function getMonthStartEnd(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const from = `${y}-${m}-01`;
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  const to = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

function getDatePreset(preset: string): { from: string; to: string } {
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
      return getMonthStartEnd();
  }
}

const DATE_PRESETS = [
  { id: 'yesterday', labelKey: 'yesterday' },
  { id: 'last7', labelKey: 'last7Days' },
  { id: 'thisWeek', labelKey: 'thisWeek' },
  { id: 'lastWeek', labelKey: 'lastWeek' },
  { id: 'thisMonth', labelKey: 'thisMonth' },
  { id: 'lastMonth', labelKey: 'lastMonth' },
  { id: 'thisYear', labelKey: 'thisYear' }
] as const;

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const TOP_CHART_ITEMS = 20;

interface ApplicationsDashboardProps {
  applications: Application[];
  students: Student[];
  programs: Program[];
  universities: University[];
  users: User[];
}

export const ApplicationsDashboard: React.FC<ApplicationsDashboardProps> = ({
  applications,
  students,
  programs,
  universities,
  users
}) => {
  const { t, translateStatus } = useTranslation();
  const defaultRange = getMonthStartEnd();
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [filterResponsible, setFilterResponsible] = useState<string[]>([]);
  const [filterAgent, setFilterAgent] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterUniversity, setFilterUniversity] = useState<string[]>([]);
  const [filterProgram, setFilterProgram] = useState<string[]>([]);
  const [filterCountry, setFilterCountry] = useState<string[]>([]);


  const applyDatePreset = (presetId: string) => {
    const { from, to } = getDatePreset(presetId);
    setFromDate(from);
    setToDate(to);
  };

  const getStudent = (id: string) => students.find((s) => s.id === id);
  const getProgram = (id: string) => programs.find((p) => p.id === id);
  const getUni = (id: string) => universities.find((u) => u.id === id);
  const getAgentName = (app: Application) =>
    app.agentName || (app.userId && users.find((u) => u.id === app.userId)?.name) || '—';
  const getResponsibleName = (app: Application) => app.responsibleName || (app.responsibleId && users.find((u) => u.id === app.responsibleId)?.name) || '—';

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const d = dateOnly(app.createdAt);
      if (fromDate && toDate && (!d || d < fromDate || d > toDate)) return false;
      const student = getStudent(app.studentId);
      const program = getProgram(app.programId);
      const uni = program ? getUni(program.universityId) : null;

      if (filterResponsible.length > 0 && !filterResponsible.includes(getResponsibleName(app))) return false;
      if (filterAgent.length > 0 && !filterAgent.includes(getAgentName(app))) return false;
      if (filterStatus.length > 0 && !filterStatus.includes(app.status)) return false;
      if (filterUniversity.length > 0 && (!program || !filterUniversity.includes(program.universityId))) return false;
      if (filterProgram.length > 0 && (!program || !filterProgram.includes(program.id))) return false;
      if (filterCountry.length > 0 && (!student || !filterCountry.includes(student.nationality))) return false;
      return true;
    });
  }, [
    applications,
    fromDate,
    toDate,
    filterResponsible,
    filterAgent,
    filterStatus,
    filterUniversity,
    filterProgram,
    filterCountry,
    students,
    programs,
    universities,
    users
  ]);

  const chartByResponsible = useMemo(() => {
    const map: Record<string, number> = {};
    filteredApplications.forEach((app) => {
      const name = getResponsibleName(app) || t.filterAll;
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count, value: count }));
  }, [filteredApplications, users]);

  const chartByAgent = useMemo(() => {
    const map: Record<string, number> = {};
    filteredApplications.forEach((app) => {
      const name = getAgentName(app) || t.filterAll;
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count, value: count }));
  }, [filteredApplications, users]);

  const STATUS_KEYS = ['Draft', 'Missing Documents', 'Under Review', 'Accepted', 'Rejected'] as const;
  const chartByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    filteredApplications.forEach((app) => {
      const s = app.status || 'Draft';
      map[s] = (map[s] || 0) + 1;
    });
    return STATUS_KEYS.filter((k) => (map[k] ?? 0) > 0).map((k) => ({
      name: translateStatus(k),
      count: map[k] ?? 0,
      value: map[k] ?? 0
    }));
  }, [filteredApplications]);

  const topNWithOthers = (items: { name: string; count: number }[], othersLabel: string) => {
    const sorted = [...items].sort((a, b) => b.count - a.count);
    let result: { name: string; count: number }[];
    if (sorted.length <= TOP_CHART_ITEMS) result = sorted;
    else {
      const top = sorted.slice(0, TOP_CHART_ITEMS);
      const othersCount = sorted.slice(TOP_CHART_ITEMS).reduce((s, x) => s + x.count, 0);
      result = [...top, { name: othersLabel, count: othersCount }];
    }
    return result.reverse();
  };

  const chartByUniversity = useMemo(() => {
    const map: Record<string, number> = {};
    filteredApplications.forEach((app) => {
      const program = getProgram(app.programId);
      const uni = program ? getUni(program.universityId) : null;
      const name = uni?.name ?? '—';
      map[name] = (map[name] || 0) + 1;
    });
    const items = Object.entries(map).map(([name, count]) => ({ name, count }));
    return topNWithOthers(items, t.others);
  }, [filteredApplications, programs, universities, t.others]);

  const chartByProgram = useMemo(() => {
    const map: Record<string, number> = {};
    filteredApplications.forEach((app) => {
      const program = getProgram(app.programId);
      const name = program?.name ?? '—';
      map[name] = (map[name] || 0) + 1;
    });
    const items = Object.entries(map).map(([name, count]) => ({ name, count }));
    return topNWithOthers(items, t.others);
  }, [filteredApplications, programs, t.others]);

  const chartByCountry = useMemo(() => {
    const map: Record<string, number> = {};
    filteredApplications.forEach((app) => {
      const student = getStudent(app.studentId);
      const name = student?.nationality ?? '—';
      map[name] = (map[name] || 0) + 1;
    });
    const items = Object.entries(map).map(([name, count]) => ({ name, count }));
    return topNWithOthers(items, t.others);
  }, [filteredApplications, students, t.others]);

  const totals = useMemo(() => {
    let cost = 0,
      commission = 0,
      sale = 0;
    filteredApplications.forEach((app) => {
      cost += Number(app.cost) || 0;
      commission += Number(app.commission) || 0;
      sale += Number(app.saleAmount) || 0;
    });
    const profit = sale - cost - commission;
    return { cost, commission, sale, profit };
  }, [filteredApplications]);

  const uniqueResponsibles = useMemo(() => {
    const set = new Set<string>();
    applications.forEach((app) => {
      const n = getResponsibleName(app);
      if (n && n !== '—') set.add(n);
    });
    return Array.from(set).sort();
  }, [applications, users]);
  const uniqueAgents = useMemo(() => {
    const set = new Set<string>();
    applications.forEach((app) => {
      const n = getAgentName(app);
      if (n && n !== '—') set.add(n);
    });
    return Array.from(set).sort();
  }, [applications, users]);
  const uniqueCountries = useMemo(() => {
    const set = new Set(students.map((s) => s.nationality).filter(Boolean));
    return Array.from(set).sort();
  }, [students]);

  const toggleFilter = (arr: string[], set: (v: string[]) => void, value: string) => {
    if (arr.includes(value)) set(arr.filter((x) => x !== value));
    else set([...arr, value]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{t.applicationsDashboard}</h2>
        <p className="text-gray-500 text-sm mt-1">{t.applicationsSubtitle}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-blue-600" />
          <h3 className="font-bold text-gray-800">{t.filter}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.createdAt}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyDatePreset(p.id)}
                  className="px-2 py-1 text-xs rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-800"
                >
                  {t[p.labelKey as keyof typeof t]}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="flex-1 min-w-0 p-2 border border-gray-200 rounded-lg text-sm"
              />
              <span className="text-gray-400">–</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="flex-1 min-w-0 p-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.responsible}</label>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {uniqueResponsibles.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleFilter(filterResponsible, setFilterResponsible, name)}
                  className={`px-2 py-1 rounded text-xs ${filterResponsible.includes(name) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.agent}</label>
            <MultiSelect
              options={uniqueAgents.map((name) => ({ value: name, label: name }))}
              value={filterAgent}
              onChange={setFilterAgent}
              placeholder={t.filterAll}
              selectedCountLabel={t.selectedCountLabel}
              noOptionsLabel={t.noOptions}
              clearTitle={t.clearFilter}
              searchable
              searchPlaceholder={t.search}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.applicationStatus}</label>
            <MultiSelect
              options={['Draft', 'Missing Documents', 'Under Review', 'Accepted', 'Rejected'].map((st) => ({
                value: st,
                label: translateStatus(st)
              }))}
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder={t.filterAll}
              selectedCountLabel={t.selectedCountLabel}
              noOptionsLabel={t.noOptions}
              clearTitle={t.clearFilter}
              searchable
              searchPlaceholder={t.search}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.universitiesTitle}</label>
            <MultiSelect
              options={universities.map((u) => ({ value: u.id, label: u.name }))}
              value={filterUniversity}
              onChange={setFilterUniversity}
              placeholder={t.filterAll}
              selectedCountLabel={t.selectedCountLabel}
              noOptionsLabel={t.noOptions}
              clearTitle={t.clearFilter}
              searchable
              searchPlaceholder={t.search}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.programsTitle}</label>
            <MultiSelect
              options={programs.map((p) => ({ value: p.id, label: p.name }))}
              value={filterProgram}
              onChange={setFilterProgram}
              placeholder={t.filterAll}
              selectedCountLabel={t.selectedCountLabel}
              noOptionsLabel={t.noOptions}
              clearTitle={t.clearFilter}
              searchable
              searchPlaceholder={t.search}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.nationality}</label>
            <MultiSelect
              options={uniqueCountries.map((c) => ({ value: c, label: c }))}
              value={filterCountry}
              onChange={setFilterCountry}
              placeholder={t.filterAll}
              selectedCountLabel={t.selectedCountLabel}
              noOptionsLabel={t.noOptions}
              clearTitle={t.clearFilter}
              searchable
              searchPlaceholder={t.search}
            />
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <DollarSign size={20} />
          {t.totalsByFilter}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs font-medium text-blue-600 uppercase">{t.totalCost}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{totals.cost.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <p className="text-xs font-medium text-emerald-600 uppercase">{t.commission}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{totals.commission.toLocaleString()}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <p className="text-xs font-medium text-purple-600 uppercase">{t.saleAmount}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{totals.sale.toLocaleString()}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <p className="text-xs font-medium text-amber-600 uppercase">{t.profit}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{totals.profit.toLocaleString()}</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-3">
          {filteredApplications.length} {t.applicationsTitle.toLowerCase()}
        </p>
      </div>

      {/* Row 1: Sorumluya göre | Duruma göre */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-4">{t.byResponsible}</h3>
          {chartByResponsible.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartByResponsible}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {chartByResponsible.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400">{t.noApplications}</div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-4">{t.byStatus}</h3>
          {chartByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartByStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {chartByStatus.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400">{t.noApplications}</div>
          )}
        </div>
      </div>

      {/* Row 2: Temsilciye göre | Üniversiteye göre */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-4">{t.byAgent}</h3>
          {chartByAgent.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartByAgent} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" name={t.totalApplications} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400">{t.noApplications}</div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-4">{t.byUniversity}</h3>
          {chartByUniversity.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartByUniversity} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" name={t.totalApplications} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-gray-400">{t.noApplications}</div>
          )}
        </div>
      </div>

      {/* Row 3: Bölüme göre | Ülkeye göre */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-4">{t.byProgram}</h3>
          {chartByProgram.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartByProgram} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" name={t.totalApplications} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-gray-400">{t.noApplications}</div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-4">{t.byCountry}</h3>
          {chartByCountry.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartByCountry} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" name={t.totalApplications} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-gray-400">{t.noApplications}</div>
          )}
        </div>
      </div>
    </div>
  );
};
