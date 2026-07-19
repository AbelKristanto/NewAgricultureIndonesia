'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { User as UserIcon, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react';

const STATUS_BADGE: Record<string, { en: string; id: string; className: string }> = {
  approved: { en: 'Approved', id: 'Disetujui', className: 'bg-green-50 text-green-700 border-green-200' },
  pending: { en: 'Pending review', id: 'Menunggu verifikasi', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  rejected: { en: 'Rejected', id: 'Ditolak', className: 'bg-red-50 text-red-700 border-red-200' },
  deactivated: { en: 'Deactivated', id: 'Dinonaktifkan', className: 'bg-surface-100 text-surface-600 border-surface-200' },
};

export default function ProfilePage() {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const { role } = useRole();
  const supabaseRef = useRef(createClient());
  const isMounted = useRef(true);

  const needsInstitution = role === 'finance' || role === 'government';

  const [username, setUsername] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    isMounted.current = true;
    if (user) {
      setUsername(user.username);
      setInstitutionName(user.institutionName || '');
      setLoading(false);
    }
    return () => {
      isMounted.current = false;
    };
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updates: Record<string, string | null> = { username: username.trim() };
      if (needsInstitution) updates.institution_name = institutionName.trim() || null;

      const { error: updateError } = await supabaseRef.current
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;
      if (!isMounted.current) return;
      setSuccess(lang === 'en' ? 'Profile updated.' : 'Profil berhasil diperbarui.');
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Failed to update profile.' : 'Gagal memperbarui profil.');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const statusBadge = STATUS_BADGE[user.status] || STATUS_BADGE.approved;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <UserIcon className="h-6 w-6 text-primary-700" />
          {lang === 'en' ? 'User Profile' : 'Profil User'}
        </h1>
        <p className="mt-1 text-surface-500">
          {lang === 'en' ? 'Your account details and identity on Serenagri AI.' : 'Detail akun dan identitas Anda di Serenagri AI.'}
        </p>
      </div>

      <div className="rounded-xl border border-surface-200 bg-white p-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium text-surface-400">
              <Mail className="h-3.5 w-3.5" />
              {lang === 'en' ? 'Email' : 'Email'}
            </dt>
            <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium text-surface-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              {lang === 'en' ? 'Role' : 'Peran'}
            </dt>
            <dd className="mt-1 text-sm text-gray-900">{t(`roles.${user.role}`)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium text-surface-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {lang === 'en' ? 'Account status' : 'Status akun'}
            </dt>
            <dd className="mt-1">
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge.className}`}>
                {lang === 'en' ? statusBadge.en : statusBadge.id}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">
          {lang === 'en' ? 'Edit profile' : 'Ubah profil'}
        </h2>

        <Input
          label={lang === 'en' ? 'Username' : 'Nama pengguna'}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        {needsInstitution && (
          <Input
            label={lang === 'en' ? 'Institution name' : 'Nama institusi'}
            value={institutionName}
            onChange={(e) => setInstitutionName(e.target.value)}
          />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        <Button type="submit" disabled={saving}>
          {saving ? <Spinner size="sm" /> : lang === 'en' ? 'Save changes' : 'Simpan perubahan'}
        </Button>
      </form>
    </div>
  );
}
