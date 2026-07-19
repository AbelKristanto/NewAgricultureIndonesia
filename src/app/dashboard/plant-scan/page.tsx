'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { LandPlot } from '@/types/land-plots';
import { PlantScan, PlantScanResult } from '@/types/plant-scan';
import { formatTimeAgo } from '@/lib/time-format';
import { Camera, Sparkles } from 'lucide-react';

const SEVERITY_COLOR: Record<string, string> = {
  none: 'bg-green-100 text-green-800',
  mild: 'bg-yellow-100 text-yellow-800',
  moderate: 'bg-orange-100 text-orange-800',
  severe: 'bg-red-100 text-red-800',
};

function isStructuredResult(result: PlantScan['result']): result is PlantScanResult {
  return 'diagnosis' in result;
}

export default function PlantScanPage() {
  const { lang } = useLanguage();
  const isMounted = useRef(true);

  const [landPlots, setLandPlots] = useState<LandPlot[]>([]);
  const [landPlotId, setLandPlotId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PlantScan | null>(null);

  const [history, setHistory] = useState<PlantScan[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/plant-scans');
      const data = await res.json();
      if (isMounted.current && data.success) setHistory(data.data);
    } catch {
      // Non-critical
    } finally {
      if (isMounted.current) setLoadingHistory(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetch('/api/land-plots')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted.current && data.success) setLandPlots(data.data);
      })
      .catch(() => {});
    loadHistory();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (landPlotId) formData.append('landPlotId', landPlotId);
      formData.append('lang', lang);

      const res = await fetch('/api/plant-scans', { method: 'POST', body: formData });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setResult(data.data);
        setFile(null);
        setPreviewUrl(null);
        await loadHistory();
      } else {
        setError(data.error || (lang === 'en' ? 'Failed to analyze photo' : 'Gagal menganalisis foto'));
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  const landPlotOptions = [
    { value: '', label: lang === 'en' ? 'None' : 'Tidak ada' },
    ...landPlots.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Camera className="h-6 w-6 text-primary-700" />
          {lang === 'en' ? 'Scan Plant with Camera' : 'Scan Tanaman dengan Kamera'}
        </h1>
        <p className="mt-1 text-surface-500">
          {lang === 'en'
            ? 'Take or upload a photo of your plant for an AI health diagnosis.'
            : 'Ambil atau unggah foto tanaman Anda untuk diagnosis kesehatan dari AI.'}
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-surface-200 bg-white p-4">
        <Select
          label={lang === 'en' ? 'Land plot (optional)' : 'Lahan (opsional)'}
          options={landPlotOptions}
          value={landPlotId}
          onChange={(e) => setLandPlotId(e.target.value)}
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {lang === 'en' ? 'Photo' : 'Foto'}
          </label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
          />
        </div>

        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="preview" className="h-48 w-48 rounded-lg object-cover" />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="button" onClick={handleSubmit} disabled={submitting || !file}>
          {submitting ? <Spinner size="sm" /> : (
            <>
              <Sparkles className="mr-1 h-4 w-4" />
              {lang === 'en' ? 'Analyze photo' : 'Analisis Foto'}
            </>
          )}
        </Button>
      </div>

      {result && isStructuredResult(result.result) && (
        <div className="space-y-2 rounded-xl border border-surface-200 bg-white p-5">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_COLOR[result.result.severity] || SEVERITY_COLOR.mild}`}>
            {lang === 'en' ? `Severity: ${result.result.severity}` : `Keparahan: ${result.result.severity}`}
          </span>
          <p className="text-sm text-gray-700">{result.result.diagnosis}</p>
          {result.result.recommendedActions.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-gray-700">
              {result.result.recommendedActions.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">
          {lang === 'en' ? 'Scan history' : 'Riwayat Scan'}
        </h2>
        {loadingHistory ? (
          <Spinner size="sm" />
        ) : history.length === 0 ? (
          <p className="text-sm text-surface-400">{lang === 'en' ? 'No scans yet.' : 'Belum ada scan.'}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {history.map((scan) => (
              <div key={scan.id} className="rounded-xl border border-surface-200 bg-white p-2">
                {scan.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={scan.photo_url} alt="scan" className="h-24 w-full rounded-lg object-cover" />
                )}
                <p className="mt-1 truncate text-xs text-gray-700">
                  {isStructuredResult(scan.result) ? scan.result.diagnosis : scan.result.rawText}
                </p>
                <p className="text-[10px] text-surface-400">{formatTimeAgo(scan.created_at, lang)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
