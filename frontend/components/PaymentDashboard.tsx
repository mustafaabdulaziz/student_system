import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, List, Printer } from 'lucide-react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AgencyCompany,
  Application,
  OutgoingPaymentListFilters,
  Period,
  Program,
  Student,
  University,
  User,
  UserRole
} from '../types';
import {
  COMPANY_EXPENSE_TYPE_LABELS,
  COMMISSION_SHAPE_LABELS,
  OUTGOING_PAYMENT_REASON_LABELS,
  formatCommissionShapeDisplay,
  formatExpenseTypeDisplay,
  formatOutgoingPaymentDisplay
} from '../constants/outgoingPayment';
import { CreatedAtRangeFilter } from './CreatedAtRangeFilter';
import { SearchableMultiSelect } from './SearchableMultiSelect';
import { useTranslation } from '../hooks/useTranslation';
import { matchesCreatedAtRange } from '../utils/createdAtRangeFilter';
import { getDefaultPeriodIds } from '../utils/defaultPeriods';
import { ApplicationFinancialPanel } from './ApplicationFinancialPanel';

type CurrencyCode = 'USD' | 'TRY' | 'EUR';

interface IncomingPaymentRow {
  id: string;
  paymentDate: string;
  paymentAmount: number;
  paymentType: 'Cash' | 'Bank' | 'Scholarship';
  paymentSource: string;
  paymentSourceId?: string | null;
  paymentCategory?: string | null;
  paymentCategoryId?: string | null;
  currency: CurrencyCode;
  periodId?: string | null;
}

interface OutgoingPaymentRow {
  id: string;
  paymentDate: string;
  paymentAmount: number;
  currency: CurrencyCode;
  paymentType: 'Cash' | 'Bank';
  paymentReason: string;
  expenseType?: string | null;
  commissionShape?: string | null;
  userId?: string;
  userName?: string;
  periodId?: string | null;
}

interface PaymentDashboardProps {
  currentUser: User;
  applications: Application[];
  programs: Program[];
  universities: University[];
  periods: Period[];
  users: User[];
  students: Student[];
  agencyCompanies?: AgencyCompany[];
  onNavigateToOutgoingPayments?: (filters: OutgoingPaymentListFilters) => void;
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr'));
}

const CHART_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2'];

function buildPaymentGroupStats<T extends { paymentAmount?: number }>(
  rows: T[],
  getKey: (row: T) => string,
  getLabel: (key: string) => string
) {
  const grouped = new Map<string, number>();
  rows.forEach((row) => {
    const key = getKey(row) || '—';
    grouped.set(key, (grouped.get(key) || 0) + (Number(row.paymentAmount) || 0));
  });
  return Array.from(grouped.entries())
    .map(([key, total]) => ({ key, label: getLabel(key), total }))
    .sort((a, b) => b.total - a.total);
}

type PaymentGroupStat = { key: string; label: string; total: number };
type PaymentSortKey = 'label' | 'total';
type PaymentSortDir = 'asc' | 'desc';

interface PaymentSummaryWidgetProps {
  title: string;
  stats: PaymentGroupStat[];
  chartLimit?: number;
  chartType?: 'pie' | 'bar';
  onItemClick?: (key: string) => void;
  onTotalClick?: () => void;
}

