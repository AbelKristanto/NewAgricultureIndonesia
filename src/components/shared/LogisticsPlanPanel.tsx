'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Transaction } from '@/types/transaction';
import { FarmerLogisticsPlan } from '@/types/farmer-operations';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import DeliveryMap from '@/components/shared/DeliveryMap';
import { Truck } from 'lucide-react';

const STATUS_OPTIONS: Array<{ value: string; labelEn: string; labelId: string }> = [
  { value: 'scheduled', labelEn: 'Scheduled', labelId: 'Dijadwalkan' },
  { value: 'pickup_pending', labelEn: 'Pickup pending', labelId: 'Menunggu jemput' },
  { value: 'picked_up', labelEn: 'Picked up', labelId: 'Sudah dijemput' },
  { value: 'in_transit', labelEn: 'In transit', labelId: 'Dalam perjalanan' },
  { value: 'delivered', labelEn: 'Delivered', labelId: 'Terkirim' },
  { value: 'delayed', labelEn: 'Delayed', labelId: 'Tertunda' },
  { value: 'cancelled', labelEn: 'Cancelled', labelId: 'Dibatalkan' },
];

interface LogisticsPlanPanelProps {
  transaction: Transaction;
  canCreate: boolean;
  canUpdate: boolean;
}

const EMPTY_CREATE_FORM = {
  providerName: '',
  pickupAddress: '',
  pickupLat: '',
  pickupLng: '',
  destinationAddress: '',
  destinationLat: '',
  destinationLng: '',
  pickupTime: '',
};

