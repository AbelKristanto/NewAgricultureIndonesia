'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppNotification } from '@/types/notification';

const POLL_INTERVAL_MS = 30000;
const CLOCK_TICK_MS = 60000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const isMounted = useRef(true);
  const { lang } = useLanguage();
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
      }
    } catch {
      // Notifications are non-critical — fail silently and try again next poll.
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState happens after an await inside load(), not synchronously; this is the standard fetch-on-mount pattern used elsewhere in this codebase.
    load();
    const pollInterval = setInterval(load, POLL_INTERVAL_MS);
    const clockInterval = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => {
      isMounted.current = false;
      clearInterval(pollInterval);
      clearInterval(clockInterval);
    };
  }, [load]);

  const handleItemClick = (notification: AppNotification) => {
    setOpen(false);
    if (!notification.read) {
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      fetch(`/api/notifications/${notification.id}`, { method: 'PATCH' }).catch(() => {});
    }
    if (notification.link) router.push(notification.link);
  };

  const handleMarkAllRead = async () => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'PATCH' });
    } catch {
      // Non-critical — a stale unread count self-corrects on the next poll.
    }
  };

  const formatRelativeTime = (iso: string) => {
    const diffMin = Math.floor((now - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return lang === 'en' ? 'just now' : 'baru saja';
    if (diffMin < 60) return lang === 'en' ? `${diffMin}m ago` : `${diffMin} menit lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return lang === 'en' ? `${diffHour}h ago` : `${diffHour} jam lalu`;
    const diffDay = Math.floor(diffHour / 24);
    return lang === 'en' ? `${diffDay}d ago` : `${diffDay} hari lalu`;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-surface-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-expanded={open}
        aria-label={lang === 'en' ? 'Notifications' : 'Notifikasi'}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-surface-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-surface-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">{lang === 'en' ? 'Notifications' : 'Notifikasi'}</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-900"
              >
                <Check className="h-3.5 w-3.5" />
                {lang === 'en' ? 'Mark all read' : 'Tandai semua dibaca'}
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-surface-400">
                {lang === 'en' ? 'No notifications yet.' : 'Belum ada notifikasi.'}
              </p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleItemClick(notification)}
                  className={`flex w-full items-start gap-2 border-b border-surface-50 px-4 py-3 text-left text-sm transition-colors hover:bg-surface-50 ${
                    !notification.read ? 'bg-primary-50/50' : ''
                  }`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!notification.read ? 'bg-primary-600' : 'bg-transparent'}`} />
                  <span className="flex-1">
                    <span className="block font-medium text-gray-900">{notification.title}</span>
                    {notification.body && <span className="mt-0.5 block text-xs text-surface-600">{notification.body}</span>}
                    <span className="mt-1 block text-[11px] text-surface-400">{formatRelativeTime(notification.created_at)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
