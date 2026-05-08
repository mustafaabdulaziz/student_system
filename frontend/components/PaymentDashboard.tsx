import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Printer } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { User, UserRole } from '../types';
import {
  COMPANY_EXPENSE_TYPE_LABELS,
  OUTGOING_PAYMENT_REASON_LABELS,
  formatExpenseTypeDisplay,
  formatOutgoingPaymentDisplay
} from '../constants/outgoingPayment';

type CurrencyCode = 'USD' | 'TRY' | 'EUR';

interface IncomingPaymentRow {
  id: string;
  paymentDate: string;
  paymentAmount: number;
  paymentType: 'Cash' | 'Bank';
  paymentSource: string;
  currency: CurrencyCode;
}

interface OutgoingPaymentRow {
  id: string;
  paymentDate: string;
  paymentAmount: number;
  currency: CurrencyCode;
  paymentType: 'Cash' | 'Bank';
  paymentReason: string;
  expenseType?: string | null;
  userId?: string;
  userName?: string;
}

interface PaymentDashboardProps {
  currentUser: User;
}

function getLast30DaysRange(): { from: string; to: string } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const first = new Date(now);
  first.setDate(now.getDate() - 29);
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: toIso(first), to: toIso(now) };
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr'));
}

function formatPaymentType(value: string): string {
  if (value === 'Cash') return 'Nakit';
  if (value === 'Bank') return 'Banka';
  return value || '—';
}

const CHART_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2'];

function sumByCurrency<T extends { currency?: string; paymentAmount?: number }>(rows: T[]): Record<string, number> {
  const map: Record<string, number> = {};
  rows.forEach((row) => {
    const currency = row.currency || 'USD';
    map[currency] = (map[currency] || 0) + (Number(row.paymentAmount) || 0);
  });
  return map;
}

function buildMatrixByGroup<T extends { currency?: string; paymentAmount?: number }>(
  rows: T[],
  getGroupLabel: (row: T) => string
) {
  const grouped = new Map<string, Record<string, number>>();
  rows.forEach((row) => {
    const label = getGroupLabel(row) || '—';
    const currency = row.currency || 'USD';
    const current = grouped.get(label) || {};
    current[currency] = (current[currency] || 0) + (Number(row.paymentAmount) || 0);
    grouped.set(label, current);
  });

  return Array.from(grouped.entries())
    .map(([label, totals]) => ({ label, totals }))
    .sort((a, b) => a.label.localeCompare(b.label, 'tr'));
}

function MultiSelect({
  label,
  options,
  selected,
  onChange
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
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

  const toggle = (value: string) => {
    if (selected.includes(value)) onChange(selected.filter((x) => x !== value));
    else onChange([...selected, value]);
  };

  const summary =
    selected.length === 0
      ? `${label} (Tümü)`
      : selected.length === 1
        ? options.find((x) => x.value === selected[0])?.label || selected[0]
        : `${selected.length} seçili`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
      >
        <span className="truncate text-left">{summary}</span>
        <ChevronDown size={16} className="shrink-0 text-gray-500" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg p-2 space-y-1">
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="rounded border-gray-300"
              />
              <span className="truncate">{opt.label}</span>
            </label>
          ))}
          {options.length === 0 && <p className="text-xs text-gray-500 px-2 py-1">Seçenek yok</p>}
        </div>
      )}
    </div>
  );
}

