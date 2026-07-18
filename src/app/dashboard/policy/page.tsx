'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { PolicyQuery } from '@/types/policy';
import { INDONESIAN_PROVINCES, COMMODITIES, ANALYSIS_TYPES, TIME_HORIZONS } from '@/lib/constants';
import { FarmerFinancingOpportunity } from '@/types/farmer-operations';
import { Transaction } from '@/types/transaction';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
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

const FINANCING_STATUS_LABEL: Record<string, { en: string; id: string }> = {
  available: { en: 'Available', id: 'Tersedia' },
  requested: { en: 'Requested', id: 'Diajukan' },
  reviewing: { en: 'Reviewing', id: 'Ditinjau' },
  approved: { en: 'Approved', id: 'Disetujui' },
  rejected: { en: 'Rejected', id: 'Ditolak' },
};

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

  const [financeableTransactions, setFinanceableTransactions] = useState<Transaction[]>([]);
  const [myOffers, setMyOffers] = useState<FarmerFinancingOpportunity[]>([]);
  const [financingLoading, setFinancingLoading] = useState(false);
  const [financingError, setFinancingError] = useState('');
  const [financingSaving, setFinancingSaving] = useState(false);
  const [offerTransaction, setOfferTransaction] = useState<Transaction | null>(null);
  const [offerForm, setOfferForm] = useState({
    institutionName: '',
    productName: '',
    amountMin: '',
    amountMax: '',
    interestRate: '',
    tenorMonths: '',
    notes: '',
  });

  const loadFinancingData = async () => {
    setFinancingLoading(true);
    try {
      const [browseRes, mineRes] = await Promise.all([
        fetch('/api/farmer-operations/financing?scope=browse'),
        fetch('/api/farmer-operations/financing?scope=mine'),
      ]);
      const browseData = await browseRes.json();
      const mineData = await mineRes.json();
      if (!isMounted.current) return;
      if (browseData.success) setFinanceableTransactions(browseData.data);
      if (mineData.success) setMyOffers(mineData.data);
    } catch {
      // Non-critical panel — the AI policy tool below still works either way.
    } finally {
      if (isMounted.current) setFinancingLoading(false);
    }
  };

  useEffect(() => {
    if (!isFinanceRole) return;
    loadFinancingData();
  }, [isFinanceRole]);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTransaction) return;
    setFinancingSaving(true);
    setFinancingError('');
    try {
      const res = await fetch('/api/farmer-operations/financing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: offerTransaction.id,
          institutionName: offerForm.institutionName,
          productName: offerForm.productName,
          amountMin: Number(offerForm.amountMin),
          amountMax: Number(offerForm.amountMax),
          interestRate: offerForm.interestRate || undefined,
          tenorMonths: offerForm.tenorMonths ? Number(offerForm.tenorMonths) : undefined,
          notes: offerForm.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setOfferTransaction(null);
        setOfferForm({ institutionName: '', productName: '', amountMin: '', amountMax: '', interestRate: '', tenorMonths: '', notes: '' });
        await loadFinancingData();
      } else {
        setFinancingError(data.error || t('common.error'));
      }
    } catch {
      if (isMounted.current) setFinancingError(t('common.error'));
    } finally {
      if (isMounted.current) setFinancingSaving(false);
    }
  };

  const handleOfferIntent = async (id: string, intent: 'review' | 'approve' | 'reject') => {
    setFinancingSaving(true);
    setFinancingError('');
    try {
      const res = await fetch(`/api/farmer-operations/financing/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent }),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        await loadFinancingData();
      } else {
        setFinancingError(data.error || t('common.error'));
      }
    } catch {
      if (isMounted.current) setFinancingError(t('common.error'));
    } finally {
      if (isMounted.current) setFinancingSaving(false);
    }
  };

  const getFinancingStatusLabel = (status: string) =>
    FINANCING_STATUS_LABEL[status]?.[lang === 'en' ? 'en' : 'id'] || status;

  const getCommodityLabelShort = (value: string) =>
    COMMODITIES.find((c) => c.value === value)?.[lang === 'en' ? 'labelEn' : 'labelId'] || value;

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

  const transactionOpportunities: CapabilityOpportunity[] = financeableTransactions.map((tx) => ({
    id: tx.id,
    title: `${getCommodityLabelShort(tx.commodity)} - ${tx.volume} ${tx.volume_unit}`,
    subtitle: `${tx.delivery_city ? tx.delivery_city + ', ' : ''}${tx.delivery_province}`,
    leftLabel: lang === 'en' ? 'Farmer' : 'Petani',
    rightLabel: lang === 'en' ? 'Buyer' : 'Pembeli',
    metric: tx.total_value
      ? `IDR ${tx.total_value.toLocaleString('id-ID')}`
      : tx.price_per_unit
        ? `IDR ${tx.price_per_unit.toLocaleString('id-ID')}/unit`
        : '-',
    status: tx.status,
    insight: lang === 'en'
      ? `Transaction status: ${tx.status}. Created ${new Date(tx.created_at).toLocaleDateString()}.`
      : `Status transaksi: ${tx.status}. Dibuat ${new Date(tx.created_at).toLocaleDateString('id-ID')}.`,
    actionLabel: lang === 'en' ? 'Create offer' : 'Buat penawaran',
  }));

  const selectTransactionForOffer = (opportunity: CapabilityOpportunity) => {
    const tx = financeableTransactions.find((t) => t.id === opportunity.id);
    if (!tx) return;
    setOfferTransaction(tx);
    setOfferForm({ institutionName: '', productName: '', amountMin: '', amountMax: '', interestRate: '', tenorMonths: '', notes: '' });
    setFinancingError('');
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

      {isFinanceRole && financingError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{financingError}</div>
      )}

      {isFinanceRole && (
        <CapabilityOpportunityPanel
          title={lang === 'en' ? 'Financeable transactions' : 'Transaksi yang bisa dibiayai'}
          description={lang === 'en'
            ? 'Real accepted, in-progress, or completed transactions. Pick one to create a financing offer for the farmer.'
            : 'Transaksi nyata yang sudah accepted, in-progress, atau completed. Pilih satu untuk membuat penawaran pembiayaan bagi petani.'}
          icon={BadgeCheck}
          opportunities={transactionOpportunities}
          onSelect={selectTransactionForOffer}
          emptyLabel={financingLoading
            ? (lang === 'en' ? 'Loading transactions...' : 'Memuat transaksi...')
            : (lang === 'en' ? 'No financeable transactions yet.' : 'Belum ada transaksi yang bisa dibiayai.')}
        />
      )}

      {isFinanceRole && offerTransaction && (
        <form onSubmit={handleCreateOffer} className="bg-white rounded-xl border border-surface-200 p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {lang === 'en' ? 'Create financing offer' : 'Buat penawaran pembiayaan'}
              </h2>
              <p className="mt-1 text-sm text-surface-600">
                {lang === 'en'
                  ? `For transaction: ${getCommodityLabelShort(offerTransaction.commodity)} - ${offerTransaction.volume} ${offerTransaction.volume_unit} (${offerTransaction.delivery_city ? offerTransaction.delivery_city + ', ' : ''}${offerTransaction.delivery_province})`
                  : `Untuk transaksi: ${getCommodityLabelShort(offerTransaction.commodity)} - ${offerTransaction.volume} ${offerTransaction.volume_unit} (${offerTransaction.delivery_city ? offerTransaction.delivery_city + ', ' : ''}${offerTransaction.delivery_province})`}
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => setOfferTransaction(null)}>
              {lang === 'en' ? 'Cancel' : 'Batal'}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={lang === 'en' ? 'Institution name' : 'Nama lembaga'}
              value={offerForm.institutionName}
              onChange={(e) => setOfferForm({ ...offerForm, institutionName: e.target.value })}
              required
            />
            <Input
              label={lang === 'en' ? 'Product name' : 'Nama produk'}
              value={offerForm.productName}
              onChange={(e) => setOfferForm({ ...offerForm, productName: e.target.value })}
              required
            />
            <Input
              type="number"
              label={lang === 'en' ? 'Minimum amount (IDR)' : 'Jumlah minimum (IDR)'}
              value={offerForm.amountMin}
              onChange={(e) => setOfferForm({ ...offerForm, amountMin: e.target.value })}
              required
              min={0}
            />
            <Input
              type="number"
              label={lang === 'en' ? 'Maximum amount (IDR)' : 'Jumlah maksimum (IDR)'}
              value={offerForm.amountMax}
              onChange={(e) => setOfferForm({ ...offerForm, amountMax: e.target.value })}
              required
              min={0}
            />
            <Input
              label={lang === 'en' ? 'Interest rate (optional)' : 'Suku bunga (opsional)'}
              value={offerForm.interestRate}
              onChange={(e) => setOfferForm({ ...offerForm, interestRate: e.target.value })}
              placeholder={lang === 'en' ? 'e.g. 0.8%/month' : 'contoh: 0,8%/bulan'}
            />
            <Input
              type="number"
              label={lang === 'en' ? 'Tenor (months, optional)' : 'Tenor (bulan, opsional)'}
              value={offerForm.tenorMonths}
              onChange={(e) => setOfferForm({ ...offerForm, tenorMonths: e.target.value })}
              min={0}
            />
          </div>

          <Textarea
            label={lang === 'en' ? 'Notes (optional)' : 'Catatan (opsional)'}
            value={offerForm.notes}
            onChange={(e) => setOfferForm({ ...offerForm, notes: e.target.value })}
            rows={3}
          />

          <Button type="submit" disabled={financingSaving}>
            {financingSaving ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" />
                {lang === 'en' ? 'Saving...' : 'Menyimpan...'}
              </span>
            ) : (
              lang === 'en' ? 'Send offer' : 'Kirim penawaran'
            )}
          </Button>
        </form>
      )}

      {isFinanceRole && (
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-base font-semibold text-gray-900">
            {lang === 'en' ? 'My offers' : 'Penawaran saya'}
          </h2>
          {myOffers.length === 0 ? (
            <p className="mt-3 text-sm text-surface-500">
              {lang === 'en' ? 'You have not created any financing offers yet.' : 'Anda belum membuat penawaran pembiayaan.'}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {myOffers.map((offer) => (
                <div key={offer.id} className="rounded-lg border border-surface-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{offer.institution_name} - {offer.product_name}</p>
                      <p className="text-sm text-surface-600">
                        IDR {offer.amount_min.toLocaleString('id-ID')} - {offer.amount_max.toLocaleString('id-ID')}
                        {offer.interest_rate ? ` - ${offer.interest_rate}` : ''}
                        {offer.tenor_months ? ` - ${offer.tenor_months} ${lang === 'en' ? 'months' : 'bulan'}` : ''}
                      </p>
                    </div>
                    <Badge variant={
                      offer.status === 'approved' ? 'success'
                        : offer.status === 'rejected' ? 'danger'
                        : offer.status === 'requested' || offer.status === 'reviewing' ? 'warning'
                        : 'primary'
                    }>
                      {getFinancingStatusLabel(offer.status)}
                    </Badge>
                  </div>
                  {(offer.status === 'requested' || offer.status === 'reviewing') && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {offer.status === 'requested' && (
                        <Button type="button" size="sm" variant="outline" disabled={financingSaving} onClick={() => handleOfferIntent(offer.id, 'review')}>
                          {lang === 'en' ? 'Mark reviewing' : 'Tandai ditinjau'}
                        </Button>
                      )}
                      {offer.status === 'reviewing' && (
                        <>
                          <Button type="button" size="sm" disabled={financingSaving} onClick={() => handleOfferIntent(offer.id, 'approve')}>
                            {lang === 'en' ? 'Approve' : 'Setujui'}
                          </Button>
                          <Button type="button" size="sm" variant="outline" disabled={financingSaving} onClick={() => handleOfferIntent(offer.id, 'reject')}>
                            {lang === 'en' ? 'Reject' : 'Tolak'}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
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
