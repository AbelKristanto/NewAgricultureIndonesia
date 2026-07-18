'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { USER_ROLES } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LanguageToggle from '@/components/shared/LanguageToggle';
import LoadingOverlay from '@/components/shared/LoadingOverlay';
import { UserRole } from '@/types/auth';
import { ROLE_ICONS } from '@/components/auth/role-icons';

export default function SignupForm() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [institutionName, setInstitutionName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const { signup } = useAuth();
  const { t, lang } = useLanguage();
  const needsInstitution = role === 'finance' || role === 'government';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!role) {
      setError(t('signup.errorRoleRequired'));
      return;
    }
    if (password.length < 8) {
      setError(t('signup.errorPasswordLength'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('signup.errorPasswordMismatch'));
      return;
    }
    if (needsInstitution && !institutionName.trim()) {
      setError(t('signup.errorInstitutionRequired'));
      return;
    }

    setIsSubmitting(true);
    const result = await signup(email, password, username, role, needsInstitution ? institutionName.trim() : undefined);
    setIsSubmitting(false);

    if (result.success) {
      setSubmittedEmail(email);
      return;
    }

    if (result.message === 'ALREADY_REGISTERED') {
      setError(t('signup.errorAlreadyRegistered'));
    } else {
      setError(result.message || t('common.error'));
    }
  };

  if (submittedEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center px-8">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('signup.checkEmailTitle')}</h1>
          <p className="mt-3 text-sm text-surface-500">
            {t('signup.checkEmailBody').replace('{email}', submittedEmail)}
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block font-medium text-primary-700 hover:underline"
          >
            {t('signup.backToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24">
        <div className="absolute top-6 right-6 lg:right-auto lg:left-8 lg:top-8">
          <LanguageToggle />
        </div>

        <div className="w-full max-w-md mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('app.name')}</h1>
            <p className="mt-3 text-sm text-surface-500">{t('signup.subtitle')}</p>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('signup.title')}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="username"
              label={t('signup.username')}
              type="text"
              placeholder={t('signup.usernamePlaceholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <Input
              id="email"
              label={t('signup.email')}
              type="email"
              placeholder={t('signup.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="password"
              label={t('signup.password')}
              type="password"
              placeholder={t('signup.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              id="confirmPassword"
              label={t('signup.confirmPassword')}
              type="password"
              placeholder={t('signup.confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="rounded-lg border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                {t('signup.role')}
              </p>
              <p className="mt-1 font-medium">{t('signup.roleHint')}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {USER_ROLES.map((r) => {
                  const Icon = ROLE_ICONS[r.value];
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      disabled={isSubmitting}
                      className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-medium transition-all ${
                        role === r.value
                          ? 'border-primary-700 bg-primary-700 text-white shadow-sm'
                          : 'border-primary-100 bg-white text-primary-700 hover:border-primary-300 hover:bg-primary-100'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {lang === 'en' ? r.labelEn : r.labelId}
                    </button>
                  );
                })}
              </div>
            </div>

            {needsInstitution && (
              <Input
                id="institutionName"
                label={t('signup.institutionName')}
                type="text"
                placeholder={t('signup.institutionNamePlaceholder')}
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                required
              />
            )}

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
              loadingLabel={lang === 'en' ? 'Creating account...' : 'Membuat akun...'}
            >
              {t('signup.submit')}
            </Button>

            <p className="text-center text-sm text-surface-500">
              {t('signup.haveAccount')}{' '}
              <Link href="/login" className="font-medium text-primary-700 hover:underline">
                {t('signup.loginLink')}
              </Link>
            </p>
          </form>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-primary-950 relative overflow-hidden">
        <div className="relative z-10 flex w-full flex-col justify-center overflow-y-auto p-12">
          <h2 className="text-4xl font-bold tracking-tight text-white">{t('app.name')}</h2>
          <p className="mt-3 text-primary-200 text-lg max-w-xl">{t('app.tagline')}</p>
        </div>
      </div>

      {isSubmitting && (
        <LoadingOverlay
          title={lang === 'en' ? 'Creating your account...' : 'Membuat akun Anda...'}
          description={lang === 'en' ? 'Setting up your Serenagri AI profile.' : 'Menyiapkan profil Serenagri AI Anda.'}
        />
      )}
    </div>
  );
}
