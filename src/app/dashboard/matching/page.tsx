'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { COMMODITIES, QUALITY_GRADES, INDONESIAN_PROVINCES, TIMELINE_OPTIONS } from '@/lib/constants';
import { scoreMatch } from '@/lib/matching-engine';
import { parseTransactionTerms, canRespondToLatestOffer, getTransactionParty } from '@/lib/transaction-negotiation';
import { getPermissions } from '@/lib/rbac';
import { BuyerDemandListing, FarmerSupplyListing } from '@/types/listings';
import { Transaction } from '@/types/transaction';
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
import {
  MapPin,
  BarChart3,
  Truck,
  Clock,
  DollarSign,
  ThumbsUp,
  History,
  ChevronDown,
  ChevronUp,
  Wheat,
  ShoppingCart,
  Sparkles,
  Hourglass,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface AiHistoryResult {
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

const REASON_LABELS: Record<string, { en: string; id: string }> = {
  volume: { en: 'Volume fits', id: 'Volume mencukupi' },
  quality: { en: 'Quality grade fits', id: 'Grade kualitas sesuai' },
  province: { en: 'Same province', id: 'Provinsi sama' },
  city: { en: 'Nearby city', id: 'Kota berdekatan' },
  timeline: { en: 'Timeline aligned', id: 'Timeline selaras' },
};

function scenarioKey(supplyId: string, demandId: string): string {
  return `listing:${supplyId}:${demandId}`;
}

export default function MatchingPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const isMounted = useRef(true);

  const isFarmer = user?.role === 'farmer';
  const isBuyer = user?.role === 'buyer';
  const isParticipant = !isFarmer && !isBuyer;
  const canOpenTransactionsPage = getPermissions(user?.role).pages.includes('/dashboard/transactions');

  const commodityOptions = COMMODITIES.map((c) => ({ value: c.value, label: lang === 'en' ? c.labelEn : c.labelId }));
  const provinceOptions = INDONESIAN_PROVINCES.map((p) => ({ value: p.value, label: lang === 'en' ? p.labelEn : p.labelId }));
  const gradeOptions = QUALITY_GRADES.map((g) => ({ value: g.value, label: lang === 'en' ? g.labelEn : g.labelId }));
  const timelineOptions = TIMELINE_OPTIONS.map((tl) => ({ value: tl.value, label: lang === 'en' ? tl.labelEn : tl.labelId }));

  const commodityLabel = (value: string) => COMMODITIES.find((c) => c.value === value)?.[lang === 'en' ? 'labelEn' : 'labelId'] || value;
  const provinceLabel = (value: string) => INDONESIAN_PROVINCES.find((p) => p.value === value)?.[lang === 'en' ? 'labelEn' : 'labelId'] || value;
  const gradeLabel = (value: string) => QUALITY_GRADES.find((g) => g.value === value)?.[lang === 'en' ? 'labelEn' : 'labelId'] || value;
  const timelineLabel = (value: string) => TIMELINE_OPTIONS.find((tl) => tl.value === value)?.[lang === 'en' ? 'labelEn' : 'labelId'] || value;

  // --- Own listing form (farmer posts supply, buyer posts demand) ---
  const [form, setForm] = useState({
    commodity: '',
    volume: '',
    volumeUnit: 'tons' as 'tons' | 'kg',
    province: '',
    city: '',
    qualityGrade: 'standard',
    timeline: '1-season',
    priceExpectation: '',
    notes: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [mySupply, setMySupply] = useState<FarmerSupplyListing[]>([]);
  const [myDemand, setMyDemand] = useState<BuyerDemandListing[]>([]);
  const [activeListingId, setActiveListingId] = useState<string | null>(null);
  const [listingsLoading, setListingsLoading] = useState(true);

  const [candidates, setCandidates] = useState<Array<{ listing: FarmerSupplyListing | BuyerDemandListing; score: number; reasons: string[] }>>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  const [allSupply, setAllSupply] = useState<FarmerSupplyListing[]>([]);
  const [allDemand, setAllDemand] = useState<BuyerDemandListing[]>([]);

  const [selectedCandidate, setSelectedCandidate] = useState<FarmerSupplyListing | BuyerDemandListing | null>(null);
  const [linkedTransaction, setLinkedTransaction] = useState<Transaction | null>(null);
  const [linkedTransactionLoading, setLinkedTransactionLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [viewingHistory, setViewingHistory] = useState<HistoryItem | null>(null);

  const activeSupply = mySupply.find((l) => l.id === activeListingId) || null;
  const activeDemand = myDemand.find((l) => l.id === activeListingId) || null;

  const loadOwnListings = useCallback(async () => {
    if (!isFarmer && !isBuyer) return;
    setListingsLoading(true);
    try {
      const res = await fetch(isFarmer ? '/api/listings/supply' : '/api/listings/demand');
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        if (isFarmer) {
          setMySupply(data.data);
          setActiveListingId((current) => current ?? data.data[0]?.id ?? null);
        } else {
          setMyDemand(data.data);
          setActiveListingId((current) => current ?? data.data[0]?.id ?? null);
        }
      }
    } finally {
      if (isMounted.current) setListingsLoading(false);
    }
  }, [isFarmer, isBuyer]);

  const loadParticipantView = useCallback(async () => {
    setListingsLoading(true);
    try {
      const [supplyRes, demandRes] = await Promise.all([
        fetch('/api/listings/supply?scope=active'),
        fetch('/api/listings/demand?scope=active'),
      ]);
      const supplyData = await supplyRes.json();
      const demandData = await demandRes.json();
      if (!isMounted.current) return;
      if (supplyData.success) setAllSupply(supplyData.data);
      if (demandData.success) setAllDemand(demandData.data);
    } finally {
      if (isMounted.current) setListingsLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    if (isParticipant) {
      loadParticipantView();
    } else {
      loadOwnListings();
    }
    return () => {
      isMounted.current = false;
    };
  }, [isParticipant, loadOwnListings, loadParticipantView]);

  // When the selected own listing is already matched, load its linked transaction
  // directly — it won't appear as a scored candidate since it's no longer active.
  useEffect(() => {
    const listing = isFarmer ? activeSupply : isBuyer ? activeDemand : null;
    setCandidates([]);
    setSelectedCandidate(null);
    setLinkedTransaction(null);

    if (!listing || listing.status !== 'matched' || !listing.matched_transaction_id) return;

    let cancelled = false;
    setLinkedTransactionLoading(true);
    fetch(`/api/transactions/${listing.matched_transaction_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success) return;
        setLinkedTransaction(data.data);
        setSelectedCandidate(listing);
      })
      .finally(() => {
        if (!cancelled) setLinkedTransactionLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeListingId, isFarmer, isBuyer]);

  // Load matching candidates whenever the selected own listing changes (active listings only)
  useEffect(() => {
    const listing = isFarmer ? activeSupply : isBuyer ? activeDemand : null;
    if (!listing || listing.status !== 'active') {
      setCandidates([]);
      return;
    }

    let cancelled = false;
    setCandidatesLoading(true);

    const url = isFarmer ? '/api/listings/demand?scope=active' : '/api/listings/supply?scope=active';
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.success) return;
        const opposite: Array<FarmerSupplyListing | BuyerDemandListing> = data.data;
        const scored = opposite
          .map((candidate) => {
            const result = isFarmer
              ? scoreMatch(listing as FarmerSupplyListing, candidate as BuyerDemandListing)
              : scoreMatch(candidate as FarmerSupplyListing, listing as BuyerDemandListing);
            return result ? { listing: candidate, score: result.score, reasons: result.reasons } : null;
          })
          .filter((entry): entry is { listing: FarmerSupplyListing | BuyerDemandListing; score: number; reasons: string[] } => entry !== null)
          .sort((a, b) => b.score - a.score);
        setCandidates(scored);
      })
      .finally(() => {
        if (!cancelled) setCandidatesLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeListingId, isFarmer, isBuyer]);

  // History (existing AI matching analyses, read-only preview)
  useEffect(() => {
    if (!user?.id) return;
    const controller = new AbortController();
    supabaseRef.current
      .from('matching_analyses')
      .select('id, input, result, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .abortSignal(controller.signal)
      .then(({ data }) => {
        if (!isMounted.current) return;
        if (data) setHistory(data as HistoryItem[]);
      });
    return () => controller.abort();
  }, [user?.id]);

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');

    const payload = {
      commodity: form.commodity,
      volume: Number(form.volume),
      volumeUnit: form.volumeUnit,
      qualityGrade: form.qualityGrade,
      timeline: form.timeline,
      priceExpectation: form.priceExpectation ? Number(form.priceExpectation) : undefined,
      notes: form.notes || undefined,
      ...(isFarmer
        ? { regionProvince: form.province, regionCity: form.city || undefined }
        : { deliveryProvince: form.province, deliveryCity: form.city || undefined }),
    };

    try {
      const res = await fetch(isFarmer ? '/api/listings/supply' : '/api/listings/demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setForm((f) => ({ ...f, notes: '' }));
        await loadOwnListings();
        setActiveListingId(data.data.id);
      } else {
        setCreateError(data.error || t('common.error'));
      }
    } catch {
      if (isMounted.current) setCreateError(t('common.error'));
    } finally {
      if (isMounted.current) setCreating(false);
    }
  };

  const findLinkedTransaction = async (supplyId: string, demandId: string) => {
    setLinkedTransactionLoading(true);
    setActionError('');
    try {
      const res = await fetch('/api/transactions');
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        const key = scenarioKey(supplyId, demandId);
        const match = (data.data as Transaction[]).find(
          (tx) => parseTransactionTerms(tx.terms).connectionScenario === key
        );
        setLinkedTransaction(match || null);
      }
    } finally {
      if (isMounted.current) setLinkedTransactionLoading(false);
    }
  };

  const selectCandidate = (opportunity: CapabilityOpportunity) => {
    const candidate = candidates.find((c) => c.listing.id === opportunity.id)?.listing || null;
    setSelectedCandidate(candidate);
    setActionError('');
    if (!candidate) return;

    const supplyId = isFarmer ? (activeSupply as FarmerSupplyListing).id : candidate.id;
    const demandId = isFarmer ? candidate.id : (activeDemand as BuyerDemandListing).id;
    findLinkedTransaction(supplyId, demandId);
  };

  const createTransactionFromMatch = async () => {
    if (!selectedCandidate || !activeDemand) return;
    const supply = selectedCandidate as FarmerSupplyListing;
    const demand = activeDemand;

    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commodity: demand.commodity,
          volume: demand.volume,
          volumeUnit: demand.volume_unit,
          pricePerUnit: supply.price_expectation ?? demand.price_expectation ?? undefined,
          deliveryProvince: demand.delivery_province,
          deliveryCity: demand.delivery_city || undefined,
          supplyListingId: supply.id,
          demandListingId: demand.id,
          note: lang === 'en'
            ? `Created from matching: supply ${supply.id} x demand ${demand.id}`
            : `Dibuat dari matching: pasokan ${supply.id} x kebutuhan ${demand.id}`,
          terms: { connectionScenario: scenarioKey(supply.id, demand.id) },
        }),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setLinkedTransaction(data.data);
        await loadOwnListings();
      } else {
        setActionError(data.error || t('common.error'));
      }
    } catch {
      if (isMounted.current) setActionError(t('common.error'));
    } finally {
      if (isMounted.current) setActionLoading(false);
    }
  };

  const patchLinkedTransaction = async (intent: 'submit_proposal' | 'accept_offer' | 'reject_offer') => {
    if (!linkedTransaction) return;
    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/transactions/${linkedTransaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent }),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setLinkedTransaction(data.data);
      } else {
        setActionError(data.error || t('common.error'));
      }
    } catch {
      if (isMounted.current) setActionError(t('common.error'));
    } finally {
      if (isMounted.current) setActionLoading(false);
    }
  };

  const reasonsToInsight = (reasons: string[]) => {
    const labels = reasons.map((r) => REASON_LABELS[r]?.[lang === 'en' ? 'en' : 'id']).filter(Boolean);
    if (labels.length === 0) {
      return lang === 'en' ? 'Commodity matches; check other details.' : 'Komoditas cocok; cek detail lainnya.';
    }
    return labels.join(', ');
  };

  const opportunities: CapabilityOpportunity[] = candidates.map(({ listing, score, reasons }) => {
    const isDemand = 'delivery_province' in listing;
    const province = isDemand ? (listing as BuyerDemandListing).delivery_province : (listing as FarmerSupplyListing).region_province;
    const city = isDemand ? (listing as BuyerDemandListing).delivery_city : (listing as FarmerSupplyListing).region_city;
    return {
      id: listing.id,
      title: `${commodityLabel(listing.commodity)} - ${listing.volume} ${listing.volume_unit}`,
      subtitle: `${gradeLabel(listing.quality_grade)} - ${provinceLabel(province)}${city ? `, ${city}` : ''}`,
      leftLabel: isFarmer ? (lang === 'en' ? 'Your supply' : 'Pasokan Anda') : (lang === 'en' ? 'Their supply' : 'Pasokan mereka'),
      rightLabel: isFarmer ? (lang === 'en' ? 'Buyer demand' : 'Kebutuhan pembeli') : (lang === 'en' ? 'Your demand' : 'Kebutuhan Anda'),
      metric: `${score}%`,
      status: timelineLabel(listing.timeline),
      insight: reasonsToInsight(reasons),
      actionLabel: isBuyer
        ? (lang === 'en' ? 'Create transaction' : 'Buat transaksi')
        : (lang === 'en' ? 'View detail' : 'Lihat detail'),
    };
  });

  const actorParty = linkedTransaction && user ? getTransactionParty(linkedTransaction, user.id) : null;
  const canRespond = linkedTransaction && user ? canRespondToLatestOffer(linkedTransaction.terms, user.id) : false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('matching.title')}</h1>
        <p className="text-surface-500 mt-1">{t('matching.subtitle')}</p>
      </div>

      <ConnectionFlowBanner
        title={lang === 'en' ? 'Connection flow: Farmers meet buyers' : 'Alur koneksi: Petani bertemu pembeli'}
        description={lang === 'en'
          ? 'Post your real supply or demand, then the system scores real matching candidates on the other side.'
          : 'Pasang pasokan atau kebutuhan Anda yang sebenarnya, lalu sistem mencocokkan skor kandidat nyata dari sisi lain.'}
        leftLabel={lang === 'en' ? 'Farmer supply' : 'Pasokan Petani'}
        rightLabel={lang === 'en' ? 'Buyer demand' : 'Kebutuhan Pembeli'}
        leftIcon={Wheat}
        rightIcon={ShoppingCart}
      />

      {isParticipant && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-surface-200 bg-white p-5">
            <h2 className="text-base font-semibold text-gray-900">{lang === 'en' ? 'Active farmer supply' : 'Pasokan petani aktif'}</h2>
            {listingsLoading ? (
              <Spinner size="sm" />
            ) : allSupply.length === 0 ? (
              <p className="mt-2 text-sm text-surface-500">{lang === 'en' ? 'No active supply listings.' : 'Belum ada pasokan aktif.'}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {allSupply.map((s) => (
                  <li key={s.id} className="rounded-lg border border-surface-100 bg-surface-50 p-3 text-sm">
                    <p className="font-medium text-gray-900">{commodityLabel(s.commodity)} - {s.volume} {s.volume_unit}</p>
                    <p className="text-surface-500">{provinceLabel(s.region_province)}{s.region_city ? `, ${s.region_city}` : ''} - {gradeLabel(s.quality_grade)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-surface-200 bg-white p-5">
            <h2 className="text-base font-semibold text-gray-900">{lang === 'en' ? 'Active buyer demand' : 'Kebutuhan pembeli aktif'}</h2>
            {listingsLoading ? (
              <Spinner size="sm" />
            ) : allDemand.length === 0 ? (
              <p className="mt-2 text-sm text-surface-500">{lang === 'en' ? 'No active demand listings.' : 'Belum ada kebutuhan aktif.'}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {allDemand.map((d) => (
                  <li key={d.id} className="rounded-lg border border-surface-100 bg-surface-50 p-3 text-sm">
                    <p className="font-medium text-gray-900">{commodityLabel(d.commodity)} - {d.volume} {d.volume_unit}</p>
                    <p className="text-surface-500">{provinceLabel(d.delivery_province)}{d.delivery_city ? `, ${d.delivery_city}` : ''} - {gradeLabel(d.quality_grade)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {!isParticipant && (
        <>
          <div className="rounded-xl border border-surface-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900">
                {isFarmer ? (lang === 'en' ? 'Your supply listings' : 'Pasokan Anda') : (lang === 'en' ? 'Your demand listings' : 'Kebutuhan Anda')}
              </h2>
            </div>
            {listingsLoading ? (
              <Spinner size="sm" />
            ) : (isFarmer ? mySupply : myDemand).length === 0 ? (
              <p className="mt-2 text-sm text-surface-500">
                {lang === 'en' ? 'No listings yet. Post one below.' : 'Belum ada listing. Pasang di bawah.'}
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(isFarmer ? mySupply : myDemand).map((listing) => (
                  <button
                    key={listing.id}
                    type="button"
                    onClick={() => setActiveListingId(listing.id)}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      activeListingId === listing.id ? 'border-primary-400 bg-primary-50' : 'border-surface-200 bg-surface-50 hover:bg-surface-100'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{commodityLabel(listing.commodity)} - {listing.volume} {listing.volume_unit}</p>
                    <p className="text-surface-500">{listing.status} - {new Date(listing.created_at).toLocaleDateString()}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {(activeSupply || activeDemand) && (
            <CapabilityOpportunityPanel
              title={lang === 'en' ? 'Matching candidates' : 'Kandidat matching'}
              description={lang === 'en'
                ? 'Scored against your selected listing above.'
                : 'Diskor terhadap listing yang dipilih di atas.'}
              icon={Sparkles}
              opportunities={opportunities}
              onSelect={selectCandidate}
              emptyLabel={candidatesLoading
                ? (lang === 'en' ? 'Loading candidates...' : 'Memuat kandidat...')
                : (lang === 'en' ? 'No matching candidate yet.' : 'Belum ada kandidat yang cocok.')}
            />
          )}

          {selectedCandidate && (
            <section className="rounded-xl border border-primary-100 bg-primary-50/60 p-5">
              {linkedTransactionLoading ? (
                <div className="flex items-center gap-2 text-sm text-surface-600"><Spinner size="sm" /> {lang === 'en' ? 'Checking linked transaction...' : 'Mengecek transaksi terkait...'}</div>
              ) : !linkedTransaction ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-700">
                    {isBuyer
                      ? (lang === 'en' ? 'No transaction yet for this match. Create one to start negotiating.' : 'Belum ada transaksi untuk kandidat ini. Buat transaksi untuk mulai negosiasi.')
                      : (lang === 'en' ? 'No transaction yet. The buyer creates the transaction once they pick your supply.' : 'Belum ada transaksi. Pembeli yang akan membuat transaksi setelah memilih pasokan Anda.')}
                  </p>
                  {isBuyer && (
                    <Button type="button" size="sm" disabled={actionLoading} onClick={createTransactionFromMatch}>
                      {actionLoading ? <Spinner size="sm" /> : (lang === 'en' ? 'Create transaction' : 'Buat transaksi')}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-primary-900">
                      {linkedTransaction.status === 'draft' && <Hourglass className="h-5 w-5" />}
                      {linkedTransaction.status === 'proposed' && <Hourglass className="h-5 w-5" />}
                      {linkedTransaction.status === 'accepted' && <CheckCircle2 className="h-5 w-5" />}
                      {linkedTransaction.status === 'cancelled' && <XCircle className="h-5 w-5" />}
                      <h2 className="text-lg font-semibold">
                        {lang === 'en' ? 'Linked transaction' : 'Transaksi terkait'} - {linkedTransaction.status}
                      </h2>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">
                      {linkedTransaction.status === 'draft' && actorParty === 'buyer' && (lang === 'en' ? 'Submit a proposal to the farmer.' : 'Ajukan proposal ke petani.')}
                      {linkedTransaction.status === 'draft' && actorParty !== 'buyer' && (lang === 'en' ? 'Waiting for the buyer to submit a proposal.' : 'Menunggu pembeli mengajukan proposal.')}
                      {linkedTransaction.status === 'proposed' && canRespond && (lang === 'en' ? 'The other party is waiting for your response.' : 'Pihak lawan menunggu respons Anda.')}
                      {linkedTransaction.status === 'proposed' && !canRespond && (lang === 'en' ? 'Waiting for the counterparty to respond.' : 'Menunggu respons pihak lawan.')}
                      {linkedTransaction.status === 'accepted' && (lang === 'en' ? 'This match has been accepted.' : 'Kandidat ini sudah diterima.')}
                      {linkedTransaction.status === 'cancelled' && (lang === 'en' ? 'This match was rejected.' : 'Kandidat ini ditolak.')}
                    </p>
                    {actionError && (
                      <div className="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{actionError}</div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                    {linkedTransaction.status === 'draft' && actorParty === 'buyer' && (
                      <Button type="button" size="sm" disabled={actionLoading} onClick={() => patchLinkedTransaction('submit_proposal')}>
                        {lang === 'en' ? 'Submit proposal' : 'Ajukan proposal'}
                      </Button>
                    )}
                    {linkedTransaction.status === 'proposed' && canRespond && (
                      <>
                        <Button type="button" size="sm" disabled={actionLoading} onClick={() => patchLinkedTransaction('accept_offer')}>
                          {lang === 'en' ? 'Accept' : 'Terima'}
                        </Button>
                        <Button type="button" size="sm" variant="secondary" disabled={actionLoading} onClick={() => patchLinkedTransaction('reject_offer')}>
                          {lang === 'en' ? 'Reject' : 'Tolak'}
                        </Button>
                      </>
                    )}
                    {linkedTransaction.status === 'accepted' && canOpenTransactionsPage && (
                      <Button type="button" size="sm" onClick={() => window.location.assign(`/dashboard/transactions?tx=${linkedTransaction.id}`)}>
                        {lang === 'en' ? 'Open transaction' : 'Buka transaksi'}
                      </Button>
                    )}
                    <Button type="button" size="sm" variant="ghost" onClick={() => { setSelectedCandidate(null); setLinkedTransaction(null); }}>
                      {lang === 'en' ? 'Clear' : 'Bersihkan'}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {!isParticipant && (
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
                      onClick={() => setViewingHistory(item)}
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
      )}

      {viewingHistory && (() => {
        const result = viewingHistory.result as AiHistoryResult;
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{t('matching.results.title')}</h2>
              <Button type="button" size="sm" variant="ghost" onClick={() => setViewingHistory(null)}>
                {lang === 'en' ? 'Close' : 'Tutup'}
              </Button>
            </div>
            {result.rawText && !result.matchedRegions ? (
              <div className="bg-white rounded-xl border border-surface-200 p-6 prose prose-sm max-w-none">
                <ReactMarkdown>{result.rawText}</ReactMarkdown>
              </div>
            ) : (
              <>
                {result.matchedRegions && (
                  <ResultSection title={t('matching.results.matchedRegions')} icon={<MapPin className="h-5 w-5 text-primary-600" />}>
                    <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{result.matchedRegions}</ReactMarkdown></div>
                  </ResultSection>
                )}
                {result.capacityEstimates && (
                  <ResultSection title={t('matching.results.capacityEstimates')} icon={<BarChart3 className="h-5 w-5 text-blue-600" />} defaultOpen={false}>
                    <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{result.capacityEstimates}</ReactMarkdown></div>
                  </ResultSection>
                )}
                {result.logisticsFeasibility && (
                  <ResultSection title={t('matching.results.logisticsFeasibility')} icon={<Truck className="h-5 w-5 text-teal-600" />} defaultOpen={false}>
                    <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{result.logisticsFeasibility}</ReactMarkdown></div>
                  </ResultSection>
                )}
                {result.timeline && (
                  <ResultSection title={t('matching.results.timeline')} icon={<Clock className="h-5 w-5 text-indigo-600" />} defaultOpen={false}>
                    <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{result.timeline}</ReactMarkdown></div>
                  </ResultSection>
                )}
                {result.priceAnalysis && (
                  <ResultSection title={t('matching.results.priceAnalysis')} icon={<DollarSign className="h-5 w-5 text-orange-500" />} defaultOpen={false}>
                    <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{result.priceAnalysis}</ReactMarkdown></div>
                  </ResultSection>
                )}
                {result.recommendations && (
                  <ResultSection title={t('matching.results.recommendations')} icon={<ThumbsUp className="h-5 w-5 text-purple-600" />} defaultOpen={false}>
                    <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{result.recommendations}</ReactMarkdown></div>
                  </ResultSection>
                )}
              </>
            )}
          </div>
        );
      })()}

      {!isParticipant && (
        <form onSubmit={handleCreateListing} className="bg-white rounded-xl border border-surface-200 p-6 space-y-6">
          <div className="flex flex-col gap-3 rounded-lg border border-primary-100 bg-primary-50/50 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {isFarmer
                  ? (lang === 'en' ? 'Post your supply' : 'Pasang pasokan Anda')
                  : (lang === 'en' ? 'Post your demand' : 'Pasang kebutuhan Anda')}
              </h2>
              <p className="mt-1 text-sm text-surface-600">
                {lang === 'en'
                  ? 'This creates a real, persistent listing that the other side can discover and match against.'
                  : 'Ini membuat listing nyata dan tersimpan yang bisa ditemukan dan dicocokkan oleh pihak lain.'}
              </p>
            </div>
            <FormInfoButton
              title={lang === 'en' ? 'Better matching input' : 'Input agar matching lebih akurat'}
              description={lang === 'en' ? 'The matching engine scores candidates by commodity, volume, region, quality grade, and timeline.' : 'Mesin matching menskor kandidat berdasarkan komoditas, volume, wilayah, grade kualitas, dan timeline.'}
              tips={lang === 'en'
                ? ['Use the real region/city for logistics estimates.', 'Choose quality grade to filter realistic candidates.', 'Set a price expectation if you have one.']
                : ['Isi wilayah/kota sebenarnya untuk estimasi logistik.', 'Pilih grade kualitas agar kandidat lebih realistis.', 'Isi ekspektasi harga jika ada.']}
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
              id="province"
              label={t('matching.deliveryProvince')}
              options={provinceOptions}
              placeholder={t('common.selectPlaceholder')}
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
              required
            />
            <Input
              id="city"
              label={t('matching.deliveryCity')}
              placeholder={t('matching.deliveryCityPlaceholder')}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
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
            <Input
              id="priceExpectation"
              label={lang === 'en' ? 'Price expectation (per unit, optional)' : 'Ekspektasi harga (per unit, opsional)'}
              type="number"
              min="0"
              value={form.priceExpectation}
              onChange={(e) => setForm({ ...form, priceExpectation: e.target.value })}
            />
          </div>

          <Textarea
            id="notes"
            label={t('matching.notes')}
            placeholder={t('matching.notesPlaceholder')}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          {createError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{createError}</div>
          )}

          <Button type="submit" size="lg" disabled={creating} className="w-full md:w-auto">
            {creating ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" />
                {lang === 'en' ? 'Posting...' : 'Memasang...'}
              </span>
            ) : (
              isFarmer ? (lang === 'en' ? 'Post supply' : 'Pasang pasokan') : (lang === 'en' ? 'Post demand' : 'Pasang kebutuhan')
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
