'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Spinner from '@/components/ui/Spinner';
import { Globe, Users, FileSignature, Store, Route, BrainCircuit } from 'lucide-react';

interface PlatformOverview {
  usersByRole: Record<string, number>;
  transactionsByStatus: Record<string, number>;
  listingsByStatus: Record<string, number>;
  activeLogisticsPlans: number;
  aiAnalysesCounts: Record<string, number>;
  totalAiAnalyses: number;
}

function StatGroup({ title, icon, data }: { title: string; icon: React.ReactNode; data: Record<string, number> }) {
  return (
    <div className="rounded-xl border border-surface-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        {icon}
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(data).map(([key, count]) => (
          <div key={key} className="rounded-lg bg-surface-50 px-3 py-2">
            <p className="text-xs text-surface-500">{key}</p>
            <p className="text-xl font-bold text-gray-900">{count}</p>
          </div>
        ))}
        {Object.keys(data).length === 0 && <p className="col-span-full text-sm text-surface-400">-</p>}
      </div>
    </div>
  );
}

export default function PlatformOverviewPage() {
  const { lang } = useLanguage();
  const isMounted = useRef(true);

  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    isMounted.current = true;
    fetch('/api/platform-overview')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted.current) return;
        if (data.success) {
          setOverview(data.data);
        } else {
          setError(data.error || (lang === 'en' ? 'Failed to load overview' : 'Gagal memuat ringkasan'));
        }
      })
      .catch(() => {
        if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
      })
      .finally(() => {
        if (isMounted.current) setLoading(false);
      });
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Globe className="h-6 w-6 text-primary-700" />
          {lang === 'en' ? 'Platform Overview' : 'Ringkasan Platform'}
        </h1>
        <p className="mt-1 text-surface-500">
          {lang === 'en'
            ? 'Read-only, platform-wide statistics across users, transactions, marketplace, supply chain, and AI usage.'
            : 'Statistik seluruh platform (hanya baca) mencakup pengguna, transaksi, marketplace, supply chain, dan penggunaan AI.'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : overview ? (
        <div className="space-y-4">
          <StatGroup title={lang === 'en' ? 'Users by role' : 'Pengguna berdasarkan peran'} icon={<Users className="h-4 w-4 text-primary-700" />} data={overview.usersByRole} />
          <StatGroup title={lang === 'en' ? 'Transactions by status' : 'Transaksi berdasarkan status'} icon={<FileSignature className="h-4 w-4 text-primary-700" />} data={overview.transactionsByStatus} />
          <StatGroup title={lang === 'en' ? 'Marketplace listings by status' : 'Listing marketplace berdasarkan status'} icon={<Store className="h-4 w-4 text-primary-700" />} data={overview.listingsByStatus} />
          <div className="rounded-xl border border-surface-200 bg-white p-5">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Route className="h-4 w-4 text-primary-700" />
              {lang === 'en' ? 'Supply chain' : 'Supply chain'}
            </h2>
            <div className="inline-block rounded-lg bg-surface-50 px-3 py-2">
              <p className="text-xs text-surface-500">{lang === 'en' ? 'Logistics plans' : 'Rencana logistik'}</p>
              <p className="text-xl font-bold text-gray-900">{overview.activeLogisticsPlans}</p>
            </div>
          </div>
          <div className="rounded-xl border border-surface-200 bg-white p-5">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <BrainCircuit className="h-4 w-4 text-primary-700" />
              {lang === 'en' ? 'AI analyses run' : 'Analisis AI dijalankan'}
            </h2>
            <p className="mb-3 text-sm text-surface-600">
              {lang === 'en' ? 'Total: ' : 'Total: '}<span className="font-semibold text-gray-900">{overview.totalAiAnalyses}</span>
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(overview.aiAnalysesCounts).map(([table, count]) => (
                <div key={table} className="rounded-lg bg-surface-50 px-3 py-2">
                  <p className="text-xs text-surface-500">{table}</p>
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
