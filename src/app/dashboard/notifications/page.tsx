'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppNotification } from '@/types/notification';
import { formatTimeAgo } from '@/lib/time-format';
import Spinner from '@/components/ui/Spinner';

export default function NotificationsPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const isMounted = useRef(true);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=100');
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setNotifications(data.data.notifications);
      } else {
        setError(lang === 'en' ? 'Failed to load notifications' : 'Gagal memuat notifikasi');
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Failed to load notifications' : 'Gagal memuat notifikasi');
    } finally {
      if (isMounted.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    isMounted.current = true;
    load();
    return () => {
      isMounted.current = false;
    };
  }, [load]);

  const handleItemClick = (notification: AppNotification) => {
    if (!notification.read) {
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
      );
      fetch(`/api/notifications/${notification.id}`, { method: 'PATCH' }).catch(() => {});
    }
    if (notification.link) router.push(notification.link);
  };

  const handleMarkAllRead = async () => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'PATCH' });
    } catch {
      // Non-critical — a stale unread state self-corrects on next reload.
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  const renderItem = (notification: AppNotification) => (
    <button
      key={notification.id}
      type="button"
      onClick={() => handleItemClick(notification)}
      className={`flex w-full items-start gap-3 rounded-lg border border-surface-100 px-4 py-3 text-left text-sm transition-colors hover:bg-surface-50 ${
        !notification.read ? 'bg-primary-50/50' : 'bg-white'
      }`}
    >
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!notification.read ? 'bg-primary-600' : 'bg-transparent'}`} />
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-gray-900">{notification.title}</span>
        {notification.body && <span className="mt-0.5 block text-xs text-surface-600">{notification.body}</span>}
        <span className="mt-1 block text-[11px] text-surface-400">{formatTimeAgo(notification.created_at, lang)}</span>
      </span>
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Bell className="h-6 w-6 text-primary-700" />
            {lang === 'en' ? 'Notification Center' : 'Pusat Notifikasi'}
          </h1>
          <p className="mt-1 text-surface-500">
            {lang === 'en' ? 'Everything that needs your attention, in one place.' : 'Semua yang perlu perhatian Anda, dalam satu tempat.'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
          >
            <CheckCheck className="h-4 w-4" />
            {lang === 'en' ? 'Mark all read' : 'Tandai semua dibaca'}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-300 bg-white py-12 text-center text-surface-400">
          {lang === 'en' ? 'No notifications yet.' : 'Belum ada notifikasi.'}
        </div>
      ) : (
        <div className="space-y-6">
          {unread.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-surface-500">
                {lang === 'en' ? `Unread (${unread.length})` : `Belum dibaca (${unread.length})`}
              </h2>
              <div className="space-y-2">{unread.map(renderItem)}</div>
            </div>
          )}
          {read.length > 0 && (
            <div>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-surface-500">
                <Check className="h-3.5 w-3.5" />
                {lang === 'en' ? 'Read' : 'Sudah dibaca'}
              </h2>
              <div className="space-y-2">{read.map(renderItem)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
