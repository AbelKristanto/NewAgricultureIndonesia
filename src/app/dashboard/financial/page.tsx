'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { COMMODITIES } from '@/lib/constants';
import Spinner from '@/components/ui/Spinner';
import { LandPlot } from '@/types/land-plots';
import { HarvestRecord } from '@/types/harvest-records';
import { Transaction } from '@/types/transaction';
import { Wallet, AlertTriangle, Sparkles } from 'lucide-react';

interface PerformanceAnalysisResult {
  narrative: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
}

function formatCurrency(value: number, lang: string) {
  return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

interface MonthBucket {
  month: string;
  income: number;
  expense: number;
}

export default function FinancialDashboardPage() {
  const { lang } = useLanguage();
  const isMounted = useRef(true);

  const [harvestRecords, setHarvestRecords] = useState<HarvestRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [landPlots, setLandPlots] = useState<LandPlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<PerformanceAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  useEffect(() => {
    isMounted.current = true;
    Promise.all([
      fetch('/api/harvest-records').then((r) => r.json()),
      fetch('/api/transactions').then((r) => r.json()),
      fetch('/api/land-plots').then((r) => r.json()),
    ])
      .then(([harvestData, txData, plotsData]) => {
        if (!isMounted.current) return;
        if (harvestData.success) setHarvestRecords(harvestData.data);
        else setError(harvestData.error || (lang === 'en' ? 'Failed to load data' : 'Gagal memuat data'));
        if (txData.success) setTransactions(txData.data);
        if (plotsData.success) setLandPlots(plotsData.data);
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

  const getPlotArea = (landPlotId: string): number | null =>
    landPlots.find((p) => p.id === landPlotId)?.area_value ?? null;

  const getCommodityLabel = (value: string) =>
    COMMODITIES.find((c) => c.value === value)?.[lang === 'en' ? 'labelEn' : 'labelId'] || value;

  const harvestRevenue = harvestRecords.reduce((sum, r) => sum + (r.revenue || 0), 0);
  const harvestCost = harvestRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
  const completedTransactions = transactions.filter((t) => t.status === 'completed');
  const marketplaceRevenue = completedTransactions.reduce((sum, t) => sum + (t.total_value || 0), 0);

  const totalRevenue = harvestRevenue + marketplaceRevenue;
  const totalExpense = harvestCost;
  const estimatedProfit = totalRevenue - totalExpense;
  const margin = totalRevenue > 0 ? (estimatedProfit / totalRevenue) * 100 : 0;

  const buckets = new Map<string, MonthBucket>();
  harvestRecords.forEach((r) => {
    const month = r.season_end.slice(0, 7);
    const b = buckets.get(month) || { month, income: 0, expense: 0 };
    b.income += r.revenue || 0;
    b.expense += r.cost || 0;
    buckets.set(month, b);
  });
  completedTransactions.forEach((t) => {
    const month = t.created_at.slice(0, 7);
    const b = buckets.get(month) || { month, income: 0, expense: 0 };
    b.income += t.total_value || 0;
    buckets.set(month, b);
  });
  const monthlyBuckets = Array.from(buckets.values()).sort((a, b) => a.month.localeCompare(b.month));
  const maxAbsNet = Math.max(1, ...monthlyBuckets.map((b) => Math.abs(b.income - b.expense)));

  const costPerHa = (record: HarvestRecord): number | null => {
    if (record.cost == null) return null;
    const area = getPlotArea(record.land_plot_id);
    if (!area || area <= 0) return null;
    return record.cost / area;
  };

  const chronologicalHarvests = [...harvestRecords].sort((a, b) => (a.season_end > b.season_end ? 1 : -1));
  const costFlagByCommodity = new Map<string, number>();
  chronologicalHarvests.forEach((record, idx) => {
    const current = costPerHa(record);
    if (current == null) return;
    for (let i = idx - 1; i >= 0; i--) {
      if (chronologicalHarvests[i].commodity === record.commodity) {
        const prev = costPerHa(chronologicalHarvests[i]);
        if (prev != null && prev > 0) {
          const delta = ((current - prev) / prev) * 100;
          if (delta > 15) {
            costFlagByCommodity.set(record.commodity, delta);
          } else {
            costFlagByCommodity.delete(record.commodity);
          }
        }
        break;
      }
    }
  });

  const handleGenerateAnalysis = () => {
    setAnalysisLoading(true);
    setAnalysisError('');
    fetch('/api/ai/performance-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalRevenue,
        totalExpense,
        estimatedProfit,
        margin,
        monthlyBuckets,
        costFlags: Array.from(costFlagByCommodity.entries()).map(([commodity, deltaPercent]) => ({ commodity, deltaPercent })),
        lang,
      }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setAnalysis(json.data);
        else setAnalysisError(json.error || (lang === 'en' ? 'Failed to generate analysis' : 'Gagal membuat analisis'));
      })
      .catch(() => setAnalysisError(lang === 'en' ? 'Network error' : 'Gagal terhubung'))
      .finally(() => setAnalysisLoading(false));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Wallet className="h-6 w-6 text-primary-700" />
          {lang === 'en' ? 'Financial Dashboard' : 'Dashboard Keuangan'}
        </h1>
        <p className="mt-1 text-surface-500">
          {lang === 'en'
            ? 'Income, expenses, and profit across your harvests and marketplace sales.'
            : 'Pendapatan, pengeluaran, dan keuntungan dari hasil panen dan transaksi pasar Anda.'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <p className="text-sm font-medium text-surface-500">{lang === 'en' ? 'Total revenue' : 'Total pendapatan'}</p>
          <p className="mt-2 text-lg font-bold text-gray-900">{formatCurrency(totalRevenue, lang)}</p>
          <p className="mt-1 text-xs text-surface-400">
            {lang === 'en' ? 'Harvest' : 'Panen'}: {formatCurrency(harvestRevenue, lang)} • {lang === 'en' ? 'Marketplace' : 'Transaksi pasar'}: {formatCurrency(marketplaceRevenue, lang)}
          </p>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <p className="text-sm font-medium text-surface-500">{lang === 'en' ? 'Total expenses' : 'Total pengeluaran'}</p>
          <p className="mt-2 text-lg font-bold text-gray-900">{formatCurrency(totalExpense, lang)}</p>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <p className="text-sm font-medium text-surface-500">{lang === 'en' ? 'Estimated profit' : 'Estimasi keuntungan'}</p>
          <p className={`mt-2 text-lg font-bold ${estimatedProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {formatCurrency(estimatedProfit, lang)}
          </p>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <p className="text-sm font-medium text-surface-500">{lang === 'en' ? 'Profit margin' : 'Margin keuntungan'}</p>
          <p className="mt-2 text-lg font-bold text-gray-900">{margin.toFixed(0)}%</p>
        </div>
      </div>

      {costFlagByCommodity.size > 0 && (
        <div className="space-y-2">
          {Array.from(costFlagByCommodity.entries()).map(([commodity, delta]) => (
            <div key={commodity} className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {lang === 'en'
                  ? `Production cost for ${getCommodityLabel(commodity)} is up ${delta.toFixed(0)}% vs the previous season. Check expenses like fertilizer, seeds, or labor.`
                  : `Biaya produksi ${getCommodityLabel(commodity)} naik ${delta.toFixed(0)}% dibanding musim sebelumnya. Cek pengeluaran seperti pupuk, benih, atau tenaga kerja.`}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-surface-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">{lang === 'en' ? 'Simple cashflow' : 'Cashflow sederhana'}</h2>
        {monthlyBuckets.length === 0 ? (
          <p className="mt-3 text-sm text-surface-400">
            {lang === 'en' ? 'No income or expense data yet.' : 'Belum ada data pendapatan atau pengeluaran.'}
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {monthlyBuckets.map((b) => {
              const net = b.income - b.expense;
              return (
                <div key={b.month}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">{b.month}</span>
                    <span className={net >= 0 ? 'text-green-700' : 'text-red-700'}>
                      {net >= 0 ? '+' : ''}{formatCurrency(net, lang)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-surface-200">
                    <div
                      className={`h-2 rounded-full ${net >= 0 ? 'bg-green-600' : 'bg-red-600'}`}
                      style={{ width: `${(Math.abs(net) / maxAbsNet) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-surface-400">
                    {lang === 'en' ? 'Income' : 'Pendapatan'}: {formatCurrency(b.income, lang)} • {lang === 'en' ? 'Expense' : 'Pengeluaran'}: {formatCurrency(b.expense, lang)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-surface-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Sparkles className="h-4 w-4 text-primary-600" />
            {lang === 'en' ? 'AI Performance Analysis' : 'Analisis Performa AI'}
          </h2>
          <button
            onClick={handleGenerateAnalysis}
            disabled={analysisLoading}
            className="rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-800 disabled:opacity-50"
          >
            {analysisLoading
              ? (lang === 'en' ? 'Analyzing...' : 'Menganalisis...')
              : (lang === 'en' ? 'Generate Analysis' : 'Buat Analisis AI')}
          </button>
        </div>

        {analysisError && (
          <p className="mt-3 text-sm text-red-700">{analysisError}</p>
        )}

        {!analysis && !analysisError && !analysisLoading && (
          <p className="mt-3 text-sm text-surface-400">
            {lang === 'en'
              ? 'Generate an AI narrative over the numbers above — strengths, concerns, and recommendations.'
              : 'Buat narasi AI dari angka di atas — kekuatan, perhatian, dan rekomendasi.'}
          </p>
        )}

        {analysis && (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-gray-700 leading-5">{analysis.narrative}</p>
            {analysis.strengths?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                  {lang === 'en' ? 'Strengths' : 'Kekuatan'}
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {analysis.concerns?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                  {lang === 'en' ? 'Concerns' : 'Perhatian'}
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {analysis.concerns.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {analysis.recommendations?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                  {lang === 'en' ? 'Recommendations' : 'Rekomendasi'}
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {analysis.recommendations.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
