'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Logo from '@/components/brand/Logo';
import LanguageToggle from '@/components/shared/LanguageToggle';
import { LogOut, User } from 'lucide-react';

export default function Topbar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-surface-200">
      <div className="flex items-center justify-between px-4 md:px-6 h-14">
        {/* Mobile logo */}
        <div className="md:hidden">
          <Logo className="h-8 w-[130px]" priority />
        </div>

        <div className="hidden md:block" />

        <div className="flex items-center gap-4">
          <LanguageToggle />

          {user && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-700" />
                </div>
                <span className="hidden sm:inline text-sm font-medium text-gray-700">{user.username}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-danger-600 hover:bg-red-50 rounded-lg transition-colors"
                title={t('common.logout')}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{t('common.logout')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
