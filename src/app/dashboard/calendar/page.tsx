'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { LandPlot } from '@/types/land-plots';
import { CalendarActivity, CalendarActivityType, CalendarAnalysis } from '@/types/calendar';
import { CalendarDays, Droplets, FlaskConical, Bug, Wheat, Truck, Circle, ChevronDown, ChevronUp, History } from 'lucide-react';

const ACTIVITY_ICON: Record<CalendarActivityType, typeof Droplets> = {
  watering: Droplets,
  fertilizing: FlaskConical,
  pesticide: Bug,
  harvest: Wheat,
  delivery: Truck,
  other: Circle,
};

const ACTIVITY_LABEL: Record<CalendarActivityType, { en: string; id: string }> = {
  watering: { en: 'Watering', id: 'Penyiraman' },
  fertilizing: { en: 'Fertilizing', id: 'Pemupukan' },
  pesticide: { en: 'Pesticide / pest check', id: 'Pestisida / cek hama' },
  harvest: { en: 'Harvest', id: 'Panen' },
  delivery: { en: 'Delivery', id: 'Pengiriman' },
  other: { en: 'Other', id: 'Lainnya' },
};

interface HistoryItem {
  id: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  created_at: string;
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export default function CalendarPage() {
  const { lang } = useLanguage();
  const isMounted = useRef(true);

  const [landPlots, setLandPlots] = useState<LandPlot[]>([]);
  const [loadingPlots, setLoadingPlots] = useState(true);
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<CalendarAnalysis | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const loadHistory = () => {
    fetch('/api/ai/calendar')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted.current) return;
        if (data.success) setHistory(data.data);
      });
  };

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
    loadHistory();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleGenerate = async () => {
    if (!selectedPlotId) return;
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/ai/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landPlotId: selectedPlotId, lang }),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setAnalysis(data.data);
        loadHistory();
      } else {
        setError(data.error || (lang === 'en' ? 'Failed to generate calendar' : 'Gagal membuat kalender'));
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setGenerating(false);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setAnalysis(item.result as unknown as CalendarAnalysis);
    const plotId = item.input.landPlotId as string | undefined;
    if (plotId) setSelectedPlotId(plotId);
  };

  const selectedPlot = landPlots.find((p) => p.id === selectedPlotId) || null;
  const sortedActivities: CalendarActivity[] = analysis?.activities
    ? [...analysis.activities].sort((a, b) => (a.suggestedDate > b.suggestedDate ? 1 : -1))
    : [];

  const getStatus = (dateStr: string): 'overdue' | 'soon' | 'normal' => {
    const days = daysBetween(new Date(), new Date(dateStr));
    if (days < 0) return 'overdue';
    if (days <= 3) return 'soon';
    return 'normal';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <CalendarDays className="h-6 w-6 text-primary-700" />
          {lang === 'en' ? 'AI Calendar' : 'Kalender AI'}
        </h1>
        <p className="mt-1 text-surface-500">
          {lang === 'en'
            ? 'Get an AI-generated activity schedule from planting to harvest for each land plot.'
            : 'Dapatkan jadwal aktivitas dari AI, dari tanam sampai panen, untuk setiap lahan.'}
        </p>
      </div>

      {loadingPlots ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : landPlots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-300 bg-white py-12 text-center text-surface-400">
          {lang === 'en'
            ? 'Register a land plot in Kelola Lahan first to generate a calendar.'
            : 'Daftarkan lahan di Kelola Lahan dulu untuk membuat kalender.'}
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
                <p className="mt-1 text-xs text-surface-500">
                  {plot.planting_date
                    ? (lang === 'en' ? `Planted ${plot.planting_date}` : `Tanam ${plot.planting_date}`)
                    : (lang === 'en' ? 'No planting date set' : 'Belum ada tanggal tanam')}
                </p>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-gray-900">{selectedPlot?.name}</p>
                <Button type="button" size="sm" disabled={generating || !selectedPlot?.planting_date} onClick={handleGenerate}>
                  {generating ? <Spinner size="sm" /> : (lang === 'en' ? 'Generate AI calendar' : 'Buat kalender AI')}
                </Button>
              </div>
              {!selectedPlot?.planting_date && (
                <p className="mt-2 text-xs text-orange-600">
                  {lang === 'en' ? 'Set a planting date for this plot in Kelola Lahan first.' : 'Atur tanggal tanam untuk lahan ini dulu di Kelola Lahan.'}
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="rounded-xl border border-surface-200 bg-white">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-surface-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {lang === 'en' ? 'History' : 'Riwayat'} ({history.length})
                  </span>
                </div>
                {showHistory ? <ChevronUp className="h-4 w-4 text-surface-400" /> : <ChevronDown className="h-4 w-4 text-surface-400" />}
              </button>
              {showHistory && (
                <div className="border-t border-surface-100 p-3 space-y-1 max-h-48 overflow-y-auto">
                  {history.length === 0 ? (
                    <p className="p-2 text-sm text-surface-400">{lang === 'en' ? 'No history yet.' : 'Belum ada riwayat.'}</p>
                  ) : (
                    history.map((item) => {
                      const plot = landPlots.find((p) => p.id === (item.input.landPlotId as string));
                      return (
                        <button
                          key={item.id}
                          onClick={() => loadHistoryItem(item)}
                          className="w-full rounded-lg p-2 text-left transition-colors hover:bg-surface-50"
                        >
                          <p className="truncate text-sm font-medium text-gray-800">{plot?.name || (item.input.commodity as string) || 'Kalender'}</p>
                          <p className="text-xs text-surface-400">{new Date(item.created_at).toLocaleDateString()}</p>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {analysis && (
              <div className="rounded-xl border border-surface-200 bg-white p-4">
                {analysis.summary && <p className="mb-3 text-sm text-gray-700">{analysis.summary}</p>}
                {analysis.rawText && !analysis.activities ? (
                  <p className="whitespace-pre-line text-sm text-gray-700">{analysis.rawText}</p>
                ) : (
                  <div className="space-y-3">
                    {sortedActivities.map((activity, i) => {
                      const Icon = ACTIVITY_ICON[activity.type];
                      const status = getStatus(activity.suggestedDate);
                      return (
                        <div key={i} className="flex gap-3 border-b border-surface-100 pb-3 last:border-0">
                          <div className={`mt-0.5 rounded-lg p-1.5 ${
                            status === 'overdue' ? 'bg-red-50 text-red-700' : status === 'soon' ? 'bg-orange-50 text-orange-700' : 'bg-primary-50 text-primary-700'
                          }`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium text-gray-900">
                                {activity.label || ACTIVITY_LABEL[activity.type][lang === 'en' ? 'en' : 'id']}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-surface-500">{activity.suggestedDate}</span>
                                {status === 'overdue' && (
                                  <Badge variant="danger">{lang === 'en' ? 'Overdue' : 'Terlambat'}</Badge>
                                )}
                                {status === 'soon' && (
                                  <Badge variant="warning">{lang === 'en' ? 'Due soon' : 'Segera'}</Badge>
                                )}
                              </div>
                            </div>
                            {activity.notes && <p className="mt-1 text-sm text-gray-600">{activity.notes}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
