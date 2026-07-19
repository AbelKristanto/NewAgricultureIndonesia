'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { COMMODITIES } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { ContractStatus, FarmingContract } from '@/types/contract';
import { formatTimeAgo } from '@/lib/time-format';
import { FileSignature, Plus } from 'lucide-react';

interface Counterparty {
  id: string;
  username: string;
}

const EMPTY_FORM = {
  counterpartyId: '',
  commodity: '',
  agreedVolume: '',
  volumeUnit: 'kg',
  agreedPricePerUnit: '',
  startDate: '',
  endDate: '',
  deliverySchedule: '',
  terms: '',
};

const STATUS_VARIANT: Record<ContractStatus, 'success' | 'primary' | 'secondary' | 'danger'> = {
  proposed: 'secondary',
  active: 'primary',
  fulfilled: 'success',
  breached: 'danger',
  cancelled: 'danger',
};

const STATUS_LABEL: Record<ContractStatus, { en: string; id: string }> = {
  proposed: { en: 'Proposed', id: 'Diusulkan' },
  active: { en: 'Active', id: 'Aktif' },
  fulfilled: { en: 'Fulfilled', id: 'Terpenuhi' },
  breached: { en: 'Breached', id: 'Dilanggar' },
  cancelled: { en: 'Cancelled', id: 'Dibatalkan' },
};

const NEXT_STATUSES: Record<ContractStatus, ContractStatus[]> = {
  proposed: ['active', 'cancelled'],
  active: ['fulfilled', 'breached', 'cancelled'],
  fulfilled: [],
  breached: [],
  cancelled: [],
};

