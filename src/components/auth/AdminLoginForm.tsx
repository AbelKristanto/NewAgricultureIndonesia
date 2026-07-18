'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LanguageToggle from '@/components/shared/LanguageToggle';
import LoadingOverlay from '@/components/shared/LoadingOverlay';

export default function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { t, lang } = useLanguage();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(email, password);
    if (!result.success) {
      setError(result.message || t('login.error'));
      setIsSubmitting(false);
      return;
    }

    if (result.redirectTo !== '/admin') {
      setError(lang === 'en' ? 'This login is for administrators only.' : 'Login ini khusus untuk administrator.');
      setIsSubmitting(false);
      return;
    }

    router.push('/admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-6">
      <div className="absolute top-6 right-6">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="rounded-full bg-gray-900 p-3">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            {lang === 'en' ? 'Admin Panel' : 'Panel Admin'}
          </h1>
          <p className="mt-2 text-sm text-surface-500">
            {lang === 'en' ? 'Sign in with an administrator account.' : 'Masuk dengan akun administrator.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-surface-200 bg-white p-6">
          <Input
            id="admin-email"
            label={t('login.email')}
            type="email"
            placeholder={t('login.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="admin-password"
            label={t('login.password')}
            type="password"
            placeholder={t('login.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={isSubmitting}
            loadingLabel={lang === 'en' ? 'Signing in...' : 'Sedang masuk...'}
          >
            {t('login.submit')}
          </Button>
        </form>
      </div>

      {isSubmitting && (
        <LoadingOverlay
          title={lang === 'en' ? 'Signing you in...' : 'Sedang masuk...'}
          description={lang === 'en' ? 'Checking administrator access.' : 'Memeriksa akses administrator.'}
        />
      )}
    </div>
  );
}
