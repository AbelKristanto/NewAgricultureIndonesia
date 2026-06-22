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
import ConnectionFlowBanner from '@/components/shared/ConnectionFlowBanner';
import CapabilityOpportunityPanel, { CapabilityOpportunity } from '@/components/shared/CapabilityOpportunityPanel';
import ReactMarkdown from 'react-markdown';
import { MapPin, BarChart3, Truck, Clock, DollarSign, ThumbsUp, History, ChevronDown, ChevronUp, Wheat, ShoppingCart, Sparkles } from 'lucide-react';

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

interface MatchingOpportunity extends CapabilityOpportunity {
  form: {
    commodity: string;
    volume: string;
    volumeUnit: 'tons' | 'kg';
    deliveryProvince: string;
    deliveryCity: string;
    qualityGrade: string;
    timeline: string;
    notes: string;
  };
  result: MatchingResult;
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

  const matchingOpportunities: MatchingOpportunity[] = [
    {
      id: 'rice-subang-jakarta-2026',
      title: user?.role === 'farmer'
        ? (lang === 'en' ? 'Buyer demand: Jakarta rice' : 'Demand pembeli: beras Jakarta')
        : (lang === 'en' ? 'Farmer supply: Subang rice' : 'Pasokan petani: beras Subang'),
      subtitle: lang === 'en' ? '25 tons, Grade A, July window' : '25 ton, Grade A, window Juli',
      leftLabel: lang === 'en' ? 'Petani Subang' : 'Petani Subang',
      rightLabel: lang === 'en' ? 'Buyer Jakarta' : 'Buyer Jakarta',
      metric: '88%',
      status: lang === 'en' ? 'Ready to match' : 'Siap dicocokkan',
      insight: lang === 'en'
        ? 'Irrigated rice supply can meet Jakarta buyer demand with a short Pantura route.'
        : 'Pasokan padi irigasi cocok dengan demand buyer Jakarta melalui rute Pantura yang pendek.',
      actionLabel: lang === 'en' ? 'Use match' : 'Pakai kandidat',
      form: {
        commodity: 'rice',
        volume: '25',
        volumeUnit: 'tons',
        deliveryProvince: 'dki-jakarta',
        deliveryCity: 'Jakarta Utara',
        qualityGrade: 'grade-a',
        timeline: '1-season',
        notes: 'Kandidat rice-subang-jakarta-2026: Petani Demo Subang cocok dengan Buyer Demo Jakarta. Lanjutkan ke transaksi dan cek pembiayaan modal kerja.',
      },
      result: {
        matchedRegions: 'Petani Demo Subang menjadi kandidat utama untuk Buyer Demo Jakarta karena volume 25 ton dan kualitas Grade A sesuai kebutuhan.',
        capacityEstimates: 'Kapasitas aman 25 ton per siklus dengan buffer 10% dari kelompok tani sekitar Subang.',
        logisticsFeasibility: 'Rute Subang - Pantura - Jakarta Utara layak untuk pengiriman bertahap 2-4 hari.',
        timeline: 'Matching hari ini, negosiasi 3-5 hari, pengiriman awal mulai 1 Juli 2026.',
        priceAnalysis: 'Harga acuan IDR 11.800.000 per ton masih sesuai rentang kontrak buyer.',
        recommendations: 'Buat transaksi buyer-farmer, lalu libatkan Finance untuk modal kerja petani dan Logistics untuk jadwal kirim.',
      },
    },
    {
      id: 'chili-garut-bandung-2026',
      title: lang === 'en' ? 'Fresh chili demand: Bandung' : 'Demand cabai segar: Bandung',
      subtitle: lang === 'en' ? '800 kg, fast delivery' : '800 kg, pengiriman cepat',
      leftLabel: lang === 'en' ? 'Petani Garut' : 'Petani Garut',
      rightLabel: lang === 'en' ? 'Buyer Bandung' : 'Buyer Bandung',
      metric: '82%',
      status: lang === 'en' ? 'Needs route buffer' : 'Perlu buffer rute',
      insight: lang === 'en'
        ? 'Garut supply fits Bandung demand, but logistics should buffer weather and freshness risk.'
        : 'Pasokan Garut cocok untuk demand Bandung, tetapi logistics perlu buffer cuaca dan kesegaran.',
      actionLabel: lang === 'en' ? 'Use match' : 'Pakai kandidat',
      form: {
        commodity: 'chili',
        volume: '800',
        volumeUnit: 'kg',
        deliveryProvince: 'jawa-barat',
        deliveryCity: 'Bandung',
        qualityGrade: 'grade-a',
        timeline: '1-season',
        notes: 'Kandidat chili-garut-bandung-2026: butuh cold handling ringan dan buffer rute Garut - Nagreg - Bandung.',
      },
      result: {
        matchedRegions: 'Petani Demo Garut cocok untuk Buyer Demo Bandung karena kedekatan wilayah dan ketersediaan cabai segar.',
        capacityEstimates: 'Kapasitas 800 kg dapat dipenuhi dari panen bertahap, dengan buffer 100 kg dari petani sekitar.',
        logisticsFeasibility: 'Rute Garut - Nagreg - Bandung layak, namun perlu pickup pagi dan kemasan berventilasi.',
        timeline: 'Matching 1 hari, quality check 1 hari, pengiriman dalam 2-3 hari.',
        priceAnalysis: 'Harga acuan IDR 78.000 per kg realistis untuk cabai segar Grade A.',
        recommendations: 'Pilih kandidat ini untuk uji counter/accept di transaksi cabai dan validasi rute oleh Logistics.',
      },
    },
    {
      id: 'corn-malang-surabaya-2026',
      title: lang === 'en' ? 'Feed corn supply: Malang' : 'Pasokan jagung pakan: Malang',
      subtitle: lang === 'en' ? '12 tons, Surabaya buyer' : '12 ton, buyer Surabaya',
      leftLabel: lang === 'en' ? 'Petani Malang' : 'Petani Malang',
      rightLabel: lang === 'en' ? 'Buyer Surabaya' : 'Buyer Surabaya',
      metric: '79%',
      status: lang === 'en' ? 'Supplier input visible' : 'Input supplier terlihat',
      insight: lang === 'en'
        ? 'Corn supply is suitable for Surabaya feed demand and can expose input needs to suppliers.'
        : 'Pasokan jagung cocok untuk demand pakan Surabaya dan kebutuhan inputnya bisa dilihat supplier.',
      actionLabel: lang === 'en' ? 'Use match' : 'Pakai kandidat',
      form: {
        commodity: 'corn',
        volume: '12',
        volumeUnit: 'tons',
        deliveryProvince: 'jawa-timur',
        deliveryCity: 'Surabaya',
        qualityGrade: 'standard',
        timeline: '1-season',
        notes: 'Kandidat corn-malang-surabaya-2026: Petani Malang, Buyer Surabaya, supplier input memantau kebutuhan benih/pupuk.',
      },
      result: {
        matchedRegions: 'Petani Demo Malang menjadi kandidat pasokan jagung untuk Buyer Demo Surabaya.',
        capacityEstimates: 'Kapasitas 12 ton realistis untuk satu siklus, dengan opsi agregasi desa sekitar.',
        logisticsFeasibility: 'Rute Malang - Pandaan - Surabaya stabil untuk pengiriman bulk.',
        timeline: 'Negosiasi dapat dimulai dari transaksi accepted demo dan dilanjutkan ke monitoring pengiriman.',
        priceAnalysis: 'Harga IDR 5.400.000 per ton sesuai nilai transaksi dummy accepted.',
        recommendations: 'Gunakan sebagai contoh koneksi supplier input, buyer-farmer transaction, dan monitoring government.',
      },
    },
  ];

