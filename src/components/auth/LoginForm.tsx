'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  CloudSun,
  FileSignature,
  Handshake,
  Landmark,
  MessageSquare,
  ShoppingCart,
  Truck,
  Wheat,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { USER_ROLES } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LanguageToggle from '@/components/shared/LanguageToggle';
import LoadingOverlay from '@/components/shared/LoadingOverlay';
import { UserRole } from '@/types/auth';
import { ROLE_ICONS } from '@/components/auth/role-icons';

const CAPABILITIES: Array<{
  icon: LucideIcon;
  role: UserRole;
  titleEn: string;
  titleId: string;
  descriptionEn: string;
  descriptionId: string;
}> = [
  {
    icon: Wheat,
    role: 'farmer',
    titleEn: 'Crop Recommendation',
    titleId: 'Rekomendasi Tanaman',
    descriptionEn: 'Use land, soil, water, budget, and timeline data to generate crop plans.',
    descriptionId: 'Pakai data lahan, tanah, air, budget, dan timeline untuk rencana tanam.',
  },
  {
    icon: ShoppingCart,
    role: 'buyer',
    titleEn: 'Buyer Sourcing Demand',
    titleId: 'Kebutuhan Sourcing Pembeli',
    descriptionEn: 'Model buyer demand, volume, delivery schedule, and supply risk.',
    descriptionId: 'Modelkan demand pembeli, volume, jadwal kirim, dan risiko pasokan.',
  },
  {
    icon: Handshake,
    role: 'buyer',
    titleEn: 'Farmer-Buyer Supply Matching',
    titleId: 'Matching Pasokan Petani-Pembeli',
    descriptionEn: 'Connect farmer supply with buyer demand, capacity, logistics, and price fit.',
    descriptionId: 'Hubungkan pasokan petani dengan kebutuhan pembeli, kapasitas, logistik, dan harga.',
  },
  {
    icon: CloudSun,
    role: 'farmer',
    titleEn: 'Weather Risk Analysis',
    titleId: 'Analisis Risiko Cuaca',
    descriptionEn: 'Estimate crop and delivery risks from weather scenarios.',
    descriptionId: 'Perkirakan risiko tanaman dan pengiriman dari skenario cuaca.',
  },
  {
    icon: FileSignature,
    role: 'buyer',
    titleEn: 'Buyer-Farmer Transactions',
    titleId: 'Transaksi Pembeli-Petani',
    descriptionEn: 'Create contract drafts and negotiate buyer-farmer supply agreements.',
    descriptionId: 'Buat draft kontrak dan negosiasikan kesepakatan pasokan pembeli-petani.',
  },
  {
    icon: BarChart3,
    role: 'government',
    titleEn: 'Policy Monitoring',
    titleId: 'Monitoring Kebijakan',
    descriptionEn: 'Review supply-demand gaps, risk zones, and priority policy actions.',
    descriptionId: 'Pantau gap pasokan-permintaan, zona risiko, dan aksi kebijakan prioritas.',
  },
  {
    icon: Landmark,
    role: 'finance',
    titleEn: 'Financing Assessment',
    titleId: 'Assessment Pembiayaan',
    descriptionEn: 'Connect farmer needs with financing institutions using production and risk signals.',
    descriptionId: 'Hubungkan kebutuhan petani dengan lembaga keuangan memakai sinyal produksi dan risiko.',
  },
  {
    icon: Truck,
    role: 'logistics',
    titleEn: 'Buyer-Logistics Planning',
    titleId: 'Perencanaan Pembeli-Logistik',
    descriptionEn: 'Connect buyer delivery needs with logistics providers for route and timing planning.',
    descriptionId: 'Hubungkan kebutuhan pengiriman pembeli dengan pihak logistik untuk rute dan jadwal.',
  },
  {
    icon: MessageSquare,
    role: 'farmer',
    titleEn: 'AI Advisory Chat',
    titleId: 'Chat Konsultasi AI',
    descriptionEn: 'Ask agriculture, market, weather, logistics, and policy questions.',
    descriptionId: 'Tanyakan pertanian, pasar, cuaca, logistik, dan kebijakan.',
  },
];

