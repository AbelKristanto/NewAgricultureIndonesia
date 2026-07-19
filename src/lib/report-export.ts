import jsPDF from 'jspdf';
import { HarvestRecord, YieldUnit } from '@/types/harvest-records';
import { LandPlot } from '@/types/land-plots';
import { COMMODITIES } from '@/lib/constants';

const YIELD_UNIT_TO_KG: Record<YieldUnit, number> = { kg: 1, ton: 1000, quintal: 100 };

function getPlotName(landPlots: LandPlot[], landPlotId: string): string {
  return landPlots.find((p) => p.id === landPlotId)?.name || '-';
}

function getPlotArea(landPlots: LandPlot[], landPlotId: string): number | null {
  return landPlots.find((p) => p.id === landPlotId)?.area_value ?? null;
}

function getCommodityLabel(value: string, lang: 'en' | 'id'): string {
  return COMMODITIES.find((c) => c.value === value)?.[lang === 'en' ? 'labelEn' : 'labelId'] || value;
}

function yieldPerHa(record: HarvestRecord, landPlots: LandPlot[]): number | null {
  if (record.yield_value == null) return null;
  const area = getPlotArea(landPlots, record.land_plot_id);
  if (!area || area <= 0) return null;
  return (record.yield_value * YIELD_UNIT_TO_KG[record.yield_unit]) / area;
}

function avgPrice(record: HarvestRecord): number | null {
  if (record.revenue == null || record.yield_value == null || record.yield_value <= 0) return null;
  const kgValue = record.yield_value * YIELD_UNIT_TO_KG[record.yield_unit];
  return record.revenue / kgValue;
}

