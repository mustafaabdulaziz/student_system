import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight, FileUp, FilePlus, RefreshCw, UserPlus } from 'lucide-react';
import { User } from '../types';
import { canManageCatalog } from '../utils/roles';
import { useTranslation } from '../hooks/useTranslation';
import { CreatedAtRangeFilter } from './CreatedAtRangeFilter';
import { SearchableSelect } from './SearchableSelect';

type ActivityType = 'FILE_UPLOAD' | 'APPLICATION_STATUS' | 'APPLICATION_CREATE' | 'STUDENT_CREATE';

interface ActivityDetails {
  studentId?: string;
  studentName?: string;
  applicationId?: string;
  fileNames?: string[];
  fileCount?: number;
  oldStatus?: string;
  newStatus?: string;
  status?: string;
  passportNumber?: string;
}

interface ActivityItem {
  id: string;
  type: ActivityType;
  actorUserId?: string | null;
  actorName?: string | null;
  createdAt: string;
  entityType?: string | null;
  entityId?: string | null;
  details: ActivityDetails;
}

interface ActivityDashboardProps {
  currentUser: User;
  users: User[];
  onOpenApplication?: (appId: string) => void;
  onOpenStudent?: (studentId: string) => void;
}

const PAGE_SIZE = 50;

export const ActivityDashboard: React.FC<ActivityDashboardProps> = ({
  currentUser,
  users,
  onOpenApplication,
  onOpenStudent
}) => {
  const { t, language, translateStatus } = useTranslation();
  const dateLocale = { ar: 'ar-SA', en: 'en-GB', tr: 'tr-TR' }[language] || 'en-GB';
  const canAccess = canManageCatalog(currentUser?.role);

  const [items, setItems] = useState<ActivityItem[]>([]);
  const [summary, setSummary] = useState<Record<ActivityType, number>>({
    FILE_UPLOAD: 0,
    APPLICATION_STATUS: 0,
    APPLICATION_CREATE: 0,
    STUDENT_CREATE: 0
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [actorFilter, setActorFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        role: currentUser.role,
        page: String(page),
        pageSize: String(PAGE_SIZE)
      });
      if (typeFilter) params.set('type', typeFilter);
      if (actorFilter) params.set('actorUserId', actorFilter);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/activities?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total) || 0);
        setTotalPages(Number(data.totalPages) || 1);
        setSummary({
          FILE_UPLOAD: Number(data.summary?.FILE_UPLOAD) || 0,
          APPLICATION_STATUS: Number(data.summary?.APPLICATION_STATUS) || 0,
          APPLICATION_CREATE: Number(data.summary?.APPLICATION_CREATE) || 0,
          STUDENT_CREATE: Number(data.summary?.STUDENT_CREATE) || 0
        });
      }
    } finally {
      setLoading(false);
    }
  }, [actorFilter, canAccess, currentUser.role, fromDate, page, search, toDate, typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, actorFilter, fromDate, toDate, search]);

  const typeLabel = (type: ActivityType) => {
    switch (type) {
      case 'FILE_UPLOAD':
        return t.activityFileUpload;
      case 'APPLICATION_STATUS':
        return t.activityApplicationStatus;
      case 'APPLICATION_CREATE':
        return t.activityApplicationCreate;
      case 'STUDENT_CREATE':
        return t.activityStudentCreate;
      default:
        return type;
    }
  };

  const formatDate = (iso: string) =>
    iso ? new Date(iso).toLocaleString(dateLocale, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  const describe = (item: ActivityItem) => {
    const d = item.details || {};
    const parts: string[] = [];
    if (d.studentName) parts.push(`${t.studentName}: ${d.studentName}`);
    if (d.applicationId) parts.push(`${t.number}: ${d.applicationId}`);
    if (item.type === 'APPLICATION_STATUS') {
      if (d.oldStatus) parts.push(`${t.activityOldStatus}: ${translateStatus(d.oldStatus, currentUser.role)}`);
      if (d.newStatus) parts.push(`${t.activityNewStatus}: ${translateStatus(d.newStatus, currentUser.role)}`);
    }
    if (item.type === 'FILE_UPLOAD') {
      const names = (d.fileNames || []).filter(Boolean);
      if (names.length) parts.push(`${t.uploadFiles}: ${names.join(', ')}`);
      else if (d.fileCount) parts.push(`${t.activityFileCount}: ${d.fileCount}`);
    }
    return parts.join(' · ') || '—';
  };

  const cards = [
    { type: 'FILE_UPLOAD' as const, label: t.activityFileUpload, value: summary.FILE_UPLOAD, icon: FileUp, color: 'bg-sky-500' },
    { type: 'APPLICATION_STATUS' as const, label: t.activityApplicationStatus, value: summary.APPLICATION_STATUS, icon: RefreshCw, color: 'bg-amber-500' },
    { type: 'APPLICATION_CREATE' as const, label: t.activityApplicationCreate, value: summary.APPLICATION_CREATE, icon: FilePlus, color: 'bg-emerald-500' },
    { type: 'STUDENT_CREATE' as const, label: t.activityStudentCreate, value: summary.STUDENT_CREATE, icon: UserPlus, color: 'bg-indigo-500' }
  ];

  const actorOptions = useMemo(
    () => [
      { value: '', label: t.activityAllUsers },
      ...users.map((u) => ({ value: u.id, label: u.name }))
    ],
    [t.activityAllUsers, users]
  );

  const listFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const listTo = Math.min(page * PAGE_SIZE, total);

  const openItem = (item: ActivityItem) => {
    const applicationId = item.details?.applicationId || (item.entityType === 'application' ? item.entityId : null);
    const studentId = item.details?.studentId || (item.entityType === 'student' ? item.entityId : null);
    if (applicationId && onOpenApplication) {
      onOpenApplication(applicationId);
      return;
    }
    if (studentId && onOpenStudent) onOpenStudent(studentId);
  };

  if (!canAccess) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Activity size={24} />
          {t.activityDashboard}
        </h2>
        <p className="text-sm text-gray-500 mt-1">{t.activityDashboardSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <button
            key={card.type}
            type="button"
            onClick={() => setTypeFilter((prev) => (prev === card.type ? '' : card.type))}
            className={`bg-white p-5 rounded-xl shadow-sm border flex items-center gap-4 text-left transition-all ${
              typeFilter === card.type ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100 hover:border-blue-200'
            }`}
          >
            <div className={`p-3 rounded-lg text-white shrink-0 ${card.color}`}>
              <card.icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-gray-500 text-sm leading-snug">{card.label}</p>
              <h3 className="text-2xl font-bold text-gray-800">{card.value}</h3>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.activityType}</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">{t.activityAllTypes}</option>
              <option value="FILE_UPLOAD">{t.activityFileUpload}</option>
              <option value="APPLICATION_STATUS">{t.activityApplicationStatus}</option>
              <option value="APPLICATION_CREATE">{t.activityApplicationCreate}</option>
              <option value="STUDENT_CREATE">{t.activityStudentCreate}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.activityActor}</label>
            <SearchableSelect
              value={actorFilter}
              onChange={setActorFilter}
              options={actorOptions}
              placeholder={t.activityAllUsers}
              searchPlaceholder={t.search}
              noResultsText={t.searchNoResults}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.search}</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`${t.studentName} / ${t.number}`}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <CreatedAtRangeFilter
          from={fromDate}
          to={toDate}
          onFromChange={setFromDate}
          onToChange={setToDate}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">{t.activityTime}</th>
                <th className="text-left px-4 py-3 font-semibold">{t.activityActor}</th>
                <th className="text-left px-4 py-3 font-semibold">{t.activityType}</th>
                <th className="text-left px-4 py-3 font-semibold">{t.activityDetails}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500">{t.loading}</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500">{t.activityNoRecords}</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => openItem(item)}
                    className="border-t border-gray-100 hover:bg-blue-50/60 cursor-pointer"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.actorName || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {typeLabel(item.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{describe(item)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 bg-gray-50/80">
          <span>{listFrom}-{listTo} / {total}</span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-500">{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