const CALLBACK_ERROR_MESSAGES: Record<string, { en: string; id: string }> = {
  confirmation_failed: {
    en: 'That confirmation link is invalid or has expired. Please sign up again to get a new one.',
    id: 'Link konfirmasi tidak valid atau sudah kedaluwarsa. Silakan daftar ulang untuk mendapatkan link baru.',
  },
};

export default function LoginForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const { login } = useAuth();
  const { t, lang } = useLanguage();
  const router = useRouter();

  const callbackErrorMessage = initialError
    ? CALLBACK_ERROR_MESSAGES[initialError]?.[lang === 'en' ? 'en' : 'id']
    : null;
  const displayedError = error || callbackErrorMessage;

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
      return;
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
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                {lang === 'en' ? 'Supported User Roles' : 'Role Pengguna yang Didukung'}
              </p>
              <p className="mt-1 font-medium">{t('login.roleHint')}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {USER_ROLES.map((role) => {
                  const Icon = ROLE_ICONS[role.value];

                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => applyDemoRole(role.value)}
                      disabled={isSubmitting}
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

            <div className="lg:hidden rounded-lg border border-surface-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-900">
                {lang === 'en' ? 'Platform Capabilities' : 'Kapabilitas Platform'}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {CAPABILITIES.slice(0, 4).map((capability) => {
                  const Icon = capability.icon;
                  return (
                    <button
                      key={capability.titleEn}
                      type="button"
                      onClick={() => applyDemoRole(capability.role)}
                      disabled={isSubmitting}
                      className="flex items-start gap-3 rounded-lg border border-surface-200 p-3 text-left hover:border-primary-300 hover:bg-primary-50"
                    >
                      <Icon className="mt-0.5 h-4 w-4 text-primary-700" />
                      <span>
                        <span className="block text-sm font-medium text-gray-900">
                          {lang === 'en' ? capability.titleEn : capability.titleId}
                        </span>
                        <span className="mt-1 block text-xs text-surface-500">
                          {lang === 'en' ? capability.descriptionEn : capability.descriptionId}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {displayedError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {displayedError}
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

            <p className="text-center text-sm text-surface-500">
              {t('login.noAccount')}{' '}
              <Link href="/signup" className="font-medium text-primary-700 hover:underline">
                {t('login.signupLink')}
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="hidden lg:flex flex-1 bg-primary-950 relative overflow-hidden">
        <div className="relative z-10 flex w-full flex-col justify-center overflow-y-auto p-12">
          <h2 className="text-4xl font-bold tracking-tight text-white">{t('app.name')}</h2>
          <p className="mt-3 text-primary-200 text-lg max-w-xl">{t('app.tagline')}</p>

          <div className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-primary-200">
                  {lang === 'en' ? 'Platform Capabilities' : 'Kapabilitas Platform'}
                </h3>
                <p className="mt-1 text-sm text-primary-300">
                  {lang === 'en'
                    ? 'Click a capability to autofill a demo account that can use it.'
                    : 'Klik capability untuk mengisi akun demo yang bisa memakai fitur itu.'}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {CAPABILITIES.map((capability) => {
                const Icon = capability.icon;
                return (
                  <button
                    key={capability.titleEn}
                    type="button"
                    onClick={() => applyDemoRole(capability.role)}
                    disabled={isSubmitting}
                    className="rounded-lg border border-white/10 bg-white/10 p-4 text-left text-white transition-colors hover:border-primary-300 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-primary-300"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary-200" />
                      <p className="text-sm font-semibold">{lang === 'en' ? capability.titleEn : capability.titleId}</p>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-primary-200">
                      {lang === 'en' ? capability.descriptionEn : capability.descriptionId}
                    </p>
                    <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-primary-300">
                      {lang === 'en' ? 'Use as' : 'Pakai sebagai'} {t(`roles.${capability.role}`)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {isSubmitting && (
        <LoadingOverlay
          title={lang === 'en' ? 'Signing you in...' : 'Sedang masuk...'}
          description={lang === 'en' ? 'Checking your account role and preparing your dashboard.' : 'Memeriksa role akun dan menyiapkan dashboard Anda.'}
        />
      )}
    </div>
  );
}
