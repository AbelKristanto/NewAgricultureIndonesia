'use client';

import { useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { createClient } from '@/lib/supabase/client';
import LanguageToggle from '@/components/shared/LanguageToggle';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { Settings, Languages, KeyRound } from 'lucide-react';

export default function SettingsPage() {
  const { lang } = useLanguage();
  const supabaseRef = useRef(createClient());

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError(lang === 'en' ? 'Password must be at least 6 characters.' : 'Kata sandi minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(lang === 'en' ? 'Passwords do not match.' : 'Kata sandi tidak cocok.');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabaseRef.current.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setSuccess(lang === 'en' ? 'Password updated.' : 'Kata sandi berhasil diperbarui.');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setError(lang === 'en' ? 'Failed to update password.' : 'Gagal memperbarui kata sandi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Settings className="h-6 w-6 text-primary-700" />
          {lang === 'en' ? 'App Settings' : 'Pengaturan Aplikasi'}
        </h1>
        <p className="mt-1 text-surface-500">
          {lang === 'en' ? 'Manage your language and account security.' : 'Kelola bahasa dan keamanan akun Anda.'}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-surface-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-50 p-2 text-primary-700">
            <Languages className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{lang === 'en' ? 'Language' : 'Bahasa'}</p>
            <p className="text-xs text-surface-500">
              {lang === 'en' ? 'Choose the display language for the app.' : 'Pilih bahasa tampilan aplikasi.'}
            </p>
          </div>
        </div>
        <LanguageToggle />
      </div>

      <form onSubmit={handlePasswordChange} className="space-y-4 rounded-xl border border-surface-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-50 p-2 text-primary-700">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-900">{lang === 'en' ? 'Change password' : 'Ubah kata sandi'}</h2>
            <p className="text-xs text-surface-500">
              {lang === 'en' ? 'Use a strong password you don’t use elsewhere.' : 'Gunakan kata sandi kuat yang tidak dipakai di tempat lain.'}
            </p>
          </div>
        </div>

        <Input
          type="password"
          label={lang === 'en' ? 'New password' : 'Kata sandi baru'}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <Input
          type="password"
          label={lang === 'en' ? 'Confirm new password' : 'Konfirmasi kata sandi baru'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        <Button type="submit" disabled={saving}>
          {saving ? <Spinner size="sm" /> : lang === 'en' ? 'Update password' : 'Perbarui kata sandi'}
        </Button>
      </form>
    </div>
  );
}
