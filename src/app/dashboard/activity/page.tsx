'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { createClient } from '@/lib/supabase/client';
import { fetchRecentActivity, RecentActivityItem } from '@/hooks/useDashboardData';
import { formatTimeAgo } from '@/lib/time-format';
import Spinner from '@/components/ui/Spinner';
import {
  Clock,
  Wheat,
  ShoppingCart,
  Building2,
  MessageSquare,
  CloudSun,
  Handshake,
  FileSignature,
  Map,
  Sprout,
  History,
  CalendarDays,
} from 'lucide-react';

const TYPE_ICON: Record<string, typeof Wheat> = {
  Farmer: Wheat,
  Buyer: ShoppingCart,
  Policy: Building2,
  Chat: MessageSquare,
  Weather: CloudSun,
  Matching: Handshake,
  Transaction: FileSignature,
  LandPlot: Map,
  CropLog: Sprout,
  Harvest: History,
  Calendar: CalendarDays,
};

function dateGroupLabel(dateStr: string, lang: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (isSameDay(date, today)) return lang === 'en' ? 'Today' : 'Hari ini';
  if (isSameDay(date, yesterday)) return lang === 'en' ? 'Yesterday' : 'Kemarin';
  return date.toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ActivityTimelinePage() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { role } = useRole();
  const isMounted = useRef(true);
  const supabaseRef = useRef(createClient());

  const [items, setItems] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    isMounted.current = true;
    const abortController = new AbortController();

    fetchRecentActivity(supabaseRef.current, user.id, role, abortController.signal, 50)
      .then((data) => {
        if (!isMounted.current) return;
        setItems(data);
      })
      .catch(() => {
        if (!isMounted.current) return;
        setError(lang === 'en' ? 'Failed to load activity' : 'Gagal memuat aktivitas');
      })
      .finally(() => {
        if (isMounted.current) setLoading(false);
      });

    return () => {
      isMounted.current = false;
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role]);

  const groups: { label: string; items: RecentActivityItem[] }[] = [];
  items.forEach((item) => {
    const label = dateGroupLabel(item.created_at, lang);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Clock className="h-6 w-6 text-primary-700" />
          {lang === 'en' ? 'Activity Timeline' : 'Riwayat Aktivitas'}
        </h1>
        <p className="mt-1 text-surface-500">
          {lang === 'en'
            ? 'Your business journey, from land registration to completed transactions.'
            : 'Perjalanan usaha Anda, dari mendaftarkan lahan sampai transaksi selesai.'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-300 bg-white py-12 text-center text-surface-400">
          {lang === 'en' ? 'No activity yet.' : 'Belum ada aktivitas.'}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <h2 className="mb-2 text-sm font-semibold text-surface-500">{group.label}</h2>
              <div className="space-y-2 rounded-xl border border-surface-200 bg-white p-2">
                {group.items.map((item, i) => {
                  const Icon = TYPE_ICON[item.type] || Clock;
                  const row = (
                    <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface-50">
                      <div className="rounded-lg bg-primary-50 p-2 text-primary-700">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
                        <p className="text-xs text-surface-400">{formatTimeAgo(item.created_at, lang)}</p>
                      </div>
                    </div>
                  );
                  return item.href ? (
                    <Link key={`${item.type}-${i}`} href={item.href}>
                      {row}
                    </Link>
                  ) : (
                    <div key={`${item.type}-${i}`}>{row}</div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
