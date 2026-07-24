'use client';

import { useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { MapPinned, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';

interface RegionalSummaryEntry {
  province: string;
  narrative: string;
  opportunities: string[];
  risks: string[];
}

interface RegionalAnalyticsResult {
  regionalSummary?: RegionalSummaryEntry[];
  nationalTrends?: string;
  rawText?: string;
}

export default function RegionalAnalyticsPanel() {
  const { lang } = useLanguage();
  const isMounted = useRef(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RegionalAnalyticsResult | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/regional-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang }),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || (lang === 'en' ? 'Failed to generate analysis' : 'Gagal membuat analisis'));
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-surface-200 bg-white p-4">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <MapPinned className="h-4 w-4 text-primary-700" />
            {lang === 'en' ? 'AI Regional Analytics' : 'Analitik Regional AI'}
          </h3>
          <p className="mt-1 text-xs text-surface-500">
            {lang === 'en'
              ? 'Narrative analysis of land, supply, and demand activity by province.'
              : 'Analisis naratif aktivitas lahan, supply, dan demand per provinsi.'}
          </p>
        </div>
        <Button type="button" onClick={handleGenerate} disabled={loading}>
          {loading ? <Spinner size="sm" /> : (
            <>
              <Sparkles className="mr-1 h-4 w-4" />
              {lang === 'en' ? 'Generate' : 'Buat Analisis'}
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          {result.nationalTrends && (
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <TrendingUp className="h-4 w-4 text-primary-700" />
                {lang === 'en' ? 'National trends' : 'Tren Nasional'}
              </h3>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{result.nationalTrends}</p>
            </div>
          )}

          {result.regionalSummary && result.regionalSummary.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {result.regionalSummary.map((r) => (
                <div key={r.province} className="rounded-xl border border-surface-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-gray-900">{r.province}</h3>
                  <p className="mt-1 text-sm text-gray-700">{r.narrative}</p>
                  {r.opportunities?.length > 0 && (
                    <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-2">
                      <p className="text-xs font-semibold text-green-800">
                        {lang === 'en' ? 'Opportunities' : 'Peluang'}
                      </p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-green-700">
                        {r.opportunities.map((o, i) => <li key={i}>{o}</li>)}
                      </ul>
                    </div>
                  )}
                  {r.risks?.length > 0 && (
                    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2">
                      <p className="flex items-center gap-1 text-xs font-semibold text-red-800">
                        <AlertTriangle className="h-3 w-3" />
                        {lang === 'en' ? 'Risks' : 'Risiko'}
                      </p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-red-700">
                        {r.risks.map((rk, i) => <li key={i}>{rk}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : result.rawText ? (
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <p className="whitespace-pre-wrap text-sm text-gray-700">{result.rawText}</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
