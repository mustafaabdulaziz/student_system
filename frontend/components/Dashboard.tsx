import React, { useState, useMemo, useEffect } from 'react';
import { Student, Application, Program, University, User, UserRole, ApplicationListFilters, Period } from '../types';
import { Users, FileText, School, Filter, BarChart3, List, DollarSign, Mail, Wallet, UserCheck, CircleCheck, CirclePlus, Clock3, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useTranslation } from '../hooks/useTranslation';
import { ApplicationStatus } from '../types';
import { normalizeApplicationStatus } from '../utils/applicationStatus';
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { DATE_PRESETS, getDatePreset } from '../utils/datePresets';
import { SearchableMultiSelect } from './SearchableMultiSelect';

interface DashboardProps {
  students: Student[];
  applications: Application[];
  programs: Program[];
  universities: University[];
  periods: Period[];
  users: User[];
  currentUser: User | null;
  universitiesCount: number;
  onDrilldownToApplications: (filters: ApplicationListFilters) => void;
}

interface DashboardOutgoingPayment {
  id: string;
  paymentDate: string;
  paymentAmount: number;
  currency?: string;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
}

type FinancialTableGroup = 'university' | 'agent' | 'period' | 'nationality';

const FINANCIAL_TABLE_FIELDS: Array<{ key: keyof Application; label: string }> = [
  { key: 'annualPayment', label: 'Yıllık ödeme' },
  { key: 'educationVat', label: 'Eğitim KDV tutarı' },
  { key: 'grossCommission', label: 'Brüt komisyon' },
  { key: 'abroadVat', label: 'Yurtdışı KDV tutarı' },
  { key: 'netCommission', label: 'Net komisyon' },
  { key: 'bonusMax', label: 'Bonus Max' },
  { key: 'bonusMin', label: 'Bonus Min' },
  { key: 'agencyCommission', label: 'Acenta komisyon' },
  { key: 'agencyBonus', label: 'Acenta bonus' },
  { key: 'depositSupport', label: 'Depozito desteği' },
  { key: 'agencyContractAmount', label: 'Acenta anlaşma miktarı' },
  { key: 'remainingMin', label: 'Kalan Min' },
  { key: 'remainingMax', label: 'Kalan Max' },
];

type DrilldownDimension = 'status' | 'university' | 'program' | 'country' | 'degree' | 'responsible' | 'agency';

function dateOnly(iso: string | undefined): string {
  if (!iso) return '';
  return iso.split('T')[0];
}


const TOP_RANKED_CHART_ITEMS = 20;

