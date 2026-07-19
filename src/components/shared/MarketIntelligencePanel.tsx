'use client';

import { useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { COMMODITIES, INDONESIAN_PROVINCES } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';

interface MarketIntelligenceResult {
  demandOutlook?: string;
  priceOutlook?: string;
  trendNarrative?: string;
  risks?: string[];
  opportunities?: string[];
  rawText?: string;
}

const TIMEFRAMES = [
  { value: '1 month', en: '1 month', id: '1 bulan' },
  { value: '3 months', en: '3 months', id: '3 bulan' },
  { value: '6 months', en: '6 months', id: '6 bulan' },
  { value: '1 year', en: '1 year', id: '1 tahun' },
];

export default function MarketIntelligencePanel() {
  const { lang } = useLanguage();
  const isMounted = useRef(true);

  const [commodity, setCommodity] = useState('');
  const [province, setProvince] = useState('');
  const [timeframe, setTimeframe] = useState('3 months');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MarketIntelligenceResult | null>(null);

  const commodityOptions = COMMODITIES.map((c) => ({ value: c.value, label: lang === 'en' ? c.labelEn : c.labelId }));
  const provinceOptions = INDONESIAN_PROVINCES.map((p) => ({ value: p.value, label: lang === 'en' ? p.labelEn : p.labelId }));

  const handleGenerate = async () => {
    if (!commodity || !province) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/market-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commodity, province, timeframe, lang }),
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
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-surface-200 bg-white p-4 sm:grid-cols-4 sm:items-end">
        <Select
          label={lang === 'en' ? 'Commodity' : 'Komoditas'}
          options={commodityOptions}
          placeholder={lang === 'en' ? 'Select' : 'Pilih'}
          value={commodity}
          onChange={(e) => setCommodity(e.target.value)}
        />
        <Select
          label={lang === 'en' ? 'Province' : 'Provinsi'}
          options={provinceOptions}
          placeholder={lang === 'en' ? 'Select' : 'Pilih'}
          value={province}
          onChange={(e) => setProvince(e.target.value)}
        />
        <Select
          label={lang === 'en' ? 'Timeframe' : 'Jangka waktu'}
          options={TIMEFRAMES.map((t) => ({ value: t.value, label: lang === 'en' ? t.en : t.id }))}
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
        />
        <Button type="button" onClick={handleGenerate} disabled={loading || !commodity || !province}>
          {loading ? <Spinner size="sm" /> : (
            <>
              <Sparkles className="mr-1 h-4 w-4" />
              {lang === 'en' ? 'Analyze' : 'Analisis'}
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <TrendingUp className="h-4 w-4 text-primary-700" />
                {lang === 'en' ? 'Demand outlook' : 'Prospek permintaan'}
              </h3>
              <p className="text-sm text-gray-700">{result.demandOutlook || result.rawText}</p>
            </div>
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <TrendingUp className="h-4 w-4 text-primary-700" />
                {lang === 'en' ? 'Price outlook' : 'Prospek harga'}
              </h3>
              <p className="text-sm text-gray-700">{result.priceOutlook}</p>
            </div>
          </div>

          {result.trendNarrative && (
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <h3 className="mb-1 text-sm font-semibold text-gray-900">
                {lang === 'en' ? 'Market trends' : 'Tren pasar'}
              </h3>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{result.trendNarrative}</p>
            </div>
          )}

          {((result.risks && result.risks.length > 0) || (result.opportunities && result.opportunities.length > 0)) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {result.risks && result.risks.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    {lang === 'en' ? 'Risks' : 'Risiko'}
                  </h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-red-700">
                    {result.risks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {result.opportunities && result.opportunities.length > 0 && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <h3 className="mb-1 text-sm font-semibold text-green-800">
                    {lang === 'en' ? 'Opportunities' : 'Peluang'}
                  </h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-green-700">
                    {result.opportunities.map((o, i) => <li key={i}>{o}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
