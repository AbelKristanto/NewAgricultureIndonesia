'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { INDONESIAN_PROVINCES, COMMODITIES, LAND_PLOT_STATUSES } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { LandPlot } from '@/types/land-plots';
import { Map, Plus, Pencil, Trash2, Sparkles } from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  province: '',
  district: '',
  areaValue: '',
  areaUnit: 'hectares',
  commodity: '',
  plantingDate: '',
  harvestEstimate: '',
  status: 'active',
};

export default function LandPlotsPage() {
  const { lang } = useLanguage();
  const isMounted = useRef(true);

  const [plots, setPlots] = useState<LandPlot[]>([]);
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

  const loadPlots = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/land-plots');
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setPlots(data.data);
        setError('');
      } else {
        setError(data.error || (lang === 'en' ? 'Failed to load land plots' : 'Gagal memuat data lahan'));
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    loadPlots();
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

  const openEditForm = (plot: LandPlot) => {
    setEditingId(plot.id);
    setForm({
      name: plot.name,
      province: plot.province,
      district: plot.district || '',
      areaValue: String(plot.area_value),
      areaUnit: plot.area_unit,
      commodity: plot.commodity || '',
      plantingDate: plot.planting_date || '',
      harvestEstimate: plot.harvest_estimate || '',
      status: plot.status,
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    const body = {
      name: form.name,
      province: form.province,
      district: form.district || undefined,
      areaValue: Number(form.areaValue),
      areaUnit: form.areaUnit,
      commodity: form.commodity || undefined,
      plantingDate: form.plantingDate || undefined,
      harvestEstimate: form.harvestEstimate || undefined,
      status: form.status,
    };

    try {
      const res = await fetch(editingId ? `/api/land-plots/${editingId}` : '/api/land-plots', {
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
        await loadPlots();
      } else {
        setFormError(data.error || (lang === 'en' ? 'Failed to save land plot' : 'Gagal menyimpan data lahan'));
      }
    } catch {
      if (isMounted.current) setFormError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      lang === 'en' ? 'Delete this land plot? This cannot be undone.' : 'Hapus lahan ini? Tindakan ini tidak bisa dibatalkan.'
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/land-plots/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setPlots((current) => current.filter((p) => p.id !== id));
      } else {
        setError(data.error || (lang === 'en' ? 'Failed to delete land plot' : 'Gagal menghapus data lahan'));
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setDeletingId(null);
    }
  };

  const provinceOptions = INDONESIAN_PROVINCES.map((p) => ({ value: p.value, label: lang === 'en' ? p.labelEn : p.labelId }));
  const commodityOptions = [
    { value: '', label: lang === 'en' ? 'Not set' : 'Belum ditentukan' },
    ...COMMODITIES.map((c) => ({ value: c.value, label: lang === 'en' ? c.labelEn : c.labelId })),
  ];
  const statusOptions = LAND_PLOT_STATUSES.map((s) => ({ value: s.value, label: lang === 'en' ? s.labelEn : s.labelId }));
  const areaUnitOptions = [
    { value: 'hectares', label: lang === 'en' ? 'Hectares' : 'Hektar' },
    { value: 'm2', label: 'm2' },
  ];

  const statusVariant = (status: string) =>
    status === 'active' ? 'success' : status === 'harvested' ? 'primary' : 'secondary';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Map className="h-6 w-6 text-primary-700" />
            {lang === 'en' ? 'Land Plots' : 'Kelola Lahan'}
          </h1>
          <p className="mt-1 text-surface-500">
            {lang === 'en'
              ? 'Register and manage each of your land plots so recommendations can be based on real data.'
              : 'Daftarkan dan kelola setiap lahan Anda supaya rekomendasi bisa berdasarkan data nyata.'}
          </p>
        </div>
        <Button type="button" size="sm" onClick={openCreateForm}>
          <Plus className="mr-1 h-4 w-4" />
          {lang === 'en' ? 'Add land plot' : 'Tambah Lahan'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 rounded-xl border border-surface-200 bg-surface-50 p-4 sm:grid-cols-2">
          <Input
            id="lp-name"
            label={lang === 'en' ? 'Plot name' : 'Nama lahan'}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Select
            id="lp-province"
            label={lang === 'en' ? 'Province' : 'Provinsi'}
            options={provinceOptions}
            placeholder={lang === 'en' ? 'Select a province' : 'Pilih provinsi'}
            value={form.province}
            onChange={(e) => setForm({ ...form, province: e.target.value })}
            required
          />
          <Input
            id="lp-district"
            label={lang === 'en' ? 'District (optional)' : 'Kecamatan/Kabupaten (opsional)'}
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="lp-area-value"
              type="number"
              step="0.01"
              min="0"
              label={lang === 'en' ? 'Area' : 'Luas lahan'}
              value={form.areaValue}
              onChange={(e) => setForm({ ...form, areaValue: e.target.value })}
              required
            />
            <Select
              id="lp-area-unit"
              label={lang === 'en' ? 'Unit' : 'Satuan'}
              options={areaUnitOptions}
              value={form.areaUnit}
              onChange={(e) => setForm({ ...form, areaUnit: e.target.value })}
            />
          </div>
          <Select
            id="lp-commodity"
            label={lang === 'en' ? 'Commodity' : 'Jenis komoditas'}
            options={commodityOptions}
            value={form.commodity}
            onChange={(e) => setForm({ ...form, commodity: e.target.value })}
          />
          <Select
            id="lp-status"
            label={lang === 'en' ? 'Plot status' : 'Status lahan'}
            options={statusOptions}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          />
          <Input
            id="lp-planting-date"
            type="date"
            label={lang === 'en' ? 'Planting date' : 'Tanggal tanam'}
            value={form.plantingDate}
            onChange={(e) => setForm({ ...form, plantingDate: e.target.value })}
          />
          <Input
            id="lp-harvest-estimate"
            type="date"
            label={lang === 'en' ? 'Harvest estimate' : 'Estimasi panen'}
            value={form.harvestEstimate}
            onChange={(e) => setForm({ ...form, harvestEstimate: e.target.value })}
          />

          {formError && (
            <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Spinner size="sm" /> : editingId ? (lang === 'en' ? 'Save changes' : 'Simpan perubahan') : (lang === 'en' ? 'Add land plot' : 'Tambah lahan')}
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
      ) : plots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-300 bg-white py-12 text-center text-surface-400">
          {lang === 'en' ? 'No land plots registered yet.' : 'Belum ada lahan yang didaftarkan.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plots.map((plot) => (
            <div key={plot.id} className="rounded-xl border border-surface-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{plot.name}</h3>
                <Badge variant={statusVariant(plot.status)}>{getLabel(LAND_PLOT_STATUSES, plot.status)}</Badge>
              </div>
              <p className="mt-1 text-sm text-surface-600">
                {getLabel(INDONESIAN_PROVINCES, plot.province)}{plot.district ? `, ${plot.district}` : ''}
              </p>
              <p className="mt-2 text-sm text-gray-700">
                {plot.area_value} {plot.area_unit === 'hectares' ? (lang === 'en' ? 'ha' : 'ha') : 'm2'}
                {plot.commodity ? ` • ${getLabel(COMMODITIES, plot.commodity)}` : ''}
              </p>
              <div className="mt-2 space-y-0.5 text-xs text-surface-500">
                <p>{lang === 'en' ? 'Planting date' : 'Tanggal tanam'}: {plot.planting_date || '-'}</p>
                <p>{lang === 'en' ? 'Harvest estimate' : 'Estimasi panen'}: {plot.harvest_estimate || '-'}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/dashboard/farmer?landPlotId=${plot.id}`}>
                  <Button type="button" size="sm">
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                    {lang === 'en' ? 'Analyze with AI' : 'Analisis dengan AI'}
                  </Button>
                </Link>
                <Button type="button" size="sm" variant="ghost" onClick={() => openEditForm(plot)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={deletingId === plot.id}
                  onClick={() => handleDelete(plot.id)}
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
