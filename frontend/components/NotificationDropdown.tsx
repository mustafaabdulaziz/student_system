import React, { useMemo } from 'react';
import { Bell, ChevronRight, Mail, MailOpen } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useNotifications } from '../contexts/NotificationContext';
import { navigateFromNotification } from '../utils/notifications';

const PREVIEW_LIMIT = 8;

interface NotificationDropdownProps {
  onNavigate?: (page: string, appId?: string) => void;
  onViewAll?: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  onNavigate,
  onViewAll
}) => {
  const { t, language, translateNotification } = useTranslation();
  const { notifications, unreadCount, loading, markAsRead, markAsUnread, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleNotificationClick = (notification: { id: string; isRead: boolean; link: string | null; type: string }) => {
    if (!notification.isRead) markAsRead(notification.id);
    setIsOpen(false);
    navigateFromNotification(notification, onNavigate);
  };

  const openAllPage = () => {
    setIsOpen(false);
    onViewAll?.();
  };

  const previewItems = useMemo(() => notifications.slice(0, PREVIEW_LIMIT), [notifications]);
  const hasMore = notifications.length > PREVIEW_LIMIT;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div
            className={`absolute ${language === 'ar' ? 'left-0' : 'right-0'} mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-20 flex flex-col max-h-[min(28rem,70vh)] ${language === 'ar' ? 'text-right' : 'text-left'}`}
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={openAllPage}
                className="font-bold text-gray-800 hover:text-blue-600 transition-colors text-left"
              >
                {t.notificationsTitle}
              </button>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {t.markAllAsRead}
                    </button>
                    <span className="text-sm text-gray-500">{unreadCount} {t.newMessage}</span>
                  </>
                )}
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {loading && notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">{t.loading}</div>
              ) : previewItems.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Bell size={48} className="mx-auto mb-2 opacity-30" />
                  <p>{t.noNotifications}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {previewItems.map((notification) => {
                    const { title, message } = translateNotification(notification);
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 transition-colors ${
                          notification.isRead ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => handleNotificationClick(notification)}
                            className="flex items-start gap-3 flex-1 min-w-0 text-left"
                          >
                            <div
                              className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                notification.isRead ? 'bg-gray-300' : 'bg-blue-500'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-medium text-sm ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                                {title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{message}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(notification.createdAt).toLocaleString(
                                  language === 'ar' ? 'ar-SA' : language === 'tr' ? 'tr-TR' : 'en-US'
                                )}
                              </p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (notification.isRead) void markAsUnread(notification.id);
                              else void markAsRead(notification.id);
                            }}
                            className="shrink-0 p-1.5 rounded-md text-gray-500 hover:text-blue-700 hover:bg-white/80 transition-colors"
                            title={notification.isRead ? t.markAsUnread : t.markAsRead}
                            aria-label={notification.isRead ? t.markAsUnread : t.markAsRead}
                          >
                            {notification.isRead ? <Mail size={16} /> : <MailOpen size={16} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {(notifications.length > 0 || onViewAll) && (
              <div className="border-t border-gray-200 p-3 shrink-0 bg-gray-50 rounded-b-lg">
                <button
                  type="button"
                  onClick={openAllPage}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  {t.viewAllNotifications}
                  {hasMore && (
                    <span className="text-gray-400 font-normal">({notifications.length})</span>
                  )}
                  <ChevronRight size={16} className={language === 'ar' ? 'rotate-180' : ''} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