interface RankedStatRow {
  label: string;
  value: number;
  key?: string;
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
        key: row.key,
        share: Math.round((row.value / total) * 1000) / 10
      }))
      .filter((row) => !query || row.label.toLowerCase().includes(query));
  }, [stats, totalApplications, search]);

  const handleItemClick = (row: RankedStatRow) => {
    if (!onItemClick || row.label === othersLabel || row.label === '—') return;
    onItemClick(row.key ?? row.label);
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
                            onClick={() => handleItemClick(row)}
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
                onClick={(data) => {
                  const row = data?.payload as RankedStatRow | undefined;
                  if (row) handleItemClick(row);
                }}
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
  periods,
  users,
  currentUser,
  universitiesCount,
  onDrilldownToApplications
}) => {
  const { t, translateStatus, translateDegree } = useTranslation();
  const displayStatus = (status: string) => translateStatus(status, currentUser?.role);
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isAdminOrUser = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.USER;
  const canSeeCountryChart = isAdminOrUser;
  const defaultRange = getDatePreset('thisYear');
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
  const [outgoingPayments, setOutgoingPayments] = useState<DashboardOutgoingPayment[]>([]);
  const [financialTableGroup, setFinancialTableGroup] = useState<FinancialTableGroup>('university');

  const canSeeNationalityFilter = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.USER;

  useEffect(() => {
    if (!isAdmin) {
      setOutgoingPayments([]);
      return;
    }
    fetch('/api/outgoing-payments?role=ADMIN')
      .then(async response => {
        const data = await response.json();
        if (response.ok && Array.isArray(data)) setOutgoingPayments(data);
      })
      .catch(() => setOutgoingPayments([]));
  }, [isAdmin]);

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
      if (statusFilter.length > 0 && !statusFilter.includes(normalizeApplicationStatus(app.status) as string)) return false;
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

  const applicationsForPayableTotal = useMemo(() => {
    return scopedApplications.filter((app) => {
      const d = dateOnly(app.createdAt);
      if (filterActive && fromDate && toDate && (!d || d < fromDate || d > toDate)) return false;
      const program = programs.find((p) => p.id === app.programId);
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
  }, [scopedApplications, filterActive, fromDate, toDate, programs, universityFilter, programFilter, degreeFilter, agentFilter, responsibleFilter, nationalityFilter, currencyFilter, studentById, users]);

  const filteredStudents = useMemo(() => {
    const hasAppFilters =
      statusFilter.length > 0 ||
      universityFilter.length > 0 ||
      programFilter.length > 0 ||
      degreeFilter.length > 0 ||
      agentFilter.length > 0 ||
      responsibleFilter.length > 0 ||
      nationalityFilter.length > 0 ||
      currencyFilter.length > 0;

    if (hasAppFilters) {
      const studentIds = new Set(filteredApplications.map((app) => app.studentId));
      return scopedStudents.filter((student) => studentIds.has(student.id));
    }

    return scopedStudents.filter((s) => {
      if (!filterActive || !fromDate || !toDate) return true;
      const d = dateOnly(s.createdAt);
      return !!(d && d >= fromDate && d <= toDate);
    });
  }, [
    scopedStudents,
    filteredApplications,
    filterActive,
    fromDate,
    toDate,
    statusFilter,
    universityFilter,
    programFilter,
    degreeFilter,
    agentFilter,
    responsibleFilter,
    nationalityFilter,
    currencyFilter
  ]);

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
    const range = getDatePreset('thisYear');
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

  const getProgramName = (progId: string) => programs.find((p) => p.id === progId)?.name || t.noPrograms;
  const getUniversityName = (uniId: string) => universities.find((u) => u.id === uniId)?.name || '—';
  const programById = useMemo(() => {
    const map = new Map<string, Program>();
    programs.forEach((p) => map.set(p.id, p));
    return map;
  }, [programs]);

  const periodById = useMemo(() => {
    const map = new Map<string, Period>();
    periods.forEach((period) => map.set(period.id, period));
    return map;
  }, [periods]);

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
      const key = normalizeApplicationStatus(app.status) as string;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([key, value]) => ({ key, label: displayStatus(key), value }))
      .filter((item) => item.label)
      .sort((a, b) => b.value - a.value);
  }, [filteredApplications, currentUser?.role, translateStatus]);

  const universityStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredApplications.forEach((app) => {
      const program = programById.get(app.programId);
      const uniName = program ? getUniversityName(program.universityId) : '—';
      map.set(uniName, (map.get(uniName) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [filteredApplications, programById, universities]);

  const degreeStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredApplications.forEach((app) => {
      const degree = programById.get(app.programId)?.degree || '—';
      map.set(degree, (map.get(degree) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([key, value]) => ({ key, label: translateDegree(key), value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredApplications, programById, translateDegree]);

  const programStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredApplications.forEach((app) => {
      const progName = getProgramName(app.programId);
      map.set(progName, (map.get(progName) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [filteredApplications, programs, t.noPrograms]);

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
      educationVat = 0,
      grossCommission = 0,
      abroadVat = 0,
      netCommission = 0,
      bonusMax = 0,
      bonusMin = 0,
      agencyCommission = 0,
      agencyBonus = 0,
      depositSupport = 0,
      agencyContractAmount = 0,
      remainingMin = 0,
      remainingMax = 0;
    filteredApplications.forEach((app) => {
      annualPayment += Number(app.annualPayment) || 0;
      educationVat += Number(app.educationVat) || 0;
      grossCommission += Number(app.grossCommission) || 0;
      abroadVat += Number(app.abroadVat) || 0;
      netCommission += Number(app.netCommission) || 0;
      bonusMax += Number(app.bonusMax) || 0;
      bonusMin += Number(app.bonusMin) || 0;
      agencyCommission += Number(app.agencyCommission) || 0;
      agencyBonus += Number(app.agencyBonus) || 0;
      depositSupport += Number(app.depositSupport) || 0;
      agencyContractAmount += Number(app.agencyContractAmount) || 0;
      remainingMin += Number(app.remainingMin) || 0;
      remainingMax += Number(app.remainingMax) || 0;
    });
    return {
      annualPayment,
      educationVat,
      grossCommission,
      abroadVat,
      netCommission,
      bonusMax,
      bonusMin,
      agencyCommission,
      agencyBonus,
      depositSupport,
      agencyContractAmount,
      remainingMin,
      remainingMax
    };
  }, [filteredApplications]);

  const totalPaidToAgents = useMemo(() => {
    const agentUsersById = new Map(
      users
        .filter(user => (user.role || '').toString().toLowerCase() === 'agent')
        .map(user => [user.id, user])
    );
    const selectedAgentIds = new Set(
      Array.from(agentUsersById.values())
        .filter(user => agentFilter.length === 0 || agentFilter.includes(user.name))
        .map(user => user.id)
    );

    return outgoingPayments.reduce((sum, payment) => {
      if (!payment.userId || !agentUsersById.has(payment.userId)) return sum;
      if (agentFilter.length > 0 && !selectedAgentIds.has(payment.userId)) return sum;
      const paymentDate = dateOnly(payment.paymentDate);
      if (filterActive && fromDate && toDate && (!paymentDate || paymentDate < fromDate || paymentDate > toDate)) {
        return sum;
      }
      return sum + (Number(payment.paymentAmount) || 0);
    }, 0);
  }, [outgoingPayments, users, agentFilter, filterActive, fromDate, toDate]);

  const totalPayableToAgents = useMemo(() => {
    const payableStatuses = new Set<ApplicationStatus>([
      ApplicationStatus.DEPOSIT_PAYMENT_UPLOAD_WAITING,
      ApplicationStatus.ACCEPTANCE_LETTER_WAITING,
      ApplicationStatus.ACCEPTANCE_LETTER_SEND_TO_COMPANY_WAITING,
      ApplicationStatus.STUDENT_DOCUMENT_WAITING,
      ApplicationStatus.STUDENT_DOCUMENT_DELIVERED,
      ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING,
      ApplicationStatus.UNIVERSITY_ACCOUNTING_APPROVAL_WAITING,
      ApplicationStatus.COMPLETED,
    ]);
    return applicationsForPayableTotal.reduce((sum, app) => {
      const status = normalizeApplicationStatus(app.status) as ApplicationStatus;
      if (!payableStatuses.has(status)) return sum;
      return sum + (Number(app.agencyContractAmount) || 0);
    }, 0);
  }, [applicationsForPayableTotal]);

  const financialTableRows = useMemo(() => {
    const grouped = new Map<string, Record<string, number>>();
    filteredApplications.forEach((app) => {
      const program = programById.get(app.programId);
      let groupLabel = '—';
      if (financialTableGroup === 'university') {
        groupLabel = program ? getUniversityName(program.universityId) : '—';
      } else if (financialTableGroup === 'agent') {
        groupLabel = getAgentName(app);
      } else if (financialTableGroup === 'period') {
        const periodId = app.periodId || program?.periodId;
        groupLabel = (periodId && periodById.get(periodId)?.name) || '—';
      } else if (financialTableGroup === 'nationality') {
        groupLabel = studentById.get(app.studentId)?.nationality || '—';
      }

      const current = grouped.get(groupLabel) || Object.fromEntries(
        FINANCIAL_TABLE_FIELDS.map(field => [String(field.key), 0])
      );
      FINANCIAL_TABLE_FIELDS.forEach(field => {
        const key = String(field.key);
        current[key] = (current[key] || 0) + (Number(app[field.key]) || 0);
      });
      grouped.set(groupLabel, current);
    });

    return Array.from(grouped.entries())
      .map(([group, values]) => ({ group, values }))
      .sort((a, b) => (b.values.annualPayment || 0) - (a.values.annualPayment || 0));
  }, [filteredApplications, financialTableGroup, programById, periodById, studentById, universities, users]);

  const financialTableTotals = useMemo(() => {
    const result: Record<string, number> = {};
    FINANCIAL_TABLE_FIELDS.forEach(field => {
      const key = String(field.key);
      result[key] = financialTableRows.reduce((sum, row) => sum + (row.values[key] || 0), 0);
    });
    return result;
  }, [financialTableRows]);

  const financialTableGroupLabel = {
    university: t.university,
    agent: t.agent,
    period: t.period,
    nationality: t.nationality,
  }[financialTableGroup];

  const exportFinancialTable = () => {
    const rows = financialTableRows.map(row => {
      const exported: Record<string, string | number> = {
        [financialTableGroupLabel]: row.group,
      };
      FINANCIAL_TABLE_FIELDS.forEach(field => {
        exported[field.label] = row.values[String(field.key)] || 0;
      });
      return exported;
    });
    const totalRow: Record<string, string | number> = {
      [financialTableGroupLabel]: t.totals,
    };
    FINANCIAL_TABLE_FIELDS.forEach(field => {
      totalRow[field.label] = financialTableTotals[String(field.key)] || 0;
    });
    rows.push(totalRow);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 32 },
      ...FINANCIAL_TABLE_FIELDS.map(() => ({ wch: 20 })),
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Finansal Tablo');
    XLSX.writeFile(workbook, `finansal-tablo-${financialTableGroup}.xlsx`);
  };

  const financialTotalCards = [
    { label: 'Yıllık ödeme', value: totals.annualPayment, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    { label: 'Eğitim KDV tutarı', value: totals.educationVat, bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-100' },
    { label: 'Brüt komisyon', value: totals.grossCommission, bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
    { label: 'Yurtdışı KDV tutarı', value: totals.abroadVat, bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100' },
    { label: 'Net komisyon', value: totals.netCommission, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    { label: 'Bonus Max', value: totals.bonusMax, bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
    { label: 'Bonus Min', value: totals.bonusMin, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    { label: 'Acenta komisyon', value: totals.agencyCommission, bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-100' },
    { label: 'Acenta Bonus', value: totals.agencyBonus, bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100' },
    { label: 'Depozito desteği', value: totals.depositSupport, bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100' },
    { label: 'Toplam ödenmiş', value: totalPaidToAgents, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' },
    { label: 'Toplam ödenecek', value: totalPayableToAgents, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
    { label: 'Acenta anlaşma miktarı', value: totals.agencyContractAmount, bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-100' },
    { label: 'Kalan Min', value: totals.remainingMin, bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-100' },
    { label: 'Kalan Max', value: totals.remainingMax, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100' }
  ];

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
  ];

  const countApplicationsWithStatuses = (statuses: ApplicationStatus[]) => {
    const statusSet = new Set<ApplicationStatus>(statuses);
    return filteredApplications.filter((app) =>
      statusSet.has(normalizeApplicationStatus(app.status) as ApplicationStatus)
    ).length;
  };

  const pipelineStats = [
    {
      label: t.totalOfferLetterPipeline,
      value: countApplicationsWithStatuses([
        ApplicationStatus.OFFER_LETTER_SEND_TO_COMPANY_WAITING,
        ApplicationStatus.DEPOSIT_PAYMENT_WAITING,
      ]),
      icon: Mail,
      color: 'bg-amber-500',
    },
    {
      label: t.totalDepositPaidPipeline,
      value: countApplicationsWithStatuses([
        ApplicationStatus.DEPOSIT_PAYMENT_UPLOAD_WAITING,
        ApplicationStatus.ACCEPTANCE_LETTER_WAITING,
        ApplicationStatus.ACCEPTANCE_LETTER_SEND_TO_COMPANY_WAITING,
        ApplicationStatus.STUDENT_DOCUMENT_WAITING,
        ApplicationStatus.STUDENT_DOCUMENT_DELIVERED,
        ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING,
        ApplicationStatus.UNIVERSITY_ACCOUNTING_APPROVAL_WAITING,
        ApplicationStatus.COMPLETED,
      ]),
      icon: Wallet,
      color: 'bg-teal-500',
    },
    {
      label: t.totalFinalRegistration,
      value: countApplicationsWithStatuses([
        ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING,
        ApplicationStatus.UNIVERSITY_ACCOUNTING_APPROVAL_WAITING,
        ApplicationStatus.COMPLETED,
      ]),
      icon: UserCheck,
      color: 'bg-indigo-500',
    },
    {
      label: t.totalAnnualPaymentCompleted,
      value: countApplicationsWithStatuses([
        ApplicationStatus.UNIVERSITY_ACCOUNTING_APPROVAL_WAITING,
        ApplicationStatus.COMPLETED,
      ]),
      icon: CircleCheck,
      color: 'bg-rose-500',
    },
    {
      label: t.totalNewApplications,
      value: countApplicationsWithStatuses([
        ApplicationStatus.NEW,
      ]),
      icon: CirclePlus,
      color: 'bg-blue-500',
    },
    {
      label: t.totalOfferLetterWaiting,
      value: countApplicationsWithStatuses([
        ApplicationStatus.NEW,
        ApplicationStatus.OFFER_LETTER_WAITING,
      ]),
      icon: Clock3,
      color: 'bg-sky-500',
    },
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
          <SearchableMultiSelect
            options={Object.values(ApplicationStatus).map((status) => ({
              value: status,
              label: displayStatus(status as any)
            }))}
            selected={statusFilter}
            onChange={setStatusFilter}
            placeholder={`${t.applicationStatus} (${t.filterAll})`}
            searchPlaceholder={t.search}
            noResultsText={t.searchNoResults}
          />
          <SearchableMultiSelect
            options={universities.map((u) => ({ value: u.id, label: u.name }))}
            selected={universityFilter}
            onChange={setUniversityFilter}
            placeholder={`${t.university} (${t.filterAll})`}
            searchPlaceholder={t.searchUniversities}
            noResultsText={t.searchNoResults}
          />
          <SearchableMultiSelect
            options={programs
              .filter((p) => universityFilter.length === 0 || universityFilter.includes(p.universityId))
              .map((p) => ({ value: p.id, label: p.name }))}
            selected={programFilter}
            onChange={setProgramFilter}
            placeholder={`${t.program} (${t.filterAll})`}
            searchPlaceholder={t.searchProgramNamePlaceholder}
            noResultsText={t.searchNoResults}
          />
          <SearchableMultiSelect
            options={uniqueDegrees.map((d) => ({ value: d, label: d }))}
            selected={degreeFilter}
            onChange={setDegreeFilter}
            placeholder={`${t.programDegree} (${t.filterAll})`}
            searchPlaceholder={t.search}
            noResultsText={t.searchNoResults}
          />
          {canSeeNationalityFilter && (
            <SearchableMultiSelect
              options={uniqueNationalities}
              selected={nationalityFilter}
              onChange={setNationalityFilter}
              placeholder={`${t.nationality} (${t.filterAll})`}
              searchPlaceholder={t.search}
              noResultsText={t.searchNoResults}
            />
          )}
          {isAdmin && (
            <SearchableMultiSelect
              options={uniqueAgents}
              selected={agentFilter}
              onChange={setAgentFilter}
              placeholder={`${t.agent} (${t.filterAll})`}
              searchPlaceholder={t.search}
              noResultsText={t.searchNoResults}
            />
          )}
          {isAdmin && (
            <SearchableMultiSelect
              options={uniqueResponsibles}
              selected={responsibleFilter}
              onChange={setResponsibleFilter}
              placeholder={`${t.responsible} (${t.filterAll})`}
              searchPlaceholder={t.search}
              noResultsText={t.searchNoResults}
            />
          )}
          {isAdmin && (
            <SearchableMultiSelect
              options={uniqueCurrencies}
              selected={currencyFilter}
              onChange={setCurrencyFilter}
              placeholder={`${t.currency} (${t.filterAll})`}
              searchPlaceholder={t.search}
              noResultsText={t.searchNoResults}
            />
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {pipelineStats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-5">
            <div className={`p-4 rounded-lg text-white shrink-0 ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-gray-500 text-sm leading-snug">{stat.label}</p>
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
            {financialTotalCards.map((card) => (
              <div key={card.label} className={`${card.bg} rounded-xl p-4 border ${card.border}`}>
                <p className={`text-xs font-medium ${card.text} uppercase`}>{card.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{card.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-3">
            {filteredApplications.length} {t.applicationsTitle.toLowerCase()}
          </p>
        </div>
      )}

      {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <DollarSign size={20} />
                {t.financialTable}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{filteredApplications.length} {t.applicationsTitle.toLowerCase()}</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <label className="text-sm font-medium text-gray-600">
                <span className="block mb-1">{t.groupBy}</span>
                <select
                  value={financialTableGroup}
                  onChange={event => setFinancialTableGroup(event.target.value as FinancialTableGroup)}
                  className="min-w-52 rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="university">{t.university}</option>
                  <option value="agent">{t.agent}</option>
                  <option value="period">{t.period}</option>
                  <option value="nationality">{t.nationality}</option>
                </select>
              </label>
              <button
                type="button"
                onClick={exportFinancialTable}
                disabled={financialTableRows.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={17} />
                Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-max w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left font-semibold min-w-56">
                    {financialTableGroupLabel}
                  </th>
                  {FINANCIAL_TABLE_FIELDS.map(field => (
                    <th key={String(field.key)} className="px-4 py-3 text-right font-semibold min-w-36">
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {financialTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={FINANCIAL_TABLE_FIELDS.length + 1} className="px-4 py-8 text-center text-gray-400">
                      {t.noApplications}
                    </td>
                  </tr>
                ) : (
                  financialTableRows.map(row => (
                    <tr key={row.group} className="hover:bg-blue-50/40">
                      <td className="sticky left-0 bg-white px-4 py-3 font-semibold text-gray-800 border-r border-gray-100">
                        {row.group}
                      </td>
                      {FINANCIAL_TABLE_FIELDS.map(field => (
                        <td key={String(field.key)} className="px-4 py-3 text-right tabular-nums text-gray-700">
                          {(row.values[String(field.key)] || 0).toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
              {financialTableRows.length > 0 && (
                <tfoot className="bg-slate-100 border-t-2 border-slate-200">
                  <tr>
                    <td className="sticky left-0 bg-slate-100 px-4 py-3 font-bold text-gray-900">{t.totals}</td>
                    {FINANCIAL_TABLE_FIELDS.map(field => (
                      <td key={String(field.key)} className="px-4 py-3 text-right font-bold tabular-nums text-gray-900">
                        {(financialTableTotals[String(field.key)] || 0).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RankedStatsCard
          title={t.byStatus}
          stats={statusStats}
          totalApplications={filteredApplications.length}
          barColor="#3b82f6"
          searchPlaceholder={t.search}
          nameColumnLabel={t.applicationStatus}
          countSummary={`${statusStats.length} ${t.applicationStatus.toLowerCase()} · ${filteredApplications.length} ${t.totalApplications.toLowerCase()}`}
          onItemClick={(value) => handleDrilldown('status', value)}
          {...rankedCardLabels}
        />
        {isAdminOrUser && (
          <RankedStatsCard
            title={t.byAgency}
            stats={agencyStats}
            totalApplications={filteredApplications.length}
            barColor="#ef4444"
            searchPlaceholder={t.search}
            nameColumnLabel={t.agent}
            countSummary={`${agencyStats.length} ${t.agent.toLowerCase()} · ${filteredApplications.length} ${t.totalApplications.toLowerCase()}`}
            onItemClick={(label) => handleDrilldown('agency', label)}
            {...rankedCardLabels}
          />
        )}
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
          title={t.byDegree}
          stats={degreeStats}
          totalApplications={filteredApplications.length}
          barColor="#f59e0b"
          searchPlaceholder={t.search}
          nameColumnLabel={t.byDegree}
          countSummary={`${degreeStats.length} ${t.programDegree.toLowerCase()} · ${filteredApplications.length} ${t.totalApplications.toLowerCase()}`}
          onItemClick={(value) => handleDrilldown('degree', value)}
          {...rankedCardLabels}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <RankedStatsCard
            title={t.byResponsible}
            stats={responsibleStats}
            totalApplications={filteredApplications.length}
            barColor="#6366f1"
            searchPlaceholder={t.search}
            nameColumnLabel={t.byResponsible}
            countSummary={`${responsibleStats.length} ${t.responsible.toLowerCase()} · ${filteredApplications.length} ${t.totalApplications.toLowerCase()}`}
            onItemClick={(label) => handleDrilldown('responsible', label)}
            {...rankedCardLabels}
          />
        )}
      </div>
    </div>
  );
};