  const selectOpportunity = (opportunity: MatchingOpportunity) => {
    setForm(opportunity.form);
    setResults(opportunity.result);
    setError('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('matching.title')}</h1>
        <p className="text-surface-500 mt-1">{t('matching.subtitle')}</p>
      </div>

      <ConnectionFlowBanner
        title={lang === 'en' ? 'Connection flow: Farmers meet buyers' : 'Alur koneksi: Petani bertemu pembeli'}
        description={lang === 'en'
          ? 'Supply matching is used to turn farmer supply and buyer demand into a clear sourcing opportunity.'
          : 'Pencocokan pasokan dipakai untuk mempertemukan stok petani dan kebutuhan pembeli menjadi peluang sourcing yang jelas.'}
        leftLabel={lang === 'en' ? 'Farmer supply' : 'Pasokan Petani'}
        rightLabel={lang === 'en' ? 'Buyer demand' : 'Kebutuhan Pembeli'}
        leftIcon={Wheat}
        rightIcon={ShoppingCart}
      />

      <CapabilityOpportunityPanel
        title={lang === 'en' ? 'Available matching opportunities' : 'Peluang matching yang tersedia'}
        description={lang === 'en'
          ? 'Pick a candidate to simulate how farmer supply and buyer demand become a match before moving into transactions.'
          : 'Pilih kandidat untuk mensimulasikan bagaimana pasokan petani dan demand pembeli menjadi matching sebelum lanjut ke transaksi.'}
        icon={Sparkles}
        opportunities={matchingOpportunities}
        onSelect={(opportunity) => selectOpportunity(opportunity as MatchingOpportunity)}
      />

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
            <h2 className="text-base font-semibold text-gray-900">{lang === 'en' ? 'Farmer-Buyer Matching Form' : 'Form Matching Petani-Pembeli'}</h2>
            <p className="mt-1 text-sm text-surface-600">
              {lang === 'en'
                ? 'Use this to connect available farm supply with buyer demand, including capacity, logistics feasibility, and price fit.'
                : 'Gunakan form ini untuk menghubungkan pasokan petani dengan kebutuhan pembeli, termasuk kapasitas, logistik, dan kecocokan harga.'}
            </p>
          </div>
          <FormInfoButton
            title={lang === 'en' ? 'Better farmer-buyer matching input' : 'Input agar matching petani-pembeli lebih akurat'}
            description={lang === 'en' ? 'The model matches buyer demand to farmer supply regions based on commodity, volume, destination, quality, and timeline.' : 'Model mencocokkan kebutuhan pembeli dengan wilayah/pasokan petani berdasarkan komoditas, volume, tujuan, kualitas, dan timeline.'}
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
