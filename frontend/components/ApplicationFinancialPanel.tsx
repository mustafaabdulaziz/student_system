import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AgencyCompany,
  Application,
  ApplicationStatus,
  Period,
  Program,
  Student,
  University,
  User
} from '../types';
import { DollarSign, Download, Columns3, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useTranslation } from '../hooks/useTranslation';
import { normalizeApplicationStatus } from '../utils/applicationStatus';
import { matchesCreatedAtRange } from '../utils/createdAtRangeFilter';
import { matchesMultiFilter, type MultiFilterMode } from '../utils/multiFilter';
import { SearchableMultiSelect } from './SearchableMultiSelect';
import { isAgentRole } from '../utils/roles';
import { getDefaultPeriodIds } from '../utils/defaultPeriods';

type FinancialTableGroup = 'university' | 'agent' | 'period' | 'nationality';

interface OutgoingPaymentRow {
  paymentDate: string;
  paymentAmount: number;
  userId?: string | null;
  periodId?: string | null;
}

export const FINANCIAL_TABLE_FIELDS: Array<{ key: keyof Application; label: string }> = [
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

const FINANCIAL_TABLE_COLUMN_KEYS = FINANCIAL_TABLE_FIELDS.map((field) => String(field.key));

/** Ödeme panosu: yalnızca bu durumlardaki başvurular toplam ve finansal tabloya dahil edilir. */
export const PAYMENT_PANEL_APPLICATION_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.DEPOSIT_PAYMENT_UPLOAD_WAITING,
  ApplicationStatus.ACCEPTANCE_LETTER_WAITING,
  ApplicationStatus.ACCEPTANCE_LETTER_SEND_TO_COMPANY_WAITING,
  ApplicationStatus.STUDENT_DOCUMENT_WAITING,
  ApplicationStatus.STUDENT_DOCUMENT_DELIVERED,
  ApplicationStatus.ANNUAL_PAYMENT_RECEIPT_WAITING,
  ApplicationStatus.UNIVERSITY_ACCOUNTING_APPROVAL_WAITING,
  ApplicationStatus.COMPLETED,
];

const PAYMENT_PANEL_STATUS_VALUES = PAYMENT_PANEL_APPLICATION_STATUSES.map((status) => status as string);

function dateOnly(iso: string | undefined): string {
  if (!iso) return '';
  return iso.split('T')[0];
}

function getAppPeriodId(app: Application, program?: Program): string | undefined {
  return app.periodId || program?.periodId;
}

interface ApplicationFinancialPanelProps {
  applications: Application[];
  programs: Program[];
  universities: University[];
  periods: Period[];
  users: User[];
  students: Student[];
  agencyCompanies?: AgencyCompany[];
  currentUser: User;
  outgoingPayments?: OutgoingPaymentRow[];
  paymentDateFrom?: string;
  paymentDateTo?: string;
  columnsStorageKey?: string;
  periodFilter?: string[];
  onPeriodFilterChange?: (ids: string[]) => void;
}