export default function ContractsPage() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const isMounted = useRef(true);

  const [contracts, setContracts] = useState<FarmingContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contracts');
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setContracts(data.data);
        setError('');
      } else {
        setError(data.error || (lang === 'en' ? 'Failed to load contracts' : 'Gagal memuat kontrak'));
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    loadContracts();
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateForm = async () => {
    setShowForm(true);
    setFormError('');
    try {
      const res = await fetch('/api/contracts/counterparties');
      const data = await res.json();
      if (isMounted.current && data.success) setCounterparties(data.data);
    } catch {
      // Non-critical — the dropdown just stays empty.
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counterpartyId: form.counterpartyId,
          commodity: form.commodity,
          agreedVolume: Number(form.agreedVolume),
          volumeUnit: form.volumeUnit,
          agreedPricePerUnit: form.agreedPricePerUnit ? Number(form.agreedPricePerUnit) : undefined,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          deliverySchedule: form.deliverySchedule || undefined,
          terms: form.terms || undefined,
        }),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setShowForm(false);
        setForm(EMPTY_FORM);
        await loadContracts();
      } else {
        setFormError(data.error || (lang === 'en' ? 'Failed to create contract' : 'Gagal membuat kontrak'));
      }
    } catch {
      if (isMounted.current) setFormError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: ContractStatus) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setContracts((current) => current.map((c) => (c.id === id ? data.data : c)));
      }
    } catch {
      // Non-critical — user can retry.
    } finally {
      if (isMounted.current) setUpdatingId(null);
    }
  };

  const commodityOptions = COMMODITIES.map((c) => ({ value: c.value, label: lang === 'en' ? c.labelEn : c.labelId }));
  const counterpartyOptions = counterparties.map((c) => ({ value: c.id, label: c.username }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <FileSignature className="h-6 w-6 text-primary-700" />
            {lang === 'en' ? 'Contract Farming' : 'Contract Farming'}
          </h1>
          <p className="mt-1 text-surface-500">
            {lang === 'en'
              ? 'Formal seasonal supply agreements with your trading partners.'
              : 'Perjanjian pasokan musiman resmi dengan mitra dagang Anda.'}
          </p>
        </div>
        <Button type="button" size="sm" onClick={openCreateForm}>
          <Plus className="mr-1 h-4 w-4" />
          {lang === 'en' ? 'Propose contract' : 'Usulkan Kontrak'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 rounded-xl border border-surface-200 bg-surface-50 p-4 sm:grid-cols-2">
          <Select
            label={lang === 'en' ? 'Counterparty' : 'Mitra'}
            options={counterpartyOptions}
            placeholder={
              counterpartyOptions.length === 0
                ? (lang === 'en' ? 'No prior transaction partners' : 'Belum ada mitra transaksi')
                : (lang === 'en' ? 'Select a partner you have transacted with' : 'Pilih mitra yang pernah bertransaksi')
            }
            value={form.counterpartyId}
            onChange={(e) => setForm({ ...form, counterpartyId: e.target.value })}
            required
          />
          <Select
            label={lang === 'en' ? 'Commodity' : 'Komoditas'}
            options={commodityOptions}
            placeholder={lang === 'en' ? 'Select' : 'Pilih'}
            value={form.commodity}
            onChange={(e) => setForm({ ...form, commodity: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              step="0.01"
              min="0"
              label={lang === 'en' ? 'Agreed volume' : 'Volume disepakati'}
              value={form.agreedVolume}
              onChange={(e) => setForm({ ...form, agreedVolume: e.target.value })}
              required
            />
            <Input
              label={lang === 'en' ? 'Unit' : 'Satuan'}
              value={form.volumeUnit}
              onChange={(e) => setForm({ ...form, volumeUnit: e.target.value })}
            />
          </div>
          <Input
            type="number"
            step="0.01"
            min="0"
            label={lang === 'en' ? 'Price per unit (optional)' : 'Harga per satuan (opsional)'}
            value={form.agreedPricePerUnit}
            onChange={(e) => setForm({ ...form, agreedPricePerUnit: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label={lang === 'en' ? 'Start date' : 'Tanggal mulai'}
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
            <Input
              type="date"
              label={lang === 'en' ? 'End date' : 'Tanggal selesai'}
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
          <Input
            label={lang === 'en' ? 'Delivery schedule (optional)' : 'Jadwal pengiriman (opsional)'}
            value={form.deliverySchedule}
            onChange={(e) => setForm({ ...form, deliverySchedule: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Textarea
              label={lang === 'en' ? 'Terms (optional)' : 'Ketentuan (opsional)'}
              value={form.terms}
              onChange={(e) => setForm({ ...form, terms: e.target.value })}
            />
          </div>

          {formError && (
            <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={saving || counterpartyOptions.length === 0}>
              {saving ? <Spinner size="sm" /> : lang === 'en' ? 'Propose contract' : 'Usulkan kontrak'}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>
              {lang === 'en' ? 'Cancel' : 'Batal'}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : contracts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-300 bg-white py-12 text-center text-surface-400">
          {lang === 'en' ? 'No contracts yet.' : 'Belum ada kontrak.'}
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((contract) => {
            const isFarmer = user?.role === 'farmer';
            return (
              <div key={contract.id} className="rounded-xl border border-surface-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{contract.commodity}</p>
                    <p className="mt-1 text-sm text-surface-600">
                      {contract.agreed_volume} {contract.volume_unit}
                      {contract.agreed_price_per_unit ? ` @ Rp${contract.agreed_price_per_unit.toLocaleString('id-ID')}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-surface-500">
                      {isFarmer ? (lang === 'en' ? 'With buyer' : 'Dengan pembeli') : (lang === 'en' ? 'With farmer' : 'Dengan petani')}
                      {' • '}{formatTimeAgo(contract.created_at, lang)}
                    </p>
                    {(contract.start_date || contract.end_date) && (
                      <p className="mt-1 text-xs text-surface-500">
                        {contract.start_date || '?'} → {contract.end_date || '?'}
                      </p>
                    )}
                    {contract.delivery_schedule && (
                      <p className="mt-1 text-xs text-surface-500">
                        {lang === 'en' ? 'Delivery' : 'Pengiriman'}: {contract.delivery_schedule}
                      </p>
                    )}
                    {contract.terms && <p className="mt-2 text-sm text-gray-700">{contract.terms}</p>}
                  </div>
                  <Badge variant={STATUS_VARIANT[contract.status]}>
                    {lang === 'en' ? STATUS_LABEL[contract.status].en : STATUS_LABEL[contract.status].id}
                  </Badge>
                </div>

                {NEXT_STATUSES[contract.status].length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {NEXT_STATUSES[contract.status].map((next) => (
                      <Button
                        key={next}
                        type="button"
                        size="sm"
                        variant={next === 'cancelled' || next === 'breached' ? 'secondary' : 'primary'}
                        disabled={updatingId === contract.id}
                        onClick={() => handleStatusUpdate(contract.id, next)}
                      >
                        {updatingId === contract.id ? <Spinner size="sm" /> : (lang === 'en' ? STATUS_LABEL[next].en : STATUS_LABEL[next].id)}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
