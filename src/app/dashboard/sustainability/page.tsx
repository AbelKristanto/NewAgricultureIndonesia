'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRole } from '@/contexts/RoleContext';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import {
  CreateAssessmentInput,
  SustainabilityAssessment,
  SustainabilityAssessmentWithUsername,
} from '@/types/sustainability';
import { getSustainabilityTier } from '@/lib/sustainability-score';
import { formatTimeAgo } from '@/lib/time-format';
import { Leaf, Award } from 'lucide-react';

const EMPTY_FORM = {
  waterConservation: false,
  pesticideUsage: 'moderate' as CreateAssessmentInput['pesticideUsage'],
  organicCertified: false,
  cropRotation: false,
  wasteManagement: 'basic' as CreateAssessmentInput['wasteManagement'],
};

const TIER_BADGE: Record<string, { className: string; en: string; id: string }> = {
  gold: { className: 'bg-yellow-100 text-yellow-800', en: 'Gold', id: 'Emas' },
  silver: { className: 'bg-gray-200 text-gray-700', en: 'Silver', id: 'Perak' },
  bronze: { className: 'bg-orange-100 text-orange-800', en: 'Bronze', id: 'Perunggu' },
};

function TierBadge({ score, lang }: { score: number; lang: string }) {
  const tier = getSustainabilityTier(score);
  const badge = TIER_BADGE[tier];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
      <Award className="h-3 w-3" />
      {lang === 'en' ? badge.en : badge.id}
    </span>
  );
}

export default function SustainabilityPage() {
  const { lang } = useLanguage();
  const { role } = useRole();
  const isMounted = useRef(true);
  const isFarmer = role === 'farmer';

  const [ownHistory, setOwnHistory] = useState<SustainabilityAssessment[]>([]);
  const [leaderboard, setLeaderboard] = useState<SustainabilityAssessmentWithUsername[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      if (isFarmer) {
        const [ownRes, boardRes] = await Promise.all([
          fetch('/api/sustainability?mine=1'),
          fetch('/api/sustainability'),
        ]);
        const ownData = await ownRes.json();
        const boardData = await boardRes.json();
        if (!isMounted.current) return;
        if (ownData.success) setOwnHistory(ownData.data);
        if (boardData.success) setLeaderboard(boardData.data);
      } else {
        const res = await fetch('/api/sustainability');
        const data = await res.json();
        if (!isMounted.current) return;
        if (data.success) setLeaderboard(data.data);
      }
      setError('');
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    load();
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/sustainability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setForm(EMPTY_FORM);
        await load();
      } else {
        setFormError(data.error || (lang === 'en' ? 'Failed to save assessment' : 'Gagal menyimpan penilaian'));
      }
    } catch {
      if (isMounted.current) setFormError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const latestScore = ownHistory[0]?.score ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Leaf className="h-6 w-6 text-primary-700" />
          {lang === 'en' ? 'Sustainability Score' : 'Skor Keberlanjutan'}
        </h1>
        <p className="mt-1 text-surface-500">
          {isFarmer
            ? (lang === 'en' ? 'Self-assess your farming practices to build a transparent sustainability record.' : 'Nilai sendiri praktik pertanian Anda untuk membangun rekam jejak keberlanjutan yang transparan.')
            : (lang === 'en' ? 'Browse farmer sustainability scores based on self-reported practices.' : 'Jelajahi skor keberlanjutan petani berdasarkan praktik yang dilaporkan sendiri.')}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {isFarmer && (
        <>
          {latestScore !== null && (
            <div className="flex items-center gap-4 rounded-xl border border-surface-200 bg-white p-5">
              <div>
                <p className="text-xs text-surface-500">{lang === 'en' ? 'Latest score' : 'Skor terbaru'}</p>
                <p className="text-3xl font-bold text-gray-900">{latestScore}</p>
              </div>
              <TierBadge score={latestScore} lang={lang} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-surface-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">
              {lang === 'en' ? 'New self-assessment' : 'Penilaian mandiri baru'}
            </h2>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.waterConservation}
                onChange={(e) => setForm({ ...form, waterConservation: e.target.checked })}
              />
              {lang === 'en' ? 'Practices water conservation' : 'Menerapkan konservasi air'}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.organicCertified}
                onChange={(e) => setForm({ ...form, organicCertified: e.target.checked })}
              />
              {lang === 'en' ? 'Organic certified' : 'Bersertifikat organik'}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.cropRotation}
                onChange={(e) => setForm({ ...form, cropRotation: e.target.checked })}
              />
              {lang === 'en' ? 'Practices crop rotation' : 'Menerapkan rotasi tanaman'}
            </label>

            <Select
              label={lang === 'en' ? 'Pesticide usage' : 'Penggunaan pestisida'}
              value={form.pesticideUsage}
              onChange={(e) => setForm({ ...form, pesticideUsage: e.target.value as CreateAssessmentInput['pesticideUsage'] })}
              options={[
                { value: 'none', label: lang === 'en' ? 'None' : 'Tidak ada' },
                { value: 'low', label: lang === 'en' ? 'Low' : 'Rendah' },
                { value: 'moderate', label: lang === 'en' ? 'Moderate' : 'Sedang' },
                { value: 'high', label: lang === 'en' ? 'High' : 'Tinggi' },
              ]}
            />
            <Select
              label={lang === 'en' ? 'Waste management' : 'Pengelolaan limbah'}
              value={form.wasteManagement}
              onChange={(e) => setForm({ ...form, wasteManagement: e.target.value as CreateAssessmentInput['wasteManagement'] })}
              options={[
                { value: 'none', label: lang === 'en' ? 'None' : 'Tidak ada' },
                { value: 'basic', label: lang === 'en' ? 'Basic' : 'Dasar' },
                { value: 'advanced', label: lang === 'en' ? 'Advanced' : 'Lanjutan' },
              ]}
            />

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <Button type="submit" disabled={saving}>
              {saving ? <Spinner size="sm" /> : lang === 'en' ? 'Submit assessment' : 'Kirim penilaian'}
            </Button>
          </form>

          {ownHistory.length > 0 && (
            <div className="rounded-xl border border-surface-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                {lang === 'en' ? 'Score history' : 'Riwayat skor'}
              </h2>
              <div className="space-y-2">
                {ownHistory.map((a) => (
                  <div key={a.id} className="flex items-center gap-3">
                    <span className="w-10 shrink-0 text-xs text-surface-500">{formatTimeAgo(a.created_at, lang)}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-100">
                      <div className="h-full rounded-full bg-primary-600" style={{ width: `${a.score}%` }} />
                    </div>
                    <span className="w-8 text-right text-xs font-medium text-gray-900">{a.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="rounded-xl border border-surface-200 bg-white">
        <div className="border-b border-surface-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            {lang === 'en' ? 'Farmer leaderboard' : 'Papan Peringkat Petani'}
          </h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : leaderboard.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-surface-400">
            {lang === 'en' ? 'No assessments yet.' : 'Belum ada penilaian.'}
          </p>
        ) : (
          <div className="divide-y divide-surface-100">
            {leaderboard.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{a.farmer_username || '-'}</p>
                  <p className="text-xs text-surface-400">{formatTimeAgo(a.created_at, lang)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="primary">{a.score}</Badge>
                  <TierBadge score={a.score} lang={lang} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
