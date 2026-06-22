'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  CreateTransactionInput,
  Transaction,
  TransactionNegotiationEntry,
  TransactionParty,
  TransactionStatus,
} from '@/types/transaction';
import { COMMODITIES, INDONESIAN_PROVINCES, TRANSACTION_STATUSES } from '@/lib/constants';
import {
  canRespondToLatestOffer,
  getLatestNegotiationEntry,
  getTransactionParty,
  getTransactionParticipantLabel,
  parseTransactionTerms,
} from '@/lib/transaction-negotiation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Textarea from '@/components/ui/Textarea';
import FormInfoButton from '@/components/shared/FormInfoButton';
import {
  ArrowRightLeft,
  Check,
  FileText,
  MessageSquareText,
  Plus,
  Send,
  X,
  XCircle,
} from 'lucide-react';

interface NegotiationFormState {
  pricePerUnit: string;
  startDate: string;
  endDate: string;
  note: string;
}

const EMPTY_NEGOTIATION_FORM: NegotiationFormState = {
  pricePerUnit: '',
  startDate: '',
  endDate: '',
  note: '',
};

export default function TransactionsPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const requestedTransactionId =
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('tx');
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [negotiationForm, setNegotiationForm] = useState<NegotiationFormState>(EMPTY_NEGOTIATION_FORM);

  const [form, setForm] = useState({
    commodity: '',
    volume: '',
    volumeUnit: 'tons',
    pricePerUnit: '',
    deliveryProvince: '',
    deliveryCity: '',
    startDate: '',
    endDate: '',
    note: '',
  });

  const selectedTerms = useMemo(
    () => parseTransactionTerms(selectedTx?.terms ?? null),
    [selectedTx]
  );
  const negotiationHistory = selectedTerms.negotiationHistory || [];
  const selectedTxId = selectedTx?.id ?? null;
  const selectedPricePerUnit = selectedTx?.price_per_unit ?? null;
  const selectedStartDate = selectedTx?.start_date ?? '';
  const selectedEndDate = selectedTx?.end_date ?? '';
  const latestNegotiation = useMemo(
    () => getLatestNegotiationEntry(selectedTx?.terms ?? null),
    [selectedTx]
  );
  const canCreateTransaction = user?.role === 'buyer';
  const currentParty = selectedTx && user ? getTransactionParty(selectedTx, user.id) : null;
  const currentParticipantLabel = selectedTx && user && !currentParty
    ? getTransactionParticipantLabel(selectedTx, user.id)
    : null;
  const canRespond = selectedTx && user ? canRespondToLatestOffer(selectedTx.terms, user.id) : false;

  useEffect(() => {
    if (!selectedTxId) {
      setNegotiationForm(EMPTY_NEGOTIATION_FORM);
      return;
    }

    setNegotiationForm({
      pricePerUnit: selectedPricePerUnit?.toString() ?? '',
      startDate: selectedStartDate,
      endDate: selectedEndDate,
      note: '',
    });
  }, [selectedTxId, selectedPricePerUnit, selectedStartDate, selectedEndDate]);

  const fetchTransactions = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/transactions', { signal });
      if (!isMounted.current) return;
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        const nextTransactions = data.data as Transaction[];
        setTransactions(nextTransactions);
        setSelectedTx((current) => {
          if (!current) {
            return requestedTransactionId
              ? nextTransactions.find((tx) => tx.id === requestedTransactionId) ?? null
              : null;
          }
          return nextTransactions.find((tx) => tx.id === current.id) ?? null;
        });
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
    isMounted.current = true;
    abortControllerRef.current?.abort();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    fetchTransactions(abortController.signal);

    return () => {
      isMounted.current = false;
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedTransactionId]);

  const syncTransactionState = async (nextTransaction: Transaction) => {
    setSelectedTx(nextTransaction);
    await fetchTransactions(abortControllerRef.current?.signal);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    const input: CreateTransactionInput = {
      commodity: form.commodity,
      volume: Number(form.volume),
      volumeUnit: form.volumeUnit,
      pricePerUnit: form.pricePerUnit ? Number(form.pricePerUnit) : undefined,
      deliveryProvince: form.deliveryProvince,
      deliveryCity: form.deliveryCity || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      note: form.note || undefined,
    };

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: abortControllerRef.current?.signal,
      });
      if (!isMounted.current) return;
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setShowForm(false);
        setForm({
          commodity: '',
          volume: '',
          volumeUnit: 'tons',
          pricePerUnit: '',
          deliveryProvince: '',
          deliveryCity: '',
          startDate: '',
          endDate: '',
          note: '',
        });
        await fetchTransactions(abortControllerRef.current?.signal);
      } else {
        setError(data.error || t('common.error'));
      }
    } catch (err) {
      if (!isMounted.current) return;
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(t('common.error'));
    } finally {
      if (isMounted.current) setCreating(false);
    }
  };

  const patchTransaction = async (txId: string, payload: Record<string, unknown>) => {
    setUpdatingStatus(true);
    setError('');

    try {
      const res = await fetch(`/api/transactions/${txId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current?.signal,
      });
      if (!isMounted.current) return;
      const data = await res.json();
      if (!isMounted.current) return;

      if (data.success) {
        await syncTransactionState(data.data);
        return true;
      }

      setError(data.error || t('common.error'));
      return false;
    } catch (err) {
      if (!isMounted.current) return false;
      if (err instanceof Error && err.name === 'AbortError') return false;
      setError(t('common.error'));
      return false;
    } finally {
      if (isMounted.current) setUpdatingStatus(false);
    }
  };

  const handleStatusUpdate = async (txId: string, newStatus: TransactionStatus) => {
    await patchTransaction(txId, { status: newStatus });
  };

  const handleSubmitProposal = async () => {
    if (!selectedTx) return;

    const ok = await patchTransaction(selectedTx.id, {
      intent: 'submit_proposal',
      note: negotiationForm.note || undefined,
    });

    if (ok) {
      setNegotiationForm((current) => ({ ...current, note: '' }));
    }
  };

  const handleCounterOffer = async () => {
    if (!selectedTx) return;

    const ok = await patchTransaction(selectedTx.id, {
      intent: 'counter_offer',
      pricePerUnit: negotiationForm.pricePerUnit
        ? Number(negotiationForm.pricePerUnit)
        : null,
      startDate: negotiationForm.startDate || null,
      endDate: negotiationForm.endDate || null,
      note: negotiationForm.note || null,
    });

    if (ok) {
      setNegotiationForm((current) => ({ ...current, note: '' }));
    }
  };

  const handleAcceptOffer = async () => {
    if (!selectedTx) return;

    const ok = await patchTransaction(selectedTx.id, {
      intent: 'accept_offer',
      note: negotiationForm.note || undefined,
    });

    if (ok) {
      setNegotiationForm((current) => ({ ...current, note: '' }));
    }
  };

  const handleRejectOffer = async () => {
    if (!selectedTx) return;

    const ok = await patchTransaction(selectedTx.id, {
      intent: 'reject_offer',
      note: negotiationForm.note || undefined,
    });

    if (ok) {
      setNegotiationForm((current) => ({ ...current, note: '' }));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusDef = TRANSACTION_STATUSES.find((s) => s.value === status);
    const label = statusDef ? (lang === 'en' ? statusDef.labelEn : statusDef.labelId) : status;
    const variant = (statusDef?.color || 'secondary') as 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getCommodityLabel = (value: string) => {
    const c = COMMODITIES.find((c) => c.value === value);
    return c ? (lang === 'en' ? c.labelEn : c.labelId) : value;
  };

  const getProvinceLabel = (value: string) => {
    const p = INDONESIAN_PROVINCES.find((p) => p.value === value);
    return p ? (lang === 'en' ? p.labelEn : p.labelId) : value;
  };

  const commodityOptions = COMMODITIES.map((c) => ({
    value: c.value,
    label: lang === 'en' ? c.labelEn : c.labelId,
  }));

  const provinceOptions = INDONESIAN_PROVINCES.map((p) => ({
    value: p.value,
    label: lang === 'en' ? p.labelEn : p.labelId,
  }));

  const getNextStatuses = (current: string): TransactionStatus[] => {
    const transitions: Partial<Record<TransactionStatus, TransactionStatus[]>> = {
      draft: ['cancelled'],
      accepted: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
    };

    return transitions[current as TransactionStatus] || [];
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return t('transactions.notSet');

    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getPartyLabel = (party: TransactionParty | null) => {
    if (party === 'buyer') return t('transactions.buyerParty');
    if (party === 'farmer') return t('transactions.farmerParty');
    return t('transactions.counterparty');
  };

  const getNegotiationActionLabel = (entry: TransactionNegotiationEntry) => {
    const labels = {
      offer_created: t('transactions.actions.offerCreated'),
      proposal_submitted: t('transactions.actions.proposalSubmitted'),
      counter_offer: t('transactions.actions.counterOffer'),
      accepted: t('transactions.actions.accepted'),
      rejected: t('transactions.actions.rejected'),
      status_updated: t('transactions.actions.statusUpdated'),
    };

    return labels[entry.action];
  };

  const canSubmitDraftProposal =
    selectedTx?.status === 'draft' && currentParty === 'buyer';
  const canAcceptOrReject =
    selectedTx?.status === 'proposed' && !!currentParty && canRespond;
  const canSendCounterOffer =
    !!selectedTx &&
    !!currentParty &&
    ['proposed', 'accepted'].includes(selectedTx.status) &&
    canRespond;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('transactions.title')}</h1>
          <p className="text-surface-500 mt-1">{t('transactions.subtitle')}</p>
        </div>
        {canCreateTransaction && (
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <span className="flex items-center gap-2">
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? t('common.back') : t('transactions.create')}
            </span>
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {canCreateTransaction && showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-surface-200 p-6 space-y-6">
          <div className="flex flex-col gap-3 rounded-lg border border-primary-100 bg-primary-50/50 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('transactions.newTransaction')}</h2>
              <p className="mt-1 text-sm text-surface-600">
                {lang === 'en'
                  ? 'Create a transaction draft that can be negotiated and tracked by permitted roles.'
                  : 'Buat draft transaksi yang bisa dinegosiasikan dan dipantau oleh role yang punya akses.'}
              </p>
            </div>
            <FormInfoButton
              title={lang === 'en' ? 'Transaction setup tips' : 'Tips membuat transaksi'}
              description={lang === 'en' ? 'Commodity, volume, delivery location, price, and date range become the first offer used in negotiation.' : 'Komoditas, volume, lokasi kirim, harga, dan rentang tanggal menjadi penawaran awal untuk negosiasi.'}
              tips={lang === 'en'
                ? ['Leave price empty if it still needs discussion.', 'Use delivery dates as realistic windows, not single-day promises.', 'Add quality, packaging, or payment notes in the note field.']
                : ['Kosongkan harga kalau masih perlu diskusi.', 'Gunakan tanggal kirim sebagai rentang realistis, bukan janji satu hari.', 'Isi kualitas, kemasan, atau pembayaran di catatan.']}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              id="tx-commodity"
              label={t('transactions.commodity')}
              options={commodityOptions}
              placeholder={t('common.selectPlaceholder')}
              value={form.commodity}
              onChange={(e) => setForm({ ...form, commodity: e.target.value })}
              required
            />
            <Input
              id="tx-volume"
              label={t('transactions.volume')}
              type="number"
              min="0"
              value={form.volume}
              onChange={(e) => setForm({ ...form, volume: e.target.value })}
              required
            />
            <Select
              id="tx-unit"
              label={t('transactions.volumeUnit')}
              options={[
                { value: 'tons', label: t('common.tons') },
                { value: 'kg', label: t('common.kilograms') },
              ]}
              value={form.volumeUnit}
              onChange={(e) => setForm({ ...form, volumeUnit: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              id="tx-price"
              label={t('transactions.pricePerUnit')}
              type="number"
              min="0"
              placeholder="IDR"
              value={form.pricePerUnit}
              onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })}
            />
            <Select
              id="tx-province"
              label={t('transactions.deliveryProvince')}
              options={provinceOptions}
              placeholder={t('common.selectPlaceholder')}
              value={form.deliveryProvince}
              onChange={(e) => setForm({ ...form, deliveryProvince: e.target.value })}
              required
            />
            <Input
              id="tx-city"
              label={t('transactions.deliveryCity')}
              value={form.deliveryCity}
              onChange={(e) => setForm({ ...form, deliveryCity: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="tx-start"
              label={t('transactions.startDate')}
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
            <Input
              id="tx-end"
              label={t('transactions.endDate')}
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
          <Textarea
            id="tx-note"
            label={t('transactions.note')}
            placeholder={t('transactions.notePlaceholder')}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            rows={3}
          />
          <Button type="submit" disabled={creating}>
            {creating ? (
              <span className="flex items-center gap-2"><Spinner size="sm" />{t('common.loading')}</span>
            ) : (
              t('transactions.submit')
            )}
          </Button>
        </form>
      )}

      {selectedTx && (
        <div className="bg-white rounded-xl border border-surface-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('transactions.detail')}</h2>
              <p className="text-sm text-surface-500 mt-1">
                {t('transactions.yourRole')}: {currentParticipantLabel || getPartyLabel(currentParty)}
              </p>
            </div>
            <button onClick={() => setSelectedTx(null)} className="text-surface-400 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-surface-500">{t('transactions.commodity')}</span>
              <p className="font-medium">{getCommodityLabel(selectedTx.commodity)}</p>
            </div>
            <div>
              <span className="text-surface-500">{t('transactions.volume')}</span>
              <p className="font-medium">{selectedTx.volume} {selectedTx.volume_unit}</p>
            </div>
            <div>
              <span className="text-surface-500">{t('transactions.status')}</span>
              <p className="mt-1">{getStatusBadge(selectedTx.status)}</p>
            </div>
            <div>
              <span className="text-surface-500">{t('transactions.deliveryProvince')}</span>
              <p className="font-medium">{getProvinceLabel(selectedTx.delivery_province)}</p>
            </div>
            <div>
              <span className="text-surface-500">{t('transactions.pricePerUnit')}</span>
              <p className="font-medium">{formatCurrency(selectedTx.price_per_unit)}</p>
            </div>
            <div>
              <span className="text-surface-500">{t('transactions.totalValue')}</span>
              <p className="font-medium">{formatCurrency(selectedTx.total_value)}</p>
            </div>
            <div>
              <span className="text-surface-500">{t('transactions.startDate')}</span>
              <p className="font-medium">{selectedTx.start_date || t('transactions.notSet')}</p>
            </div>
            <div>
              <span className="text-surface-500">{t('transactions.endDate')}</span>
              <p className="font-medium">{selectedTx.end_date || t('transactions.notSet')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="space-y-4">
              <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                <div className="flex items-center gap-2 text-gray-900">
                  <ArrowRightLeft className="h-4 w-4 text-primary-700" />
                  <h3 className="font-semibold">{t('transactions.currentOffer')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <span className="text-surface-500">{t('transactions.pricePerUnit')}</span>
                    <p className="font-medium">{formatCurrency(selectedTx.price_per_unit)}</p>
                  </div>
                  <div>
                    <span className="text-surface-500">{t('transactions.status')}</span>
                    <div className="mt-1">{getStatusBadge(selectedTx.status)}</div>
                  </div>
                  <div>
                    <span className="text-surface-500">{t('transactions.startDate')}</span>
                    <p className="font-medium">{selectedTx.start_date || t('transactions.notSet')}</p>
                  </div>
                  <div>
                    <span className="text-surface-500">{t('transactions.endDate')}</span>
                    <p className="font-medium">{selectedTx.end_date || t('transactions.notSet')}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-lg bg-white border border-surface-200 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-surface-500">
                    {t('transactions.latestNote')}
                  </p>
                  <p className="mt-2 text-sm text-gray-700">
                    {latestNegotiation?.note || t('transactions.noNote')}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-surface-200 p-4">
                <div className="flex items-center gap-2 text-gray-900">
                  <MessageSquareText className="h-4 w-4 text-primary-700" />
                  <h3 className="font-semibold">{t('transactions.negotiationHistory')}</h3>
                </div>

                {negotiationHistory.length === 0 ? (
                  <p className="mt-4 text-sm text-surface-500">{t('transactions.noNegotiationHistory')}</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {[...negotiationHistory].reverse().map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-surface-200 bg-surface-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {getNegotiationActionLabel(entry)}
                            </p>
                            <p className="text-xs text-surface-500 mt-1">
                              {getPartyLabel(entry.actor_party)} • {new Date(entry.created_at).toLocaleString()}
                            </p>
                          </div>
                          {getStatusBadge(entry.status)}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs text-gray-700">
                          <div>
                            <span className="text-surface-500">{t('transactions.pricePerUnit')}</span>
                            <p className="mt-1 font-medium">{formatCurrency(entry.price_per_unit)}</p>
                          </div>
                          <div>
                            <span className="text-surface-500">{t('transactions.startDate')}</span>
                            <p className="mt-1 font-medium">{entry.start_date || t('transactions.notSet')}</p>
                          </div>
                          <div>
                            <span className="text-surface-500">{t('transactions.endDate')}</span>
                            <p className="mt-1 font-medium">{entry.end_date || t('transactions.notSet')}</p>
                          </div>
                        </div>
                        {entry.note && (
                          <p className="mt-3 text-sm text-gray-700">{entry.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-surface-200 p-4 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">{t('transactions.respondToOffer')}</h3>
                <p className="text-sm text-surface-500 mt-1">{t('transactions.negotiationSubtitle')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  id="negotiation-price"
                  label={t('transactions.pricePerUnit')}
                  type="number"
                  min="0"
                  value={negotiationForm.pricePerUnit}
                  onChange={(e) =>
                    setNegotiationForm((current) => ({ ...current, pricePerUnit: e.target.value }))
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id="negotiation-start"
                    label={t('transactions.startDate')}
                    type="date"
                    value={negotiationForm.startDate}
                    onChange={(e) =>
                      setNegotiationForm((current) => ({ ...current, startDate: e.target.value }))
                    }
                  />
                  <Input
                    id="negotiation-end"
                    label={t('transactions.endDate')}
                    type="date"
                    value={negotiationForm.endDate}
                    onChange={(e) =>
                      setNegotiationForm((current) => ({ ...current, endDate: e.target.value }))
                    }
                  />
                </div>
              </div>

              <Textarea
                id="negotiation-note"
                label={t('transactions.note')}
                placeholder={t('transactions.counterNotePlaceholder')}
                value={negotiationForm.note}
                onChange={(e) =>
                  setNegotiationForm((current) => ({ ...current, note: e.target.value }))
                }
                rows={4}
              />

              {canSubmitDraftProposal && (
                <Button onClick={handleSubmitProposal} disabled={updatingStatus} className="w-full">
                  <span className="flex items-center justify-center gap-2">
                    <Send className="h-4 w-4" />
                    {t('transactions.submitProposal')}
                  </span>
                </Button>
              )}

              {canSendCounterOffer && (
                <Button onClick={handleCounterOffer} disabled={updatingStatus} className="w-full">
                  <span className="flex items-center justify-center gap-2">
                    <ArrowRightLeft className="h-4 w-4" />
                    {t('transactions.sendCounterOffer')}
                  </span>
                </Button>
              )}

              {canAcceptOrReject && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button onClick={handleAcceptOffer} disabled={updatingStatus} className="w-full">
                    <span className="flex items-center justify-center gap-2">
                      <Check className="h-4 w-4" />
                      {t('transactions.acceptOffer')}
                    </span>
                  </Button>
                  <Button
                    onClick={handleRejectOffer}
                    disabled={updatingStatus}
                    variant="secondary"
                    className="w-full"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <XCircle className="h-4 w-4" />
                      {t('transactions.rejectOffer')}
                    </span>
                  </Button>
                </div>
              )}

              {!canSubmitDraftProposal && !canSendCounterOffer && !canAcceptOrReject && (
                <p className="text-sm text-surface-500">{t('transactions.noNegotiationAction')}</p>
              )}

              {getNextStatuses(selectedTx.status).length > 0 && (
                <div className="pt-4 border-t border-surface-100">
                  <p className="text-sm text-surface-500 mb-3">{t('transactions.updateStatus')}</p>
                  <div className="flex flex-wrap gap-2">
                    {getNextStatuses(selectedTx.status).map((nextStatus) => {
                      const statusDef = TRANSACTION_STATUSES.find((s) => s.value === nextStatus);
                      const label = statusDef ? (lang === 'en' ? statusDef.labelEn : statusDef.labelId) : nextStatus;

                      return (
                        <Button
                          key={nextStatus}
                          size="sm"
                          variant={nextStatus === 'cancelled' ? 'secondary' : 'primary'}
                          onClick={() => handleStatusUpdate(selectedTx.id, nextStatus)}
                          disabled={updatingStatus}
                        >
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center">
          <FileText className="h-12 w-12 text-surface-300 mx-auto mb-4" />
          <p className="text-surface-500">
            {canCreateTransaction ? t('transactions.empty') : t('transactions.emptyReadonly')}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-700">{t('transactions.commodity')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">{t('transactions.volume')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">{t('transactions.deliveryProvince')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">{t('transactions.status')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">{t('transactions.pricePerUnit')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">{t('transactions.createdAt')}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    tabIndex={0}
                    aria-selected={selectedTx?.id === tx.id}
                    onClick={() => setSelectedTx(tx)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedTx(tx);
                      }
                    }}
                    className={`border-b border-surface-100 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 ${
                      selectedTx?.id === tx.id
                        ? 'bg-primary-50 hover:bg-primary-50'
                        : 'hover:bg-surface-50'
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{getCommodityLabel(tx.commodity)}</td>
                    <td className="px-4 py-3 text-gray-600">{tx.volume} {tx.volume_unit}</td>
                    <td className="px-4 py-3 text-gray-600">{getProvinceLabel(tx.delivery_province)}</td>
                    <td className="px-4 py-3">{getStatusBadge(tx.status)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(tx.price_per_unit)}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(tx.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
