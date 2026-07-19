'use client';

import { useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { EsgComputed } from '@/lib/esg-calculator';
import { Leaf } from 'lucide-react';

interface EsgReportResult {
  computed: EsgComputed;
  narrative?: string;
  recommendations?: string[];
  rawText?: string;
}

export default function EsgReportPanel() {
  const { lang } = useLanguage();
  const isMounted = useRef(true);

  const [scope, setScope] = useState<'platform' | 'commodity'>('platform');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<EsgReportResult | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/esg-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, lang }),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || (lang === 'en' ? 'Failed to generate report' : 'Gagal membuat laporan'));
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-surface-200 bg-white p-4">
        <div className="w-48">
          <Select
            label={lang === 'en' ? 'Scope' : 'Cakupan'}
            value={scope}
            onChange={(e) => setScope(e.target.value as 'platform' | 'commodity')}
            options={[
              { value: 'platform', label: lang === 'en' ? 'Whole platform' : 'Seluruh platform' },
              { value: 'commodity', label: lang === 'en' ? 'By commodity' : 'Per komoditas' },
            ]}
          />
        </div>
        <Button type="button" onClick={handleGenerate} disabled={loading}>
          {loading ? <Spinner size="sm" /> : lang === 'en' ? 'Generate report' : 'Buat laporan'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <p className="text-xs text-surface-500">{lang === 'en' ? 'Farmers assessed' : 'Petani dinilai'}</p>
              <p className="text-2xl font-bold text-gray-900">{result.computed.farmerCount}</p>
            </div>
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <p className="text-xs text-surface-500">{lang === 'en' ? 'Average score' : 'Skor rata-rata'}</p>
              <p className="text-2xl font-bold text-gray-900">{result.computed.averageScore}</p>
            </div>
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <p className="text-xs text-surface-500">
                {lang === 'en' ? 'Est. carbon impact index' : 'Indeks estimasi dampak karbon'}
              </p>
              <p className="text-2xl font-bold text-gray-900">{result.computed.estimatedCarbonImpactIndex}</p>
              <p className="mt-0.5 text-[10px] text-surface-400">
                {lang === 'en' ? 'Estimate, not measured CO2' : 'Estimasi, bukan CO2 terukur'}
              </p>
            </div>
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <p className="mb-1 text-xs text-surface-500">{lang === 'en' ? 'Tier distribution' : 'Distribusi tingkat'}</p>
              <p className="text-xs text-gray-700">
                {lang === 'en' ? 'Gold' : 'Emas'} {result.computed.tierDistribution.gold} · {lang === 'en' ? 'Silver' : 'Perak'} {result.computed.tierDistribution.silver} · {lang === 'en' ? 'Bronze' : 'Perunggu'} {result.computed.tierDistribution.bronze}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-surface-200 bg-white p-5">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Leaf className="h-4 w-4 text-primary-700" />
              {lang === 'en' ? 'Narrative' : 'Narasi'}
            </h3>
            {result.narrative ? (
              <p className="whitespace-pre-wrap text-sm text-gray-700">{result.narrative}</p>
            ) : (
              <p className="whitespace-pre-wrap text-sm text-gray-700">{result.rawText}</p>
            )}
            {result.recommendations && result.recommendations.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {result.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