function formatCurrencyPlain(value: number): string {
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildProductionReportCsv(records: HarvestRecord[], landPlots: LandPlot[]): void {
  const header = ['Lahan', 'Komoditas', 'Akhir Musim', 'Hasil', 'Satuan', 'Pendapatan', 'Biaya', 'Keuntungan', 'Status'];
  const rows = records.map((r) => [
    getPlotName(landPlots, r.land_plot_id),
    r.commodity,
    r.season_end,
    r.yield_value ?? '',
    r.yield_unit,
    r.revenue ?? '',
    r.cost ?? '',
    r.revenue != null && r.cost != null ? r.revenue - r.cost : '',
    r.outcome,
  ]);
  const csvContent = [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
  triggerDownload(csvContent, 'laporan-produksi.csv', 'text/csv;charset=utf-8;');
}

function drawBarChart(
  doc: jsPDF,
  series: { label: string; value: number }[],
  startY: number
): number {
  let y = startY;
  const max = Math.max(1, ...series.map((s) => s.value));
  const maxBarWidth = 100;
  doc.setFontSize(8);
  series.forEach((s) => {
    if (y > 275) {
      doc.addPage();
      y = 15;
    }
    doc.text(truncate(s.label, 24), 14, y + 3);
    const width = (s.value / max) * maxBarWidth;
    doc.setFillColor(34, 139, 87);
    doc.rect(80, y - 2, Math.max(1, width), 4, 'F');
    y += 7;
  });
  return y;
}

export function buildProductionReportPdf(records: HarvestRecord[], landPlots: LandPlot[], lang: 'en' | 'id'): void {
  const doc = new jsPDF();
  const isEn = lang === 'en';
  let y = 15;

  doc.setFontSize(16);
  doc.text(isEn ? 'Production Report' : 'Laporan Produksi', 14, y);
  y += 6;
  doc.setFontSize(10);
  doc.text(`${isEn ? 'Generated' : 'Dibuat'}: ${new Date().toLocaleDateString()}`, 14, y);
  y += 10;

  const uniqueAreas = new Map<string, number>();
  records.forEach((r) => {
    const area = getPlotArea(landPlots, r.land_plot_id);
    if (area != null) uniqueAreas.set(r.land_plot_id, area);
  });
  const totalArea = Array.from(uniqueAreas.values()).reduce((sum, a) => sum + a, 0);
  const totalRevenue = records.reduce((sum, r) => sum + (r.revenue || 0), 0);
  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalProfit = totalRevenue - totalCost;

  doc.setFontSize(12);
  doc.text(isEn ? 'Summary' : 'Ringkasan', 14, y);
  y += 6;
  doc.setFontSize(10);
  [
    `${isEn ? 'Total land area' : 'Total luas lahan'}: ${totalArea.toFixed(2)} ha`,
    `${isEn ? 'Total harvests' : 'Total panen'}: ${records.length}`,
    `${isEn ? 'Total revenue' : 'Total penjualan'}: ${formatCurrencyPlain(totalRevenue)}`,
    `${isEn ? 'Total profit' : 'Total keuntungan'}: ${formatCurrencyPlain(totalProfit)}`,
  ].forEach((line) => {
    doc.text(line, 14, y);
    y += 6;
  });
  y += 4;

  doc.setFontSize(12);
  doc.text(isEn ? 'Harvest Records' : 'Catatan Panen', 14, y);
  y += 6;
  doc.setFontSize(8);
  const colX = [14, 55, 90, 120, 150, 175];
  const headers = isEn
    ? ['Plot', 'Commodity', 'Date', 'Yield', 'Revenue', 'Outcome']
    : ['Lahan', 'Komoditas', 'Tanggal', 'Hasil', 'Pendapatan', 'Status'];
  headers.forEach((h, i) => doc.text(h, colX[i], y));
  y += 4;
  doc.setLineWidth(0.1);
  doc.line(14, y, 195, y);
  y += 4;

  records.forEach((r) => {
    if (y > 270) {
      doc.addPage();
      y = 15;
    }
    const row = [
      truncate(getPlotName(landPlots, r.land_plot_id), 16),
      truncate(getCommodityLabel(r.commodity, lang), 12),
      r.season_end,
      r.yield_value != null ? `${r.yield_value}${r.yield_unit}` : '-',
      r.revenue != null ? formatCurrencyPlain(r.revenue) : '-',
      r.outcome,
    ];
    row.forEach((cell, i) => doc.text(String(cell), colX[i], y));
    y += 6;
  });

  y += 8;
  if (y > 240) {
    doc.addPage();
    y = 15;
  }

  doc.setFontSize(12);
  doc.text(isEn ? 'Production Chart (yield/ha)' : 'Grafik Produksi (hasil/ha)', 14, y);
  y += 8;
  const yieldSeries = records
    .map((r) => ({
      label: `${getCommodityLabel(r.commodity, lang)} ${r.season_end}`,
      value: yieldPerHa(r, landPlots),
    }))
    .filter((s): s is { label: string; value: number } => s.value != null);
  if (yieldSeries.length > 0) {
    y = drawBarChart(doc, yieldSeries, y);
  } else {
    doc.setFontSize(9);
    doc.text(isEn ? 'Not enough data' : 'Data belum cukup', 14, y);
    y += 6;
  }

  y += 8;
  if (y > 240) {
    doc.addPage();
    y = 15;
  }

  doc.setFontSize(12);
  doc.text(isEn ? 'Price Chart (avg. price)' : 'Grafik Harga (harga rata-rata)', 14, y);
  y += 8;
  const priceSeries = records
    .map((r) => ({
      label: `${getCommodityLabel(r.commodity, lang)} ${r.season_end}`,
      value: avgPrice(r),
    }))
    .filter((s): s is { label: string; value: number } => s.value != null);
  if (priceSeries.length > 0) {
    drawBarChart(doc, priceSeries, y);
  } else {
    doc.setFontSize(9);
    doc.text(isEn ? 'Not enough data' : 'Data belum cukup', 14, y);
  }

  doc.save('laporan-produksi.pdf');
}
