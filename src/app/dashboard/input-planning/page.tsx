'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { INPUT_ITEM_TYPES, INPUT_PLAN_STATUSES, COMMODITIES } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { FarmerInputPlan } from '@/types/input-planning';
import { LandPlot } from '@/types/land-plots';
import { ClipboardList, Plus, Pencil, Trash2 } from 'lucide-react';

const EMPTY_FORM = {
  landPlotId: '',
  commodity: '',
  seasonLabel: '',
  itemName: '',
  itemType: 'seed',
  quantity: '',
  unit: '',
  unitCost: '',
  status: 'planned',
  notes: '',
};

export default function InputPlanningPage() {
  const { lang } = useLanguage();
  const isMounted = useRef(true);

  const [plans, setPlans] = useState<FarmerInputPlan[]>([]);
  const [landPlots, setLandPlots] = useState<LandPlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getLabel = (options: { value: string; labelEn: string; labelId: string }[], value: string | null) =>
    options.find((o) => o.value === value)?.[lang === 'en' ? 'labelEn' : 'labelId'] || value || '-';

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, plotsRes] = await Promise.all([
        fetch('/api/input-planning'),
        fetch('/api/land-plots'),
      ]);
      const plansData = await plansRes.json();
      const plotsData = await plotsRes.json();
      if (!isMounted.current) return;
      if (plansData.success) {
        setPlans(plansData.data);
        setError('');
      } else {
        setError(plansData.error || (lang === 'en' ? 'Failed to load input plans' : 'Gagal memuat rencana sarana produksi'));
      }
      if (plotsData.success) {
        setLandPlots(plotsData.data);
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    loadData();
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (plan: FarmerInputPlan) => {
    setEditingId(plan.id);
    setForm({
      landPlotId: plan.land_plot_id || '',
      commodity: plan.commodity || '',
      seasonLabel: plan.season_label || '',
      itemName: plan.item_name,
      itemType: plan.item_type,
      quantity: String(plan.quantity),
      unit: plan.unit,
      unitCost: plan.unit_cost != null ? String(plan.unit_cost) : '',
      status: plan.status,
      notes: plan.notes || '',
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    const body = {
      landPlotId: form.landPlotId || undefined,
      commodity: form.commodity || undefined,
      seasonLabel: form.seasonLabel || undefined,
      itemName: form.itemName,
      itemType: form.itemType,
      quantity: Number(form.quantity),
      unit: form.unit,
      unitCost: form.unitCost ? Number(form.unitCost) : undefined,
      status: form.status,
      notes: form.notes || undefined,
    };

    try {
      const res = await fetch(editingId ? `/api/input-planning/${editingId}` : '/api/input-planning', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setShowForm(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        await loadData();
      } else {
        setFormError(data.error || (lang === 'en' ? 'Failed to save input plan' : 'Gagal menyimpan rencana sarana produksi'));
      }
    } catch {
      if (isMounted.current) setFormError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      lang === 'en' ? 'Delete this input plan? This cannot be undone.' : 'Hapus rencana sarana produksi ini? Tindakan ini tidak bisa dibatalkan.'
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/input-planning/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setPlans((current) => current.filter((p) => p.id !== id));
      } else {
        setError(data.error || (lang === 'en' ? 'Failed to delete input plan' : 'Gagal menghapus rencana sarana produksi'));
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setDeletingId(null);
    }
  };

  const itemTypeOptions = INPUT_ITEM_TYPES.map((t) => ({ value: t.value, label: lang === 'en' ? t.labelEn : t.labelId }));
  const statusOptions = INPUT_PLAN_STATUSES.map((s) => ({ value: s.value, label: lang === 'en' ? s.labelEn : s.labelId }));
  const commodityOptions = [
    { value: '', label: lang === 'en' ? 'Not set' : 'Belum ditentukan' },
    ...COMMODITIES.map((c) => ({ value: c.value, label: lang === 'en' ? c.labelEn : c.labelId })),
  ];
  const landPlotOptions = [
    { value: '', label: lang === 'en' ? 'Not linked to a plot' : 'Tidak terhubung ke lahan' },
    ...landPlots.map((p) => ({ value: p.id, label: p.name })),
  ];

  const statusVariant = (status: string) =>
    status === 'used' ? 'success' : status === 'purchased' ? 'primary' : 'secondary';

  const landPlotName = (id: string | null) => landPlots.find((p) => p.id === id)?.name || null;

  const totalPlannedCost = plans.reduce((sum, p) => sum + (p.unit_cost != null ? p.quantity * p.unit_cost : 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <ClipboardList className="h-6 w-6 text-primary-700" />
            {lang === 'en' ? 'Input Planning' : 'Rencana Sarana Produksi'}
          </h1>
          <p className="mt-1 text-surface-500">
            {lang === 'en'
              ? 'Plan seeds, fertilizer, and pesticide needs per planting cycle and estimate their cost.'
              : 'Rencanakan kebutuhan benih, pupuk, dan pestisida per musim tanam beserta estimasi biayanya.'}
          </p>
        </div>
        <Button type="button" size="sm" onClick={openCreateForm}>
          <Plus className="mr-1 h-4 w-4" />
          {lang === 'en' ? 'Add input item' : 'Tambah Sarana Produksi'}
        </Button>
      </div>

      {plans.length > 0 && (
        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <p className="text-sm text-surface-500">{lang === 'en' ? 'Total estimated cost' : 'Total estimasi biaya'}</p>
          <p className="text-xl font-bold text-gray-900">Rp {totalPlannedCost.toLocaleString('id-ID')}</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 rounded-xl border border-surface-200 bg-surface-50 p-4 sm:grid-cols-2">
          <Input
            id="ip-item-name"
            label={lang === 'en' ? 'Item name' : 'Nama sarana produksi'}
            placeholder={lang === 'en' ? 'e.g. Ciherang rice seed' : 'contoh: Benih Padi Ciherang'}
            value={form.itemName}
            onChange={(e) => setForm({ ...form, itemName: e.target.value })}
            required
          />
          <Select
            id="ip-item-type"
            label={lang === 'en' ? 'Item type' : 'Jenis sarana produksi'}
            options={itemTypeOptions}
            value={form.itemType}
            onChange={(e) => setForm({ ...form, itemType: e.target.value })}
          />
          <Select
            id="ip-land-plot"
            label={lang === 'en' ? 'Land plot (optional)' : 'Lahan (opsional)'}
            options={landPlotOptions}
            value={form.landPlotId}
            onChange={(e) => setForm({ ...form, landPlotId: e.target.value })}
          />
          <Select
            id="ip-commodity"
            label={lang === 'en' ? 'Commodity' : 'Jenis komoditas'}
            options={commodityOptions}
            value={form.commodity}
            onChange={(e) => setForm({ ...form, commodity: e.target.value })}
          />
          <Input
            id="ip-season-label"
            label={lang === 'en' ? 'Season (optional)' : 'Musim tanam (opsional)'}
            placeholder={lang === 'en' ? 'e.g. Planting season 1, 2026' : 'contoh: MT1 2026'}
            value={form.seasonLabel}
            onChange={(e) => setForm({ ...form, seasonLabel: e.target.value })}
          />
          <Select
            id="ip-status"
            label={lang === 'en' ? 'Status' : 'Status'}
            options={statusOptions}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="ip-quantity"
              type="number"
              step="0.01"
              min="0"
              label={lang === 'en' ? 'Quantity' : 'Jumlah'}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
            <Input
              id="ip-unit"
              label={lang === 'en' ? 'Unit' : 'Satuan'}
              placeholder={lang === 'en' ? 'kg, liter, sack' : 'kg, liter, sak'}
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              required
            />
          </div>
          <Input
            id="ip-unit-cost"
            type="number"
            step="0.01"
            min="0"
            label={lang === 'en' ? 'Unit cost (optional)' : 'Harga per satuan (opsional)'}
            value={form.unitCost}
            onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
          />
          <Textarea
            id="ip-notes"
            label={lang === 'en' ? 'Notes (optional)' : 'Catatan (opsional)'}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="sm:col-span-2"
            rows={2}
          />

          {formError && (
            <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Spinner size="sm" /> : editingId ? (lang === 'en' ? 'Save changes' : 'Simpan perubahan') : (lang === 'en' ? 'Add input item' : 'Tambah sarana produksi')}
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
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-300 bg-white py-12 text-center text-surface-400">
          {lang === 'en' ? 'No input plans yet.' : 'Belum ada rencana sarana produksi.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-surface-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{plan.item_name}</h3>
                <Badge variant={statusVariant(plan.status)}>{getLabel(INPUT_PLAN_STATUSES, plan.status)}</Badge>
              </div>
              <p className="mt-1 text-sm text-surface-600">
                {getLabel(INPUT_ITEM_TYPES, plan.item_type)}
                {plan.season_label ? ` • ${plan.season_label}` : ''}
              </p>
              <p className="mt-2 text-sm text-gray-700">
                {plan.quantity} {plan.unit}
                {plan.unit_cost != null ? ` • Rp ${(plan.quantity * plan.unit_cost).toLocaleString('id-ID')}` : ''}
              </p>
              <div className="mt-2 space-y-0.5 text-xs text-surface-500">
                {landPlotName(plan.land_plot_id) && <p>{lang === 'en' ? 'Land plot' : 'Lahan'}: {landPlotName(plan.land_plot_id)}</p>}
                {plan.commodity && <p>{lang === 'en' ? 'Commodity' : 'Komoditas'}: {getLabel(COMMODITIES, plan.commodity)}</p>}
              </div>
              {plan.notes && <p className="mt-2 text-xs text-surface-500">{plan.notes}</p>}
              <div className="mt-3 flex gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => openEditForm(plan)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={deletingId === plan.id}
                  onClick={() => handleDelete(plan.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
