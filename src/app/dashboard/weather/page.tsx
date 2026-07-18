'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { WeatherInput } from '@/types/weather';
import { INDONESIAN_PROVINCES, COMMODITIES, WEATHER_SCENARIOS, SEASONS } from '@/lib/constants';
import { BMKG_REGION_MAP } from '@/lib/bmkg-regions';
import { BmkgForecast } from '@/lib/bmkg';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Spinner from '@/components/ui/Spinner';
import ResultSection from '@/components/shared/ResultSection';
import FormInfoButton from '@/components/shared/FormInfoButton';
import ReactMarkdown from 'react-markdown';
import { CloudRain, Sprout, Droplets, Calendar, Shield, AlertTriangle, History, ChevronDown, ChevronUp, Satellite } from 'lucide-react';

interface WeatherResult {
  impactAssessment?: string;
  cropAdjustments?: string;
  irrigationPlanning?: string;
  revisedSchedule?: string;
  mitigationStrategies?: string;
  riskLevel?: string;
  rawText?: string;
}

interface HistoryItem {
  id: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  created_at: string;
}

export default function WeatherPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<WeatherResult | null>(null);
  const [bmkgData, setBmkgData] = useState<BmkgForecast | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [form, setForm] = useState({
    region: '',
    crop: '',
    scenario: '',
    season: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);
    setBmkgData(null);

    const input: WeatherInput = {
      regions: form.region ? [form.region] : [],
      crops: form.crop ? [form.crop] : [],
      scenario: form.scenario,
      season: form.season,
      notes: form.notes,
      lang,
    };

    try {
      const res = await fetch('/api/ai/weather', {
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
        setBmkgData(data.bmkg || null);
        if (user?.id) {
          const supabase = supabaseRef.current;
          const { data: hist } = await supabase
            .from('weather_analyses')
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
      .from('weather_analyses')
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
    const regions = inp.regions as string[] | undefined;
    const crops = inp.crops as string[] | undefined;
    setBmkgData(null);
    setForm({
      region: regions?.[0] || '',
      crop: crops?.[0] || '',
      scenario: (inp.scenario as string) || '',
      season: (inp.season as string) || '',
      notes: (inp.notes as string) || '',
    });
    setResults(item.result as unknown as WeatherResult);
  };

  const provinceOptions = INDONESIAN_PROVINCES.map((p) => ({
    value: p.value,
    label: lang === 'en' ? p.labelEn : p.labelId,
  }));

  const bmkgCoveredProvinceLabels = INDONESIAN_PROVINCES
    .filter((p) => BMKG_REGION_MAP[p.value])
    .map((p) => (lang === 'en' ? p.labelEn : p.labelId))
    .join(', ');

  const cropOptions = COMMODITIES.map((c) => ({
    value: c.value,
    label: lang === 'en' ? c.labelEn : c.labelId,
  }));

  const scenarioOptions = WEATHER_SCENARIOS.map((s) => ({
    value: s.value,
    label: lang === 'en' ? s.labelEn : s.labelId,
  }));

  const seasonOptions = SEASONS.map((s) => ({
    value: s.value,
    label: lang === 'en' ? s.labelEn : s.labelId,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('weather.title')}</h1>
        <p className="text-surface-500 mt-1">{t('weather.subtitle')}</p>
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
                const inp = item.input as Record<string, unknown>;
                const regions = inp.regions as string[] | undefined;
                return (
                  <button
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className="w-full text-left p-2 rounded-lg hover:bg-surface-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-800 truncate">{(inp.scenario as string) || 'Weather'} - {regions?.[0] || ''}</p>
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
            <h2 className="text-base font-semibold text-gray-900">{lang === 'en' ? 'Weather Intelligence Form' : 'Form Intelijen Cuaca'}</h2>
            <p className="mt-1 text-sm text-surface-600">
              {lang === 'en'
                ? 'Choose the region, crop, scenario, and season to estimate operational risks and mitigation steps.'
                : 'Pilih wilayah, komoditas, skenario, dan musim untuk membaca risiko operasional serta langkah mitigasi.'}
            </p>
          </div>
          <FormInfoButton
            title={lang === 'en' ? 'How weather analysis works' : 'Cara membaca analisis cuaca'}
            description={lang === 'en' ? 'The result focuses on crop impact, schedule changes, irrigation, and risk controls for the selected scenario.' : 'Hasilnya fokus ke dampak tanaman, perubahan jadwal, irigasi, dan kontrol risiko untuk skenario yang dipilih.'}
            tips={lang === 'en'
              ? [
                  'Select the region closest to the farm or route.',
                  'Use notes for local issues like flooding, drought, or road access.',
                  'Use this before locking transaction dates.',
                  `Live BMKG conditions are available for: ${bmkgCoveredProvinceLabels}.`,
                ]
              : [
                  'Pilih wilayah yang paling dekat dengan lahan atau rute.',
                  'Gunakan catatan untuk isu lokal seperti banjir, kekeringan, atau akses jalan.',
                  'Pakai ini sebelum mengunci tanggal transaksi.',
                  `Data BMKG langsung tersedia untuk: ${bmkgCoveredProvinceLabels}.`,
                ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            id="region"
            label={t('weather.region')}
            options={provinceOptions}
            placeholder={t('common.selectPlaceholder')}
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
          />
          <Select
            id="crop"
            label={t('weather.crop')}
            options={cropOptions}
            placeholder={t('common.selectPlaceholder')}
            value={form.crop}
            onChange={(e) => setForm({ ...form, crop: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            id="scenario"
            label={t('weather.scenario')}
            options={scenarioOptions}
            placeholder={t('common.selectPlaceholder')}
            value={form.scenario}
            onChange={(e) => setForm({ ...form, scenario: e.target.value })}
            required
          />
          <Select
            id="season"
            label={t('weather.season')}
            options={seasonOptions}
            placeholder={t('common.selectPlaceholder')}
            value={form.season}
            onChange={(e) => setForm({ ...form, season: e.target.value })}
            required
          />
        </div>

        <Textarea
          id="notes"
          label={t('weather.notes')}
          placeholder={t('weather.notesPlaceholder')}
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
              {t('weather.analyzing')}
            </span>
          ) : (
            t('weather.submit')
          )}
        </Button>
      </form>

      {bmkgData && (
        <div className="bg-white rounded-xl border border-surface-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Satellite className="h-5 w-5 text-sky-600" />
            <h2 className="text-lg font-bold text-gray-900">
              {lang === 'en' ? 'Current BMKG Conditions' : 'Kondisi BMKG Saat Ini'}
            </h2>
          </div>
          <p className="text-sm text-surface-600">
            {bmkgData.location.city}, {bmkgData.location.province}
          </p>
          {bmkgData.entries[0] && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-sky-50 p-3">
                <p className="text-xs text-surface-500">{lang === 'en' ? 'Weather' : 'Cuaca'}</p>
                <p className="font-semibold text-gray-900">
                  {lang === 'en' ? bmkgData.entries[0].weatherDescEn : bmkgData.entries[0].weatherDesc}
                </p>
              </div>
              <div className="rounded-lg bg-sky-50 p-3">
                <p className="text-xs text-surface-500">{lang === 'en' ? 'Temperature' : 'Suhu'}</p>
                <p className="font-semibold text-gray-900">{bmkgData.entries[0].temperatureC}°C</p>
              </div>
              <div className="rounded-lg bg-sky-50 p-3">
                <p className="text-xs text-surface-500">{lang === 'en' ? 'Humidity' : 'Kelembapan'}</p>
                <p className="font-semibold text-gray-900">{bmkgData.entries[0].humidityPercent}%</p>
              </div>
              <div className="rounded-lg bg-sky-50 p-3">
                <p className="text-xs text-surface-500">{lang === 'en' ? 'Rain' : 'Curah Hujan'}</p>
                <p className="font-semibold text-gray-900">{bmkgData.entries[0].precipitationMm} mm</p>
              </div>
            </div>
          )}
          {bmkgData.entries.length > 1 && (
            <div className="overflow-x-auto">
              <div className="flex gap-2">
                {bmkgData.entries.slice(1, 8).map((entry) => (
                  <div key={entry.localDatetime} className="shrink-0 rounded-lg border border-surface-100 bg-surface-50 p-2 text-center text-xs w-24">
                    <p className="text-surface-500">{entry.localDatetime.slice(11, 16)}</p>
                    <p className="mt-1 font-medium text-gray-900">{entry.temperatureC}°C</p>
                    <p className="mt-1 text-surface-600">{lang === 'en' ? entry.weatherDescEn : entry.weatherDesc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-surface-400">
            {lang === 'en' ? 'Source: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)' : 'Sumber: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)'}
          </p>
        </div>
      )}

      {!bmkgData && results && form.region && (
        <div className="rounded-lg border border-dashed border-surface-300 bg-surface-50 px-4 py-3 text-sm text-surface-500">
          {lang === 'en'
            ? 'Live BMKG data is not available yet for this region — the analysis below is AI scenario planning only.'
            : 'Data BMKG langsung belum tersedia untuk wilayah ini — hasil di bawah murni analisis skenario AI.'}
        </div>
      )}

      {results && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">{t('weather.results.title')}</h2>

          {results.rawText && !results.impactAssessment ? (
            <div className="bg-white rounded-xl border border-surface-200 p-6 prose prose-sm max-w-none">
              <ReactMarkdown>{results.rawText}</ReactMarkdown>
            </div>
          ) : (
            <>
              {results.impactAssessment && (
                <ResultSection title={t('weather.results.impactAssessment')} icon={<CloudRain className="h-5 w-5 text-blue-600" />}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.impactAssessment}</ReactMarkdown></div>
                </ResultSection>
              )}
              {results.cropAdjustments && (
                <ResultSection title={t('weather.results.cropAdjustments')} icon={<Sprout className="h-5 w-5 text-green-600" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.cropAdjustments}</ReactMarkdown></div>
                </ResultSection>
              )}
              {results.irrigationPlanning && (
                <ResultSection title={t('weather.results.irrigationPlanning')} icon={<Droplets className="h-5 w-5 text-cyan-600" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.irrigationPlanning}</ReactMarkdown></div>
                </ResultSection>
              )}
              {results.revisedSchedule && (
                <ResultSection title={t('weather.results.revisedSchedule')} icon={<Calendar className="h-5 w-5 text-indigo-600" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.revisedSchedule}</ReactMarkdown></div>
                </ResultSection>
              )}
              {results.mitigationStrategies && (
                <ResultSection title={t('weather.results.mitigationStrategies')} icon={<Shield className="h-5 w-5 text-purple-600" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.mitigationStrategies}</ReactMarkdown></div>
                </ResultSection>
              )}
              {results.riskLevel && (
                <ResultSection title={t('weather.results.riskLevel')} icon={<AlertTriangle className="h-5 w-5 text-orange-500" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.riskLevel}</ReactMarkdown></div>
                </ResultSection>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