const PaymentSummaryWidget: React.FC<PaymentSummaryWidgetProps> = ({
  title,
  stats,
  chartLimit,
  chartType = 'pie',
  onItemClick,
  onTotalClick
}) => {
  const [showTable, setShowTable] = useState(false);
  const [sortKey, setSortKey] = useState<PaymentSortKey>('total');
  const [sortDir, setSortDir] = useState<PaymentSortDir>('desc');

  const grandTotal = useMemo(() => stats.reduce((sum, row) => sum + row.total, 0), [stats]);

  const chartData = useMemo(() => {
    if (!chartLimit || stats.length <= chartLimit) return stats;
    const top = stats.slice(0, chartLimit);
    const restTotal = stats.slice(chartLimit).reduce((sum, row) => sum + row.total, 0);
    if (restTotal <= 0) return top;
    return [...top, { key: '__others__', label: 'Diğer', total: restTotal }];
  }, [stats, chartLimit]);

  const sortedTableRows = useMemo(() => {
    const rows = [...stats];
    rows.sort((a, b) => {
      const cmp =
        sortKey === 'label'
          ? a.label.localeCompare(b.label, 'tr')
          : a.total - b.total;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [stats, sortKey, sortDir]);

  const toggleSort = (key: PaymentSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'label' ? 'asc' : 'desc');
    }
  };

  const sortIndicator = (key: PaymentSortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const handleItemClick = (row: PaymentGroupStat) => {
    if (!onItemClick || row.key === '—' || row.key === '__others__') return;
    onItemClick(row.key);
  };

  return (
    <div className="rounded-lg border border-gray-200 p-3 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
        <div>
          {onTotalClick ? (
            <button
              type="button"
              onClick={onTotalClick}
              className="text-sm font-semibold text-gray-700 hover:text-blue-600 hover:underline text-left"
            >
              {title}
            </button>
          ) : (
            <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
          )}
          {stats.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Toplam: {grandTotal.toFixed(2)}
              {chartLimit && !showTable && stats.length > chartLimit ? ` (grafikte ilk ${chartLimit})` : ''}
            </p>
          )}
        </div>
        {stats.length > 0 && (
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 shrink-0"
          >
            {showTable ? <BarChart3 size={14} /> : <List size={14} />}
            {showTable ? 'Grafik' : 'Tablo'}
          </button>
        )}
      </div>

      {stats.length === 0 ? (
        <p className="text-sm text-gray-500">Kayıt yok</p>
      ) : showTable ? (
        <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">
                  <button type="button" onClick={() => toggleSort('label')} className="font-medium hover:text-blue-600">
                    Ad{sortIndicator('label')}
                  </button>
                </th>
                <th className="px-3 py-2 text-right">
                  <button type="button" onClick={() => toggleSort('total')} className="font-medium hover:text-blue-600">
                    Toplam{sortIndicator('total')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100 bg-green-50/40 font-semibold">
                <td className="px-3 py-2">
                  {onTotalClick ? (
                    <button type="button" onClick={onTotalClick} className="text-blue-600 hover:underline">
                      Toplam
                    </button>
                  ) : (
                    'Toplam'
                  )}
                </td>
                <td className="px-3 py-2 text-right">{grandTotal.toFixed(2)}</td>
              </tr>
              {sortedTableRows.map((row) => (
                <tr key={row.key} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    {onItemClick ? (
                      <button
                        type="button"
                        onClick={() => handleItemClick(row)}
                        className="text-left text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {row.label}
                      </button>
                    ) : (
                      row.label
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{row.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : chartType === 'bar' ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 12, left: 8, bottom: 5 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: number) => [value.toFixed(2), 'Toplam']} />
              <Bar
                dataKey="total"
                fill="#16a34a"
                radius={[0, 4, 4, 0]}
                cursor={onItemClick ? 'pointer' : undefined}
                onClick={(data) => {
                  const row = data?.payload as PaymentGroupStat | undefined;
                  if (row) handleItemClick(row);
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip formatter={(value: number) => [value.toFixed(2), 'Toplam']} />
              <Pie
                data={chartData}
                dataKey="total"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, value }) => `${name}: ${Number(value).toFixed(0)}`}
                onClick={(_, index) => {
                  const row = chartData[index];
                  if (row) handleItemClick(row);
                }}
                cursor={onItemClick ? 'pointer' : undefined}
              >
                {chartData.map((_, idx) => (
                  <Cell key={`outgoing-widget-cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export const PaymentDashboard: React.FC<PaymentDashboardProps> = ({
  currentUser,
  applications,
  programs,
  universities,
  periods,
  users,
  students,
  agencyCompanies = [],
  onNavigateToOutgoingPayments
}) => {
  const { t } = useTranslation();
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const defaultPeriodIds = useMemo(() => getDefaultPeriodIds(periods), [periods]);
  const periodDefaultsApplied = useRef(false);

  const [incomingRows, setIncomingRows] = useState<IncomingPaymentRow[]>([]);
  const [outgoingRows, setOutgoingRows] = useState<OutgoingPaymentRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [periodFilter, setPeriodFilter] = useState<string[]>([]);

  useEffect(() => {
    if (periodDefaultsApplied.current) return;
    if (periods.length === 0) return;
    const ids = getDefaultPeriodIds(periods);
    if (ids.length > 0) setPeriodFilter(ids);
    periodDefaultsApplied.current = true;
  }, [periods]);

  const [incomingFilters, setIncomingFilters] = useState({
    currencies: [] as string[],
    paymentSources: [] as string[],
    paymentCategories: [] as string[]
  });

  const [outgoingFilters, setOutgoingFilters] = useState({
    currencies: [] as string[],
    paymentReasons: [] as string[],
    expenseTypes: [] as string[],
    commissionShapes: [] as string[],
    users: [] as string[]
  });

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      setLoading(true);
      try {
        const [incomingRes, outgoingRes] = await Promise.all([
          fetch(`/api/incoming-payments?role=${encodeURIComponent(currentUser.role)}`),
          fetch(`/api/outgoing-payments?role=${encodeURIComponent(currentUser.role)}`)
        ]);
        const incomingData = await incomingRes.json();
        const outgoingData = await outgoingRes.json();
        if (incomingRes.ok) setIncomingRows(Array.isArray(incomingData) ? incomingData : []);
        if (outgoingRes.ok) setOutgoingRows(Array.isArray(outgoingData) ? outgoingData : []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser.role, isAdmin]);

  const incomingOptions = useMemo(() => {
    const currencies = uniq(incomingRows.map((r) => r.currency || 'USD'));
    const paymentSources = uniq(incomingRows.map((r) => r.paymentSource || '—'));
    const categoryMap = new Map<string, string>();
    incomingRows.forEach((r) => {
      const id = r.paymentCategoryId || r.paymentCategory || '';
      if (!id) return;
      categoryMap.set(id, r.paymentCategory || id);
    });
    return {
      currencies: currencies.map((v) => ({ value: v, label: v })),
      paymentSources: paymentSources.map((v) => ({ value: v, label: v })),
      paymentCategories: Array.from(categoryMap.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label, 'tr'))
    };
  }, [incomingRows]);

  const outgoingOptions = useMemo(() => {
    const currencies = uniq(outgoingRows.map((r) => r.currency || 'USD'));
    const paymentReasons = uniq(outgoingRows.map((r) => r.paymentReason || ''));
    const expenseTypes = uniq(outgoingRows.map((r) => r.expenseType || ''));
    const commissionShapes = uniq(outgoingRows.map((r) => r.commissionShape || ''));
    const users = uniq(outgoingRows.map((r) => r.userId || ''));
    const userLabelMap = new Map<string, string>();
    outgoingRows.forEach((r) => {
      if (r.userId) userLabelMap.set(r.userId, r.userName || r.userId);
    });
    return {
      currencies: currencies.map((v) => ({ value: v, label: v })),
      paymentReasons: paymentReasons.map((v) => ({
        value: v,
        label: OUTGOING_PAYMENT_REASON_LABELS[v as keyof typeof OUTGOING_PAYMENT_REASON_LABELS] || formatOutgoingPaymentDisplay(v)
      })),
      expenseTypes: expenseTypes.map((v) => ({
        value: v,
        label: COMPANY_EXPENSE_TYPE_LABELS[v as keyof typeof COMPANY_EXPENSE_TYPE_LABELS] || formatExpenseTypeDisplay(v)
      })),
      commissionShapes: commissionShapes.map((v) => ({
        value: v,
        label: COMMISSION_SHAPE_LABELS[v as keyof typeof COMMISSION_SHAPE_LABELS] || formatCommissionShapeDisplay(v)
      })),
      users: users.map((v) => ({ value: v, label: userLabelMap.get(v) || v }))
    };
  }, [outgoingRows]);

  const filteredIncoming = useMemo(() => {
    return incomingRows.filter((r) => {
      if (!matchesCreatedAtRange(r.paymentDate, dateFrom, dateTo)) return false;
      if (periodFilter.length > 0 && !periodFilter.includes(r.periodId || '')) return false;
      if (incomingFilters.currencies.length > 0 && !incomingFilters.currencies.includes(r.currency)) return false;
      if (incomingFilters.paymentSources.length > 0 && !incomingFilters.paymentSources.includes(r.paymentSource || '—')) return false;
      if (incomingFilters.paymentCategories.length > 0) {
        const categoryKey = r.paymentCategoryId || r.paymentCategory || '';
        if (!incomingFilters.paymentCategories.includes(categoryKey)) return false;
      }
      return true;
    });
  }, [incomingRows, dateFrom, dateTo, incomingFilters, periodFilter]);

  const filteredOutgoing = useMemo(() => {
    return outgoingRows.filter((r) => {
      if (!matchesCreatedAtRange(r.paymentDate, dateFrom, dateTo)) return false;
      if (periodFilter.length > 0 && !periodFilter.includes(r.periodId || '')) return false;
      if (outgoingFilters.currencies.length > 0 && !outgoingFilters.currencies.includes(r.currency)) return false;
      if (outgoingFilters.paymentReasons.length > 0 && !outgoingFilters.paymentReasons.includes(r.paymentReason || '')) return false;
      if (outgoingFilters.expenseTypes.length > 0 && !outgoingFilters.expenseTypes.includes(r.expenseType || '')) return false;
      if (outgoingFilters.commissionShapes.length > 0 && !outgoingFilters.commissionShapes.includes(r.commissionShape || '')) return false;
      if (outgoingFilters.users.length > 0 && !outgoingFilters.users.includes(r.userId || '')) return false;
      return true;
    });
  }, [outgoingRows, dateFrom, dateTo, outgoingFilters, periodFilter]);

  const incomingSourceStats = useMemo(
    () =>
      buildPaymentGroupStats(
        filteredIncoming,
        (r) => r.paymentSource || '—',
        (key) => key
      ),
    [filteredIncoming]
  );

  const incomingCategoryStats = useMemo(
    () =>
      buildPaymentGroupStats(
        filteredIncoming,
        (r) => r.paymentCategoryId || r.paymentCategory || '—',
        (key) => {
          if (key === '—') return '—';
          const row = filteredIncoming.find(
            (r) => (r.paymentCategoryId || r.paymentCategory || '') === key
          );
          return row?.paymentCategory || key;
        }
      ),
    [filteredIncoming]
  );

  const companyExpenseRows = useMemo(
    () => filteredOutgoing.filter((r) => r.paymentReason === 'company_expense'),
    [filteredOutgoing]
  );
  const commissionRows = useMemo(
    () => filteredOutgoing.filter((r) => r.paymentReason === 'commission'),
    [filteredOutgoing]
  );
  const debtRows = useMemo(
    () => filteredOutgoing.filter((r) => r.paymentReason === 'debt'),
    [filteredOutgoing]
  );

  const paymentReasonStats = useMemo(
    () =>
      buildPaymentGroupStats(
        filteredOutgoing,
        (r) => r.paymentReason || '—',
        (key) =>
          key === '—'
            ? '—'
            : OUTGOING_PAYMENT_REASON_LABELS[key as keyof typeof OUTGOING_PAYMENT_REASON_LABELS] ||
              formatOutgoingPaymentDisplay(key)
      ),
    [filteredOutgoing]
  );

  const expenseTypeStats = useMemo(
    () =>
      buildPaymentGroupStats(
        companyExpenseRows,
        (r) => r.expenseType || '—',
        (key) => (key === '—' ? '—' : formatExpenseTypeDisplay(key))
      ),
    [companyExpenseRows]
  );

  const commissionShapeStats = useMemo(
    () =>
      buildPaymentGroupStats(
        commissionRows,
        (r) => r.commissionShape || '—',
        (key) => (key === '—' ? '—' : formatCommissionShapeDisplay(key))
      ),
    [commissionRows]
  );

  const commissionUserStats = useMemo(
    () =>
      buildPaymentGroupStats(
        commissionRows,
        (r) => r.userId || '—',
        (key) => {
          if (key === '—') return '—';
          const row = commissionRows.find((r) => r.userId === key);
          return row?.userName || key;
        }
      ),
    [commissionRows]
  );

  const debtUserStats = useMemo(
    () =>
      buildPaymentGroupStats(
        debtRows,
        (r) => r.userId || '—',
        (key) => {
          if (key === '—') return '—';
          const row = debtRows.find((r) => r.userId === key);
          return row?.userName || key;
        }
      ),
    [debtRows]
  );

  const buildOutgoingDrilldown = (extra: OutgoingPaymentListFilters = {}): OutgoingPaymentListFilters => ({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    periodId: periodFilter.length === 1 ? periodFilter[0] : undefined,
    currency: outgoingFilters.currencies.length === 1 ? outgoingFilters.currencies[0] : undefined,
    paymentReason: outgoingFilters.paymentReasons.length === 1 ? outgoingFilters.paymentReasons[0] : undefined,
    expenseType: outgoingFilters.expenseTypes.length === 1 ? outgoingFilters.expenseTypes[0] : undefined,
    commissionShape: outgoingFilters.commissionShapes.length === 1 ? outgoingFilters.commissionShapes[0] : undefined,
    userId: outgoingFilters.users.length === 1 ? outgoingFilters.users[0] : undefined,
    ...extra
  });

  const navigateOutgoing = (extra: OutgoingPaymentListFilters = {}) => {
    if (!onNavigateToOutgoingPayments) return;
    onNavigateToOutgoingPayments(buildOutgoingDrilldown(extra));
  };

  if (!isAdmin) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-6 text-gray-600">
        Bu ekranı sadece admin kullanıcılar görebilir.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold text-gray-900">Ödeme Panosu</h2>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
        >
          <Printer size={16} />
          Print PDF
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Ödeme Tarihi Aralığı (opsiyonel)</h3>
        <CreatedAtRangeFilter
          from={dateFrom}
          to={dateTo}
          onFromChange={setDateFrom}
          onToChange={setDateTo}
          presetPosition="above"
          fromLabel={t.filterPaymentDateFrom}
          toLabel={t.filterPaymentDateTo}
        />
      </div>

      <ApplicationFinancialPanel
        applications={applications}
        programs={programs}
        universities={universities}
        periods={periods}
        users={users}
        students={students}
        agencyCompanies={agencyCompanies}
        currentUser={currentUser}
        outgoingPayments={outgoingRows}
        incomingPayments={incomingRows}
        paymentDateFrom={dateFrom}
        paymentDateTo={dateTo}
        periodFilter={periodFilter}
        onPeriodFilterChange={setPeriodFilter}
        columnsStorageKey="paymentDashboard.financialTable.visibleColumns"
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Gelen Ödeme Özeti</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SearchableMultiSelect
            options={incomingOptions.currencies}
            selected={incomingFilters.currencies}
            onChange={(v) => setIncomingFilters((p) => ({ ...p, currencies: v }))}
            placeholder={`Currency (${t.filterAll})`}
            searchPlaceholder={t.search}
            noResultsText={t.searchNoResults}
          />
          <SearchableMultiSelect
            options={incomingOptions.paymentSources}
            selected={incomingFilters.paymentSources}
            onChange={(v) => setIncomingFilters((p) => ({ ...p, paymentSources: v }))}
            placeholder={`Ödeme Kaynağı (${t.filterAll})`}
            searchPlaceholder={t.search}
            noResultsText={t.searchNoResults}
          />
          <SearchableMultiSelect
            options={incomingOptions.paymentCategories}
            selected={incomingFilters.paymentCategories}
            onChange={(v) => setIncomingFilters((p) => ({ ...p, paymentCategories: v }))}
            placeholder={`Ödeme Kategorisi (${t.filterAll})`}
            searchPlaceholder={t.search}
            noResultsText={t.searchNoResults}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <PaymentSummaryWidget
            title="Ödeme Kaynağı"
            stats={incomingSourceStats}
            chartType="pie"
          />
          <PaymentSummaryWidget
            title="Ödeme Kategorisi"
            stats={incomingCategoryStats}
            chartType="pie"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Giden Ödeme Özeti</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <SearchableMultiSelect
            options={outgoingOptions.currencies}
            selected={outgoingFilters.currencies}
            onChange={(v) => setOutgoingFilters((p) => ({ ...p, currencies: v }))}
            placeholder={`Currency (${t.filterAll})`}
            searchPlaceholder={t.search}
            noResultsText={t.searchNoResults}
          />
          <SearchableMultiSelect
            options={outgoingOptions.paymentReasons}
            selected={outgoingFilters.paymentReasons}
            onChange={(v) => setOutgoingFilters((p) => ({ ...p, paymentReasons: v }))}
            placeholder={`Ödeme Sebebi (${t.filterAll})`}
            searchPlaceholder={t.search}
            noResultsText={t.searchNoResults}
          />
          <SearchableMultiSelect
            options={outgoingOptions.expenseTypes}
            selected={outgoingFilters.expenseTypes}
            onChange={(v) => setOutgoingFilters((p) => ({ ...p, expenseTypes: v }))}
            placeholder={`Masraf Tipi (${t.filterAll})`}
            searchPlaceholder={t.search}
            noResultsText={t.searchNoResults}
          />
          <SearchableMultiSelect
            options={outgoingOptions.commissionShapes}
            selected={outgoingFilters.commissionShapes}
            onChange={(v) => setOutgoingFilters((p) => ({ ...p, commissionShapes: v }))}
            placeholder={`Komisyon Şekli (${t.filterAll})`}
            searchPlaceholder={t.search}
            noResultsText={t.searchNoResults}
          />
          <SearchableMultiSelect
            options={outgoingOptions.users}
            selected={outgoingFilters.users}
            onChange={(v) => setOutgoingFilters((p) => ({ ...p, users: v }))}
            placeholder={`Kullanıcı (${t.filterAll})`}
            searchPlaceholder={t.search}
            noResultsText={t.searchNoResults}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <PaymentSummaryWidget
            title="Ödeme Sebebi"
            stats={paymentReasonStats}
            chartType="pie"
            onItemClick={(key) => navigateOutgoing({ paymentReason: key })}
            onTotalClick={() => navigateOutgoing({})}
          />
          <PaymentSummaryWidget
            title="Firma Masrafı — Masraf Tipi"
            stats={expenseTypeStats}
            chartType="pie"
            onItemClick={(key) => navigateOutgoing({ paymentReason: 'company_expense', expenseType: key })}
            onTotalClick={() => navigateOutgoing({ paymentReason: 'company_expense' })}
          />
          <PaymentSummaryWidget
            title="Komisyon — Komisyon Şekli"
            stats={commissionShapeStats}
            chartType="pie"
            onItemClick={(key) => navigateOutgoing({ paymentReason: 'commission', commissionShape: key })}
            onTotalClick={() => navigateOutgoing({ paymentReason: 'commission' })}
          />
          <PaymentSummaryWidget
            title="Komisyon — Kullanıcı"
            stats={commissionUserStats}
            chartType="bar"
            chartLimit={10}
            onItemClick={(key) => navigateOutgoing({ paymentReason: 'commission', userId: key })}
            onTotalClick={() => navigateOutgoing({ paymentReason: 'commission' })}
          />
          <PaymentSummaryWidget
            title="Borç — Kullanıcı"
            stats={debtUserStats}
            chartType="bar"
            chartLimit={10}
            onItemClick={(key) => navigateOutgoing({ paymentReason: 'debt', userId: key })}
            onTotalClick={() => navigateOutgoing({ paymentReason: 'debt' })}
          />
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Yükleniyor...</p>}
    </div>
  );
};
