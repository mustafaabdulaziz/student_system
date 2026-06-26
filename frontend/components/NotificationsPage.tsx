import React, { useState, useEffect, useMemo } from 'react';
import { Bell, Filter, X, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useNotifications } from '../contexts/NotificationContext';
import { matchesCreatedAtRange } from '../utils/createdAtRangeFilter';
import { navigateFromNotification } from '../utils/notifications';

interface NotificationsPageProps {
  onNavigate?: (page: string, appId?: string) => void;
}

const PAGE_SIZE = 50;

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate }) => {
  const { t, language, translateNotification } = useTranslation();
  const dateLocale = { ar: 'ar-SA', en: 'en-GB', tr: 'tr-TR' }[language] || 'en-GB';
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (!matchesCreatedAtRange(n.createdAt, filterFrom, filterTo)) return false;
      if (readFilter === 'unread' && n.isRead) return false;
      if (readFilter === 'read' && !n.isRead) return false;
      return true;
    });
  }, [notifications, filterFrom, filterTo, readFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [filterFrom, filterTo, readFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const listFrom = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const listTo = Math.min(page * PAGE_SIZE, filtered.length);

  const hasActiveFilters = Boolean(filterFrom || filterTo || readFilter !== 'all');

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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
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
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => { setFilterFrom(''); setFilterTo(''); setReadFilter('all'); }}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={14} />
              {t.clearFilters}
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-3">
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
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleClick(notification)}
                  className={`w-full text-left p-5 transition-colors hover:bg-gray-50 ${
                    notification.isRead ? 'bg-white' : 'bg-blue-50/80 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0 ${
                        notification.isRead ? 'bg-gray-300' : 'bg-blue-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h4 className={`font-bold text-base ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                          {title}
                        </h4>
                        <time className="text-xs text-gray-400 whitespace-nowrap font-medium">
                          {formatDate(notification.createdAt)}
                        </time>
                      </div>
                      <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{message}</p>
                    </div>
                  </div>
                </button>
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