export const PaymentDashboard: React.FC<PaymentDashboardProps> = ({ currentUser }) => {
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const defaultRange = getLast30DaysRange();

  const [incomingRows, setIncomingRows] = useState<IncomingPaymentRow[]>([]);
  const [outgoingRows, setOutgoingRows] = useState<OutgoingPaymentRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);

  const [incomingFilters, setIncomingFilters] = useState({
    currencies: [] as string[],
    paymentSources: [] as string[],
    paymentTypes: [] as string[]
  });

  const [outgoingFilters, setOutgoingFilters] = useState({
    currencies: [] as string[],
    paymentTypes: [] as string[],
    paymentReasons: [] as string[],
    expenseTypes: [] as string[],
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
    const paymentTypes = uniq(incomingRows.map((r) => r.paymentType || 'Cash'));
    return {
      currencies: currencies.map((v) => ({ value: v, label: v })),
      paymentSources: paymentSources.map((v) => ({ value: v, label: v })),
      paymentTypes: paymentTypes.map((v) => ({ value: v, label: v === 'Cash' ? 'Nakit' : 'Banka' }))
    };
  }, [incomingRows]);

  const outgoingOptions = useMemo(() => {
    const currencies = uniq(outgoingRows.map((r) => r.currency || 'USD'));
    const paymentTypes = uniq(outgoingRows.map((r) => r.paymentType || 'Cash'));
    const paymentReasons = uniq(outgoingRows.map((r) => r.paymentReason || ''));
    const expenseTypes = uniq(outgoingRows.map((r) => r.expenseType || ''));
    const users = uniq(outgoingRows.map((r) => r.userId || ''));
    const userLabelMap = new Map<string, string>();
    outgoingRows.forEach((r) => {
      if (r.userId) userLabelMap.set(r.userId, r.userName || r.userId);
    });
    return {
      currencies: currencies.map((v) => ({ value: v, label: v })),
      paymentTypes: paymentTypes.map((v) => ({ value: v, label: v === 'Cash' ? 'Nakit' : 'Banka' })),
      paymentReasons: paymentReasons.map((v) => ({
        value: v,
        label: OUTGOING_PAYMENT_REASON_LABELS[v as keyof typeof OUTGOING_PAYMENT_REASON_LABELS] || formatOutgoingPaymentDisplay(v)
      })),
      expenseTypes: expenseTypes.map((v) => ({
        value: v,
        label: COMPANY_EXPENSE_TYPE_LABELS[v as keyof typeof COMPANY_EXPENSE_TYPE_LABELS] || formatExpenseTypeDisplay(v)
      })),
      users: users.map((v) => ({ value: v, label: userLabelMap.get(v) || v }))
    };
  }, [outgoingRows]);

  const filteredIncoming = useMemo(() => {
    return incomingRows.filter((r) => {
      if (dateFrom && r.paymentDate < dateFrom) return false;
      if (dateTo && r.paymentDate > dateTo) return false;
      if (incomingFilters.currencies.length > 0 && !incomingFilters.currencies.includes(r.currency)) return false;
      if (incomingFilters.paymentSources.length > 0 && !incomingFilters.paymentSources.includes(r.paymentSource || '—')) return false;
      if (incomingFilters.paymentTypes.length > 0 && !incomingFilters.paymentTypes.includes(r.paymentType)) return false;
      return true;
    });
  }, [incomingRows, dateFrom, dateTo, incomingFilters]);

  const filteredOutgoing = useMemo(() => {
    return outgoingRows.filter((r) => {
      if (dateFrom && r.paymentDate < dateFrom) return false;
      if (dateTo && r.paymentDate > dateTo) return false;
      if (outgoingFilters.currencies.length > 0 && !outgoingFilters.currencies.includes(r.currency)) return false;
      if (outgoingFilters.paymentTypes.length > 0 && !outgoingFilters.paymentTypes.includes(r.paymentType)) return false;
      if (outgoingFilters.paymentReasons.length > 0 && !outgoingFilters.paymentReasons.includes(r.paymentReason || '')) return false;
      if (outgoingFilters.expenseTypes.length > 0 && !outgoingFilters.expenseTypes.includes(r.expenseType || '')) return false;
      if (outgoingFilters.users.length > 0 && !outgoingFilters.users.includes(r.userId || '')) return false;
      return true;
    });
  }, [outgoingRows, dateFrom, dateTo, outgoingFilters]);

  const incomingTotalsByCurrency = useMemo(() => {
    return sumByCurrency(filteredIncoming);
  }, [filteredIncoming]);

  const outgoingTotalsByCurrency = useMemo(() => {
    return sumByCurrency(filteredOutgoing);
  }, [filteredOutgoing]);

  const incomingCurrencies = useMemo(() => uniq(filteredIncoming.map((r) => r.currency || 'USD')), [filteredIncoming]);
  const outgoingCurrencies = useMemo(() => uniq(filteredOutgoing.map((r) => r.currency || 'USD')), [filteredOutgoing]);

  const incomingChartData = useMemo(
    () => Object.entries(incomingTotalsByCurrency).map(([currency, total]) => ({ name: currency, value: total })),
    [incomingTotalsByCurrency]
  );
  const outgoingChartData = useMemo(
    () => Object.entries(outgoingTotalsByCurrency).map(([currency, total]) => ({ name: currency, value: total })),
    [outgoingTotalsByCurrency]
  );

  const incomingBySource = useMemo(
    () => buildMatrixByGroup(filteredIncoming, (r) => r.paymentSource || '—'),
    [filteredIncoming]
  );
  const incomingByType = useMemo(
    () => buildMatrixByGroup(filteredIncoming, (r) => formatPaymentType(r.paymentType)),
    [filteredIncoming]
  );
  const outgoingByType = useMemo(
    () => buildMatrixByGroup(filteredOutgoing, (r) => formatPaymentType(r.paymentType)),
    [filteredOutgoing]
  );
  const outgoingByReason = useMemo(
    () =>
      buildMatrixByGroup(
        filteredOutgoing,
        (r) => OUTGOING_PAYMENT_REASON_LABELS[r.paymentReason as keyof typeof OUTGOING_PAYMENT_REASON_LABELS] || formatOutgoingPaymentDisplay(r.paymentReason)
      ),
    [filteredOutgoing]
  );
  const outgoingByUser = useMemo(
    () => buildMatrixByGroup(filteredOutgoing, (r) => r.userName || '—'),
    [filteredOutgoing]
  );

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
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Tarih Aralığı (Son 30 gün default)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Gelen Ödeme Özeti</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MultiSelect
            label="Currency"
            options={incomingOptions.currencies}
            selected={incomingFilters.currencies}
            onChange={(v) => setIncomingFilters((p) => ({ ...p, currencies: v }))}
          />
          <MultiSelect
            label="Ödeme Kaynağı"
            options={incomingOptions.paymentSources}
            selected={incomingFilters.paymentSources}
            onChange={(v) => setIncomingFilters((p) => ({ ...p, paymentSources: v }))}
          />
          <MultiSelect
            label="Ödeme Türü"
            options={incomingOptions.paymentTypes}
            selected={incomingFilters.paymentTypes}
            onChange={(v) => setIncomingFilters((p) => ({ ...p, paymentTypes: v }))}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-200 p-3 min-w-0">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Currency Bazlı Grafik</h4>
            {incomingChartData.length === 0 ? (
              <p className="text-sm text-gray-500">Kayıt yok</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip />
                    <Pie data={incomingChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {incomingChartData.map((_, idx) => (
                        <Cell key={`incoming-cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 overflow-x-auto min-w-0">
            <h4 className="text-sm font-semibold text-gray-700 p-3">Ödeme Kaynağı x Currency</h4>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Ödeme Kaynağı</th>
                  {incomingCurrencies.map((currency) => (
                    <th key={currency} className="px-3 py-2 text-right">{currency}</th>
                  ))}
                  <th className="px-3 py-2 text-right">Toplam</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100 bg-blue-50/40 font-semibold">
                  <td className="px-3 py-2">Toplam</td>
                  {incomingCurrencies.map((currency) => (
                    <td key={currency} className="px-3 py-2 text-right">{(incomingTotalsByCurrency[currency] || 0).toFixed(2)}</td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    {Object.values(incomingTotalsByCurrency).reduce((s, v) => s + v, 0).toFixed(2)}
                  </td>
                </tr>
                {incomingBySource.map((row) => (
                  <tr key={row.label} className="border-t border-gray-100">
                    <td className="px-3 py-2">{row.label}</td>
                    {incomingCurrencies.map((currency) => (
                      <td key={currency} className="px-3 py-2 text-right">{(row.totals[currency] || 0).toFixed(2)}</td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      {incomingCurrencies.reduce((s, c) => s + (row.totals[c] || 0), 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {incomingBySource.length === 0 && (
                  <tr className="border-t border-gray-100">
                    <td colSpan={incomingCurrencies.length + 2} className="px-3 py-4 text-center text-gray-500">Kayıt yok</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-x-auto min-w-0">
            <h4 className="text-sm font-semibold text-gray-700 p-3">Ödeme Türü x Currency</h4>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Ödeme Türü</th>
                  {incomingCurrencies.map((currency) => (
                    <th key={currency} className="px-3 py-2 text-right">{currency}</th>
                  ))}
                  <th className="px-3 py-2 text-right">Toplam</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100 bg-blue-50/40 font-semibold">
                  <td className="px-3 py-2">Toplam</td>
                  {incomingCurrencies.map((currency) => (
                    <td key={currency} className="px-3 py-2 text-right">{(incomingTotalsByCurrency[currency] || 0).toFixed(2)}</td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    {Object.values(incomingTotalsByCurrency).reduce((s, v) => s + v, 0).toFixed(2)}
                  </td>
                </tr>
                {incomingByType.map((row) => (
                  <tr key={row.label} className="border-t border-gray-100">
                    <td className="px-3 py-2">{row.label}</td>
                    {incomingCurrencies.map((currency) => (
                      <td key={currency} className="px-3 py-2 text-right">{(row.totals[currency] || 0).toFixed(2)}</td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      {incomingCurrencies.reduce((s, c) => s + (row.totals[c] || 0), 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {incomingByType.length === 0 && (
                  <tr className="border-t border-gray-100">
                    <td colSpan={incomingCurrencies.length + 2} className="px-3 py-4 text-center text-gray-500">Kayıt yok</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Giden Ödeme Özeti</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <MultiSelect
            label="Currency"
            options={outgoingOptions.currencies}
            selected={outgoingFilters.currencies}
            onChange={(v) => setOutgoingFilters((p) => ({ ...p, currencies: v }))}
          />
          <MultiSelect
            label="Ödeme Türü"
            options={outgoingOptions.paymentTypes}
            selected={outgoingFilters.paymentTypes}
            onChange={(v) => setOutgoingFilters((p) => ({ ...p, paymentTypes: v }))}
          />
          <MultiSelect
            label="Ödeme Sebebi"
            options={outgoingOptions.paymentReasons}
            selected={outgoingFilters.paymentReasons}
            onChange={(v) => setOutgoingFilters((p) => ({ ...p, paymentReasons: v }))}
          />
          <MultiSelect
            label="Masraf Tipi"
            options={outgoingOptions.expenseTypes}
            selected={outgoingFilters.expenseTypes}
            onChange={(v) => setOutgoingFilters((p) => ({ ...p, expenseTypes: v }))}
          />
          <MultiSelect
            label="Kullanıcı"
            options={outgoingOptions.users}
            selected={outgoingFilters.users}
            onChange={(v) => setOutgoingFilters((p) => ({ ...p, users: v }))}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-200 p-3 min-w-0">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Currency Bazlı Grafik</h4>
            {outgoingChartData.length === 0 ? (
              <p className="text-sm text-gray-500">Kayıt yok</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip />
                    <Pie data={outgoingChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {outgoingChartData.map((_, idx) => (
                        <Cell key={`outgoing-cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 overflow-x-auto min-w-0">
            <h4 className="text-sm font-semibold text-gray-700 p-3">Ödeme Türü x Currency</h4>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Ödeme Türü</th>
                  {outgoingCurrencies.map((currency) => (
                    <th key={currency} className="px-3 py-2 text-right">{currency}</th>
                  ))}
                  <th className="px-3 py-2 text-right">Toplam</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100 bg-green-50/40 font-semibold">
                  <td className="px-3 py-2">Toplam</td>
                  {outgoingCurrencies.map((currency) => (
                    <td key={currency} className="px-3 py-2 text-right">{(outgoingTotalsByCurrency[currency] || 0).toFixed(2)}</td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    {Object.values(outgoingTotalsByCurrency).reduce((s, v) => s + v, 0).toFixed(2)}
                  </td>
                </tr>
                {outgoingByType.map((row) => (
                  <tr key={row.label} className="border-t border-gray-100">
                    <td className="px-3 py-2">{row.label}</td>
                    {outgoingCurrencies.map((currency) => (
                      <td key={currency} className="px-3 py-2 text-right">{(row.totals[currency] || 0).toFixed(2)}</td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      {outgoingCurrencies.reduce((s, c) => s + (row.totals[c] || 0), 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {outgoingByType.length === 0 && (
                  <tr className="border-t border-gray-100">
                    <td colSpan={outgoingCurrencies.length + 2} className="px-3 py-4 text-center text-gray-500">Kayıt yok</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-x-auto min-w-0">
            <h4 className="text-sm font-semibold text-gray-700 p-3">Ödeme Sebebi x Currency</h4>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Ödeme Sebebi</th>
                  {outgoingCurrencies.map((currency) => (
                    <th key={currency} className="px-3 py-2 text-right">{currency}</th>
                  ))}
                  <th className="px-3 py-2 text-right">Toplam</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100 bg-green-50/40 font-semibold">
                  <td className="px-3 py-2">Toplam</td>
                  {outgoingCurrencies.map((currency) => (
                    <td key={currency} className="px-3 py-2 text-right">{(outgoingTotalsByCurrency[currency] || 0).toFixed(2)}</td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    {Object.values(outgoingTotalsByCurrency).reduce((s, v) => s + v, 0).toFixed(2)}
                  </td>
                </tr>
                {outgoingByReason.map((row) => (
                  <tr key={row.label} className="border-t border-gray-100">
                    <td className="px-3 py-2">{row.label}</td>
                    {outgoingCurrencies.map((currency) => (
                      <td key={currency} className="px-3 py-2 text-right">{(row.totals[currency] || 0).toFixed(2)}</td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      {outgoingCurrencies.reduce((s, c) => s + (row.totals[c] || 0), 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {outgoingByReason.length === 0 && (
                  <tr className="border-t border-gray-100">
                    <td colSpan={outgoingCurrencies.length + 2} className="px-3 py-4 text-center text-gray-500">Kayıt yok</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-x-auto min-w-0">
            <h4 className="text-sm font-semibold text-gray-700 p-3">Kullanıcı x Currency</h4>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Kullanıcı</th>
                  {outgoingCurrencies.map((currency) => (
                    <th key={currency} className="px-3 py-2 text-right">{currency}</th>
                  ))}
                  <th className="px-3 py-2 text-right">Toplam</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100 bg-green-50/40 font-semibold">
                  <td className="px-3 py-2">Toplam</td>
                  {outgoingCurrencies.map((currency) => (
                    <td key={currency} className="px-3 py-2 text-right">{(outgoingTotalsByCurrency[currency] || 0).toFixed(2)}</td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    {Object.values(outgoingTotalsByCurrency).reduce((s, v) => s + v, 0).toFixed(2)}
                  </td>
                </tr>
                {outgoingByUser.map((row) => (
                  <tr key={row.label} className="border-t border-gray-100">
                    <td className="px-3 py-2">{row.label}</td>
                    {outgoingCurrencies.map((currency) => (
                      <td key={currency} className="px-3 py-2 text-right">{(row.totals[currency] || 0).toFixed(2)}</td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      {outgoingCurrencies.reduce((s, c) => s + (row.totals[c] || 0), 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {outgoingByUser.length === 0 && (
                  <tr className="border-t border-gray-100">
                    <td colSpan={outgoingCurrencies.length + 2} className="px-3 py-4 text-center text-gray-500">Kayıt yok</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Yükleniyor...</p>}
    </div>
  );
};
