'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { LandPlot } from '@/types/land-plots';
import { CropLogType, CropMonitoringLog } from '@/types/crop-monitoring';
import { Sprout, Droplets, FlaskConical, FileText, Circle, AlertTriangle } from 'lucide-react';

const LOG_TYPE_LABEL: Record<CropLogType, { en: string; id: string }> = {
  watering: { en: 'Watering', id: 'Penyiraman' },
  fertilizing: { en: 'Fertilizing', id: 'Pemupukan' },
  condition_note: { en: 'Condition note', id: 'Catatan kondisi' },
  other: { en: 'Other', id: 'Lainnya' },
};

const LOG_TYPE_ICON: Record<CropLogType, typeof Droplets> = {
  watering: Droplets,
  fertilizing: FlaskConical,
  condition_note: FileText,
  other: Circle,
};

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export default function MonitoringPage() {
  const { lang } = useLanguage();
  const isMounted = useRef(true);

  const [landPlots, setLandPlots] = useState<LandPlot[]>([]);
  const [loadingPlots, setLoadingPlots] = useState(true);
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);

  const [logs, setLogs] = useState<CropMonitoringLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState('');

  const [logType, setLogType] = useState<CropLogType>('watering');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    fetch('/api/land-plots')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted.current) return;
        if (data.success) {
          setLandPlots(data.data);
          if (data.data.length > 0) setSelectedPlotId(data.data[0].id);
        }
      })
      .finally(() => {
        if (isMounted.current) setLoadingPlots(false);
      });
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadLogs = (plotId: string) => {
    setLoadingLogs(true);
    setError('');
    fetch(`/api/crop-monitoring?landPlotId=${plotId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted.current) return;
        if (data.success) {
          setLogs(data.data);
        } else {
          setError(data.error || (lang === 'en' ? 'Failed to load logs' : 'Gagal memuat log'));
        }
      })
      .catch(() => {
        if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
      })
      .finally(() => {
        if (isMounted.current) setLoadingLogs(false);
      });
  };

  useEffect(() => {
    if (selectedPlotId) loadLogs(selectedPlotId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlotId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlotId) return;
    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('landPlotId', selectedPlotId);
      formData.append('logType', logType);
      if (notes.trim()) formData.append('notes', notes.trim());
      if (photo) formData.append('file', photo);

      const res = await fetch('/api/crop-monitoring', { method: 'POST', body: formData });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setLogs((prev) => [data.data, ...prev]);
        setNotes('');
        setPhoto(null);
      } else {
        setError(data.error || (lang === 'en' ? 'Failed to add log' : 'Gagal menambah catatan'));
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  const selectedPlot = landPlots.find((p) => p.id === selectedPlotId) || null;

  const cropAgeDays = selectedPlot?.planting_date
    ? daysBetween(new Date(selectedPlot.planting_date), new Date())
    : null;

  const lastLoggedAt = logs[0]?.logged_at || selectedPlot?.planting_date || null;
  const daysSinceLastLog = lastLoggedAt ? daysBetween(new Date(lastLoggedAt), new Date()) : null;
  const showStaleReminder = daysSinceLastLog !== null && daysSinceLastLog >= 5;

  const daysUntilHarvest = selectedPlot?.harvest_estimate
    ? daysBetween(new Date(), new Date(selectedPlot.harvest_estimate))
    : null;
  const showHarvestReminder = daysUntilHarvest !== null && daysUntilHarvest >= 0 && daysUntilHarvest <= 7;

  const logTypeOptions = (Object.keys(LOG_TYPE_LABEL) as CropLogType[]).map((value) => ({
    value,
    label: LOG_TYPE_LABEL[value][lang === 'en' ? 'en' : 'id'],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Sprout className="h-6 w-6 text-primary-700" />
          {lang === 'en' ? 'Crop Monitoring' : 'Monitoring Tanaman'}
        </h1>
        <p className="mt-1 text-surface-500">
          {lang === 'en'
            ? 'Log watering, fertilizing, and condition updates for each land plot.'
            : 'Catat penyiraman, pemupukan, dan kondisi tanaman untuk setiap lahan.'}
        </p>
      </div>

      {loadingPlots ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : landPlots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-300 bg-white py-12 text-center text-surface-400">
          {lang === 'en'
            ? 'Register a land plot in Kelola Lahan first to start monitoring.'
            : 'Daftarkan lahan di Kelola Lahan dulu untuk mulai monitoring.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.4fr]">
          <div className="space-y-2">
            {landPlots.map((plot) => (
              <button
                key={plot.id}
                type="button"
                onClick={() => setSelectedPlotId(plot.id)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selectedPlotId === plot.id
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-surface-200 bg-white hover:border-primary-200'
                }`}
              >
                <p className="font-semibold text-gray-900">{plot.name}</p>
                <p className="mt-1 text-xs text-surface-500">{plot.province}{plot.district ? `, ${plot.district}` : ''}</p>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            {selectedPlot && (
              <div className="rounded-xl border border-surface-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold text-gray-900">{selectedPlot.name}</h2>
                  {cropAgeDays !== null && (
                    <Badge variant="primary">
                      {lang === 'en' ? `${cropAgeDays} days old` : `Umur ${cropAgeDays} hari`}
                    </Badge>
                  )}
                </div>

                {showStaleReminder && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {lang === 'en'
                        ? `No update in ${daysSinceLastLog} days. Check on this plot's condition.`
                        : `Tanaman belum di-update selama ${daysSinceLastLog} hari. Yuk cek kondisi lahannya.`}
                    </span>
                  </div>
                )}
                {showHarvestReminder && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {lang === 'en'
                        ? `Estimated harvest in ${daysUntilHarvest} day(s).`
                        : `Estimasi panen dalam ${daysUntilHarvest} hari.`}
                    </span>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="rounded-xl border border-surface-200 bg-white p-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                  id="log-type"
                  label={lang === 'en' ? 'Activity type' : 'Jenis aktivitas'}
                  options={logTypeOptions}
                  value={logType}
                  onChange={(e) => setLogType(e.target.value as CropLogType)}
                />
                <Input
                  id="log-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  label={lang === 'en' ? 'Photo (optional)' : 'Foto (opsional)'}
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                />
              </div>
              <Textarea
                id="log-notes"
                label={lang === 'en' ? 'Notes (optional)' : 'Catatan (opsional)'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button type="submit" size="sm" disabled={submitting || !selectedPlotId}>
                {submitting ? <Spinner size="sm" /> : (lang === 'en' ? 'Add log' : 'Tambah catatan')}
              </Button>
            </form>

            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-900">{lang === 'en' ? 'Activity timeline' : 'Riwayat aktivitas'}</h3>
              {loadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner size="md" />
                </div>
              ) : logs.length === 0 ? (
                <p className="mt-3 text-sm text-surface-400">
                  {lang === 'en' ? 'No activity logged yet.' : 'Belum ada aktivitas yang dicatat.'}
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {logs.map((log) => {
                    const Icon = LOG_TYPE_ICON[log.log_type];
                    return (
                      <div key={log.id} className="flex gap-3 border-b border-surface-100 pb-3 last:border-0">
                        <div className="mt-0.5 rounded-lg bg-primary-50 p-1.5 text-primary-700">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">
                              {LOG_TYPE_LABEL[log.log_type][lang === 'en' ? 'en' : 'id']}
                            </p>
                            <p className="text-xs text-surface-400">{new Date(log.logged_at).toLocaleString()}</p>
                          </div>
                          {log.notes && <p className="mt-1 text-sm text-gray-700">{log.notes}</p>}
                          {log.photo_url && (
                            <a href={log.photo_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                              <img
                                src={log.photo_url}
                                alt={LOG_TYPE_LABEL[log.log_type][lang === 'en' ? 'en' : 'id']}
                                className="h-20 w-32 rounded object-cover"
                              />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
