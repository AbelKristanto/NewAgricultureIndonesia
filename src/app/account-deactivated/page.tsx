'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/shared/LanguageToggle';
import { Lock } from 'lucide-react';

export default function AccountDeactivatedPage() {
  const { logout } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center px-8">
      <div className="absolute top-6 right-6 lg:right-auto lg:left-8 lg:top-8">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
          <Lock className="h-6 w-6" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900">{t('accountDeactivated.title')}</h1>

        <p className="mt-3 text-sm text-surface-500">{t('accountDeactivated.body')}</p>

        <button
          type="button"
          onClick={() => logout()}
          className="mt-6 font-medium text-primary-700 hover:underline"
        >
          {t('accountDeactivated.logout')}
        </button>
      </div>
    </div>
  );
}
