'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { PolicyQuery } from '@/types/policy';
import { INDONESIAN_PROVINCES, COMMODITIES, ANALYSIS_TYPES, TIME_HORIZONS } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import ResultSection from '@/components/shared/ResultSection';
import FormInfoButton from '@/components/shared/FormInfoButton';
import ConnectionFlowBanner from '@/components/shared/ConnectionFlowBanner';
import CapabilityOpportunityPanel, { CapabilityOpportunity } from '@/components/shared/CapabilityOpportunityPanel';
import ReactMarkdown from 'react-markdown';
import { MapPin, TrendingUp, AlertTriangle, FileText, Target, History, ChevronDown, ChevronUp, Wheat, Landmark, BadgeCheck } from 'lucide-react';

interface PolicyResult {
  productionOverview?: string;
  supplyDemandAnalysis?: string;
  riskZones?: string;
  policyRecommendations?: string;
  priorityActions?: string;
  rawText?: string;
}

interface HistoryItem {
  id: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  created_at: string;
}

interface FinanceOpportunity extends CapabilityOpportunity {
  regions: string[];
  commodities: string[];
  analysisTypes: string[];
  timeHorizon: string;
  result: PolicyResult;
}

export default function PolicyPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PolicyResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string[]>([]);
  const [timeHorizon, setTimeHorizon] = useState('current-season');
  const isFinanceRole = user?.role === 'finance';

  const toggleSelection = (arr: string[], value: string, setter: (v: string[]) => void) => {
    setter(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);

    const input: PolicyQuery = {
      regions: selectedRegions,
      commodities: selectedCommodities,
      analysisTypes: selectedAnalysis,
      timeHorizon,
      lang,
    };

    try {
      const res = await fetch('/api/ai/policy', {
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
            .from('policy_analyses')
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

  const horizonOptions = TIME_HORIZONS.map((h) => ({
    value: h.value,
    label: lang === 'en' ? h.labelEn : h.labelId,
  }));

  // Load history on mount
  useEffect(() => {
    if (!user?.id) return;
    isMounted.current = true;
    abortControllerRef.current?.abort();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const supabase = supabaseRef.current;
    supabase
      .from('policy_analyses')
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
    setSelectedRegions((inp.regions as string[]) || []);
    setSelectedCommodities((inp.commodities as string[]) || []);
    setSelectedAnalysis((inp.analysisTypes as string[]) || []);
    setTimeHorizon((inp.timeHorizon as string) || 'current-season');
    setResults(item.result as unknown as PolicyResult);
  };

  const financeOpportunities: FinanceOpportunity[] = [
    {
      id: 'finance-rice-subang-jakarta-2026',
      title: lang === 'en' ? 'Working capital: Subang rice farmer' : 'Modal kerja: petani beras Subang',
      subtitle: lang === 'en' ? 'Linked to Buyer Demo Jakarta PO' : 'Terkait PO Buyer Demo Jakarta',
      leftLabel: lang === 'en' ? 'Petani Subang' : 'Petani Subang',
      rightLabel: lang === 'en' ? 'Financial institution' : 'Lembaga keuangan',
      metric: 'IDR 180M',
      status: lang === 'en' ? 'Assessment ready' : 'Siap assessment',
      insight: lang === 'en'
        ? 'Buyer demand and transaction value can support short-term working capital assessment.'
        : 'Demand buyer dan nilai transaksi bisa menjadi dasar assessment modal kerja jangka pendek.',
      actionLabel: lang === 'en' ? 'Assess' : 'Assessment',
      regions: ['jawa-barat'],
      commodities: ['rice'],
      analysisTypes: ['production-capacity', 'demand-supply'],
      timeHorizon: '1-year',
      result: {
        productionOverview: 'Petani Demo Subang punya rencana pasokan beras 25 ton untuk Buyer Demo Jakarta dengan irigasi dan jadwal panen yang jelas.',
        supplyDemandAnalysis: 'Demand buyer senilai acuan IDR 295.000.000 mendukung assessment modal kerja sekitar IDR 180.000.000.',
        riskZones: 'Risiko utama berada pada cuaca basah, jadwal panen, dan keterlambatan rute Subang - Pantura - Jakarta Utara.',
        policyRecommendations: 'Lembaga keuangan dapat memakai transaksi buyer-farmer sebagai dasar invoice/PO financing bertahap.',
        priorityActions: '1. Validasi transaksi. 2. Cek histori produksi petani. 3. Tetapkan pencairan bertahap mengikuti milestone panen dan pengiriman.',
      },
    },
    {
      id: 'finance-chili-garut-bandung-2026',
      title: lang === 'en' ? 'Harvest bridge: Garut chili farmer' : 'Talangan panen: petani cabai Garut',
      subtitle: lang === 'en' ? 'Fresh delivery risk needs buffer' : 'Risiko kirim segar perlu buffer',
      leftLabel: lang === 'en' ? 'Petani Garut' : 'Petani Garut',
      rightLabel: lang === 'en' ? 'Financial institution' : 'Lembaga keuangan',
      metric: 'IDR 52M',
      status: lang === 'en' ? 'Medium risk' : 'Risiko sedang',
      insight: lang === 'en'
        ? 'Chili demand is strong, but freshness and weather risk should affect financing terms.'
        : 'Demand cabai kuat, tetapi risiko kesegaran dan cuaca perlu memengaruhi tenor pembiayaan.',
      actionLabel: lang === 'en' ? 'Assess' : 'Assessment',
      regions: ['jawa-barat'],
      commodities: ['chili'],
      analysisTypes: ['production-capacity', 'food-supply-gaps', 'demand-supply'],
      timeHorizon: 'current-season',
      result: {
        productionOverview: 'Petani Demo Garut punya peluang memasok 800 kg cabai ke Buyer Demo Bandung.',
        supplyDemandAnalysis: 'Volume kecil dan nilai cepat cair cocok untuk pembiayaan jangka pendek berbasis pengiriman.',
        riskZones: 'Risiko tinggi pada fluktuasi harga cabai, cuaca, dan keterlambatan rute Garut - Nagreg - Bandung.',
        policyRecommendations: 'Gunakan plafon lebih kecil dengan pencairan setelah quality check dan bukti pickup logistics.',
        priorityActions: '1. Cek kontrak buyer. 2. Wajibkan bukti pickup. 3. Tambahkan buffer harga dan klausa kualitas.',
      },
    },
  ];

  const selectFinanceOpportunity = (opportunity: FinanceOpportunity) => {
    setSelectedRegions(opportunity.regions);
    setSelectedCommodities(opportunity.commodities);
    setSelectedAnalysis(opportunity.analysisTypes);
    setTimeHorizon(opportunity.timeHorizon);
    setResults(opportunity.result);
    setError('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isFinanceRole
            ? (lang === 'en' ? 'Agricultural Financing Assessment' : 'Assessment Pembiayaan Pertanian')
            : t('policy.title')}
        </h1>
        <p className="text-surface-500 mt-1">
          {isFinanceRole
            ? (lang === 'en'
              ? 'Connect farmer needs with financing institutions through production, risk, and transaction signals.'
              : 'Hubungkan kebutuhan petani dengan lembaga keuangan melalui sinyal produksi, risiko, dan transaksi.')
            : t('policy.subtitle')}
        </p>
      </div>

      {isFinanceRole && (
        <ConnectionFlowBanner
          title={lang === 'en' ? 'Connection flow: Farmers meet financing institutions' : 'Alur koneksi: Petani bertemu lembaga keuangan'}
          description={lang === 'en'
            ? 'The finance assessment helps identify where farmer production plans and risk profiles can become financing opportunities.'
            : 'Assessment pembiayaan membantu membaca rencana produksi dan profil risiko petani sebagai peluang pembiayaan.'}
          leftLabel={lang === 'en' ? 'Farmer need' : 'Kebutuhan Petani'}
          rightLabel={lang === 'en' ? 'Financial institution' : 'Lembaga Keuangan'}
          leftIcon={Wheat}
          rightIcon={Landmark}
        />
      )}

      {isFinanceRole && (
        <CapabilityOpportunityPanel
          title={lang === 'en' ? 'Financing opportunities' : 'Peluang pembiayaan yang tersedia'}
          description={lang === 'en'
            ? 'Pick a farmer financing candidate to see how supply, demand, and risk signals become an assessment.'
            : 'Pilih kandidat pembiayaan petani untuk melihat bagaimana sinyal pasokan, demand, dan risiko menjadi assessment.'}
          icon={BadgeCheck}
          opportunities={financeOpportunities}
          onSelect={(opportunity) => selectFinanceOpportunity(opportunity as FinanceOpportunity)}
        />
      )}

      {/* History Panel */}
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
                const inp = item.input as Record<string, string[]>;
                return (
                  <button
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className="w-full text-left p-2 rounded-lg hover:bg-surface-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-800 truncate">{inp.regions?.slice(0, 2).join(', ') || 'Policy Analysis'}</p>
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
            <h2 className="text-base font-semibold text-gray-900">
              {isFinanceRole
                ? (lang === 'en' ? 'Financing Assessment Form' : 'Form Assessment Pembiayaan')
                : (lang === 'en' ? 'Policy Intelligence Form' : 'Form Intelijen Kebijakan')}
            </h2>
            <p className="mt-1 text-sm text-surface-600">
              {isFinanceRole
                ? (lang === 'en'
                  ? 'Select region and commodity scope to assess farmer financing fit and risk.'
                  : 'Pilih wilayah dan komoditas untuk menilai kecocokan pembiayaan petani dan risikonya.')
                : (lang === 'en'
                  ? 'Select policy scope to analyze production, supply-demand gaps, risk zones, and priority actions.'
                  : 'Pilih cakupan kebijakan untuk menganalisis produksi, gap supply-demand, zona risiko, dan aksi prioritas.')}
            </p>
          </div>
          <FormInfoButton
            title={isFinanceRole ? (lang === 'en' ? 'Choosing financing scope' : 'Memilih cakupan pembiayaan') : (lang === 'en' ? 'Choosing policy scope' : 'Memilih cakupan kebijakan')}
            description={isFinanceRole
              ? (lang === 'en'
                ? 'Use this to understand which farmer groups, commodities, and risk zones are most financeable.'
                : 'Gunakan ini untuk memahami kelompok petani, komoditas, dan zona risiko yang paling layak dibiayai.')
              : (lang === 'en' ? 'You can leave regions empty for a national view, then narrow commodities and analysis types for sharper recommendations.' : 'Wilayah boleh dikosongkan untuk analisis nasional, lalu persempit komoditas dan jenis analisis agar rekomendasi lebih tajam.')}
            tips={lang === 'en'
              ? ['Pick 1-3 regions for regional planning.', 'Select multiple analysis types when comparing budget or risk priorities.', 'Use longer horizons for investment and infrastructure decisions.']
              : ['Pilih 1-3 wilayah untuk perencanaan regional.', 'Pilih beberapa jenis analisis saat membandingkan prioritas anggaran atau risiko.', 'Gunakan horizon lebih panjang untuk investasi dan infrastruktur.']}
          />
        </div>

        {/* Region Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('policy.regions')}</label>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-surface-200 rounded-lg">
            {INDONESIAN_PROVINCES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => toggleSelection(selectedRegions, p.value, setSelectedRegions)}
                className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                  selectedRegions.includes(p.value)
                    ? 'bg-primary-50 border-primary-500 text-primary-700'
                    : 'bg-white border-surface-300 text-gray-600 hover:border-primary-300'
                }`}
              >
                {lang === 'en' ? p.labelEn : p.labelId}
              </button>
            ))}
          </div>
          {selectedRegions.length === 0 && (
            <p className="text-xs text-surface-400 mt-1">{t('policy.national')}</p>
          )}
        </div>

        {/* Commodity Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('policy.commodities')}</label>
          <div className="flex flex-wrap gap-2">
            {COMMODITIES.slice(0, 15).map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => toggleSelection(selectedCommodities, c.value, setSelectedCommodities)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  selectedCommodities.includes(c.value)
                    ? 'bg-secondary-50 border-secondary-500 text-secondary-700'
                    : 'bg-white border-surface-300 text-gray-600 hover:border-secondary-300'
                }`}
              >
                {lang === 'en' ? c.labelEn : c.labelId}
              </button>
            ))}
          </div>
        </div>

        {/* Analysis Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('policy.analysisType')}</label>
          <div className="flex flex-wrap gap-2">
            {ANALYSIS_TYPES.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => toggleSelection(selectedAnalysis, a.value, setSelectedAnalysis)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  selectedAnalysis.includes(a.value)
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-surface-300 text-gray-600 hover:border-blue-300'
                }`}
              >
                {lang === 'en' ? a.labelEn : a.labelId}
              </button>
            ))}
          </div>
        </div>

        <Select
          id="timeHorizon"
          label={t('policy.timeHorizon')}
          options={horizonOptions}
          value={timeHorizon}
          onChange={(e) => setTimeHorizon(e.target.value)}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <Button type="submit" size="lg" disabled={loading} className="w-full md:w-auto">
          {loading ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" />
              {t('policy.analyzing')}
            </span>
          ) : (
            t('policy.submit')
          )}
        </Button>
      </form>

      {results && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">{t('policy.results.title')}</h2>

          {results.rawText && !results.productionOverview ? (
            <div className="bg-white rounded-xl border border-surface-200 p-6 prose prose-sm max-w-none">
              <ReactMarkdown>{results.rawText}</ReactMarkdown>
            </div>
          ) : (
            <>
              {results.productionOverview && (
                <ResultSection title={t('policy.results.productionOverview')} icon={<MapPin className="h-5 w-5 text-primary-600" />}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.productionOverview}</ReactMarkdown></div>
                </ResultSection>
              )}
              {results.supplyDemandAnalysis && (
                <ResultSection title={t('policy.results.supplyDemandAnalysis')} icon={<TrendingUp className="h-5 w-5 text-blue-600" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.supplyDemandAnalysis}</ReactMarkdown></div>
                </ResultSection>
              )}
              {results.riskZones && (
                <ResultSection title={t('policy.results.riskZones')} icon={<AlertTriangle className="h-5 w-5 text-orange-500" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.riskZones}</ReactMarkdown></div>
                </ResultSection>
              )}
              {results.policyRecommendations && (
                <ResultSection title={t('policy.results.policyRecommendations')} icon={<FileText className="h-5 w-5 text-indigo-600" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.policyRecommendations}</ReactMarkdown></div>
                </ResultSection>
              )}
              {results.priorityActions && (
                <ResultSection title={t('policy.results.priorityActions')} icon={<Target className="h-5 w-5 text-red-600" />} defaultOpen={false}>
                  <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{results.priorityActions}</ReactMarkdown></div>
                </ResultSection>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
