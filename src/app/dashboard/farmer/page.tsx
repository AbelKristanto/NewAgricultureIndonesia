'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { FarmerInput } from '@/types/farmer';
import { INDONESIAN_PROVINCES, SOIL_TYPES, WATER_SOURCES, TIMELINE_OPTIONS } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Spinner from '@/components/ui/Spinner';
import ResultSection from '@/components/shared/ResultSection';
import ReactMarkdown from 'react-markdown';
import { Wheat, BarChart3, DollarSign, CloudRain, Users, Package, Landmark, History, ChevronDown, ChevronUp } from 'lucide-react';

interface FarmerAnalysisResult {
  cropRecommendations?: { crop: string; suitabilityScore: number; reasoning: string; plantingSeason: string }[];
  yieldEstimates?: { crop: string; estimatedYieldPerHa: string; unit: string }[];
  costProjections?: { category: string; estimatedCost: string; notes: string }[];
  weatherRisks?: string;
  buyerMatching?: string;
  inputRequirements?: string;
  subsidies?: string;
  rawText?: string;
}

interface HistoryItem {
  id: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  created_at: string;
}

export default function FarmerPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FarmerAnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [form, setForm] = useState({
    province: '',
    district: '',
    landSize: '',
    landUnit: 'hectares' as 'hectares' | 'm2',
    soilType: '',
    waterSources: [] as string[],
    currentCrops: '',
    budget: '',
    timeline: '1-season',
    notes: '',
  });

  const handleWaterToggle = (value: string) => {
    setForm((prev) => ({
      ...prev,
      waterSources: prev.waterSources.includes(value)
        ? prev.waterSources.filter((v) => v !== value)
        : [...prev.waterSources, value],
    }));
  };

  // Load history on mount
  useEffect(() => {
    if (!user?.id) return;
    const supabase = supabaseRef.current;
    supabase
      .from('farmer_analyses')
      .select('id, input, result, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setHistory(data as HistoryItem[]);
      });
  }, [user?.id]);

  const loadHistoryItem = (item: HistoryItem) => {
    const inp = item.input as Record<string, unknown>;
    setForm({
      province: (inp.province as string) || '',
      district: (inp.district as string) || '',
      landSize: String(inp.landSize || ''),
      landUnit: (inp.landUnit as 'hectares' | 'm2') || 'hectares',
      soilType: (inp.soilType as string) || '',
      waterSources: (inp.waterSources as string[]) || [],
      currentCrops: (inp.currentCrops as string) || '',
      budget: String(inp.budget || ''),
      timeline: (inp.timeline as string) || '1-season',
      notes: (inp.notes as string) || '',
    });
    setResults(item.result as unknown as FarmerAnalysisResult);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);

    const input: FarmerInput = {
      province: form.province,
      district: form.district,
      landSize: Number(form.landSize),
      landUnit: form.landUnit,
      soilType: form.soilType,
      waterSources: form.waterSources,
      currentCrops: form.currentCrops,
      budget: Number(form.budget),
      timeline: form.timeline,
      notes: form.notes,
      lang,
    };

    try {
      const res = await fetch('/api/ai/farmer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
        // Refresh history
        if (user?.id) {
          const supabase = supabaseRef.current;
          const { data: hist } = await supabase
            .from('farmer_analyses')
            .select('id, input, result, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);
          if (hist) setHistory(hist as HistoryItem[]);
        }
      } else {
        setError(data.error || t('common.error'));
      }
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const provinceOptions = INDONESIAN_PROVINCES.map((p) => ({
    value: p.value,
    label: lang === 'en' ? p.labelEn : p.labelId,
  }));

  const soilOptions = SOIL_TYPES.map((s) => ({
    value: s.value,
    label: lang === 'en' ? s.labelEn : s.labelId,
  }));

  const timelineOptions = TIMELINE_OPTIONS.map((t) => ({
    value: t.value,
    label: lang === 'en' ? t.labelEn : t.labelId,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('farmer.title')}</h1>
        <p className="text-surface-500 mt-1">{t('farmer.subtitle')}</p>
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
                    <p className="text-sm font-medium text-gray-800 truncate">{inp.province || 'Analysis'} - {inp.currentCrops || 'crops'}</p>
                    <p className="text-xs text-surface-400">{new Date(item.created_at).toLocaleDateString()}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-surface-200 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            id="province"
            label={t('farmer.province')}
            options={provinceOptions}
            placeholder={t('common.selectPlaceholder')}
            value={form.province}
            onChange={(e) => setForm({ ...form, province: e.target.value })}
            required
          />
          <Input
            id="district"
            label={t('farmer.district')}
            placeholder={t('farmer.districtPlaceholder')}
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            id="landSize"
            label={t('farmer.landSize')}
            type="number"
            min="0"
            step="0.1"
            value={form.landSize}
            onChange={(e) => setForm({ ...form, landSize: e.target.value })}
            required
          />
          <Select
            id="landUnit"
            label={t('farmer.landUnit')}
            options={[
              { value: 'hectares', label: t('common.hectares') },
              { value: 'm2', label: t('common.squareMeters') },
            ]}
            value={form.landUnit}
            onChange={(e) => setForm({ ...form, landUnit: e.target.value as 'hectares' | 'm2' })}
          />
          <Select
            id="soilType"
            label={t('farmer.soilType')}
            options={soilOptions}
            placeholder={t('common.selectPlaceholder')}
            value={form.soilType}
            onChange={(e) => setForm({ ...form, soilType: e.target.value })}
            required
          />
        </div>

        {/* Water Sources */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('farmer.waterSource')}</label>
          <div className="flex flex-wrap gap-2">
            {WATER_SOURCES.map((ws) => (
              <button
                key={ws.value}
                type="button"
                onClick={() => handleWaterToggle(ws.value)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  form.waterSources.includes(ws.value)
                    ? 'bg-primary-50 border-primary-500 text-primary-700'
                    : 'bg-white border-surface-300 text-gray-600 hover:border-primary-300'
                }`}
              >
                {lang === 'en' ? ws.labelEn : ws.labelId}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="currentCrops"
            label={t('farmer.currentCrops')}
            placeholder={t('farmer.currentCropsPlaceholder')}
            value={form.currentCrops}
            onChange={(e) => setForm({ ...form, currentCrops: e.target.value })}
          />
          <Input
            id="budget"
            label={t('farmer.budget')}
            type="number"
            min="0"
            placeholder={t('farmer.budgetPlaceholder')}
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
            required
          />
        </div>

        <Select
          id="timeline"
          label={t('farmer.timeline')}
          options={timelineOptions}
          value={form.timeline}
          onChange={(e) => setForm({ ...form, timeline: e.target.value })}
        />

        <Textarea
          id="notes"
          label={t('farmer.notes')}
          placeholder={t('farmer.notesPlaceholder')}
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
              {t('farmer.analyzing')}
            </span>
          ) : (
            t('farmer.submit')
          )}
        </Button>
      </form>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">{t('farmer.results.title')}</h2>

          {results.rawText && !results.cropRecommendations ? (
            <div className="bg-white rounded-xl border border-surface-200 p-6 prose prose-sm max-w-none">
              <ReactMarkdown>{results.rawText}</ReactMarkdown>
            </div>
          ) : (
            <>
              {results.cropRecommendations && results.cropRecommendations.length > 0 && (
                <ResultSection title={t('farmer.results.cropRecommendations')} icon={<Wheat className="h-5 w-5 text-primary-600" />}>
                  <div className="space-y-3">
                    {results.cropRecommendations.map((crop, i) => (
                      <div key={i} className="flex items-start gap-4 p-3 bg-surface-50 rounded-lg">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-700 font-bold">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{crop.crop}</span>
                            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                              {crop.suitabilityScore}/100
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{crop.reasoning}</p>
                          <p className="text-xs text-surface-500 mt-1">{crop.plantingSeason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ResultSection>
              )}

              {results.yieldEstimates && results.yieldEstimates.length > 0 && (
                <ResultSection title={t('farmer.results.yieldEstimates')} icon={<BarChart3 className="h-5 w-5 text-blue-600" />} defaultOpen={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-200">
                          <th className="text-left py-2 font-medium text-gray-700">{lang === 'en' ? 'Crop' : 'Tanaman'}</th>
                          <th className="text-left py-2 font-medium text-gray-700">{lang === 'en' ? 'Yield/Ha' : 'Hasil/Ha'}</th>
                          <th className="text-left py-2 font-medium text-gray-700">{lang === 'en' ? 'Unit' : 'Satuan'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.yieldEstimates.map((y, i) => (
                          <tr key={i} className="border-b border-surface-100">
                            <td className="py-2 text-gray-900">{y.crop}</td>
                            <td className="py-2 text-gray-700">{y.estimatedYieldPerHa}</td>
                            <td className="py-2 text-gray-500">{y.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ResultSection>
              )}

              {results.costProjections && results.costProjections.length > 0 && (
                <ResultSection title={t('farmer.results.costProjections')} icon={<DollarSign className="h-5 w-5 text-secondary-600" />} defaultOpen={false}>
                  <div className="space-y-2">
                    {results.costProjections.map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-50">
                        <div>
                          <span className="font-medium text-gray-900">{c.category}</span>
                          {c.notes && <p className="text-xs text-surface-500">{c.notes}</p>}
                        </div>
                        <span className="font-semibold text-gray-700">{c.estimatedCost}</span>
                      </div>
                    ))}
                  </div>
                </ResultSection>
              )}

              {results.weatherRisks && (
                <ResultSection title={t('farmer.results.weatherRisks')} icon={<CloudRain className="h-5 w-5 text-orange-500" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <ReactMarkdown>{results.weatherRisks}</ReactMarkdown>
                  </div>
                </ResultSection>
              )}

              {results.buyerMatching && (
                <ResultSection title={t('farmer.results.buyerMatching')} icon={<Users className="h-5 w-5 text-indigo-500" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <ReactMarkdown>{results.buyerMatching}</ReactMarkdown>
                  </div>
                </ResultSection>
              )}

              {results.inputRequirements && (
                <ResultSection title={t('farmer.results.inputRequirements')} icon={<Package className="h-5 w-5 text-teal-500" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <ReactMarkdown>{results.inputRequirements}</ReactMarkdown>
                  </div>
                </ResultSection>
              )}

              {results.subsidies && (
                <ResultSection title={t('farmer.results.subsidies')} icon={<Landmark className="h-5 w-5 text-purple-500" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <ReactMarkdown>{results.subsidies}</ReactMarkdown>
                  </div>
                </ResultSection>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