export default function LogisticsPlanPanel({ transaction, canCreate, canUpdate }: LogisticsPlanPanelProps) {
  const { lang } = useLanguage();
  const isMounted = useRef(true);
  const [plan, setPlan] = useState<FarmerLogisticsPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [positionForm, setPositionForm] = useState({ lat: '', lng: '', checkpointLabel: '' });
  const [checkpointPhoto, setCheckpointPhoto] = useState<File | null>(null);

  useEffect(() => {
    isMounted.current = true;
    setLoading(true);
    fetch(`/api/farmer-operations/logistics?transactionId=${transaction.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted.current) return;
        if (data.success) setPlan(data.data);
      })
      .catch(() => {
        // Non-critical panel — fail silently, "create" form still offered.
      })
      .finally(() => {
        if (isMounted.current) setLoading(false);
      });
    return () => {
      isMounted.current = false;
    };
  }, [transaction.id]);

  useEffect(() => {
    if (plan) {
      setPositionForm({ lat: String(plan.current_lat ?? ''), lng: String(plan.current_lng ?? ''), checkpointLabel: '' });
    }
  }, [plan]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/farmer-operations/logistics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: transaction.id,
          providerName: createForm.providerName,
          pickupAddress: createForm.pickupAddress,
          pickupLat: Number(createForm.pickupLat),
          pickupLng: Number(createForm.pickupLng),
          destinationAddress: createForm.destinationAddress,
          destinationLat: Number(createForm.destinationLat),
          destinationLng: Number(createForm.destinationLng),
          pickupTime: createForm.pickupTime || undefined,
        }),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setPlan(data.data);
        setShowCreateForm(false);
        setCreateForm(EMPTY_CREATE_FORM);
      } else {
        setError(data.error || (lang === 'en' ? 'Failed to create logistics plan' : 'Gagal membuat rencana logistik'));
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const patchPlan = async (payload: Record<string, unknown>) => {
    if (!plan) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/farmer-operations/logistics/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setPlan(data.data);
      } else {
        setError(data.error || (lang === 'en' ? 'Failed to update logistics plan' : 'Gagal memperbarui rencana logistik'));
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleAddCheckpoint = async (lat: number, lng: number, label: string) => {
    if (!plan) return;
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('label', label);
      formData.append('lat', String(lat));
      formData.append('lng', String(lng));
      if (checkpointPhoto) {
        formData.append('file', checkpointPhoto);
      }

      const res = await fetch(`/api/farmer-operations/logistics/${plan.id}/checkpoint`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setPlan(data.data);
        setPositionForm({ ...positionForm, checkpointLabel: '' });
        setCheckpointPhoto(null);
      } else {
        setError(data.error || (lang === 'en' ? 'Failed to add checkpoint' : 'Gagal menambah checkpoint'));
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleUpdatePosition = () => {
    const lat = Number(positionForm.lat);
    const lng = Number(positionForm.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    const label = positionForm.checkpointLabel.trim();
    if (label) {
      handleAddCheckpoint(lat, lng, label);
    } else {
      patchPlan({ currentLat: lat, currentLng: lng });
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-surface-200 p-4">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-surface-200 p-4 space-y-4">
      <div className="flex items-center gap-2 text-gray-900">
        <Truck className="h-4 w-4 text-primary-700" />
        <h3 className="font-semibold">{lang === 'en' ? 'Logistics' : 'Logistik'}</h3>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>
      )}

      {!plan && !canCreate && (
        <p className="text-sm text-surface-500">
          {lang === 'en' ? 'No logistics plan yet.' : 'Belum ada rencana logistik.'}
        </p>
      )}

      {!plan && canCreate && !showCreateForm && (
        <Button type="button" size="sm" onClick={() => setShowCreateForm(true)}>
          {lang === 'en' ? 'Create logistics plan' : 'Buat rencana logistik'}
        </Button>
      )}

      {!plan && canCreate && showCreateForm && (
        <form onSubmit={handleCreate} className="space-y-3">
          <Input
            id="lp-provider"
            label={lang === 'en' ? 'Provider name' : 'Nama penyedia'}
            value={createForm.providerName}
            onChange={(e) => setCreateForm({ ...createForm, providerName: e.target.value })}
            required
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              id="lp-pickup-addr"
              label={lang === 'en' ? 'Pickup address' : 'Alamat jemput'}
              value={createForm.pickupAddress}
              onChange={(e) => setCreateForm({ ...createForm, pickupAddress: e.target.value })}
              required
            />
            <Input
              id="lp-pickup-lat"
              label="Lat"
              type="number"
              step="any"
              value={createForm.pickupLat}
              onChange={(e) => setCreateForm({ ...createForm, pickupLat: e.target.value })}
              required
            />
            <Input
              id="lp-pickup-lng"
              label="Lng"
              type="number"
              step="any"
              value={createForm.pickupLng}
              onChange={(e) => setCreateForm({ ...createForm, pickupLng: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              id="lp-dest-addr"
              label={lang === 'en' ? 'Destination address' : 'Alamat tujuan'}
              value={createForm.destinationAddress}
              onChange={(e) => setCreateForm({ ...createForm, destinationAddress: e.target.value })}
              required
            />
            <Input
              id="lp-dest-lat"
              label="Lat"
              type="number"
              step="any"
              value={createForm.destinationLat}
              onChange={(e) => setCreateForm({ ...createForm, destinationLat: e.target.value })}
              required
            />
            <Input
              id="lp-dest-lng"
              label="Lng"
              type="number"
              step="any"
              value={createForm.destinationLng}
              onChange={(e) => setCreateForm({ ...createForm, destinationLng: e.target.value })}
              required
            />
          </div>
          <Input
            id="lp-pickup-time"
            label={lang === 'en' ? 'Pickup time' : 'Waktu jemput'}
            type="datetime-local"
            value={createForm.pickupTime}
            onChange={(e) => setCreateForm({ ...createForm, pickupTime: e.target.value })}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={saving} loadingLabel={lang === 'en' ? 'Saving...' : 'Menyimpan...'}>
              {lang === 'en' ? 'Save' : 'Simpan'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowCreateForm(false)}>
              {lang === 'en' ? 'Cancel' : 'Batal'}
            </Button>
          </div>
        </form>
      )}

      {plan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-gray-900">{plan.provider_name}</p>
              <p className="text-xs text-surface-500">{plan.pickup_address} → {plan.destination_address}</p>
            </div>
            <Badge variant={plan.status === 'delivered' ? 'success' : plan.status === 'delayed' || plan.status === 'cancelled' ? 'danger' : 'primary'}>
              {STATUS_OPTIONS.find((s) => s.value === plan.status)?.[lang === 'en' ? 'labelEn' : 'labelId'] || plan.status}
            </Badge>
          </div>

          <DeliveryMap plan={plan} />

          {plan.checkpoints.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {plan.checkpoints.map((checkpoint) => (
                <div key={`${checkpoint.label}-${checkpoint.time}`} className="rounded-lg border border-surface-200 p-2 text-xs">
                  <p className="font-medium text-gray-900">{checkpoint.label}</p>
                  <p className="text-surface-500">{new Date(checkpoint.time).toLocaleString()}</p>
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
          )}

          {canUpdate && (
            <div className="space-y-3 border-t border-surface-100 pt-3">
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <Button
                    key={s.value}
                    type="button"
                    size="sm"
                    variant={plan.status === s.value ? 'primary' : 'ghost'}
                    disabled={saving}
                    onClick={() => patchPlan({ status: s.value })}
                  >
                    {lang === 'en' ? s.labelEn : s.labelId}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Input
                  id="lp-pos-lat"
                  label="Lat"
                  type="number"
                  step="any"
                  value={positionForm.lat}
                  onChange={(e) => setPositionForm({ ...positionForm, lat: e.target.value })}
                />
                <Input
                  id="lp-pos-lng"
                  label="Lng"
                  type="number"
                  step="any"
                  value={positionForm.lng}
                  onChange={(e) => setPositionForm({ ...positionForm, lng: e.target.value })}
                />
                <Input
                  id="lp-checkpoint-label"
                  label={lang === 'en' ? 'Checkpoint (optional)' : 'Checkpoint (opsional)'}
                  value={positionForm.checkpointLabel}
                  onChange={(e) => setPositionForm({ ...positionForm, checkpointLabel: e.target.value })}
                />
              </div>
              <Input
                id="lp-checkpoint-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                label={lang === 'en' ? 'Proof photo (optional, with checkpoint)' : 'Foto bukti (opsional, sertakan checkpoint)'}
                onChange={(e) => setCheckpointPhoto(e.target.files?.[0] ?? null)}
              />
              <Button type="button" size="sm" onClick={handleUpdatePosition} loading={saving} loadingLabel={lang === 'en' ? 'Updating...' : 'Memperbarui...'}>
                {lang === 'en' ? 'Update position' : 'Perbarui posisi'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
