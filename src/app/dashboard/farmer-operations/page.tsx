'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import CapabilityOpportunityPanel, { CapabilityOpportunity } from '@/components/shared/CapabilityOpportunityPanel';
import DeliveryMap from '@/components/shared/DeliveryMap';
import {
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  FileSignature,
  MapPin,
  MapPinned,
  Phone,
  Route,
  Truck,
  Wheat,
} from 'lucide-react';
import {
  FarmerActivitySummary,
  FarmerFinancingOpportunity,
  FarmerOperationsData,
} from '@/types/farmer-operations';

interface FinancingCandidate extends CapabilityOpportunity {
  opportunity: FarmerFinancingOpportunity;
}

const EMPTY_DATA: FarmerOperationsData = {
  financing: [],
  logistics: [],
  summaries: [],
};

function formatCurrency(value: number, lang: string) {
  return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string | null, lang: string) {
  if (!value) return lang === 'en' ? 'Not scheduled' : 'Belum dijadwalkan';
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function progressColor(value: number) {
  if (value >= 80) return 'bg-green-600';
  if (value >= 45) return 'bg-primary-600';
  return 'bg-orange-500';
}

const FINANCING_STATUS_LABEL: Record<string, { en: string; id: string }> = {
  available: { en: 'Available', id: 'Tersedia' },
  requested: { en: 'Requested', id: 'Diajukan' },
  reviewing: { en: 'Reviewing', id: 'Ditinjau' },
  approved: { en: 'Approved', id: 'Disetujui' },
  rejected: { en: 'Rejected', id: 'Ditolak' },
};

export default function FarmerOperationsPage() {
  const { lang } = useLanguage();
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [data, setData] = useState<FarmerOperationsData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFinancing, setSelectedFinancing] = useState<FarmerFinancingOpportunity | null>(null);
  const [selectedLogisticsId, setSelectedLogisticsId] = useState<string | null>(null);
  const [requestingFinancing, setRequestingFinancing] = useState(false);
  const [financingActionError, setFinancingActionError] = useState('');

  useEffect(() => {
    isMounted.current = true;
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    fetch('/api/farmer-operations', { signal: abortController.signal })
      .then((res) => res.json())
      .then((payload) => {
        if (!isMounted.current) return;
        if (payload.success) {
          setData(payload.data);
          setSelectedLogisticsId(payload.data.logistics?.[0]?.id ?? null);
          setError('');
        } else {
          setError(payload.error || 'Failed to load farmer operations');
        }
      })
      .catch((err) => {
        if (!isMounted.current) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(lang === 'en' ? 'Failed to load farmer operations.' : 'Gagal memuat operasional petani.');
      })
      .finally(() => {
        if (isMounted.current) setLoading(false);
      });

    return () => {
      isMounted.current = false;
      abortController.abort();
    };
  }, [lang]);

  const handleRequestFinancing = async () => {
    if (!selectedFinancing) return;
    setRequestingFinancing(true);
    setFinancingActionError('');
    try {
      const res = await fetch(`/api/farmer-operations/financing/${selectedFinancing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'request' }),
      });
      const payload = await res.json();
      if (!isMounted.current) return;
      if (payload.success) {
        setData((prev) => ({
          ...prev,
          financing: prev.financing.map((item) => (item.id === payload.data.id ? payload.data : item)),
        }));
        setSelectedFinancing(payload.data);
      } else {
        setFinancingActionError(payload.error || (lang === 'en' ? 'Failed to request financing.' : 'Gagal mengajukan pembiayaan.'));
      }
    } catch {
      if (isMounted.current) {
        setFinancingActionError(lang === 'en' ? 'Failed to request financing.' : 'Gagal mengajukan pembiayaan.');
      }
    } finally {
      if (isMounted.current) setRequestingFinancing(false);
    }
  };

  const financingCandidates: FinancingCandidate[] = useMemo(() => (
    data.financing.map((item) => ({
      id: item.id,
      title: item.institution_name,
      subtitle: item.product_name,
      leftLabel: lang === 'en' ? 'Farmer need' : 'Kebutuhan petani',
      rightLabel: lang === 'en' ? 'Financial institution' : 'Lembaga keuangan',
      metric: `${item.fit_score}%`,
      status: item.status,
      insight: item.notes || (lang === 'en' ? 'Financing candidate based on production and yield potential.' : 'Kandidat pembiayaan berdasarkan data produksi dan potensi hasil.'),
      actionLabel: lang === 'en' ? 'Reach out' : 'Reach out',
      opportunity: item,
    }))
  ), [data.financing, lang]);

  const selectedLogistics = data.logistics.find((item) => item.id === selectedLogisticsId) || data.logistics[0] || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {lang === 'en' ? 'Farmer Operations' : 'Operasional Petani'}
        </h1>
        <p className="mt-1 text-surface-500">
          {lang === 'en'
            ? 'Financing access, harvest logistics, active deals, goods, payment, and live delivery tracking.'
            : 'Akses pembiayaan, logistik panen, kontrak berjalan, barang, pembayaran, dan peta delivery real time.'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {(data.summaries[0] ? [
          {
            title: lang === 'en' ? 'Contract deal' : 'Kontrak deal',
            value: data.summaries[0].contract_status,
            icon: FileSignature,
          },
          {
            title: lang === 'en' ? 'Goods monitoring' : 'Pemantauan barang',
            value: `${data.summaries[0].summary?.goodsProgress ?? 0}%`,
            icon: Wheat,
          },
          {
            title: lang === 'en' ? 'Payment monitoring' : 'Pemantauan pembayaran',
            value: `${data.summaries[0].summary?.paymentProgress ?? 0}%`,
            icon: CreditCard,
          },
          {
            title: lang === 'en' ? 'Delivery map' : 'Peta delivery',
            value: data.summaries[0].delivery_status,
            icon: MapPinned,
          },
        ] : []).map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-xl border border-surface-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-surface-500">{item.title}</p>
                  <p className="mt-2 text-xl font-bold text-gray-900">{item.value}</p>
                </div>
                <div className="rounded-lg bg-primary-50 p-2 text-primary-700">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CapabilityOpportunityPanel
        title={lang === 'en' ? 'Financing access' : 'Akses pembiayaan'}
        description={lang === 'en'
          ? 'Reach out to financial institutions matched from your production analysis and yield potential.'
          : 'Hubungi lembaga keuangan yang cocok dari hasil analisa produksi dan potensi hasil.'}
        icon={Banknote}
        opportunities={financingCandidates}
        emptyLabel={lang === 'en' ? 'No financing institution is available yet.' : 'Belum ada lembaga keuangan tersedia.'}
        onSelect={(candidate) => setSelectedFinancing((candidate as FinancingCandidate).opportunity)}
      />

      {selectedFinancing && (
        <section className="rounded-xl border border-primary-100 bg-primary-50/60 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-primary-950">
                {lang === 'en' ? 'Reach out request prepared' : 'Request reach out disiapkan'}
              </h2>
              <p className="mt-2 text-sm text-gray-700">
                {selectedFinancing.institution_name} - {selectedFinancing.product_name}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                <div className="rounded-lg bg-white p-3">
                  <span className="text-xs uppercase tracking-wide text-surface-500">Plafon</span>
                  <p className="mt-1 font-medium">
                    {formatCurrency(selectedFinancing.amount_min, lang)} - {formatCurrency(selectedFinancing.amount_max, lang)}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <span className="text-xs uppercase tracking-wide text-surface-500">Tenor</span>
                  <p className="mt-1 font-medium">{selectedFinancing.tenor_months || '-'} bulan</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <span className="text-xs uppercase tracking-wide text-surface-500">Kontak</span>
                  <p className="mt-1 font-medium">{selectedFinancing.contact?.officer || selectedFinancing.contact?.branch || '-'}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-surface-500">
                  {lang === 'en' ? 'Status' : 'Status'}
                </span>
                <Badge variant={
                  selectedFinancing.status === 'approved' ? 'success'
                    : selectedFinancing.status === 'rejected' ? 'danger'
                    : selectedFinancing.status === 'requested' || selectedFinancing.status === 'reviewing' ? 'warning'
                    : 'primary'
                }>
                  {FINANCING_STATUS_LABEL[selectedFinancing.status]?.[lang === 'en' ? 'en' : 'id'] || selectedFinancing.status}
                </Badge>
              </div>
              {financingActionError && (
                <p className="mt-2 text-sm text-red-600">{financingActionError}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              {selectedFinancing.status === 'available' && (
                <Button type="button" size="sm" disabled={requestingFinancing} onClick={handleRequestFinancing}>
                  <Phone className="mr-2 h-4 w-4" />
                  {requestingFinancing
                    ? (lang === 'en' ? 'Sending...' : 'Mengirim...')
                    : (lang === 'en' ? 'Request financing' : 'Ajukan pembiayaan')}
                </Button>
              )}
              <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedFinancing(null)}>
                {lang === 'en' ? 'Close' : 'Tutup'}
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              {lang === 'en' ? 'Logistics coordination' : 'Koordinasi logistik'}
            </h2>
          </div>
          <div className="mt-4 space-y-3">
            {data.logistics.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedLogisticsId(plan.id)}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  selectedLogistics?.id === plan.id
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-surface-200 bg-surface-50 hover:border-primary-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{plan.provider_name}</p>
                    <p className="mt-1 text-sm text-surface-600">
                      {plan.commodity} - {plan.volume} {plan.volume_unit}
                    </p>
                  </div>
                  <Badge variant={plan.status === 'delivered' ? 'success' : plan.status === 'delayed' ? 'danger' : 'primary'}>
                    {plan.status}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-surface-600">
                  <span><Clock className="mr-1 inline h-3 w-3" />Pickup: {formatDateTime(plan.pickup_time, lang)}</span>
                  <span><MapPin className="mr-1 inline h-3 w-3" />{plan.pickup_address} - {plan.destination_address}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Route className="h-5 w-5 text-primary-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              {lang === 'en' ? 'Real-time delivery map' : 'Peta delivery real time'}
            </h2>
          </div>
          {selectedLogistics ? (
            <div className="mt-4 space-y-4">
              <DeliveryMap plan={selectedLogistics} />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {selectedLogistics.checkpoints.map((checkpoint) => (
                  <div key={`${checkpoint.label}-${checkpoint.time}`} className="rounded-lg border border-surface-200 p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 ${checkpoint.status === 'done' ? 'text-green-600' : checkpoint.status === 'current' ? 'text-primary-700' : 'text-surface-400'}`} />
                      <p className="text-sm font-medium text-gray-900">{checkpoint.label}</p>
                    </div>
                    <p className="mt-1 text-xs text-surface-500">{formatDateTime(checkpoint.time, lang)}</p>
                    <p className="mt-1 text-xs text-surface-400">{checkpoint.lat}, {checkpoint.lng}</p>
                    {checkpoint.photo_url && (
                      <a href={checkpoint.photo_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                        <img
                          src={checkpoint.photo_url}
                          alt={checkpoint.label}
                          className="h-16 w-full rounded object-cover"
                        />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-surface-500">
              {lang === 'en' ? 'No logistics plan yet.' : 'Belum ada rencana logistik.'}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">
          {lang === 'en' ? 'Active transaction resume' : 'Resume transaksi berjalan'}
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {data.summaries.map((summary: FarmerActivitySummary) => (
            <article key={summary.id} className="rounded-lg border border-surface-200 bg-surface-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{summary.summary?.contractTitle || 'Contract'}</h3>
                  <p className="mt-1 text-sm text-surface-600">{summary.summary?.buyerName}</p>
                </div>
                <Badge variant={summary.contract_status === 'accepted' ? 'primary' : 'secondary'}>
                  {summary.contract_status}
                </Badge>
              </div>
              {[
                { label: lang === 'en' ? 'Goods' : 'Barang', value: summary.summary?.goodsProgress ?? 0 },
                { label: lang === 'en' ? 'Payment' : 'Pembayaran', value: summary.summary?.paymentProgress ?? 0 },
                { label: lang === 'en' ? 'Delivery' : 'Delivery', value: summary.summary?.deliveryProgress ?? 0 },
              ].map((item) => (
                <div key={item.label} className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-surface-500">
                    <span>{item.label}</span>
                    <span>{item.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-200">
                    <div className={`h-2 rounded-full ${progressColor(item.value)}`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
              <p className="mt-4 text-sm text-gray-700">{summary.summary?.nextAction}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
