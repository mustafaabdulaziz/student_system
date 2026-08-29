import React, { useState, useEffect, useMemo } from 'react';
import { Bell, Filter, X, CheckCheck, ChevronLeft, ChevronRight, Mail, MailOpen, ClipboardCheck, ClipboardList } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useNotifications } from '../contexts/NotificationContext';
import { matchesCreatedAtRange } from '../utils/createdAtRangeFilter';
import { getNotificationApplicationMetas, navigateFromNotification } from '../utils/notifications';
import { NOTIFICATION_DATE_PRESETS, getDatePreset } from '../utils/datePresets';
import { matchesMultiFilter, type MultiFilterMode } from '../utils/multiFilter';
import { SearchableMultiSelect } from './SearchableMultiSelect';
import { Application, AgencyCompany, Program, University, User } from '../types';
import { isAgentRole, isStaffRole } from '../utils/roles';

interface NotificationsPageProps {
  onNavigate?: (page: string, appId?: string) => void;
  currentUser?: User | null;
  applications?: Application[];
  programs?: Program[];
  universities?: University[];
  users?: User[];
  agencyCompanies?: AgencyCompany[];
}

const PAGE_SIZE = 50;

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  onNavigate,
  currentUser,
  applications = [],
  programs = [],
  universities = [],
  users = [],
  agencyCompanies = []
}) => {
  const { t, language, translateNotification, translateDegree } = useTranslation();
  const dateLocale = { ar: 'ar-SA', en: 'en-GB', tr: 'tr-TR' }[language] || 'en-GB';
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAsUnread,
    markAsProcessed,
    markAsUnprocessed,
    markAllAsRead
  } = useNotifications();

  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [processedFilter, setProcessedFilter] = useState<'all' | 'unprocessed' | 'processed'>('all');
  const [universityFilter, setUniversityFilter] = useState<string[]>([]);
  const [degreeFilter, setDegreeFilter] = useState<string[]>([]);
  const [responsibleFilter, setResponsibleFilter] = useState<string[]>([]);
  const [agentFilter, setAgentFilter] = useState<string[]>([]);
  const [agencyCompanyFilter, setAgencyCompanyFilter] = useState<string[]>([]);
  const [universityFilterMode, setUniversityFilterMode] = useState<MultiFilterMode>('include');
  const [degreeFilterMode, setDegreeFilterMode] = useState<MultiFilterMode>('include');
  const [responsibleFilterMode, setResponsibleFilterMode] = useState<MultiFilterMode>('include');
  const [agentFilterMode, setAgentFilterMode] = useState<MultiFilterMode>('include');
  const [agencyCompanyFilterMode, setAgencyCompanyFilterMode] = useState<MultiFilterMode>('include');
  const [page, setPage] = useState(1);

  const canUseStaffNotificationFilters = !isAgentRole(currentUser?.role);
  const agentUsers = useMemo(() => users.filter((u) => isAgentRole(u.role)), [users]);
  const responsibleUsers = useMemo(() => users.filter((u) => isStaffRole(u.role)), [users]);
  const degreeOptions = useMemo(() => {
    const degrees = Array.from(new Set(programs.map((p) => p.degree).filter(Boolean)));
    degrees.sort((a, b) => a.localeCompare(b, 'tr'));
    return degrees.map((d) => ({ value: d, label: translateDegree(d) || d }));
  }, [programs, translateDegree]);

  const hasAppFilters =
    universityFilter.length > 0 ||
    degreeFilter.length > 0 ||
    (canUseStaffNotificationFilters && (
      responsibleFilter.length > 0 ||
      agentFilter.length > 0 ||
      agencyCompanyFilter.length > 0
    ));

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (!matchesCreatedAtRange(n.createdAt, filterFrom, filterTo)) return false;
      if (readFilter === 'unread' && n.isRead) return false;
      if (readFilter === 'read' && !n.isRead) return false;
      if (processedFilter === 'unprocessed' && n.isProcessed) return false;
      if (processedFilter === 'processed' && !n.isProcessed) return false;
      if (hasAppFilters) {
        const metas = getNotificationApplicationMetas(n, applications, programs);
        if (metas.length === 0) return false;
        const matchesOne = metas.some((meta) =>
          matchesMultiFilter(meta.universityId, universityFilter, universityFilterMode) &&
          matchesMultiFilter(meta.degree, degreeFilter, degreeFilterMode) &&
          (!canUseStaffNotificationFilters || matchesMultiFilter(meta.responsibleId, responsibleFilter, responsibleFilterMode)) &&
          (!canUseStaffNotificationFilters || matchesMultiFilter(meta.agentId, agentFilter, agentFilterMode)) &&
          (!canUseStaffNotificationFilters || matchesMultiFilter(meta.agencyCompanyId, agencyCompanyFilter, agencyCompanyFilterMode))
        );
        if (!matchesOne) return false;
      }
      return true;
    });
  }, [
    notifications, filterFrom, filterTo, readFilter, processedFilter, hasAppFilters,
    canUseStaffNotificationFilters, applications, programs, universityFilter, degreeFilter,
    responsibleFilter, agentFilter, agencyCompanyFilter, universityFilterMode, degreeFilterMode,
    responsibleFilterMode, agentFilterMode, agencyCompanyFilterMode
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [
    filterFrom, filterTo, readFilter, processedFilter, universityFilter, degreeFilter,
    responsibleFilter, agentFilter, agencyCompanyFilter, universityFilterMode,
    degreeFilterMode, responsibleFilterMode, agentFilterMode, agencyCompanyFilterMode
  ]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const listFrom = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const listTo = Math.min(page * PAGE_SIZE, filtered.length);

  const hasActiveFilters = Boolean(
    filterFrom || filterTo || readFilter !== 'all' || processedFilter !== 'all' || hasAppFilters
  );

  const applyDatePreset = (presetId: string) => {
    const range = getDatePreset(presetId);
    setFilterFrom(range.from);
    setFilterTo(range.to);
  };

  const clearFilters = () => {
    setFilterFrom('');
    setFilterTo('');
    setReadFilter('all');
    setProcessedFilter('all');
    setUniversityFilter([]);
    setDegreeFilter([]);
    setResponsibleFilter([]);
    setAgentFilter([]);
    setAgencyCompanyFilter([]);
    setUniversityFilterMode('include');
    setDegreeFilterMode('include');
    setResponsibleFilterMode('include');
    setAgentFilterMode('include');
    setAgencyCompanyFilterMode('include');
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;
    void markAllAsRead();
  };

  const handleClick = async (notification: { id: string; isRead: boolean; link: string | null; type: string }) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    navigateFromNotification(notification, onNavigate);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(dateLocale, { dateStyle: 'medium', timeStyle: 'short' });

  const paginationBar = filtered.length > 0 ? (
    <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 bg-gray-50/80">
      <span>{listFrom}-{listTo} / {filtered.length}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-500">{page} / {totalPages}</span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t.back}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t.next}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <Bell className="text-blue-600" size={28} />
            {t.notificationsTitle}
          </h2>
          <p className="text-gray-500 font-medium mt-1">{t.notificationsPageSubtitle}</p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm"
          >
            <CheckCheck size={18} />
            {t.markAllAsRead}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Filter size={18} className="text-blue-500" />
            <span className="text-sm font-medium">{t.filter}</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.filterCreatedFrom}</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.filterCreatedTo}</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 items-end pb-0.5">
            {NOTIFICATION_DATE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyDatePreset(preset.id)}
                className="px-2.5 py-2 text-xs rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-800 transition-colors font-medium"
              >
                {t[preset.labelKey]}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.notificationReadFilter}</label>
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value as 'all' | 'unread' | 'read')}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[140px]"
            >
              <option value="all">{t.filterAll}</option>
              <option value="unread">{t.unreadOnly}</option>
              <option value="read">{t.readOnly}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.notificationProcessedFilter}</label>
            <select
              value={processedFilter}
              onChange={(e) => setProcessedFilter(e.target.value as 'all' | 'unprocessed' | 'processed')}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[140px]"
            >
              <option value="all">{t.filterAll}</option>
              <option value="unprocessed">{t.unprocessedOnly}</option>
              <option value="processed">{t.processedOnly}</option>
            </select>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={14} />
              {t.clearFilters}
            </button>
          )}
        </div>
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${canUseStaffNotificationFilters ? 'lg:grid-cols-5' : 'lg:grid-cols-2'}`}>
          <SearchableMultiSelect
            options={universities.map((u) => ({ value: u.id, label: u.name }))}
            selected={universityFilter}
            onChange={setUniversityFilter}
            mode={universityFilterMode}
            onModeChange={setUniversityFilterMode}
            placeholder={`${t.university} (${t.filterAll})`}
            searchPlaceholder={t.search}
            noResultsText={t.searchNoResults}
          />
          <SearchableMultiSelect
            options={degreeOptions}
            selected={degreeFilter}
            onChange={setDegreeFilter}
            mode={degreeFilterMode}
            onModeChange={setDegreeFilterMode}
            placeholder={`${t.programDegree} (${t.filterAll})`}
            searchPlaceholder={t.search}
            noResultsText={t.searchNoResults}
          />
          {canUseStaffNotificationFilters && (
            <>
              <SearchableMultiSelect
                options={responsibleUsers.map((u) => ({ value: u.id, label: u.name }))}
                selected={responsibleFilter}
                onChange={setResponsibleFilter}
                mode={responsibleFilterMode}
                onModeChange={setResponsibleFilterMode}
                placeholder={`${t.responsible} (${t.filterAll})`}
                searchPlaceholder={t.search}
                noResultsText={t.searchNoResults}
              />
              <SearchableMultiSelect
                options={agentUsers.map((u) => ({ value: u.id, label: u.name }))}
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
            </>
          )}
        </div>
        <p className="text-sm text-gray-500">
          {filtered.length} / {notifications.length} {t.notificationsShown}
          {unreadCount > 0 && (
            <span className="ml-2 text-blue-600 font-medium">· {unreadCount} {t.unreadNotifications}</span>
          )}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
            <span>{listFrom}-{listTo} / {filtered.length}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-500">{page} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={t.back}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={t.next}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
        {loading ? (
          <div className="p-12 text-center text-gray-500">{t.loading}</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <Bell size={56} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">{hasActiveFilters ? t.noNotificationsForFilter : t.noNotifications}</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {paginated.map((notification) => {
              const { title, message } = translateNotification(notification);
              const processed = Boolean(notification.isProcessed);
              return (
                <div
                  key={notification.id}
                  className={`w-full text-left p-5 transition-colors hover:bg-gray-50 ${
                    notification.isRead ? 'bg-white' : 'bg-blue-50/80 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <button
                      type="button"
                      onClick={() => handleClick(notification)}
                      className="flex items-start gap-4 flex-1 min-w-0 text-left"
                    >
                      <div
                        className={`w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0 ${
                          notification.isRead ? 'bg-gray-300' : 'bg-blue-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h4 className={`font-bold text-base ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                            {title}
                            {processed && (
                              <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                                {t.processed}
                              </span>
                            )}
                          </h4>
                          <time className="text-xs text-gray-400 whitespace-nowrap font-medium">
                            {formatDate(notification.createdAt)}
                          </time>
                        </div>
                        <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{message}</p>
                      </div>
                    </button>
                    <div className="shrink-0 flex flex-col sm:flex-row gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (processed) void markAsUnprocessed(notification.id);
                          else void markAsProcessed(notification.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-white hover:text-emerald-700 hover:border-emerald-200 transition-colors"
                        title={processed ? t.markAsUnprocessed : t.markAsProcessed}
                      >
                        {processed ? <ClipboardCheck size={14} /> : <ClipboardList size={14} />}
                        <span className="hidden sm:inline">{processed ? t.markAsUnprocessed : t.markAsProcessed}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (notification.isRead) void markAsUnread(notification.id);
                          else void markAsRead(notification.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-white hover:text-blue-700 hover:border-blue-200 transition-colors"
                        title={notification.isRead ? t.markAsUnread : t.markAsRead}
                      >
                        {notification.isRead ? <Mail size={14} /> : <MailOpen size={14} />}
                        <span className="hidden sm:inline">{notification.isRead ? t.markAsUnread : t.markAsRead}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
            {paginationBar}
          </>
        )}
      </div>
    </div>
  );
};
