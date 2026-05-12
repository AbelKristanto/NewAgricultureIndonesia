'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserRole } from '@/types/auth';
import { USER_ROLES } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import LanguageToggle from '@/components/shared/LanguageToggle';
import { Sprout } from 'lucide-react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('farmer');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { t, lang } = useLanguage();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(email, password, role);
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.message || t('login.error'));
    }
    setIsSubmitting(false);
  };

  const roleOptions = USER_ROLES.map((r) => ({
    value: r.value,
    label: lang === 'en' ? r.labelEn : r.labelId,
  }));

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24">
        <div className="absolute top-6 right-6 lg:right-auto lg:left-8 lg:top-8">
          <LanguageToggle />
        </div>

        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 bg-primary-700 rounded-xl flex items-center justify-center">
              <Sprout className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('app.name')}</h1>
              <p className="text-sm text-surface-500">{t('login.subtitle')}</p>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('login.title')}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              label={t('login.email')}
              type="email"
              placeholder={t('login.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="password"
              label={t('login.password')}
              type="password"
              placeholder={t('login.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Select
              id="role"
              label={t('login.role')}
              options={roleOptions}
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('common.loading') : t('login.submit')}
            </Button>
          </form>

          <p className="mt-6 text-xs text-surface-400 text-center">
            {t('login.demoHint')}
          </p>
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 400 400" fill="none">
            <circle cx="200" cy="200" r="150" stroke="white" strokeWidth="0.5" />
            <circle cx="200" cy="200" r="100" stroke="white" strokeWidth="0.5" />
            <circle cx="200" cy="200" r="50" stroke="white" strokeWidth="0.5" />
            <line x1="50" y1="200" x2="350" y2="200" stroke="white" strokeWidth="0.5" />
            <line x1="200" y1="50" x2="200" y2="350" stroke="white" strokeWidth="0.5" />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center p-16 text-center">
          <Sprout className="h-20 w-20 text-primary-300 mb-8" />
          <h2 className="text-3xl font-bold text-white mb-4">{t('app.name')}</h2>
          <p className="text-primary-200 text-lg max-w-sm">{t('app.tagline')}</p>
          <div className="mt-12 grid grid-cols-2 gap-4 text-left">
            {[
              { en: 'Crop Recommendations', id: 'Rekomendasi Tanaman' },
              { en: 'Demand Forecasting', id: 'Prakiraan Permintaan' },
              { en: 'Supply Matching', id: 'Pencocokan Pasokan' },
              { en: 'Weather Intelligence', id: 'Kecerdasan Cuaca' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-primary-200 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                {lang === 'en' ? item.en : item.id}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
