'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Wheat, ShoppingCart, Package, Truck, Landmark, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { USER_ROLES } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LanguageToggle from '@/components/shared/LanguageToggle';
import { UserRole } from '@/types/auth';

const ROLE_ICONS: Record<UserRole, LucideIcon> = {
  farmer: Wheat,
  buyer: ShoppingCart,
  supplier: Package,
  logistics: Truck,
  finance: Landmark,
  government: Building2,
};

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const { login } = useAuth();
  const { t, lang } = useLanguage();
  const router = useRouter();

  const applyDemoRole = (role: UserRole) => {
    setSelectedRole(role);
    setEmail(`${role}@serenagri.com`);
    setPassword(`${role}123`);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    setIsSubmitting(true);

    const result = await login(email, password);
    if (result.success) {
      router.push(result.redirectTo || '/dashboard');
    } else {
      setError(result.message || t('login.error'));
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24">
        <div className="absolute top-6 right-6 lg:right-auto lg:left-8 lg:top-8">
          <LanguageToggle />
        </div>

        <div className="w-full max-w-md mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('app.name')}</h1>
            <p className="mt-3 text-sm text-surface-500">{t('login.subtitle')}</p>
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

            <div className="rounded-lg border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-900">
              <p className="font-medium">{t('login.roleHint')}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {USER_ROLES.map((role) => {
                  const Icon = ROLE_ICONS[role.value];

                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => applyDemoRole(role.value)}
                      className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-medium transition-all ${
                        selectedRole === role.value
                          ? 'border-primary-700 bg-primary-700 text-white shadow-sm'
                          : 'border-primary-100 bg-white text-primary-700 hover:border-primary-300 hover:bg-primary-100'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {lang === 'en' ? role.labelEn : role.labelId}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('common.loading') : t('login.submit')}
            </Button>
          </form>
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
          <h2 className="text-5xl font-bold tracking-tight text-white mb-4">{t('app.name')}</h2>
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
