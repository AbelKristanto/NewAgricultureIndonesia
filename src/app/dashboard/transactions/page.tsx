'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Transaction, CreateTransactionInput } from '@/types/transaction';
import { COMMODITIES, INDONESIAN_PROVINCES, TRANSACTION_STATUSES } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { Plus, FileText, X } from 'lucide-react';

export default function TransactionsPage() {
  const { t, lang } = useLanguage();
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [form, setForm] = useState({
    commodity: '',
    volume: '',
    volumeUnit: 'tons',
    pricePerUnit: '',
    deliveryProvince: '',
    deliveryCity: '',
    startDate: '',
    endDate: '',
  });

  const fetchTransactions = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/transactions', { signal });
      if (!isMounted.current) return;
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setTransactions(data.data);
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
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    fetchTransactions(abortController.signal);

    return () => {
      isMounted.current = false;
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setForm({ commodity: '', volume: '', volumeUnit: 'tons', pricePerUnit: '', deliveryProvince: '', deliveryCity: '', startDate: '', endDate: '' });
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

  const handleStatusUpdate = async (txId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/transactions/${txId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        signal: abortControllerRef.current?.signal,
      });
      if (!isMounted.current) return;
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setSelectedTx(data.data);
        await fetchTransactions(abortControllerRef.current?.signal);
      }
    } catch (err) {
      if (!isMounted.current) return;
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(t('common.error'));
    } finally {
      if (isMounted.current) setUpdatingStatus(false);
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

  const getNextStatuses = (current: string): string[] => {
    const transitions: Record<string, string[]> = {
      draft: ['proposed', 'cancelled'],
      proposed: ['accepted', 'cancelled'],
      accepted: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
    };
    return transitions[current] || [];
  };

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
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <span className="flex items-center gap-2">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? t('common.back') : t('transactions.create')}
          </span>
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-surface-200 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">{t('transactions.newTransaction')}</h2>
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
          <Button type="submit" disabled={creating}>
            {creating ? (
              <span className="flex items-center gap-2"><Spinner size="sm" />{t('common.loading')}</span>
            ) : (
              t('transactions.submit')
            )}
          </Button>
        </form>
      )}

      {/* Transaction detail modal */}
      {selectedTx && (
        <div className="bg-white rounded-xl border border-surface-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{t('transactions.detail')}</h2>
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
            {selectedTx.price_per_unit && (
              <div>
                <span className="text-surface-500">{t('transactions.pricePerUnit')}</span>
                <p className="font-medium">IDR {selectedTx.price_per_unit.toLocaleString()}</p>
              </div>
            )}
            {selectedTx.total_value && (
              <div>
                <span className="text-surface-500">{t('transactions.totalValue')}</span>
                <p className="font-medium">IDR {selectedTx.total_value.toLocaleString()}</p>
              </div>
            )}
            <div>
              <span className="text-surface-500">{t('transactions.createdAt')}</span>
              <p className="font-medium">{new Date(selectedTx.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          {/* Status transitions */}
          {getNextStatuses(selectedTx.status).length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-surface-100">
              <span className="text-sm text-surface-500">{t('transactions.updateStatus')}:</span>
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
          )}
        </div>
      )}

      {/* Transaction list */}
      {transactions.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center">
          <FileText className="h-12 w-12 text-surface-300 mx-auto mb-4" />
          <p className="text-surface-500">{t('transactions.empty')}</p>
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
                  <th className="text-left px-4 py-3 font-medium text-gray-700">{t('transactions.createdAt')}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="border-b border-surface-100 hover:bg-surface-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{getCommodityLabel(tx.commodity)}</td>
                    <td className="px-4 py-3 text-gray-600">{tx.volume} {tx.volume_unit}</td>
                    <td className="px-4 py-3 text-gray-600">{getProvinceLabel(tx.delivery_province)}</td>
                    <td className="px-4 py-3">{getStatusBadge(tx.status)}</td>
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
