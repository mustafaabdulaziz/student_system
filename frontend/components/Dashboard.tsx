import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Student, Application, Program, University, User, UserRole, ApplicationListFilters } from '../types';
import { Users, FileText, School, TrendingUp, Filter, BarChart3, List, DollarSign } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { ApplicationStatus } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { DATE_PRESETS, getDatePreset, getLast30DaysRange } from '../utils/datePresets';

interface DashboardProps {
  students: Student[];
  applications: Application[];
  programs: Program[];
  universities: University[];
  users: User[];
  currentUser: User | null;
  universitiesCount: number;
  onDrilldownToApplications: (filters: ApplicationListFilters) => void;
}

type DrilldownDimension = 'status' | 'university' | 'program' | 'country' | 'degree' | 'responsible' | 'agency';

interface MultiSelectOption {
  value: string;
  label: string;
}

function MultiSelect({
  options,
  value,
  onChange,
  placeholder
}: {
  options: MultiSelectOption[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };
  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };
  const label = value.length === 0
    ? placeholder
    : value.length === 1
      ? options.find((o) => o.value === value[0])?.label ?? value[0]
      : `${value.length} secili`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
      >
        <span className={value.length === 0 ? 'text-gray-500' : 'text-gray-800'}>{label}</span>
        {value.length > 0 ? (
          <span onClick={clear} className="text-xs text-gray-500 hover:text-gray-700">Temizle</span>
        ) : (
          <span className="text-xs text-gray-400">▼</span>
        )}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-56 overflow-y-auto">
          {options.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">Secenek yok</div>
          ) : (
            options.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm cursor-pointer">
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
      )}
    </div>
  );
}

function dateOnly(iso: string | undefined): string {
  if (!iso) return '';
  return iso.split('T')[0];
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];
const TOP_RANKED_CHART_ITEMS = 20;

interface RankedStatRow {
  label: string;
  value: number;
}

function topNWithOthers(
  items: RankedStatRow[],
  othersLabel: string,
  topN: number
): RankedStatRow[] {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  if (sorted.length <= topN) return [...sorted].reverse();
  const top = sorted.slice(0, topN);
  const othersCount = sorted.slice(topN).reduce((sum, item) => sum + item.value, 0);
  return [...top, { label: othersLabel, value: othersCount }].reverse();
}

