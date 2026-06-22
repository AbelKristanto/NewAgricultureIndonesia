'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { MatchingInput } from '@/types/matching';
import { COMMODITIES, QUALITY_GRADES, INDONESIAN_PROVINCES, TIMELINE_OPTIONS } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Spinner from '@/components/ui/Spinner';
import ResultSection from '@/components/shared/ResultSection';
import FormInfoButton from '@/components/shared/FormInfoButton';
import ReactMarkdown from 'react-markdown';
import { MapPin, BarChart3, Truck, Clock, DollarSign, ThumbsUp, History, ChevronDown, ChevronUp } from 'lucide-react';

interface MatchingResult {
  matchedRegions?: string;
  capacityEstimates?: string;
  logisticsFeasibility?: string;
  timeline?: string;
  priceAnalysis?: string;
  recommendations?: string;
  rawText?: string;
}

interface HistoryItem {
  id: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  created_at: string;
}

export default function MatchingPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatchingResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [form, setForm] = useState({
    commodity: '',
    volume: '',
    volumeUnit: 'tons' as 'tons' | 'kg',
    deliveryProvince: '',
    deliveryCity: '',
    qualityGrade: 'standard',
    timeline: '1-season',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);

    const input: MatchingInput = {
      commodity: form.commodity,
      volume: Number(form.volume),
      volumeUnit: form.volumeUnit,
      deliveryProvince: form.deliveryProvince,
      deliveryCity: form.deliveryCity,
      qualityGrade: form.qualityGrade,
      timeline: form.timeline,
      notes: form.notes,
      lang,
    };

    try {
      const res = await fetch('/api/ai/matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: abortControllerRef.current?.signal,
      });
      if (!isMounted.current) return;
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setResults(data.data);
        if (user?.id) {
          const supabase = supabaseRef.current;
          const { data: hist } = await supabase
            .from('matching_analyses')
            .select('id, input, result, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10)
            .abortSignal(abortControllerRef.current?.signal ?? new AbortController().signal);
          if (!isMounted.current) return;
          if (hist) setHistory(hist as HistoryItem[]);
        }
      } else {
        setError(data.error || t('common.error'));
      }
    } catch (err) {
      if (!isMounted.current) return;
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(t('common.error'));
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    isMounted.current = true;
    abortControllerRef.current?.abort();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const supabase = supabaseRef.current;
    supabase
      .from('matching_analyses')
      .select('id, input, result, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .abortSignal(abortController.signal)
      .then(({ data }) => {
        if (!isMounted.current) return;
        if (data) setHistory(data as HistoryItem[]);
      });

    return () => {
      isMounted.current = false;
      abortController.abort();
    };
  }, [user?.id]);

  const loadHistoryItem = (item: HistoryItem) => {
    const inp = item.input as Record<string, unknown>;
    setForm({
      commodity: (inp.commodity as string) || '',
      volume: String(inp.volume || ''),
      volumeUnit: (inp.volumeUnit as 'tons' | 'kg') || 'tons',
      deliveryProvince: (inp.deliveryProvince as string) || '',
      deliveryCity: (inp.deliveryCity as string) || '',
      qualityGrade: (inp.qualityGrade as string) || 'standard',
      timeline: (inp.timeline as string) || '1-season',
      notes: (inp.notes as string) || '',
    });
    setResults(item.result as unknown as MatchingResult);
  };

  const commodityOptions = COMMODITIES.map((c) => ({
    value: c.value,
    label: lang === 'en' ? c.labelEn : c.labelId,
  }));

  const provinceOptions = INDONESIAN_PROVINCES.map((p) => ({
    value: p.value,
    label: lang === 'en' ? p.labelEn : p.labelId,
  }));

  const gradeOptions = QUALITY_GRADES.map((g) => ({
    value: g.value,
    label: lang === 'en' ? g.labelEn : g.labelId,
  }));

  const timelineOptions = TIMELINE_OPTIONS.map((t) => ({
    value: t.value,
    label: lang === 'en' ? t.labelEn : t.labelId,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('matching.title')}</h1>
        <p className="text-surface-500 mt-1">{t('matching.subtitle')}</p>
      </div>

      <div className="bg-white rounded-xl border border-surface-200">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-surface-500" />
            <span className="text-sm font-medium text-gray-700">{t('common.history')} ({history.length})</span>
          </div>
          {showHistory ? <ChevronUp className="h-4 w-4 text-surface-400" /> : <ChevronDown className="h-4 w-4 text-surface-400" />}
        </button>
        {showHistory && (
          <div className="border-t border-surface-100 p-3 space-y-1 max-h-60 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-sm text-surface-400 p-2">{t('common.noHistory')}</p>
            ) : (
              history.map((item) => {
                const inp = item.input as Record<string, string>;
                return (
                  <button
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className="w-full text-left p-2 rounded-lg hover:bg-surface-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-800 truncate">{inp.commodity || 'Commodity'} - {inp.deliveryProvince || ''}</p>
                    <p className="text-xs text-surface-400">{new Date(item.created_at).toLocaleDateString()}</p>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-surface-200 p-6 space-y-6">
        <div className="flex flex-col gap-3 rounded-lg border border-primary-100 bg-primary-50/50 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{lang === 'en' ? 'Supply Matching Form' : 'Form Pencocokan Pasokan'}</h2>
            <p className="mt-1 text-sm text-surface-600">
              {lang === 'en'
                ? 'Use this to compare likely supply regions, capacity, logistics feasibility, and price fit.'
                : 'Gunakan form ini untuk membandingkan daerah pasokan, kapasitas, kelayakan logistik, dan kecocokan harga.'}
            </p>
          </div>
          <FormInfoButton
            title={lang === 'en' ? 'Better matching input' : 'Input agar matching lebih akurat'}
            description={lang === 'en' ? 'The model matches demand to production regions based on commodity, volume, destination, quality, and timeline.' : 'Model mencocokkan kebutuhan dengan daerah produksi berdasarkan komoditas, volume, tujuan, kualitas, dan timeline.'}
            tips={lang === 'en'
              ? ['Use the real destination city for logistics estimates.', 'Choose quality grade to filter realistic supplier options.', 'Write constraints in notes, such as cold chain, packaging, or urgent delivery.']
              : ['Isi kota tujuan sebenarnya untuk estimasi logistik.', 'Pilih grade kualitas agar opsi supplier lebih realistis.', 'Tulis batasan di catatan, misalnya cold chain, kemasan, atau pengiriman cepat.']}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            id="commodity"
            label={t('matching.commodity')}
            options={commodityOptions}
            placeholder={t('common.selectPlaceholder')}
            value={form.commodity}
            onChange={(e) => setForm({ ...form, commodity: e.target.value })}
            required
          />
          <Input
            id="volume"
            label={t('matching.volume')}
            type="number"
            min="0"
            value={form.volume}
            onChange={(e) => setForm({ ...form, volume: e.target.value })}
            required
          />
          <Select
            id="volumeUnit"
            label={t('matching.volumeUnit')}
            options={[
              { value: 'tons', label: t('common.tons') },
              { value: 'kg', label: t('common.kilograms') },
            ]}
            value={form.volumeUnit}
            onChange={(e) => setForm({ ...form, volumeUnit: e.target.value as 'tons' | 'kg' })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            id="deliveryProvince"
            label={t('matching.deliveryProvince')}
            options={provinceOptions}
            placeholder={t('common.selectPlaceholder')}
            value={form.deliveryProvince}
            onChange={(e) => setForm({ ...form, deliveryProvince: e.target.value })}
            required
          />
          <Input
            id="deliveryCity"
            label={t('matching.deliveryCity')}
            placeholder={t('matching.deliveryCityPlaceholder')}
            value={form.deliveryCity}
            onChange={(e) => setForm({ ...form, deliveryCity: e.target.value })}
          />
          <Select
            id="qualityGrade"
            label={t('matching.qualityGrade')}
            options={gradeOptions}
            value={form.qualityGrade}
            onChange={(e) => setForm({ ...form, qualityGrade: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            id="timeline"
            label={t('matching.timeline')}
            options={timelineOptions}
            value={form.timeline}
            onChange={(e) => setForm({ ...form, timeline: e.target.value })}
          />
        </div>

        <Textarea
          id="notes"
          label={t('matching.notes')}
          placeholder={t('matching.notesPlaceholder')}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <Button type="submit" size="lg" disabled={loading} className="w-full md:w-auto">
          {loading ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" />
              {t('matching.analyzing')}
            </span>
          ) : (
            t('matching.submit')
          )}
        </Button>
      </form>

      {results && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">{t('matching.results.title')}</h2>

          {results.rawText && !results.matchedRegions ? (
            <div className="bg-white rounded-xl border border-surface-200 p-6 prose prose-sm max-w-none">
              <ReactMarkdown>{results.rawText}</ReactMarkdown>
            </div>
          ) : (
            <>
              {results.matchedRegions && (
                <ResultSection title={t('matching.results.matchedRegions')} icon={<MapPin className="h-5 w-5 text-primary-600" />}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.matchedRegions}</ReactMarkdown></div>
                </ResultSection>
              )}
              {results.capacityEstimates && (
                <ResultSection title={t('matching.results.capacityEstimates')} icon={<BarChart3 className="h-5 w-5 text-blue-600" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.capacityEstimates}</ReactMarkdown></div>
                </ResultSection>
              )}
              {results.logisticsFeasibility && (
                <ResultSection title={t('matching.results.logisticsFeasibility')} icon={<Truck className="h-5 w-5 text-teal-600" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.logisticsFeasibility}</ReactMarkdown></div>
                </ResultSection>
              )}
              {results.timeline && (
                <ResultSection title={t('matching.results.timeline')} icon={<Clock className="h-5 w-5 text-indigo-600" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.timeline}</ReactMarkdown></div>
                </ResultSection>
              )}
              {results.priceAnalysis && (
                <ResultSection title={t('matching.results.priceAnalysis')} icon={<DollarSign className="h-5 w-5 text-orange-500" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.priceAnalysis}</ReactMarkdown></div>
                </ResultSection>
              )}
              {results.recommendations && (
                <ResultSection title={t('matching.results.recommendations')} icon={<ThumbsUp className="h-5 w-5 text-purple-600" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.recommendations}</ReactMarkdown></div>
                </ResultSection>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
