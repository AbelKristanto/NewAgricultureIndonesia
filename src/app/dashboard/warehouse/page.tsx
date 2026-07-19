'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { INDONESIAN_PROVINCES, COMMODITIES } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { Warehouse, WarehouseStockEntry, StockBalance } from '@/types/warehouse';
import { formatTimeAgo } from '@/lib/time-format';
import { Warehouse as WarehouseIcon, Plus, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

const EMPTY_WAREHOUSE_FORM = { name: '', province: '', city: '', capacityValue: '', capacityUnit: 'ton' };
const EMPTY_STOCK_FORM = { commodity: '', quantity: '', unit: 'kg', entryType: 'in' as 'in' | 'out', notes: '' };

export default function WarehousePage() {
  const { lang } = useLanguage();
  const isMounted = useRef(true);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_WAREHOUSE_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<WarehouseStockEntry[]>([]);
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [stockForm, setStockForm] = useState(EMPTY_STOCK_FORM);
  const [stockSaving, setStockSaving] = useState(false);

  const loadWarehouses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/warehouses');
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setWarehouses(data.data);
        setError('');
      } else {
        setError(data.error || (lang === 'en' ? 'Failed to load warehouses' : 'Gagal memuat data gudang'));
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    loadWarehouses();
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          province: form.province,
          city: form.city || undefined,
          capacityValue: form.capacityValue ? Number(form.capacityValue) : undefined,
          capacityUnit: form.capacityUnit,
        }),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setShowForm(false);
        setForm(EMPTY_WAREHOUSE_FORM);
        await loadWarehouses();
      } else {
        setFormError(data.error || (lang === 'en' ? 'Failed to save warehouse' : 'Gagal menyimpan gudang'));
      }
    } catch {
      if (isMounted.current) setFormError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const loadStock = async (warehouseId: string) => {
    setEntriesLoading(true);
    try {
      const res = await fetch(`/api/warehouses/${warehouseId}/stock`);
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        const list: WarehouseStockEntry[] = data.data;
        setEntries(list);
        const balanceMap = new Map<string, StockBalance>();
        for (const e of list) {
          const key = `${e.commodity}::${e.unit}`;
          const existing = balanceMap.get(key) ?? { commodity: e.commodity, unit: e.unit, balance: 0 };
          existing.balance += e.entry_type === 'in' ? e.quantity : -e.quantity;
          balanceMap.set(key, existing);
        }
        setBalances(Array.from(balanceMap.values()));
      }
    } catch {
      // Non-critical — the warehouse card itself already loaded.
    } finally {
      if (isMounted.current) setEntriesLoading(false);
    }
  };

  const handleToggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setEntries([]);
      setBalances([]);
      return;
    }
    setExpandedId(id);
    setStockForm(EMPTY_STOCK_FORM);
    loadStock(id);
  };

  const handleAddStock = async (warehouseId: string) => {
    if (!stockForm.commodity.trim() || !stockForm.quantity) return;
    setStockSaving(true);
    try {
      const res = await fetch(`/api/warehouses/${warehouseId}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commodity: stockForm.commodity,
          quantity: Number(stockForm.quantity),
          unit: stockForm.unit,
          entryType: stockForm.entryType,
          notes: stockForm.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setStockForm(EMPTY_STOCK_FORM);
        await loadStock(warehouseId);
      }
    } catch {
      // Non-critical — user can retry the entry.
    } finally {
      if (isMounted.current) setStockSaving(false);
    }
  };

  const provinceOptions = INDONESIAN_PROVINCES.map((p) => ({ value: p.value, label: lang === 'en' ? p.labelEn : p.labelId }));
  const commodityOptions = COMMODITIES.map((c) => ({ value: c.value, label: lang === 'en' ? c.labelEn : c.labelId }));
  const getProvinceLabel = (value: string) =>
    INDONESIAN_PROVINCES.find((p) => p.value === value)?.[lang === 'en' ? 'labelEn' : 'labelId'] || value;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <WarehouseIcon className="h-6 w-6 text-primary-700" />
            {lang === 'en' ? 'Warehouse Management' : 'Manajemen Gudang'}
          </h1>
          <p className="mt-1 text-surface-500">
            {lang === 'en'
              ? 'Track your storage facilities and stock movements.'
              : 'Pantau fasilitas penyimpanan dan pergerakan stok Anda.'}
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" />
          {lang === 'en' ? 'Add warehouse' : 'Tambah Gudang'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleCreateWarehouse} className="grid grid-cols-1 gap-3 rounded-xl border border-surface-200 bg-surface-50 p-4 sm:grid-cols-2">
          <Input
            label={lang === 'en' ? 'Warehouse name' : 'Nama gudang'}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Select
            label={lang === 'en' ? 'Province' : 'Provinsi'}
            options={provinceOptions}
            placeholder={lang === 'en' ? 'Select a province' : 'Pilih provinsi'}
            value={form.province}
            onChange={(e) => setForm({ ...form, province: e.target.value })}
            required
          />
          <Input
            label={lang === 'en' ? 'City (optional)' : 'Kota (opsional)'}
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              step="0.01"
              min="0"
              label={lang === 'en' ? 'Capacity' : 'Kapasitas'}
              value={form.capacityValue}
              onChange={(e) => setForm({ ...form, capacityValue: e.target.value })}
            />
            <Input
              label={lang === 'en' ? 'Unit' : 'Satuan'}
              value={form.capacityUnit}
              onChange={(e) => setForm({ ...form, capacityUnit: e.target.value })}
            />
          </div>

          {formError && (
            <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Spinner size="sm" /> : lang === 'en' ? 'Add warehouse' : 'Tambah gudang'}
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
      ) : warehouses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-300 bg-white py-12 text-center text-surface-400">
          {lang === 'en' ? 'No warehouses registered yet.' : 'Belum ada gudang yang didaftarkan.'}
        </div>
      ) : (
        <div className="space-y-3">
          {warehouses.map((wh) => {
            const isExpanded = expandedId === wh.id;
            return (
              <div key={wh.id} className="rounded-xl border border-surface-200 bg-white">
                <button type="button" onClick={() => handleToggleExpand(wh.id)} className="w-full px-5 py-4 text-left">
                  <p className="font-semibold text-gray-900">{wh.name}</p>
                  <p className="mt-1 text-sm text-surface-600">
                    {getProvinceLabel(wh.province)}{wh.city ? `, ${wh.city}` : ''}
                    {wh.capacity_value ? ` • ${lang === 'en' ? 'Capacity' : 'Kapasitas'}: ${wh.capacity_value} ${wh.capacity_unit}` : ''}
                  </p>
                </button>

                {isExpanded && (
                  <div className="border-t border-surface-100 px-5 py-4 space-y-4">
                    <div>
                      <h3 className="mb-2 text-xs font-semibold text-surface-500">
                        {lang === 'en' ? 'Current stock balance' : 'Saldo stok saat ini'}
                      </h3>
                      {balances.length === 0 ? (
                        <p className="text-xs text-surface-400">
                          {lang === 'en' ? 'No stock recorded yet.' : 'Belum ada stok tercatat.'}
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {balances.map((b) => (
                            <div key={`${b.commodity}-${b.unit}`} className="rounded-lg bg-surface-50 px-3 py-2">
                              <p className="text-xs text-surface-500">{b.commodity}</p>
                              <p className="text-sm font-semibold text-gray-900">{b.balance} {b.unit}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2 rounded-lg bg-surface-50 p-3 sm:grid-cols-5 sm:items-end">
                      <Select
                        label={lang === 'en' ? 'Commodity' : 'Komoditas'}
                        options={commodityOptions}
                        placeholder={lang === 'en' ? 'Select' : 'Pilih'}
                        value={stockForm.commodity}
                        onChange={(e) => setStockForm({ ...stockForm, commodity: e.target.value })}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        label={lang === 'en' ? 'Quantity' : 'Jumlah'}
                        value={stockForm.quantity}
                        onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                      />
                      <Input
                        label={lang === 'en' ? 'Unit' : 'Satuan'}
                        value={stockForm.unit}
                        onChange={(e) => setStockForm({ ...stockForm, unit: e.target.value })}
                      />
                      <Select
                        label={lang === 'en' ? 'Type' : 'Jenis'}
                        options={[
                          { value: 'in', label: lang === 'en' ? 'Stock in' : 'Stok masuk' },
                          { value: 'out', label: lang === 'en' ? 'Stock out' : 'Stok keluar' },
                        ]}
                        value={stockForm.entryType}
                        onChange={(e) => setStockForm({ ...stockForm, entryType: e.target.value as 'in' | 'out' })}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={stockSaving || !stockForm.commodity || !stockForm.quantity}
                        onClick={() => handleAddStock(wh.id)}
                      >
                        {stockSaving ? <Spinner size="sm" /> : lang === 'en' ? 'Record' : 'Catat'}
                      </Button>
                    </div>

                    <div>
                      <h3 className="mb-2 text-xs font-semibold text-surface-500">
                        {lang === 'en' ? 'Stock ledger' : 'Riwayat stok'}
                      </h3>
                      {entriesLoading ? (
                        <Spinner size="sm" />
                      ) : entries.length === 0 ? (
                        <p className="text-xs text-surface-400">
                          {lang === 'en' ? 'No entries yet.' : 'Belum ada catatan.'}
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {entries.map((entry) => (
                            <div key={entry.id} className="flex items-center gap-2 rounded-lg bg-surface-50 px-3 py-2 text-sm">
                              {entry.entry_type === 'in' ? (
                                <ArrowDownToLine className="h-3.5 w-3.5 shrink-0 text-green-600" />
                              ) : (
                                <ArrowUpFromLine className="h-3.5 w-3.5 shrink-0 text-red-600" />
                              )}
                              <span className="flex-1 text-gray-700">
                                {entry.commodity} — {entry.quantity} {entry.unit}
                                {entry.notes ? ` (${entry.notes})` : ''}
                              </span>
                              <span className="text-xs text-surface-400">{formatTimeAgo(entry.created_at, lang)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
