'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { INPUT_ITEM_TYPES } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { SupplierProduct } from '@/types/supplier-products';
import { AggregateInputDemandItem } from '@/types/supplier-products';
import { Package, Plus, Pencil, Trash2, TrendingUp } from 'lucide-react';

const EMPTY_FORM = {
  productName: '',
  productType: 'seed',
  unit: '',
  pricePerUnit: '',
  stockQuantity: '',
  description: '',
  status: 'active',
};

export default function SuppliesPage() {
  const { lang } = useLanguage();
  const isMounted = useRef(true);

  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [demand, setDemand] = useState<AggregateInputDemandItem[]>([]);
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
      const [productsRes, demandRes] = await Promise.all([
        fetch('/api/supplier-products'),
        fetch('/api/supplier-products/demand'),
      ]);
      const productsData = await productsRes.json();
      const demandData = await demandRes.json();
      if (!isMounted.current) return;
      if (productsData.success) {
        setProducts(productsData.data);
        setError('');
      } else {
        setError(productsData.error || (lang === 'en' ? 'Failed to load products' : 'Gagal memuat produk'));
      }
      if (demandData.success) {
        setDemand(demandData.data);
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

  const openEditForm = (product: SupplierProduct) => {
    setEditingId(product.id);
    setForm({
      productName: product.product_name,
      productType: product.product_type,
      unit: product.unit,
      pricePerUnit: String(product.price_per_unit),
      stockQuantity: product.stock_quantity != null ? String(product.stock_quantity) : '',
      description: product.description || '',
      status: product.status,
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    const body = {
      productName: form.productName,
      productType: form.productType,
      unit: form.unit,
      pricePerUnit: Number(form.pricePerUnit),
      stockQuantity: form.stockQuantity ? Number(form.stockQuantity) : undefined,
      description: form.description || undefined,
      status: form.status,
    };

    try {
      const res = await fetch(editingId ? `/api/supplier-products/${editingId}` : '/api/supplier-products', {
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
        setFormError(data.error || (lang === 'en' ? 'Failed to save product' : 'Gagal menyimpan produk'));
      }
    } catch {
      if (isMounted.current) setFormError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      lang === 'en' ? 'Delete this product? This cannot be undone.' : 'Hapus produk ini? Tindakan ini tidak bisa dibatalkan.'
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/supplier-products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setProducts((current) => current.filter((p) => p.id !== id));
      } else {
        setError(data.error || (lang === 'en' ? 'Failed to delete product' : 'Gagal menghapus produk'));
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setDeletingId(null);
    }
  };

  const typeOptions = INPUT_ITEM_TYPES.map((t) => ({ value: t.value, label: lang === 'en' ? t.labelEn : t.labelId }));
  const statusOptions = [
    { value: 'active', label: lang === 'en' ? 'Active' : 'Aktif' },
    { value: 'inactive', label: lang === 'en' ? 'Inactive' : 'Nonaktif' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Package className="h-6 w-6 text-primary-700" />
            {lang === 'en' ? 'Product Catalog' : 'Katalog Produk'}
          </h1>
          <p className="mt-1 text-surface-500">
            {lang === 'en'
              ? 'Manage the seeds, fertilizer, and pesticide products you supply.'
              : 'Kelola produk benih, pupuk, dan pestisida yang Anda pasok.'}
          </p>
        </div>
        <Button type="button" size="sm" onClick={openCreateForm}>
          <Plus className="mr-1 h-4 w-4" />
          {lang === 'en' ? 'Add product' : 'Tambah Produk'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 rounded-xl border border-surface-200 bg-surface-50 p-4 sm:grid-cols-2">
          <Input
            id="sp-product-name"
            label={lang === 'en' ? 'Product name' : 'Nama produk'}
            placeholder={lang === 'en' ? 'e.g. Ciherang rice seed' : 'contoh: Benih Padi Ciherang'}
            value={form.productName}
            onChange={(e) => setForm({ ...form, productName: e.target.value })}
            required
          />
          <Select
            id="sp-product-type"
            label={lang === 'en' ? 'Product type' : 'Jenis produk'}
            options={typeOptions}
            value={form.productType}
            onChange={(e) => setForm({ ...form, productType: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="sp-unit"
              label={lang === 'en' ? 'Unit' : 'Satuan'}
              placeholder={lang === 'en' ? 'kg, liter, sack' : 'kg, liter, sak'}
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              required
            />
            <Input
              id="sp-price"
              type="number"
              step="0.01"
              min="0"
              label={lang === 'en' ? 'Price per unit' : 'Harga per satuan'}
              value={form.pricePerUnit}
              onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })}
              required
            />
          </div>
          <Input
            id="sp-stock"
            type="number"
            step="0.01"
            min="0"
            label={lang === 'en' ? 'Stock quantity (optional)' : 'Jumlah stok (opsional)'}
            value={form.stockQuantity}
            onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
          />
          <Select
            id="sp-status"
            label={lang === 'en' ? 'Status' : 'Status'}
            options={statusOptions}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          />
          <Textarea
            id="sp-description"
            label={lang === 'en' ? 'Description (optional)' : 'Deskripsi (opsional)'}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
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
              {saving ? <Spinner size="sm" /> : editingId ? (lang === 'en' ? 'Save changes' : 'Simpan perubahan') : (lang === 'en' ? 'Add product' : 'Tambah produk')}
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
      ) : (
        <>
          {products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-300 bg-white py-12 text-center text-surface-400">
              {lang === 'en' ? 'No products yet.' : 'Belum ada produk.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <div key={product.id} className="rounded-xl border border-surface-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{product.product_name}</h3>
                    <Badge variant={product.status === 'active' ? 'success' : 'secondary'}>
                      {product.status === 'active' ? (lang === 'en' ? 'Active' : 'Aktif') : (lang === 'en' ? 'Inactive' : 'Nonaktif')}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-surface-600">{getLabel(INPUT_ITEM_TYPES, product.product_type)}</p>
                  <p className="mt-2 text-sm text-gray-700">
                    Rp {product.price_per_unit.toLocaleString('id-ID')} / {product.unit}
                    {product.stock_quantity != null ? ` • ${lang === 'en' ? 'Stock' : 'Stok'}: ${product.stock_quantity} ${product.unit}` : ''}
                  </p>
                  {product.description && <p className="mt-2 text-xs text-surface-500">{product.description}</p>}
                  <div className="mt-3 flex gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => openEditForm(product)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={deletingId === product.id}
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <TrendingUp className="h-4 w-4 text-primary-700" />
              {lang === 'en' ? 'Aggregate Input Demand' : 'Permintaan Sarana Produksi Terkini'}
            </h2>
            <p className="mt-1 text-xs text-surface-500">
              {lang === 'en'
                ? 'Anonymized totals from farmers’ input plans across the platform — use this to gauge market demand.'
                : 'Total teragregasi dan dianonimkan dari rencana sarana produksi seluruh petani di platform — gunakan untuk mengukur permintaan pasar.'}
            </p>
            {demand.length === 0 ? (
              <p className="mt-4 text-sm text-surface-400">
                {lang === 'en' ? 'No demand data yet.' : 'Belum ada data permintaan.'}
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {demand.map((item) => (
                  <div key={`${item.itemName}-${item.itemType}-${item.unit}`} className="flex items-center justify-between rounded-lg border border-surface-100 px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-900">{item.itemName}</span>
                      <span className="ml-2 text-xs text-surface-500">{getLabel(INPUT_ITEM_TYPES, item.itemType)}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{item.totalQuantity.toLocaleString('id-ID')} {item.unit}</p>
                      <p className="text-xs text-surface-500">
                        {item.farmerCount} {lang === 'en' ? (item.farmerCount === 1 ? 'farmer' : 'farmers') : 'petani'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
