'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { COMMODITIES } from '@/lib/constants';
import Spinner from '@/components/ui/Spinner';
import { InstitutionalFinancialSummary } from '@/lib/db/institutional-financials';
import { Landmark } from 'lucide-react';

function formatCurrency(value: number, lang: string) {
  return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function InstitutionalFinancialPage() {
  const { lang } = useLanguage();
  const isMounted = useRef(true);

  const [summary, setSummary] = useState<InstitutionalFinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    isMounted.current = true;
    fetch('/api/institutional-financials')
      .then((r) => r.json())
      .then((json) => {
        if (!isMounted.current) return;
        if (json.success) setSummary(json.data);
        else setError(json.error || (lang === 'en' ? 'Failed to load data' : 'Gagal memuat data'));
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

  const getCommodityLabel = (value: string) =>
    COMMODITIES.find((c) => c.value === value)?.[lang === 'en' ? 'labelEn' : 'labelId'] || value;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const maxRevenue = Math.max(1, ...(summary?.byCommodity.map((c) => c.revenue) || []));
  const maxVolume = Math.max(1, ...(summary?.byCommodity.map((c) => c.volume) || []));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Landmark className="h-6 w-6 text-primary-700" />
          {lang === 'en' ? 'Institutional Financial & Production Summary' : 'Ringkasan Keuangan & Produksi Institusi'}
        </h1>
        <p className="mt-1 text-surface-500">
          {lang === 'en'
            ? 'Platform-wide income, expenses, and production volume across all farmers.'
            : 'Pendapatan, pengeluaran, dan volume produksi seluruh platform dari semua petani.'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <p className="text-sm font-medium text-surface-500">{lang === 'en' ? 'Platform revenue' : 'Pendapatan platform'}</p>
              <p className="mt-2 text-lg font-bold text-gray-900">{formatCurrency(summary.totalRevenue, lang)}</p>
            </div>
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <p className="text-sm font-medium text-surface-500">{lang === 'en' ? 'Platform expenses' : 'Pengeluaran platform'}</p>
              <p className="mt-2 text-lg font-bold text-gray-900">{formatCurrency(summary.totalExpense, lang)}</p>
            </div>
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <p className="text-sm font-medium text-surface-500">{lang === 'en' ? 'Estimated profit' : 'Estimasi keuntungan'}</p>
              <p className={`mt-2 text-lg font-bold ${summary.estimatedProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                {formatCurrency(summary.estimatedProfit, lang)}
              </p>
            </div>
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <p className="text-sm font-medium text-surface-500">{lang === 'en' ? 'Profit margin' : 'Margin keuntungan'}</p>
              <p className="mt-2 text-lg font-bold text-gray-900">{summary.margin.toFixed(0)}%</p>
            </div>
          </div>

          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <p className="text-sm font-medium text-surface-500">
              {lang === 'en' ? 'Total production volume (kg)' : 'Total volume produksi (kg)'}
            </p>
            <p className="mt-2 text-lg font-bold text-gray-900">
              {summary.totalProductionVolume.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')} kg
            </p>
          </div>

          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">
              {lang === 'en' ? 'Revenue by commodity' : 'Pendapatan per komoditas'}
            </h2>
            {summary.byCommodity.length === 0 ? (
              <p className="mt-3 text-sm text-surface-400">
                {lang === 'en' ? 'No data yet.' : 'Belum ada data.'}
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {summary.byCommodity.map((c) => (
                  <div key={c.commodity}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{getCommodityLabel(c.commodity)}</span>
                      <span className="text-gray-700">{formatCurrency(c.revenue, lang)}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-surface-200">
                      <div
                        className="h-2 rounded-full bg-primary-600"
                        style={{ width: `${(c.revenue / maxRevenue) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-surface-400">
                      {lang === 'en' ? 'Cost' : 'Biaya'}: {formatCurrency(c.cost, lang)} • {lang === 'en' ? 'Marketplace value' : 'Nilai transaksi pasar'}: {formatCurrency(c.transactionValue, lang)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">
              {lang === 'en' ? 'Production volume by commodity' : 'Volume produksi per komoditas'}
            </h2>
            {summary.byCommodity.length === 0 ? (
              <p className="mt-3 text-sm text-surface-400">
                {lang === 'en' ? 'No data yet.' : 'Belum ada data.'}
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {summary.byCommodity.map((c) => (
                  <div key={c.commodity}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{getCommodityLabel(c.commodity)}</span>
                      <span className="text-gray-700">{c.volume.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')} kg</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-surface-200">
                      <div
                        className="h-2 rounded-full bg-secondary-600"
                        style={{ width: `${(c.volume / maxVolume) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
