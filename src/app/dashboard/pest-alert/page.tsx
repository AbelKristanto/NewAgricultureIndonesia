'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRole } from '@/contexts/RoleContext';
import { COMMODITIES, INDONESIAN_PROVINCES } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Spinner from '@/components/ui/Spinner';
import { LandPlot } from '@/types/land-plots';
import { ShieldAlert, AlertTriangle, Sparkles } from 'lucide-react';

interface PestAlertResult {
  riskLevel?: 'low' | 'moderate' | 'high';
  likelyPestsOrDiseases?: string[];
  preventiveActions?: string[];
  monitoringChecklist?: string[];
  rawText?: string;
}

const RISK_COLOR: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export default function PestAlertPage() {
  const { lang } = useLanguage();
  const { role } = useRole();
  const isMounted = useRef(true);
  const isFarmer = role === 'farmer';

  const [landPlots, setLandPlots] = useState<LandPlot[]>([]);

  const [commodity, setCommodity] = useState('');
  const [province, setProvince] = useState('');
  const [landPlotId, setLandPlotId] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PestAlertResult | null>(null);

  useEffect(() => {
    isMounted.current = true;
    if (isFarmer) {
      fetch('/api/land-plots')
        .then((res) => res.json())
        .then((data) => {
          if (isMounted.current && data.success) setLandPlots(data.data);
        })
        .catch(() => {});
    }
    return () => {
      isMounted.current = false;
    };
  }, [isFarmer]);

  const handlePlotSelect = (id: string) => {
    setLandPlotId(id);
    const plot = landPlots.find((p) => p.id === id);
    if (plot) {
      if (plot.commodity) setCommodity(plot.commodity);
      setProvince(plot.province);
    }
  };

  const handleGenerate = async () => {
    if (!commodity || !province) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/pest-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commodity,
          province,
          landPlotId: landPlotId || undefined,
          symptoms: symptoms || undefined,
          lang,
        }),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || (lang === 'en' ? 'Failed to generate assessment' : 'Gagal membuat penilaian'));
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const commodityOptions = COMMODITIES.map((c) => ({ value: c.value, label: lang === 'en' ? c.labelEn : c.labelId }));
  const provinceOptions = INDONESIAN_PROVINCES.map((p) => ({ value: p.value, label: lang === 'en' ? p.labelEn : p.labelId }));
  const landPlotOptions = [
    { value: '', label: lang === 'en' ? 'None (general assessment)' : 'Tidak ada (penilaian umum)' },
    ...landPlots.map((p) => ({ value: p.id, label: p.name })),
  ];

  const now = new Date();
  const autoAlerts = isFarmer
    ? landPlots
        .map((plot) => {
          const daysSincePlanting = plot.planting_date ? daysBetween(new Date(plot.planting_date), now) : null;
          const daysUntilHarvest = plot.harvest_estimate ? daysBetween(now, new Date(plot.harvest_estimate)) : null;
          const alerts: string[] = [];
          if (daysSincePlanting !== null && daysSincePlanting >= 5) {
            alerts.push(
              lang === 'en'
                ? `No recent monitoring log — ${daysSincePlanting} days since planting/last activity.`
                : `Belum ada catatan monitoring terbaru — ${daysSincePlanting} hari sejak tanam/aktivitas terakhir.`
            );
          }
          if (daysUntilHarvest !== null && daysUntilHarvest >= 0 && daysUntilHarvest <= 7) {
            alerts.push(
              lang === 'en'
                ? `Harvest window in ${daysUntilHarvest} day(s) — check crop condition closely.`
                : `Jendela panen dalam ${daysUntilHarvest} hari — periksa kondisi tanaman lebih cermat.`
            );
          }
          return { plot, alerts };
        })
        .filter((entry) => entry.alerts.length > 0)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <ShieldAlert className="h-6 w-6 text-primary-700" />
          {lang === 'en' ? 'Disease & Pest Alert' : 'Peringatan Hama & Penyakit'}
        </h1>
        <p className="mt-1 text-surface-500">
          {lang === 'en'
            ? 'Early warnings from your own data, plus AI-generated risk assessments.'
            : 'Peringatan dini dari data Anda sendiri, ditambah penilaian risiko yang dibuat AI.'}
        </p>
      </div>

      {isFarmer && autoAlerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">
            {lang === 'en' ? 'Automatic early warnings' : 'Peringatan Otomatis'}
          </h2>
          {autoAlerts.map(({ plot, alerts }) => (
            <div key={plot.id} className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium text-yellow-900">
                <AlertTriangle className="h-4 w-4" />
                {plot.name}
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-6 text-sm text-yellow-800">
                {alerts.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-surface-200 bg-white p-4 sm:grid-cols-2">
        {isFarmer && (
          <div className="sm:col-span-2">
            <Select
              label={lang === 'en' ? 'Land plot (optional)' : 'Lahan (opsional)'}
              options={landPlotOptions}
              value={landPlotId}
              onChange={(e) => handlePlotSelect(e.target.value)}
            />
          </div>
        )}
        <Select
          label={lang === 'en' ? 'Commodity' : 'Komoditas'}
          options={commodityOptions}
          placeholder={lang === 'en' ? 'Select' : 'Pilih'}
          value={commodity}
          onChange={(e) => setCommodity(e.target.value)}
        />
        <Select
          label={lang === 'en' ? 'Province' : 'Provinsi'}
          options={provinceOptions}
          placeholder={lang === 'en' ? 'Select' : 'Pilih'}
          value={province}
          onChange={(e) => setProvince(e.target.value)}
        />
        <div className="sm:col-span-2">
          <Textarea
            label={lang === 'en' ? 'Observed symptoms (optional)' : 'Gejala yang teramati (opsional)'}
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="button" onClick={handleGenerate} disabled={loading || !commodity || !province}>
            {loading ? <Spinner size="sm" /> : (
              <>
                <Sparkles className="mr-1 h-4 w-4" />
                {lang === 'en' ? 'Assess risk' : 'Nilai Risiko'}
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="space-y-3 rounded-xl border border-surface-200 bg-white p-5">
          {result.riskLevel && (
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${RISK_COLOR[result.riskLevel] || RISK_COLOR.moderate}`}>
              {lang === 'en' ? `Risk: ${result.riskLevel}` : `Risiko: ${result.riskLevel}`}
            </span>
          )}
          {result.likelyPestsOrDiseases && result.likelyPestsOrDiseases.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {lang === 'en' ? 'Likely pests / diseases' : 'Hama/penyakit yang mungkin terjadi'}
              </h3>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-gray-700">
                {result.likelyPestsOrDiseases.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {result.preventiveActions && result.preventiveActions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {lang === 'en' ? 'Preventive actions' : 'Tindakan pencegahan'}
              </h3>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-gray-700">
                {result.preventiveActions.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {result.monitoringChecklist && result.monitoringChecklist.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {lang === 'en' ? 'Monitoring checklist' : 'Daftar pemantauan'}
              </h3>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-gray-700">
                {result.monitoringChecklist.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {!result.riskLevel && result.rawText && (
            <p className="whitespace-pre-wrap text-sm text-gray-700">{result.rawText}</p>
          )}
        </div>
      )}
    </div>
  );
}
