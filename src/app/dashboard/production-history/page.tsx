'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { COMMODITIES } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { LandPlot } from '@/types/land-plots';
import { HarvestOutcome, HarvestRecord, YieldUnit } from '@/types/harvest-records';
import { buildProductionReportCsv, buildProductionReportPdf } from '@/lib/report-export';
import { History, TrendingUp, TrendingDown, Download, FileText } from 'lucide-react';

const OUTCOME_LABEL: Record<HarvestOutcome, { en: string; id: string; variant: 'success' | 'warning' | 'danger' }> = {
  success: { en: 'Success', id: 'Berhasil', variant: 'success' },
  partial: { en: 'Partial', id: 'Sebagian', variant: 'warning' },
  failed: { en: 'Failed', id: 'Gagal', variant: 'danger' },
};

const YIELD_UNIT_TO_KG: Record<YieldUnit, number> = { kg: 1, ton: 1000, quintal: 100 };

const EMPTY_FORM = {
  landPlotId: '',
  commodity: '',
  seasonStart: '',
  seasonEnd: '',
  yieldValue: '',
  yieldUnit: 'kg' as YieldUnit,
  revenue: '',
  cost: '',
  outcome: 'success' as HarvestOutcome,
  failureReason: '',
  notes: '',
};

function formatCurrency(value: number, lang: string) {
  return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProductionHistoryPage() {
  const { lang } = useLanguage();
  const isMounted = useRef(true);

  const [records, setRecords] = useState<HarvestRecord[]>([]);
  const [landPlots, setLandPlots] = useState<LandPlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    Promise.all([
      fetch('/api/harvest-records').then((r) => r.json()),
      fetch('/api/land-plots').then((r) => r.json()),
    ])
      .then(([recordsData, plotsData]) => {
        if (!isMounted.current) return;
        if (recordsData.success) setRecords(recordsData.data);
        if (plotsData.success) {
          setLandPlots(plotsData.data);
          if (plotsData.data.length > 0 && !form.landPlotId) {
            setForm((prev) => ({ ...prev, landPlotId: plotsData.data[0].id, commodity: plotsData.data[0].commodity || '' }));
          }
        }
        if (!recordsData.success) setError(recordsData.error || (lang === 'en' ? 'Failed to load history' : 'Gagal memuat histori'));
      })
      .finally(() => {
        if (isMounted.current) setLoading(false);
      });
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlotChange = (plotId: string) => {
    const plot = landPlots.find((p) => p.id === plotId);
    setForm((prev) => ({ ...prev, landPlotId: plotId, commodity: plot?.commodity || prev.commodity }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.landPlotId || !form.commodity) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/harvest-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landPlotId: form.landPlotId,
          commodity: form.commodity,
          seasonStart: form.seasonStart || undefined,
          seasonEnd: form.seasonEnd || undefined,
          yieldValue: form.yieldValue ? Number(form.yieldValue) : undefined,
          yieldUnit: form.yieldUnit,
          revenue: form.revenue ? Number(form.revenue) : undefined,
          cost: form.cost ? Number(form.cost) : undefined,
          outcome: form.outcome,
          failureReason: form.outcome !== 'success' && form.failureReason ? form.failureReason : undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setRecords((prev) => [data.data, ...prev].sort((a, b) => (a.season_end < b.season_end ? 1 : -1)));
        setForm((prev) => ({ ...EMPTY_FORM, landPlotId: prev.landPlotId, commodity: prev.commodity }));
      } else {
        setError(data.error || (lang === 'en' ? 'Failed to add record' : 'Gagal menambah catatan'));
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  const getPlotName = (landPlotId: string) => landPlots.find((p) => p.id === landPlotId)?.name || '-';
  const getPlotArea = (landPlotId: string) => landPlots.find((p) => p.id === landPlotId)?.area_value || null;

  const yieldPerHa = (record: HarvestRecord): number | null => {
    if (record.yield_value == null) return null;
    const area = getPlotArea(record.land_plot_id);
    if (!area || area <= 0) return null;
    return (record.yield_value * YIELD_UNIT_TO_KG[record.yield_unit]) / area;
  };

  const chronological = [...records].sort((a, b) => (a.season_end > b.season_end ? 1 : -1));
  const maxYieldPerHa = Math.max(0, ...chronological.map((r) => yieldPerHa(r) || 0));

  const getTrend = (record: HarvestRecord): number | null => {
    const idx = chronological.findIndex((r) => r.id === record.id);
    const current = yieldPerHa(record);
    if (idx < 0 || current == null) return null;
    for (let i = idx - 1; i >= 0; i--) {
      if (chronological[i].commodity === record.commodity) {
        const prev = yieldPerHa(chronological[i]);
        if (prev != null && prev > 0) {
          return ((current - prev) / prev) * 100;
        }
      }
    }
    return null;
  };

  const totalHarvests = records.length;
  const totalRevenue = records.reduce((sum, r) => sum + (r.revenue || 0), 0);
  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const successRate = totalHarvests > 0 ? Math.round((records.filter((r) => r.outcome === 'success').length / totalHarvests) * 100) : 0;

  const plotOptions = landPlots.map((p) => ({ value: p.id, label: p.name }));
  const commodityOptions = COMMODITIES.map((c) => ({ value: c.value, label: lang === 'en' ? c.labelEn : c.labelId }));
  const yieldUnitOptions = [
    { value: 'kg', label: 'kg' },
    { value: 'quintal', label: lang === 'en' ? 'Quintal' : 'Kuintal' },
    { value: 'ton', label: lang === 'en' ? 'Ton' : 'Ton' },
  ];
  const outcomeOptions = (Object.keys(OUTCOME_LABEL) as HarvestOutcome[]).map((value) => ({
    value,
    label: OUTCOME_LABEL[value][lang === 'en' ? 'en' : 'id'],
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <History className="h-6 w-6 text-primary-700" />
            {lang === 'en' ? 'Production History' : 'Histori Produksi'}
          </h1>
          <p className="mt-1 text-surface-500">
            {lang === 'en'
              ? 'Track season outcomes, yields, and profit for every land plot.'
              : 'Catat hasil musim tanam, hasil panen, dan keuntungan untuk setiap lahan.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={records.length === 0}
            onClick={() => buildProductionReportCsv(records, landPlots)}
          >
            <Download className="mr-1 h-4 w-4" />
            {lang === 'en' ? 'Download CSV' : 'Unduh CSV'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={records.length === 0}
            onClick={() => buildProductionReportPdf(records, landPlots, lang)}
          >
            <FileText className="mr-1 h-4 w-4" />
            {lang === 'en' ? 'Download PDF' : 'Unduh PDF'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : landPlots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-300 bg-white py-12 text-center text-surface-400">
          {lang === 'en'
            ? 'Register a land plot in Kelola Lahan first to start tracking production history.'
            : 'Daftarkan lahan di Kelola Lahan dulu untuk mulai mencatat histori produksi.'}
        </div>
      ) : (
        <>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: lang === 'en' ? 'Total harvests' : 'Total panen', value: String(totalHarvests) },
              { label: lang === 'en' ? 'Total revenue' : 'Total pendapatan', value: formatCurrency(totalRevenue, lang) },
              { label: lang === 'en' ? 'Total profit' : 'Total keuntungan', value: formatCurrency(totalProfit, lang) },
              { label: lang === 'en' ? 'Success rate' : 'Tingkat keberhasilan', value: `${successRate}%` },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-surface-200 bg-white p-4">
                <p className="text-sm font-medium text-surface-500">{item.label}</p>
                <p className="mt-2 text-lg font-bold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 rounded-xl border border-surface-200 bg-white p-4 sm:grid-cols-2">
            <Select
              id="hr-plot"
              label={lang === 'en' ? 'Land plot' : 'Lahan'}
              options={plotOptions}
              value={form.landPlotId}
              onChange={(e) => handlePlotChange(e.target.value)}
            />
            <Select
              id="hr-commodity"
              label={lang === 'en' ? 'Commodity' : 'Komoditas'}
              options={commodityOptions}
              placeholder={lang === 'en' ? 'Select a commodity' : 'Pilih komoditas'}
              value={form.commodity}
              onChange={(e) => setForm({ ...form, commodity: e.target.value })}
              required
            />
            <Input
              id="hr-season-start"
              type="date"
              label={lang === 'en' ? 'Season start' : 'Mulai musim'}
              value={form.seasonStart}
              onChange={(e) => setForm({ ...form, seasonStart: e.target.value })}
            />
            <Input
              id="hr-season-end"
              type="date"
              label={lang === 'en' ? 'Season end (harvest date)' : 'Akhir musim (tanggal panen)'}
              value={form.seasonEnd}
              onChange={(e) => setForm({ ...form, seasonEnd: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="hr-yield"
                type="number"
                min="0"
                step="0.01"
                label={lang === 'en' ? 'Yield' : 'Hasil panen'}
                value={form.yieldValue}
                onChange={(e) => setForm({ ...form, yieldValue: e.target.value })}
              />
              <Select
                id="hr-yield-unit"
                label={lang === 'en' ? 'Unit' : 'Satuan'}
                options={yieldUnitOptions}
                value={form.yieldUnit}
                onChange={(e) => setForm({ ...form, yieldUnit: e.target.value as YieldUnit })}
              />
            </div>
            <Select
              id="hr-outcome"
              label={lang === 'en' ? 'Outcome' : 'Status hasil'}
              options={outcomeOptions}
              value={form.outcome}
              onChange={(e) => setForm({ ...form, outcome: e.target.value as HarvestOutcome })}
            />
            <Input
              id="hr-revenue"
              type="number"
              min="0"
              label={lang === 'en' ? 'Revenue (IDR)' : 'Pendapatan (IDR)'}
              value={form.revenue}
              onChange={(e) => setForm({ ...form, revenue: e.target.value })}
            />
            <Input
              id="hr-cost"
              type="number"
              min="0"
              label={lang === 'en' ? 'Cost (IDR)' : 'Biaya (IDR)'}
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
            {form.outcome !== 'success' && (
              <Textarea
                id="hr-failure-reason"
                label={lang === 'en' ? 'Failure reason' : 'Penyebab gagal panen'}
                value={form.failureReason}
                onChange={(e) => setForm({ ...form, failureReason: e.target.value })}
              />
            )}
            <Textarea
              id="hr-notes"
              label={lang === 'en' ? 'Notes (optional)' : 'Catatan (opsional)'}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div className="sm:col-span-2">
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? <Spinner size="sm" /> : (lang === 'en' ? 'Add record' : 'Tambah catatan')}
              </Button>
            </div>
          </form>

          <div className="rounded-xl border border-surface-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">{lang === 'en' ? 'History' : 'Riwayat'}</h2>
            {records.length === 0 ? (
              <p className="mt-3 text-sm text-surface-400">
                {lang === 'en' ? 'No harvest records yet.' : 'Belum ada catatan panen.'}
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {records.map((record) => {
                  const trend = getTrend(record);
                  const perHa = yieldPerHa(record);
                  const profit = record.revenue != null && record.cost != null ? record.revenue - record.cost : null;
                  return (
                    <div key={record.id} className="rounded-lg border border-surface-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {commodityOptions.find((c) => c.value === record.commodity)?.label || record.commodity} - {getPlotName(record.land_plot_id)}
                          </p>
                          <p className="text-xs text-surface-500">{record.season_end}</p>
                        </div>
                        <Badge variant={OUTCOME_LABEL[record.outcome].variant}>
                          {OUTCOME_LABEL[record.outcome][lang === 'en' ? 'en' : 'id']}
                        </Badge>
                      </div>

                      {record.outcome !== 'success' && record.failure_reason && (
                        <p className="mt-2 text-sm text-red-700">{record.failure_reason}</p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-700">
                        {record.yield_value != null && (
                          <span>{lang === 'en' ? 'Yield' : 'Hasil'}: {record.yield_value} {record.yield_unit}</span>
                        )}
                        {profit != null && (
                          <span>{lang === 'en' ? 'Profit' : 'Keuntungan'}: {formatCurrency(profit, lang)}</span>
                        )}
                      </div>

                      {perHa != null && (
                        <div className="mt-2">
                          <div className="h-2 rounded-full bg-surface-200">
                            <div
                              className="h-2 rounded-full bg-primary-600"
                              style={{ width: `${maxYieldPerHa > 0 ? (perHa / maxYieldPerHa) * 100 : 0}%` }}
                            />
                          </div>
                          {trend != null && (
                            <p className={`mt-1 flex items-center gap-1 text-xs ${trend >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {trend >= 0 ? '+' : ''}{trend.toFixed(0)}% {lang === 'en' ? 'vs previous season' : 'dibanding musim sebelumnya'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