export const ApplicationFinancialPanel: React.FC<ApplicationFinancialPanelProps> = ({
  applications,
  programs,
  universities,
  periods,
  users,
  students,
  agencyCompanies = [],
  currentUser,
  outgoingPayments = [],
  paymentDateFrom = '',
  paymentDateTo = '',
  columnsStorageKey = 'applicationFinancialPanel.visibleColumns',
  periodFilter: periodFilterProp,
  onPeriodFilterChange
}) => {
  const { t, translateStatus, translateDegree } = useTranslation();
  const displayStatus = (status: string) => translateStatus(status, currentUser?.role);
  const periodDefaultsApplied = useRef(false);

  const [statusFilter, setStatusFilter] = useState<string[]>(() => [...PAYMENT_PANEL_STATUS_VALUES]);
  const [universityFilter, setUniversityFilter] = useState<string[]>([]);
  const [degreeFilter, setDegreeFilter] = useState<string[]>([]);
  const [agentFilter, setAgentFilter] = useState<string[]>([]);
  const [agencyCompanyFilter, setAgencyCompanyFilter] = useState<string[]>([]);
  const [internalPeriodFilter, setInternalPeriodFilter] = useState<string[]>([]);
  const periodFilter = periodFilterProp ?? internalPeriodFilter;
  const setPeriodFilter = onPeriodFilterChange ?? setInternalPeriodFilter;
  const [statusFilterMode, setStatusFilterMode] = useState<MultiFilterMode>('include');
  const [universityFilterMode, setUniversityFilterMode] = useState<MultiFilterMode>('include');
  const [degreeFilterMode, setDegreeFilterMode] = useState<MultiFilterMode>('include');
  const [agentFilterMode, setAgentFilterMode] = useState<MultiFilterMode>('include');
  const [agencyCompanyFilterMode, setAgencyCompanyFilterMode] = useState<MultiFilterMode>('include');
  const [periodFilterMode, setPeriodFilterMode] = useState<MultiFilterMode>('include');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');

  useEffect(() => {
    if (periodFilterProp !== undefined || periodDefaultsApplied.current) return;
    if (periods.length === 0) return;
    const ids = getDefaultPeriodIds(periods);
    if (ids.length > 0) setInternalPeriodFilter(ids);
    periodDefaultsApplied.current = true;
  }, [periods, periodFilterProp]);

  const [financialTableGroup, setFinancialTableGroup] = useState<FinancialTableGroup>('university');
  const [financialTableColumnsOpen, setFinancialTableColumnsOpen] = useState(false);
  const [visibleFinancialTableColumns, setVisibleFinancialTableColumns] = useState<string[]>(FINANCIAL_TABLE_COLUMN_KEYS);
  const financialTableColumnsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(columnsStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter((key: string) => FINANCIAL_TABLE_COLUMN_KEYS.includes(key));
      if (valid.length > 0) setVisibleFinancialTableColumns(valid);
    } catch {
      // ignore invalid storage
    }
  }, [columnsStorageKey]);

  useEffect(() => {
    window.localStorage.setItem(columnsStorageKey, JSON.stringify(visibleFinancialTableColumns));
  }, [columnsStorageKey, visibleFinancialTableColumns]);

  useEffect(() => {
    if (!financialTableColumnsOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        financialTableColumnsRef.current &&
        !financialTableColumnsRef.current.contains(event.target as Node)
      ) {
        setFinancialTableColumnsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [financialTableColumnsOpen]);

  const studentById = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

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

  const getAgentName = (app: Application) =>
    app.agentName || (app.userId && users.find((u) => u.id === app.userId)?.name) || '—';

  const getUniversityName = (uniId: string) => universities.find((u) => u.id === uniId)?.name || '—';

  const scopedApplications = useMemo(() => {
    if (isAgentRole(currentUser?.role)) {
      return applications.filter((app) => app.userId === currentUser.id);
    }
    return applications;
  }, [applications, currentUser]);

  const allowedPaymentStatusSet = useMemo(
    () => new Set(PAYMENT_PANEL_STATUS_VALUES.map((status) => normalizeApplicationStatus(status) as string)),
    []
  );

  const statusScopedApplications = useMemo(() => {
    return scopedApplications.filter((app) =>
      allowedPaymentStatusSet.has(normalizeApplicationStatus(app.status) as string)
    );
  }, [scopedApplications, allowedPaymentStatusSet]);

  const filteredApplications = useMemo(() => {
    return statusScopedApplications.filter((app) => {
      if (!matchesCreatedAtRange(app.createdAt, createdFrom, createdTo)) return false;
      const program = programById.get(app.programId);
      if (!matchesMultiFilter(
        normalizeApplicationStatus(app.status) as string,
        statusFilter.map((s) => normalizeApplicationStatus(s) as string),
        statusFilterMode
      )) return false;
      if (!matchesMultiFilter(program?.universityId, universityFilter, universityFilterMode)) return false;
      if (!matchesMultiFilter(program?.degree, degreeFilter, degreeFilterMode)) return false;
      if (!matchesMultiFilter(getAgentName(app), agentFilter, agentFilterMode)) return false;
      if (!matchesMultiFilter(app.agencyCompanyId, agencyCompanyFilter, agencyCompanyFilterMode)) return false;
      if (!matchesMultiFilter(getAppPeriodId(app, program), periodFilter, periodFilterMode)) return false;
      return true;
    });
  }, [
    statusScopedApplications, createdFrom, createdTo, statusFilter, statusFilterMode, universityFilter, universityFilterMode,
    degreeFilter, degreeFilterMode, agentFilter, agentFilterMode, agencyCompanyFilter,
    agencyCompanyFilterMode, periodFilter, periodFilterMode, programById, users
  ]);

  const uniqueAgents = useMemo(() => {
    const names = new Set<string>();
    statusScopedApplications.forEach((app) => {
      const name = getAgentName(app);
      if (name && name !== '—') names.add(name);
    });
    return Array.from(names).sort().map((name) => ({ value: name, label: name }));
  }, [statusScopedApplications, users]);

  const uniqueDegrees = useMemo(() => {
    return Array.from(new Set(programs.map((p) => p.degree).filter(Boolean)))
      .sort()
      .map((d) => ({ value: d, label: translateDegree(d) || d }));
  }, [programs, translateDegree]);

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
        .filter((user) => (user.role || '').toString().toLowerCase() === 'agent')
        .map((user) => [user.id, user])
    );
    const selectedAgentIds = new Set(
      Array.from(agentUsersById.values())
        .filter((user) => agentFilter.length === 0 || agentFilter.includes(user.name))
        .map((user) => user.id)
    );

    return outgoingPayments.reduce((sum, payment) => {
      if (!payment.userId || !agentUsersById.has(payment.userId)) return sum;
      if (agentFilter.length > 0 && !selectedAgentIds.has(payment.userId)) return sum;
      if (!matchesCreatedAtRange(payment.paymentDate, paymentDateFrom, paymentDateTo)) return sum;
      if (periodFilter.length > 0 && !periodFilter.includes(payment.periodId || '')) return sum;
      return sum + (Number(payment.paymentAmount) || 0);
    }, 0);
  }, [outgoingPayments, users, agentFilter, paymentDateFrom, paymentDateTo, periodFilter]);

  const totalPayableToAgents = useMemo(() => {
    return filteredApplications.reduce((sum, app) => {
      return sum + (Number(app.agencyContractAmount) || 0);
    }, 0);
  }, [filteredApplications]);

  const agentAccountRows = useMemo(() => {
    const agentUsers = users.filter((user) => (user.role || '').toString().toLowerCase() === 'agent');
    const visibleAgents =
      agentFilter.length === 0
        ? agentUsers
        : agentUsers.filter((user) => agentFilter.includes(user.name));
    const agentUsersById = new Map(agentUsers.map((user) => [user.id, user]));

    const payableByAgentId = new Map<string, number>();
    filteredApplications.forEach((app) => {
      if (!app.userId) return;
      payableByAgentId.set(
        app.userId,
        (payableByAgentId.get(app.userId) || 0) + (Number(app.agencyContractAmount) || 0)
      );
    });

    const paidByAgentId = new Map<string, number>();
    outgoingPayments.forEach((payment) => {
      if (!payment.userId || !agentUsersById.has(payment.userId)) return;
      if (agentFilter.length > 0) {
        const user = agentUsersById.get(payment.userId);
        if (!user || !agentFilter.includes(user.name)) return;
      }
      if (!matchesCreatedAtRange(payment.paymentDate, paymentDateFrom, paymentDateTo)) return;
      if (periodFilter.length > 0 && !periodFilter.includes(payment.periodId || '')) return;
      paidByAgentId.set(
        payment.userId,
        (paidByAgentId.get(payment.userId) || 0) + (Number(payment.paymentAmount) || 0)
      );
    });

    return visibleAgents
      .map((agent) => {
        const payable = payableByAgentId.get(agent.id) || 0;
        const paid = paidByAgentId.get(agent.id) || 0;
        return {
          agentId: agent.id,
          agentName: agent.name,
          payable,
          paid,
          remaining: payable - paid,
        };
      })
      .sort((a, b) => b.payable - a.payable || a.agentName.localeCompare(b.agentName, 'tr'));
  }, [
    users,
    agentFilter,
    filteredApplications,
    outgoingPayments,
    paymentDateFrom,
    paymentDateTo,
    periodFilter,
  ]);

  const agentAccountTotals = useMemo(() => {
    return agentAccountRows.reduce(
      (acc, row) => ({
        payable: acc.payable + row.payable,
        paid: acc.paid + row.paid,
        remaining: acc.remaining + row.remaining,
      }),
      { payable: 0, paid: 0, remaining: 0 }
    );
  }, [agentAccountRows]);

  const financialTableRows = useMemo(() => {
    const grouped = new Map<string, { values: Record<string, number>; count: number }>();
    filteredApplications.forEach((app) => {
      const program = programById.get(app.programId);
      let groupLabel = '—';
      if (financialTableGroup === 'university') {
        groupLabel = program ? getUniversityName(program.universityId) : '—';
      } else if (financialTableGroup === 'agent') {
        groupLabel = getAgentName(app);
      } else if (financialTableGroup === 'period') {
        const periodId = getAppPeriodId(app, program);
        groupLabel = (periodId && periodById.get(periodId)?.name) || '—';
      } else if (financialTableGroup === 'nationality') {
        groupLabel = studentById.get(app.studentId)?.nationality || '—';
      }

      const current = grouped.get(groupLabel) || {
        values: Object.fromEntries(FINANCIAL_TABLE_FIELDS.map((field) => [String(field.key), 0])),
        count: 0
      };
      FINANCIAL_TABLE_FIELDS.forEach((field) => {
        const key = String(field.key);
        current.values[key] = (current.values[key] || 0) + (Number(app[field.key]) || 0);
      });
      current.count += 1;
      grouped.set(groupLabel, current);
    });

    return Array.from(grouped.entries())
      .map(([group, data]) => ({ group, values: data.values, count: data.count }))
      .sort((a, b) => (b.values.annualPayment || 0) - (a.values.annualPayment || 0));
  }, [filteredApplications, financialTableGroup, programById, periodById, studentById, universities, users]);

  const financialTableTotals = useMemo(() => {
    const result: Record<string, number> = {};
    FINANCIAL_TABLE_FIELDS.forEach((field) => {
      const key = String(field.key);
      result[key] = financialTableRows.reduce((sum, row) => sum + (row.values[key] || 0), 0);
    });
    return result;
  }, [financialTableRows]);

  const financialTableTotalCount = useMemo(
    () => financialTableRows.reduce((sum, row) => sum + row.count, 0),
    [financialTableRows]
  );

  const visibleFinancialTableFields = useMemo(
    () => FINANCIAL_TABLE_FIELDS.filter((field) => visibleFinancialTableColumns.includes(String(field.key))),
    [visibleFinancialTableColumns]
  );

  const financialTableGroupLabel = {
    university: t.university,
    agent: t.agent,
    period: t.period,
    nationality: t.nationality,
  }[financialTableGroup];

  const toggleFinancialTableColumn = (key: string) => {
    setVisibleFinancialTableColumns((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((column) => column !== key);
      }
      return [...prev, key];
    });
  };

  const exportFinancialTable = () => {
    const rows = financialTableRows.map((row) => {
      const exported: Record<string, string | number> = {
        [financialTableGroupLabel]: row.group,
        [t.applicationCount]: row.count,
      };
      visibleFinancialTableFields.forEach((field) => {
        exported[field.label] = row.values[String(field.key)] || 0;
      });
      return exported;
    });
    const totalRow: Record<string, string | number> = {
      [financialTableGroupLabel]: t.totals,
      [t.applicationCount]: financialTableTotalCount,
    };
    visibleFinancialTableFields.forEach((field) => {
      totalRow[field.label] = financialTableTotals[String(field.key)] || 0;
    });
    rows.push(totalRow);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 32 },
      { wch: 16 },
      ...visibleFinancialTableFields.map(() => ({ wch: 20 })),
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Finansal Tablo');
    XLSX.writeFile(workbook, `finansal-tablo-${financialTableGroup}.xlsx`);
  };

  const exportAgentAccountTable = () => {
    const rows = agentAccountRows.map((row) => ({
      [t.agent]: row.agentName,
      [t.amountPayable]: row.payable,
      [t.amountPaid]: row.paid,
      [t.remainingAmount]: row.remaining,
    }));
    rows.push({
      [t.agent]: t.totals,
      [t.amountPayable]: agentAccountTotals.payable,
      [t.amountPaid]: agentAccountTotals.paid,
      [t.remainingAmount]: agentAccountTotals.remaining,
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Agent Hesap');
    XLSX.writeFile(workbook, 'agent-hesap-tablosu.xlsx');
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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <SearchableMultiSelect
            options={PAYMENT_PANEL_APPLICATION_STATUSES.map((status) => ({
              value: status,
              label: displayStatus(status)
            }))}
            selected={statusFilter}
            onChange={setStatusFilter}
            mode={statusFilterMode}
            onModeChange={setStatusFilterMode}
            placeholder={`${t.applicationStatus} (${t.filterAll})`}
            searchPlaceholder={t.search}
            noResultsText={t.searchNoResults}
          />
          <SearchableMultiSelect
            options={universities.map((u) => ({ value: u.id, label: u.name }))}
            selected={universityFilter}
            onChange={setUniversityFilter}
            mode={universityFilterMode}
            onModeChange={setUniversityFilterMode}
            placeholder={`${t.university} (${t.filterAll})`}
            searchPlaceholder={t.searchUniversities}
            noResultsText={t.searchNoResults}
          />
          <SearchableMultiSelect
            options={uniqueDegrees}
            selected={degreeFilter}
            onChange={setDegreeFilter}
            mode={degreeFilterMode}
            onModeChange={setDegreeFilterMode}
            placeholder={`${t.programDegree} (${t.filterAll})`}
            searchPlaceholder={t.search}
            noResultsText={t.searchNoResults}
          />
          <SearchableMultiSelect
            options={uniqueAgents}
            selected={agentFilter}
            onChange={setAgentFilter}
            mode={agentFilterMode}
            onModeChange={setAgentFilterMode}
            placeholder={`${t.agent} (${t.filterAll})`}
            searchPlaceholder={t.search}
            noResultsText={t.searchNoResults}
          />
          <SearchableMultiSelect
            options={agencyCompanies.map((c) => ({ value: c.id, label: c.name }))}
            selected={agencyCompanyFilter}
            onChange={setAgencyCompanyFilter}
            mode={agencyCompanyFilterMode}
            onModeChange={setAgencyCompanyFilterMode}
            placeholder={`${t.agencyCompany} (${t.filterAll})`}
            searchPlaceholder={t.search}
            noResultsText={t.searchNoResults}
          />
          <SearchableMultiSelect
            options={periods.map((p) => ({ value: p.id, label: p.name }))}
            selected={periodFilter}
            onChange={setPeriodFilter}
            mode={periodFilterMode}
            onModeChange={setPeriodFilterMode}
            placeholder={`${t.period} (${t.filterAll})`}
            searchPlaceholder={t.search}
            noResultsText={t.searchNoResults}
          />
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t.filterCreatedFrom}</label>
            <input
              type="date"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t.filterCreatedTo}</label>
            <input
              type="date"
              value={createdTo}
              onChange={(e) => setCreatedTo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            />
          </div>
        </div>
      </div>

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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Users size={20} />
            {t.agentAccountTable}
          </h3>
          <button
            type="button"
            onClick={exportAgentAccountTable}
            disabled={agentAccountRows.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={17} />
            {t.exportExcel}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold min-w-48">{t.agent}</th>
                <th className="px-4 py-3 text-right font-semibold min-w-32 whitespace-nowrap">{t.amountPayable}</th>
                <th className="px-4 py-3 text-right font-semibold min-w-32 whitespace-nowrap">{t.amountPaid}</th>
                <th className="px-4 py-3 text-right font-semibold min-w-32 whitespace-nowrap">{t.remainingAmount}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agentAccountRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    {t.noApplications}
                  </td>
                </tr>
              ) : (
                agentAccountRows.map((row) => (
                  <tr key={row.agentId} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.agentName}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-800">{row.payable.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-800">{row.paid.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">{row.remaining.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
            {agentAccountRows.length > 0 && (
              <tfoot className="bg-slate-100 border-t-2 border-slate-200">
                <tr>
                  <td className="px-4 py-3 font-bold text-gray-900">{t.totals}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-900">
                    {agentAccountTotals.payable.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-900">
                    {agentAccountTotals.paid.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-900">
                    {agentAccountTotals.remaining.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <DollarSign size={20} />
              {t.financialTable}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {filteredApplications.length} {t.applicationsTitle.toLowerCase()}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <label className="text-sm font-medium text-gray-600">
              <span className="block mb-1">{t.groupBy}</span>
              <select
                value={financialTableGroup}
                onChange={(event) => setFinancialTableGroup(event.target.value as FinancialTableGroup)}
                className="min-w-52 rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="university">{t.university}</option>
                <option value="agent">{t.agent}</option>
                <option value="period">{t.period}</option>
                <option value="nationality">{t.nationality}</option>
              </select>
            </label>
            <div className="relative" ref={financialTableColumnsRef}>
              <button
                type="button"
                onClick={() => setFinancialTableColumnsOpen((open) => !open)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Columns3 size={17} />
                {t.columns}
              </button>
              {financialTableColumnsOpen && (
                <div className="absolute right-0 z-30 mt-2 w-64 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                  {FINANCIAL_TABLE_FIELDS.map((field) => {
                    const key = String(field.key);
                    return (
                      <label
                        key={key}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={visibleFinancialTableColumns.includes(key)}
                          onChange={() => toggleFinancialTableColumn(key)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{field.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
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
                <th className="px-4 py-3 text-right font-semibold min-w-32 whitespace-nowrap">
                  {t.applicationCount}
                </th>
                {visibleFinancialTableFields.map((field) => (
                  <th key={String(field.key)} className="px-4 py-3 text-right font-semibold min-w-36">
                    {field.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {financialTableRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleFinancialTableFields.length + 2} className="px-4 py-8 text-center text-gray-400">
                    {t.noApplications}
                  </td>
                </tr>
              ) : (
                financialTableRows.map((row) => (
                  <tr key={row.group} className="hover:bg-blue-50/40">
                    <td className="sticky left-0 bg-white px-4 py-3 font-semibold text-gray-800 border-r border-gray-100">
                      {row.group}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-800">
                      {row.count.toLocaleString()}
                    </td>
                    {visibleFinancialTableFields.map((field) => (
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
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-900">
                    {financialTableTotalCount.toLocaleString()}
                  </td>
                  {visibleFinancialTableFields.map((field) => (
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
    </div>
  );
};