function RankedStatsCard({
  title,
  stats,
  totalApplications,
  barColor,
  searchPlaceholder,
  nameColumnLabel,
  countSummary,
  emptyText,
  othersLabel,
  topNote,
  showFullListLabel,
  showChartLabel,
  searchNoResults,
  shareLabel,
  totalApplicationsLabel,
  topN = TOP_RANKED_CHART_ITEMS,
  onItemClick
}: {
  title: string;
  stats: RankedStatRow[];
  totalApplications: number;
  barColor: string;
  searchPlaceholder: string;
  nameColumnLabel: string;
  countSummary?: string;
  emptyText: string;
  othersLabel: string;
  topNote: string;
  showFullListLabel: string;
  showChartLabel: string;
  searchNoResults: string;
  shareLabel: string;
  totalApplicationsLabel: string;
  topN?: number;
  onItemClick?: (label: string) => void;
}) {
  const [showTable, setShowTable] = useState(false);
  const [search, setSearch] = useState('');

  const chartData = useMemo(
    () => topNWithOthers(stats, othersLabel, topN),
    [stats, othersLabel, topN]
  );
  const chartHeight = Math.min(Math.max(260, chartData.length * 28), 320);
  const hasMoreThanTop = stats.length > topN;

  const tableRows = useMemo(() => {
    const total = totalApplications || 1;
    const query = search.trim().toLowerCase();
    return stats
      .map((row, index) => ({
        rank: index + 1,
        label: row.label,
        value: row.value,
        share: Math.round((row.value / total) * 1000) / 10
      }))
      .filter((row) => !query || row.label.toLowerCase().includes(query));
  }, [stats, totalApplications, search]);

  const handleItemClick = (label: string) => {
    if (!onItemClick || label === othersLabel || label === '—') return;
    onItemClick(label);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
          {countSummary && stats.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">{countSummary}</p>
          )}
        </div>
        {stats.length > 0 && (
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
          >
            {showTable ? <BarChart3 size={16} /> : <List size={16} />}
            {showTable ? showChartLabel : showFullListLabel}
          </button>
        )}
      </div>
      {stats.length === 0 ? (
        <p className="text-sm text-gray-400">{emptyText}</p>
      ) : showTable ? (
        <div className="space-y-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="max-h-[320px] overflow-y-auto rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium w-8">#</th>
                  <th className="px-3 py-2 text-left font-medium">{nameColumnLabel}</th>
                  <th className="px-3 py-2 text-right font-medium w-14">{totalApplicationsLabel}</th>
                  <th className="px-3 py-2 text-right font-medium w-12">{shareLabel}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-gray-400">{searchNoResults}</td>
                  </tr>
                ) : (
                  tableRows.map((row) => (
                    <tr key={row.label} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400">{row.rank}</td>
                      <td className="px-3 py-2 font-medium text-gray-800 truncate max-w-[140px]">
                        {onItemClick ? (
                          <button
                            type="button"
                            onClick={() => handleItemClick(row.label)}
                            className="text-left text-blue-600 hover:text-blue-800 hover:underline truncate max-w-full"
                            title={row.label}
                          >
                            {row.label}
                          </button>
                        ) : (
                          <span title={row.label}>{row.label}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800">{row.value}</td>
                      <td className="px-3 py-2 text-right text-xs text-gray-500">%{row.share}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          {hasMoreThanTop && (
            <p className="text-xs text-gray-400 mb-2">{topNote}</p>
          )}
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 12, left: 8, bottom: 5 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: number) => [value, totalApplicationsLabel]} />
              <Bar
                dataKey="value"
                fill={barColor}
                radius={[0, 4, 4, 0]}
                cursor={onItemClick ? 'pointer' : undefined}
                onClick={(data) => handleItemClick(String(data?.label ?? ''))}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export const Dashboard: React.FC<DashboardProps> = ({
  students,
  applications,
  programs,
  universities,
  users,
  currentUser,
  universitiesCount,
  onDrilldownToApplications
}) => {
  const { t, translateStatus } = useTranslation();
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const canSeeCountryChart = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.USER;
  const defaultRange = getLast30DaysRange();
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [filterActive, setFilterActive] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [universityFilter, setUniversityFilter] = useState<string[]>([]);
  const [programFilter, setProgramFilter] = useState<string[]>([]);
  const [degreeFilter, setDegreeFilter] = useState<string[]>([]);
  const [agentFilter, setAgentFilter] = useState<string[]>([]);
  const [responsibleFilter, setResponsibleFilter] = useState<string[]>([]);
  const [nationalityFilter, setNationalityFilter] = useState<string[]>([]);
  const [currencyFilter, setCurrencyFilter] = useState<string[]>([]);

  const canSeeNationalityFilter = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.USER;

  const studentById = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  const getResponsibleName = (app: Application) =>
    app.responsibleName || (app.responsibleId && users.find((u) => u.id === app.responsibleId)?.name) || '—';

  const getAgentName = (app: Application) =>
    app.agentName || (app.userId && users.find((u) => u.id === app.userId)?.name) || '—';

  const scopedApplications = useMemo(() => {
    if (currentUser?.role === UserRole.AGENT) {
      return applications.filter((app) => app.userId === currentUser.id);
    }
    return applications;
  }, [applications, currentUser]);

  const scopedStudents = useMemo(() => {
    if (currentUser?.role === UserRole.AGENT) {
      return students.filter((student) => student.userId === currentUser.id);
    }
    return students;
  }, [students, currentUser]);

  const filteredApplications = useMemo(() => {
    return scopedApplications.filter((app) => {
      const d = dateOnly(app.createdAt);
      if (filterActive && fromDate && toDate && (!d || d < fromDate || d > toDate)) return false;
      const program = programs.find((p) => p.id === app.programId);
      if (statusFilter.length > 0 && !statusFilter.includes(app.status)) return false;
      if (universityFilter.length > 0 && (!program || !universityFilter.includes(program.universityId))) return false;
      if (programFilter.length > 0 && !programFilter.includes(app.programId)) return false;
      if (degreeFilter.length > 0 && (!program || !degreeFilter.includes(program.degree))) return false;
      if (agentFilter.length > 0 && !agentFilter.includes(getAgentName(app))) return false;
      if (responsibleFilter.length > 0 && !responsibleFilter.includes(getResponsibleName(app))) return false;
      if (nationalityFilter.length > 0) {
        const nationality = studentById.get(app.studentId)?.nationality;
        if (!nationality || !nationalityFilter.includes(nationality)) return false;
      }
      if (currencyFilter.length > 0 && !currencyFilter.includes((app.currency || 'USD').toUpperCase())) return false;
      return true;
    });
  }, [scopedApplications, filterActive, fromDate, toDate, programs, statusFilter, universityFilter, programFilter, degreeFilter, agentFilter, responsibleFilter, nationalityFilter, currencyFilter, studentById, users]);

  const filteredStudents = useMemo(() => {
    const from = fromDate;
    const to = toDate;
    return scopedStudents.filter((s) => {
      if (!filterActive || !fromDate || !toDate) return true;
      const d = dateOnly(s.createdAt);
      return d && d >= from && d <= to;
    });
  }, [scopedStudents, filterActive, fromDate, toDate]);

  const handleApply = () => {
    if (fromDate && toDate) setFilterActive(true);
  };
  const applyDatePreset = (presetId: string) => {
    const { from, to } = getDatePreset(presetId);
    setFromDate(from);
    setToDate(to);
    setFilterActive(true);
  };
  const handleClearFilter = () => {
    const range = getLast30DaysRange();
    setFromDate(range.from);
    setToDate(range.to);
    setFilterActive(true);
    setStatusFilter([]);
    setUniversityFilter([]);
    setProgramFilter([]);
    setDegreeFilter([]);
    setAgentFilter([]);
    setResponsibleFilter([]);
    setNationalityFilter([]);
    setCurrencyFilter([]);
  };

  // Helper to get program name (use full students list for name lookup)
  const getProgramName = (progId: string) => programs.find(p => p.id === progId)?.name || t.noPrograms;
  const getUniversityName = (uniId: string) => universities.find((u) => u.id === uniId)?.name || '—';
  const programById = useMemo(() => {
    const map = new Map<string, Program>();
    programs.forEach((p) => map.set(p.id, p));
    return map;
  }, [programs]);

  const uniqueAgents = useMemo(() => {
    const names = new Set<string>();
    scopedApplications.forEach((app) => {
      const name = getAgentName(app);
      if (name && name !== '—') names.add(name);
    });
    return Array.from(names).sort().map((name) => ({ value: name, label: name }));
  }, [scopedApplications, users]);

  const uniqueResponsibles = useMemo(() => {
    const names = new Set<string>();
    scopedApplications.forEach((app) => {
      const name = getResponsibleName(app);
      if (name && name !== '—') names.add(name);
    });
    return Array.from(names).sort().map((name) => ({ value: name, label: name }));
  }, [scopedApplications, users]);

  const uniqueNationalities = useMemo(() => {
    const set = new Set<string>();
    scopedApplications.forEach((app) => {
      const nationality = studentById.get(app.studentId)?.nationality;
      if (nationality) set.add(nationality);
    });
    return Array.from(set).sort().map((name) => ({ value: name, label: name }));
  }, [scopedApplications, studentById]);

  const uniqueCurrencies = useMemo(() => {
    const set = new Set<string>();
    scopedApplications.forEach((app) => {
      set.add((app.currency || 'USD').toUpperCase());
    });
    return Array.from(set).sort().map((c) => ({ value: c, label: c }));
  }, [scopedApplications]);

  const uniqueDegrees = useMemo(() => {
    return Array.from(new Set(programs.map((p) => p.degree))).sort();
  }, [programs]);

  const statusStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredApplications.forEach((app) => {
      map.set(app.status, (map.get(app.status) || 0) + 1);
    });
    return Array.from(map.entries()).map(([key, value]) => ({ key, label: translateStatus(key as any), value }));
  }, [filteredApplications, translateStatus]);

  const universityStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredApplications.forEach((app) => {
      const program = programById.get(app.programId);
      const uniName = program ? getUniversityName(program.universityId) : '—';
      map.set(uniName, (map.get(uniName) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [filteredApplications, programById, universities]);

  const programStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredApplications.forEach((app) => {
      const progName = getProgramName(app.programId);
      map.set(progName, (map.get(progName) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [filteredApplications, programs]);

  const degreeStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredApplications.forEach((app) => {
      const degree = programById.get(app.programId)?.degree || '—';
      map.set(degree, (map.get(degree) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [filteredApplications, programById]);

  const countryStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredApplications.forEach((app) => {
      const nationality = studentById.get(app.studentId)?.nationality || '—';
      map.set(nationality, (map.get(nationality) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [filteredApplications, studentById]);

  const responsibleStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredApplications.forEach((app) => {
      const name = getResponsibleName(app);
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [filteredApplications, users]);

  const agencyStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredApplications.forEach((app) => {
      const name = getAgentName(app);
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [filteredApplications, users]);

  const totals = useMemo(() => {
    let annualPayment = 0,
      netCommission = 0,
      bonusMax = 0,
      bonusMin = 0,
      agencyCommission = 0,
      agencyBonus = 0,
      remainingMin = 0,
      remainingMax = 0;
    filteredApplications.forEach((app) => {
      annualPayment += Number(app.annualPayment) || 0;
      netCommission += Number(app.netCommission) || 0;
      bonusMax += Number(app.bonusMax) || 0;
      bonusMin += Number(app.bonusMin) || 0;
      agencyCommission += Number(app.agencyCommission) || 0;
      agencyBonus += Number(app.agencyBonus) || 0;
      remainingMin += Number(app.remainingMin) || 0;
      remainingMax += Number(app.remainingMax) || 0;
    });
    return {
      annualPayment,
      netCommission,
      bonusMax,
      bonusMin,
      agencyCommission,
      agencyBonus,
      remainingMin,
      remainingMax
    };
  }, [filteredApplications]);

  const rankedCardLabels = {
    othersLabel: t.others,
    topNote: t.chartTop20Note,
    showFullListLabel: t.showFullList,
    showChartLabel: t.showChart,
    searchNoResults: t.searchNoResults,
    shareLabel: t.chartShare,
    totalApplicationsLabel: t.totalApplications,
    emptyText: t.noApplications
  };

  const handleDrilldown = (dimension: DrilldownDimension, value: string) => {
    if (!value || value === '—' || value === t.others) return;

    let universityIds = [...universityFilter];
    let programIds = [...programFilter];
    let statuses = [...statusFilter];
    let degrees = [...degreeFilter];
    let nationalities = [...nationalityFilter];
    let responsibles = [...responsibleFilter];
    let agents = [...agentFilter];
    let currencies = [...currencyFilter];

    switch (dimension) {
      case 'status':
        statuses = [value];
        break;
      case 'university': {
        const id = universities.find((u) => u.name === value)?.id;
        if (id) universityIds = [id];
        break;
      }
      case 'program': {
        const candidates = programs.filter((p) => p.name === value);
        const match =
          universityFilter.length === 1
            ? candidates.find((p) => p.universityId === universityFilter[0]) ?? candidates[0]
            : candidates[0];
        if (match) programIds = [match.id];
        break;
      }
      case 'country':
        nationalities = [value];
        break;
      case 'degree':
        degrees = [value];
        break;
      case 'responsible':
        responsibles = [value];
        break;
      case 'agency':
        agents = [value];
        break;
    }

    onDrilldownToApplications({
      ...(filterActive && fromDate ? { createdFrom: fromDate } : {}),
      ...(filterActive && toDate ? { createdTo: toDate } : {}),
      ...(statuses.length > 0 ? { statuses } : {}),
      ...(universityIds.length > 0 ? { universityIds } : {}),
      ...(programIds.length > 0 ? { programIds } : {}),
      ...(degrees.length > 0 ? { degrees } : {}),
      ...(nationalities.length > 0 ? { nationalities } : {}),
      ...(responsibles.length > 0 ? { responsibles } : {}),
      ...(agents.length > 0 ? { agents } : {}),
      ...(currencies.length > 0 ? { currencies } : {}),
    });
  };

  const stats = [
    { label: t.totalStudents, value: filteredStudents.length, icon: Users, color: 'bg-blue-500' },
    { label: t.totalApplications, value: filteredApplications.length, icon: FileText, color: 'bg-emerald-500' },
    { label: t.totalUniversities, value: universitiesCount, icon: School, color: 'bg-purple-500' },
    { label: t.totalPrograms, value: programs.length, icon: TrendingUp, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">{t.dashboardTitle}</h2>
          <p className="text-gray-500">{t.recentApplications}</p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-3">
          <div className="flex flex-wrap gap-2 justify-end">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyDatePreset(p.id)}
                className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-800 transition-colors"
              >
                {t[p.labelKey as keyof typeof t] as string}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 justify-end">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">{t.fromDate}</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">{t.toDate}</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Filter size={16} />
            {t.applyFilter}
          </button>
          {filterActive && (
            <button
              type="button"
              onClick={handleClearFilter}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {t.clearFilter}
            </button>
          )}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <MultiSelect
            options={Object.values(ApplicationStatus).map((status) => ({
              value: status,
              label: translateStatus(status as any)
            }))}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder={t.applicationStatus}
          />
          <MultiSelect
            options={universities.map((u) => ({ value: u.id, label: u.name }))}
            value={universityFilter}
            onChange={setUniversityFilter}
            placeholder={t.universitiesTitle}
          />
          <MultiSelect
            options={programs
              .filter((p) => universityFilter.length === 0 || universityFilter.includes(p.universityId))
              .map((p) => ({ value: p.id, label: p.name }))}
            value={programFilter}
            onChange={setProgramFilter}
            placeholder={t.programsTitle}
          />
          <MultiSelect
            options={uniqueDegrees.map((d) => ({ value: d, label: d }))}
            value={degreeFilter}
            onChange={setDegreeFilter}
            placeholder={t.programDegree}
          />
          {canSeeNationalityFilter && (
            <MultiSelect
              options={uniqueNationalities}
              value={nationalityFilter}
              onChange={setNationalityFilter}
              placeholder={t.nationality}
            />
          )}
          {isAdmin && (
            <MultiSelect
              options={uniqueAgents}
              value={agentFilter}
              onChange={setAgentFilter}
              placeholder={t.agent}
            />
          )}
          {isAdmin && (
            <MultiSelect
              options={uniqueResponsibles}
              value={responsibleFilter}
              onChange={setResponsibleFilter}
              placeholder={t.responsible}
            />
          )}
          {isAdmin && (
            <MultiSelect
              options={uniqueCurrencies}
              value={currencyFilter}
              onChange={setCurrencyFilter}
              placeholder={t.currency}
            />
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-5">
            <div className={`p-4 rounded-lg text-white shrink-0 ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-gray-500 text-sm">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <DollarSign size={20} />
            {t.totalsByFilter}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-xs font-medium text-blue-600 uppercase">Yıllık ödeme</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{totals.annualPayment.toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-xs font-medium text-emerald-600 uppercase">Net komisyon</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{totals.netCommission.toLocaleString()}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
              <p className="text-xs font-medium text-purple-600 uppercase">Bonus Max</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{totals.bonusMax.toLocaleString()}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <p className="text-xs font-medium text-amber-600 uppercase">Bonus Min</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{totals.bonusMin.toLocaleString()}</p>
            </div>
            <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-100">
              <p className="text-xs font-medium text-cyan-700 uppercase">Acenta komisyon</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{totals.agencyCommission.toLocaleString()}</p>
            </div>
            <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
              <p className="text-xs font-medium text-rose-700 uppercase">Acenta Bonus</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{totals.agencyBonus.toLocaleString()}</p>
            </div>
            <div className="bg-lime-50 rounded-xl p-4 border border-lime-100">
              <p className="text-xs font-medium text-lime-700 uppercase">Kalan Min</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{totals.remainingMin.toLocaleString()}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
              <p className="text-xs font-medium text-orange-700 uppercase">Kalan Max</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{totals.remainingMax.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            {filteredApplications.length} {t.applicationsTitle.toLowerCase()}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3">{t.byStatus}</h3>
          {statusStats.length === 0 ? (
            <p className="text-sm text-gray-400">{t.noApplications}</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusStats}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ label, value }) => `${label}: ${value}`}
                  style={{ cursor: 'pointer' }}
                  onClick={(_, index) => {
                    const item = statusStats[index];
                    if (item?.key) handleDrilldown('status', item.key);
                  }}
                >
                  {statusStats.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <RankedStatsCard
          title={t.byUniversity}
          stats={universityStats}
          totalApplications={filteredApplications.length}
          barColor="#10b981"
          searchPlaceholder={t.searchUniversities}
          nameColumnLabel={t.byUniversity}
          countSummary={`${universityStats.length} ${t.universitiesTitle.toLowerCase()} · ${filteredApplications.length} ${t.totalApplications.toLowerCase()}`}
          onItemClick={(label) => handleDrilldown('university', label)}
          {...rankedCardLabels}
        />
        <RankedStatsCard
          title={t.byProgram}
          stats={programStats}
          totalApplications={filteredApplications.length}
          barColor="#8b5cf6"
          searchPlaceholder={t.searchProgramNamePlaceholder}
          nameColumnLabel={t.byProgram}
          countSummary={`${programStats.length} ${t.programsTitle.toLowerCase()} · ${filteredApplications.length} ${t.totalApplications.toLowerCase()}`}
          onItemClick={(label) => handleDrilldown('program', label)}
          {...rankedCardLabels}
        />
        <div className="bg-white rounded-xl border border-gray-100 p-4 min-w-0">
          <h3 className="font-semibold text-gray-800 mb-3">{t.programDegree}</h3>
          {degreeStats.length === 0 ? (
            <p className="text-sm text-gray-400">{t.noApplications}</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={degreeStats} margin={{ top: 5, right: 12, left: 0, bottom: 24 }}>
                <XAxis dataKey="label" angle={-20} textAnchor="end" height={50} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="value"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(data) => handleDrilldown('degree', String(data?.label ?? ''))}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {(canSeeCountryChart || isAdmin) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {canSeeCountryChart && (
            <RankedStatsCard
              title={t.byCountry}
              stats={countryStats}
              totalApplications={filteredApplications.length}
              barColor="#06b6d4"
              searchPlaceholder={t.search}
              nameColumnLabel={t.byCountry}
              countSummary={`${countryStats.length} ${t.nationality.toLowerCase()} · ${filteredApplications.length} ${t.totalApplications.toLowerCase()}`}
              onItemClick={(label) => handleDrilldown('country', label)}
              {...rankedCardLabels}
            />
          )}
          {isAdmin && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-800 mb-3">{t.byResponsible}</h3>
              {responsibleStats.length === 0 ? (
                <p className="text-sm text-gray-400">{t.noApplications}</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={responsibleStats}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ label, value }) => `${label}: ${value}`}
                      style={{ cursor: 'pointer' }}
                      onClick={(_, index) => {
                        const item = responsibleStats[index];
                        if (item?.label) handleDrilldown('responsible', item.label);
                      }}
                    >
                      {responsibleStats.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
          {isAdmin && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-800 mb-3">{t.byAgency}</h3>
              {agencyStats.length === 0 ? (
                <p className="text-sm text-gray-400">{t.noApplications}</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={agencyStats} margin={{ top: 5, right: 12, left: 0, bottom: 24 }}>
                    <XAxis dataKey="label" angle={-20} textAnchor="end" height={50} tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => handleDrilldown('agency', String(data?.label ?? ''))}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};