import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface Notification {
    id: string;
    title: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: string;
    type: string;
}

interface NotificationDropdownProps {
    currentUserId: string;
    onNavigate?: (page: string, appId?: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ currentUserId, onNavigate }) => {
    const { t, language, translateNotification } = useTranslation();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = async () => {
        if (!currentUserId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/notifications?user_id=${currentUserId}`);
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [currentUserId]);

    const markAsRead = async (notificationId: string) => {
        try {
            const res = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PUT'
            });
            if (res.ok) {
                setNotifications(prev =>
                    prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
                );
            }
        } catch (err) {
            console.error('Failed to mark as read', err);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.id);
        setIsOpen(false);

        // Navigate to the application if link exists
        if (notification.link && onNavigate) {
            // Extract app ID from link like "/applications/APP123"
            const match = notification.link.match(/\/applications\/(.+)/);
            if (match) {
                onNavigate('applications', match[1]);
            }
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className={`absolute ${language === 'ar' ? 'left-0' : 'right-0'} mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-96 overflow-y-auto ${language === 'ar' ? 'text-right' : 'text-left'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">{t.notificationsTitle}</h3>
                            {unreadCount > 0 && (
                                <span className="text-sm text-gray-500">{unreadCount} {t.newMessage}</span>
                            )}
                        </div>

                        {loading ? (
                            <div className="p-4 text-center text-gray-500">{t.loading}</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <Bell size={48} className="mx-auto mb-2 opacity-30" />
                                <p>{t.noNotifications}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {notifications.map(notification => {
                                    const { title, message } = translateNotification(notification);
                                    return (
                                        <div
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            className={`p-4 cursor-pointer transition-colors ${notification.isRead
                                                ? 'bg-white hover:bg-gray-50'
                                                : 'bg-blue-50 hover:bg-blue-100'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notification.isRead ? 'bg-gray-300' : 'bg-blue-500'
                                                        }`}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`font-medium text-sm ${notification.isRead ? 'text-gray-700' : 'text-gray-900'
                                                        }`}>
                                                        {title}
                                                    </h4>
                                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                        {message}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {new Date(notification.createdAt).toLocaleString(language === 'ar' ? 'ar-SA' : language === 'tr' ? 'tr-TR' : 'en-US')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
