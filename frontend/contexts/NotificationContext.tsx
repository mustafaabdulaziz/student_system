import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  AppNotification,
  fetchUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  parseApplicationIdFromNotification
} from '../utils/notifications';
import { playNotificationSound, unlockNotificationAudio } from '../utils/notificationSound';

const POLL_VISIBLE_MS = 5000;
const POLL_HIDDEN_MS = 20000;

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  markAsReadForApplication: (applicationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({
  userId,
  children
}: {
  userId: string | null;
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const userIdRef = useRef(userId);
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  const refresh = useCallback(async (silent = false) => {
    if (!userId) {
      setNotifications([]);
      knownIdsRef.current = new Set();
      initializedRef.current = false;
      return;
    }
    if (!silent) setLoading(true);
    try {
      const data = await fetchUserNotifications(userId);
      const newUnread = data.filter(
        (n) => !n.isRead && !knownIdsRef.current.has(n.id)
      );
      if (initializedRef.current && newUnread.length > 0) {
        playNotificationSound();
      }
      knownIdsRef.current = new Set(data.map((n) => n.id));
      initializedRef.current = true;
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userIdRef.current !== userId) {
      userIdRef.current = userId;
      knownIdsRef.current = new Set();
      initializedRef.current = false;
      setNotifications([]);
    }
  }, [userId]);

  useEffect(() => {
    const unlock = () => unlockNotificationAudio();
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    void refresh();

    let intervalId: ReturnType<typeof setInterval>;
    const schedulePoll = () => {
      clearInterval(intervalId);
      const ms = document.hidden ? POLL_HIDDEN_MS : POLL_VISIBLE_MS;
      intervalId = setInterval(() => void refresh(true), ms);
    };

    schedulePoll();

    const onVisibility = () => {
      if (!document.hidden) void refresh(true);
      schedulePoll();
    };
    const onFocus = () => void refresh(true);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [userId, refresh]);

  const markAsRead = useCallback(async (id: string) => {
    const ok = await markNotificationRead(id);
    if (ok) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    }
  }, []);

  const markAsUnread = useCallback(async (id: string) => {
    const ok = await markNotificationUnread(id);
    if (ok) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
      );
    }
  }, []);

  const markAsReadForApplication = useCallback(async (applicationId: string) => {
    if (!applicationId) return;
    const toMark = notificationsRef.current.filter(
      (n) => !n.isRead && parseApplicationIdFromNotification(n) === applicationId
    );
    if (toMark.length === 0) return;
    const results = await Promise.all(toMark.map((n) => markNotificationRead(n.id)));
    const succeededIds = new Set(
      toMark.filter((_, i) => results[i]).map((n) => n.id)
    );
    if (succeededIds.size === 0) return;
    setNotifications((prev) =>
      prev.map((n) => (succeededIds.has(n.id) ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    const ok = await markAllNotificationsRead(userId);
    if (ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  }, [userId]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refresh: () => refresh(false),
      markAsRead,
      markAsUnread,
      markAsReadForApplication,
      markAllAsRead
    }),
    [notifications, unreadCount, loading, refresh, markAsRead, markAsUnread, markAsReadForApplication, markAllAsRead]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}
