'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { BuyerInput } from '@/types/buyer';
import { INDONESIAN_PROVINCES, COMMODITIES, QUALITY_GRADES, MONTHS, FREQUENCY_OPTIONS } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Spinner from '@/components/ui/Spinner';
import ResultSection from '@/components/shared/ResultSection';
import ReactMarkdown from 'react-markdown';
import { MapPin, BarChart3, Truck, Clock, AlertTriangle, Users, History, ChevronDown, ChevronUp } from 'lucide-react';

interface BuyerAnalysisResult {
  productionRegions?: string;
  supplyCapacity?: string;
  logisticsRoutes?: string;
  deliveryTimeline?: string;
  supplyRisk?: string;
  recommendedSuppliers?: string;
  rawText?: string;
}

interface HistoryItem {
  id: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  created_at: string;
}

export default function BuyerPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BuyerAnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [form, setForm] = useState({
    commodityType: '',
    volume: '',
    volumeUnit: 'tons' as 'tons' | 'kg',
    qualityGrade: 'standard',
    deliveryProvince: '',
    deliveryCity: '',
    startMonth: '01',
    endMonth: '12',
    frequency: 'one-time',
    budgetMin: '',
    budgetMax: '',
    specialRequirements: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);

    const input: BuyerInput = {
      commodityType: form.commodityType,
      volume: Number(form.volume),
      volumeUnit: form.volumeUnit,
      qualityGrade: form.qualityGrade,
      deliveryProvince: form.deliveryProvince,
      deliveryCity: form.deliveryCity,
      startMonth: form.startMonth,
      endMonth: form.endMonth,
      frequency: form.frequency,
      budgetMin: Number(form.budgetMin),
      budgetMax: Number(form.budgetMax),
      specialRequirements: form.specialRequirements,
      lang,
    };

    try {
      const res = await fetch('/api/ai/buyer', {
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
        // Refresh history
        if (user?.id) {
          const supabase = supabaseRef.current;
          const { data: hist } = await supabase
            .from('buyer_analyses')
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

  // Load history on mount
  useEffect(() => {
    if (!user?.id) return;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const supabase = supabaseRef.current;
    supabase
      .from('buyer_analyses')
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
      commodityType: (inp.commodityType as string) || '',
      volume: String(inp.volume || ''),
      volumeUnit: (inp.volumeUnit as 'tons' | 'kg') || 'tons',
      qualityGrade: (inp.qualityGrade as string) || 'standard',
      deliveryProvince: (inp.deliveryProvince as string) || '',
      deliveryCity: (inp.deliveryCity as string) || '',
      startMonth: (inp.startMonth as string) || '01',
      endMonth: (inp.endMonth as string) || '12',
      frequency: (inp.frequency as string) || 'one-time',
      budgetMin: String(inp.budgetMin || ''),
      budgetMax: String(inp.budgetMax || ''),
      specialRequirements: (inp.specialRequirements as string) || '',
    });
    setResults(item.result as unknown as BuyerAnalysisResult);
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

  const monthOptions = MONTHS.map((m) => ({
    value: m.value,
    label: lang === 'en' ? m.labelEn : m.labelId,
  }));

  const frequencyOptions = FREQUENCY_OPTIONS.map((f) => ({
    value: f.value,
    label: lang === 'en' ? f.labelEn : f.labelId,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('buyer.title')}</h1>
        <p className="text-surface-500 mt-1">{t('buyer.subtitle')}</p>
      </div>

      {/* History Panel */}
      {history.length > 0 && (
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
              {history.map((item) => {
                const inp = item.input as Record<string, string>;
                return (
                  <button
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className="w-full text-left p-2 rounded-lg hover:bg-surface-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-800 truncate">{inp.commodityType || 'Commodity'} - {inp.deliveryProvince || ''}</p>
                    <p className="text-xs text-surface-400">{new Date(item.created_at).toLocaleDateString()}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-surface-200 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            id="commodity"
            label={t('buyer.commodityType')}
            options={commodityOptions}
            placeholder={t('common.selectPlaceholder')}
            value={form.commodityType}
            onChange={(e) => setForm({ ...form, commodityType: e.target.value })}
            required
          />
          <Input
            id="volume"
            label={t('buyer.volume')}
            type="number"
            min="0"
            value={form.volume}
            onChange={(e) => setForm({ ...form, volume: e.target.value })}
            required
          />
          <Select
            id="volumeUnit"
            label={t('buyer.volumeUnit')}
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
            id="quality"
            label={t('buyer.qualityGrade')}
            options={gradeOptions}
            value={form.qualityGrade}
            onChange={(e) => setForm({ ...form, qualityGrade: e.target.value })}
          />
          <Select
            id="deliveryProvince"
            label={t('buyer.deliveryProvince')}
            options={provinceOptions}
            placeholder={t('common.selectPlaceholder')}
            value={form.deliveryProvince}
            onChange={(e) => setForm({ ...form, deliveryProvince: e.target.value })}
            required
          />
          <Input
            id="deliveryCity"
            label={t('buyer.deliveryCity')}
            placeholder={t('buyer.deliveryCityPlaceholder')}
            value={form.deliveryCity}
            onChange={(e) => setForm({ ...form, deliveryCity: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            id="startMonth"
            label={t('buyer.startMonth')}
            options={monthOptions}
            value={form.startMonth}
            onChange={(e) => setForm({ ...form, startMonth: e.target.value })}
          />
          <Select
            id="endMonth"
            label={t('buyer.endMonth')}
            options={monthOptions}
            value={form.endMonth}
            onChange={(e) => setForm({ ...form, endMonth: e.target.value })}
          />
          <Select
            id="frequency"
            label={t('buyer.frequency')}
            options={frequencyOptions}
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="budgetMin"
            label={`${t('buyer.budgetRange')} - ${t('buyer.budgetMin')}`}
            type="number"
            min="0"
            value={form.budgetMin}
            onChange={(e) => setForm({ ...form, budgetMin: e.target.value })}
          />
          <Input
            id="budgetMax"
            label={`${t('buyer.budgetRange')} - ${t('buyer.budgetMax')}`}
            type="number"
            min="0"
            value={form.budgetMax}
            onChange={(e) => setForm({ ...form, budgetMax: e.target.value })}
          />
        </div>

        <Textarea
          id="specialReqs"
          label={t('buyer.specialRequirements')}
          placeholder={t('buyer.specialRequirementsPlaceholder')}
          value={form.specialRequirements}
          onChange={(e) => setForm({ ...form, specialRequirements: e.target.value })}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <Button type="submit" size="lg" disabled={loading} className="w-full md:w-auto">
          {loading ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" />
              {t('buyer.analyzing')}
            </span>
          ) : (
            t('buyer.submit')
          )}
        </Button>
      </form>

      {results && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">{t('buyer.results.title')}</h2>

          {results.rawText && !results.productionRegions ? (
            <div className="bg-white rounded-xl border border-surface-200 p-6 prose prose-sm max-w-none">
              <ReactMarkdown>{results.rawText}</ReactMarkdown>
            </div>
          ) : (
            <>
              {results.productionRegions && (
                <ResultSection title={t('buyer.results.productionRegions')} icon={<MapPin className="h-5 w-5 text-primary-600" />}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.productionRegions}</ReactMarkdown></div>
                </ResultSection>
              )}
              {results.supplyCapacity && (
                <ResultSection title={t('buyer.results.supplyCapacity')} icon={<BarChart3 className="h-5 w-5 text-blue-600" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.supplyCapacity}</ReactMarkdown></div>
                </ResultSection>
              )}
              {results.logisticsRoutes && (
                <ResultSection title={t('buyer.results.logisticsRoutes')} icon={<Truck className="h-5 w-5 text-teal-600" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.logisticsRoutes}</ReactMarkdown></div>
                </ResultSection>
              )}
              {results.deliveryTimeline && (
                <ResultSection title={t('buyer.results.deliveryTimeline')} icon={<Clock className="h-5 w-5 text-indigo-600" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.deliveryTimeline}</ReactMarkdown></div>
                </ResultSection>
              )}
              {results.supplyRisk && (
                <ResultSection title={t('buyer.results.supplyRisk')} icon={<AlertTriangle className="h-5 w-5 text-orange-500" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.supplyRisk}</ReactMarkdown></div>
                </ResultSection>
              )}
              {results.recommendedSuppliers && (
                <ResultSection title={t('buyer.results.recommendedSuppliers')} icon={<Users className="h-5 w-5 text-purple-600" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.recommendedSuppliers}</ReactMarkdown></div>
                </ResultSection>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
