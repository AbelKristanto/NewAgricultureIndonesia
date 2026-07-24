'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { getPermissions } from '@/lib/rbac';
import { useDashboardData, DashboardMetrics } from '@/hooks/useDashboardData';
import { formatTimeAgo } from '@/lib/time-format';
import Card from '@/components/ui/Card';
import {
  BarChart3,
  Wheat,
  ShoppingCart,
  MessageSquare,
  CloudSun,
  Handshake,
  FileSignature,
  FileText,
  RefreshCw,
  Route,
  CreditCard,
  MapPinned,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

interface DailyInsight {
  tip: string;
  focusArea: string;
  reasoning: string;
}

const FOCUS_AREA_LABEL: Record<string, { en: string; id: string }> = {
  irrigation: { en: 'Irrigation', id: 'Irigasi' },
  pest_prevention: { en: 'Pest prevention', id: 'Pencegahan hama' },
  harvest_timing: { en: 'Harvest timing', id: 'Waktu panen' },
  cost_management: { en: 'Cost management', id: 'Manajemen biaya' },
  market_timing: { en: 'Market timing', id: 'Waktu jual' },
  record_keeping: { en: 'Record keeping', id: 'Pencatatan' },
  general: { en: 'General', id: 'Umum' },
};

function DailyInsightCard() {
  const { lang } = useLanguage();
  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/ai/daily-insight')
      .then((r) => r.json())
      .then((json) => {
        if (!mounted) return;
        if (json.success) setInsight(json.data);
        else setError(true);
      })
      .catch(() => {
        if (mounted) setError(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (error) return null;

  const focusLabel = insight ? FOCUS_AREA_LABEL[insight.focusArea] : null;

  return (
    <div className="rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white p-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">
            {lang === 'en' ? "Today's Insight" : 'Insight Hari Ini'}
          </p>
          {loading ? (
            <div className="mt-2 space-y-1.5">
              <div className="h-3 w-3/4 bg-surface-200 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-surface-200 rounded animate-pulse" />
            </div>
          ) : insight ? (
            <>
              <p className="mt-1 text-sm text-gray-700 leading-5">{insight.tip}</p>
              {focusLabel && (
                <span className="mt-2 inline-block text-xs font-medium text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full">
                  {lang === 'en' ? focusLabel.en : focusLabel.id}
                </span>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Maps metric card keys to their translation keys, icons, and color classes */
const METRIC_CARD_CONFIG: Record<
  string,
  { labelKey: string; icon: typeof Wheat; color: string; href: string }
> = {
  farmerAnalyses: {
    labelKey: 'dashboard.metrics.farmerAnalyses',
    icon: Wheat,
    color: 'text-primary-600 bg-primary-50',
    href: '/dashboard/farmer',
  },
  buyerAnalyses: {
    labelKey: 'dashboard.metrics.buyerAnalyses',
    icon: ShoppingCart,
    color: 'text-secondary-600 bg-secondary-50',
    href: '/dashboard/buyer',
  },
  chatConversations: {
    labelKey: 'dashboard.metrics.chatConversations',
    icon: MessageSquare,
    color: 'text-green-600 bg-green-50',
    href: '/dashboard/chat',
  },
  weatherAnalyses: {
    labelKey: 'dashboard.metrics.weatherAnalyses',
    icon: CloudSun,
    color: 'text-sky-600 bg-sky-50',
    href: '/dashboard/weather',
  },
  matchingAnalyses: {
    labelKey: 'dashboard.metrics.matchingAnalyses',
    icon: Handshake,
    color: 'text-purple-600 bg-purple-50',
    href: '/dashboard/matching',
  },
  transactions: {
    labelKey: 'dashboard.metrics.transactions',
    icon: FileSignature,
    color: 'text-orange-600 bg-orange-50',
    href: '/dashboard/transactions',
  },
  policyAnalyses: {
    labelKey: 'dashboard.metrics.policyAnalyses',
    icon: FileText,
    color: 'text-blue-600 bg-blue-50',
    href: '/dashboard/policy',
  },
};

/** Maps quick action paths to their translation keys and icons */
const QUICK_ACTION_CONFIG: Record<
  string,
  { labelKey: string; icon: typeof Wheat }
> = {
  '/dashboard/farmer': { labelKey: 'dashboard.actions.analyzeMyLand', icon: Wheat },
  '/dashboard/buyer': { labelKey: 'dashboard.actions.findSuppliers', icon: ShoppingCart },
  '/dashboard/policy': { labelKey: 'dashboard.actions.policyInsights', icon: BarChart3 },
  '/dashboard/chat': { labelKey: 'dashboard.actions.chatWithAI', icon: MessageSquare },
  '/dashboard/matching': { labelKey: 'dashboard.actions.supplyMatching', icon: Handshake },
  '/dashboard/weather': { labelKey: 'dashboard.actions.weatherIntelligence', icon: CloudSun },
  '/dashboard/transactions': { labelKey: 'dashboard.actions.transactions', icon: FileSignature },
  '/dashboard/farmer-operations': { labelKey: 'dashboard.actions.farmerOperations', icon: Route },
};

const DASHBOARD_CAPABILITY_CONFIG: Record<
  string,
  { labelKey: string; icon: typeof Wheat; descriptionEn: string; descriptionId: string }
> = {
  '/dashboard/farmer': {
    labelKey: 'nav.farmer',
    icon: Wheat,
    descriptionEn: 'Analyze land conditions, crop fit, yield, costs, input needs, and buyer opportunities.',
    descriptionId: 'Analisis kondisi lahan, kecocokan tanaman, hasil, biaya, kebutuhan input, dan peluang pembeli.',
  },
  '/dashboard/buyer': {
    labelKey: 'nav.buyer',
    icon: ShoppingCart,
    descriptionEn: 'Define buyer demand so it can be connected to farmer supply and delivery planning.',
    descriptionId: 'Definisikan kebutuhan pembeli agar bisa dihubungkan ke pasokan petani dan rencana kirim.',
  },
  '/dashboard/policy': {
    labelKey: 'nav.policy',
    icon: BarChart3,
    descriptionEn: 'For finance roles, connect farmer needs with financing institutions; for government, monitor policy risk.',
    descriptionId: 'Untuk finance, hubungkan kebutuhan petani dengan lembaga keuangan; untuk pemerintah, pantau risiko kebijakan.',
  },
  '/dashboard/matching': {
    labelKey: 'nav.matching',
    icon: Handshake,
    descriptionEn: 'Connect farmer supply with buyer demand, including capacity, logistics, timeline, and price fit.',
    descriptionId: 'Hubungkan pasokan petani dengan kebutuhan pembeli, termasuk kapasitas, logistik, timeline, dan harga.',
  },
  '/dashboard/farmer-operations': {
    labelKey: 'nav.farmerOperations',
    icon: Route,
    descriptionEn: 'Track financing access, logistics pickup, active contracts, goods, payment, and delivery map.',
    descriptionId: 'Pantau akses pembiayaan, pickup logistik, kontrak aktif, barang, pembayaran, dan peta delivery.',
  },
  '/dashboard/weather': {
    labelKey: 'nav.weather',
    icon: CloudSun,
    descriptionEn: 'Estimate crop, delivery, irrigation, schedule, and mitigation risks from weather scenarios.',
    descriptionId: 'Perkirakan risiko tanaman, pengiriman, irigasi, jadwal, dan mitigasi dari skenario cuaca.',
  },
  '/dashboard/transactions': {
    labelKey: 'nav.transactions',
    icon: FileSignature,
    descriptionEn: 'Coordinate buyer-farmer agreements and expose buyer delivery needs to logistics roles.',
    descriptionId: 'Koordinasikan kesepakatan pembeli-petani dan tampilkan kebutuhan kirim pembeli ke role logistik.',
  },
  '/dashboard/chat': {
    labelKey: 'nav.chat',
    icon: MessageSquare,
    descriptionEn: 'Ask the AI assistant about agriculture, markets, weather, logistics, finance, and policy.',
    descriptionId: 'Tanyakan ke AI tentang pertanian, pasar, cuaca, logistik, pembiayaan, dan kebijakan.',
  },
  '/dashboard/simulation': {
    labelKey: 'nav.simulation',
    icon: FileText,
    descriptionEn: 'Inspect demo datasets and cross-feature simulation results for platform testing.',
    descriptionId: 'Periksa dataset demo dan hasil simulasi lintas fitur untuk testing platform.',
  },
};

/** Skeleton placeholder for a metric card */
function MetricCardSkeleton() {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-surface-200 rounded animate-pulse" />
          <div className="h-8 w-16 bg-surface-200 rounded animate-pulse mt-2" />
        </div>
        <div className="h-10 w-10 bg-surface-200 rounded-lg animate-pulse" />
      </div>
    </Card>
  );
}

/** Skeleton placeholder for the activity list */
function ActivityListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-3 pb-4 border-b border-surface-100 last:border-0 last:pb-0">
          <div className="h-2 w-2 rounded-full bg-surface-200 mt-2 flex-shrink-0 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-surface-200 rounded animate-pulse" />
            <div className="h-3 w-1/3 bg-surface-200 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { role } = useRole();

  const { metrics, recentActivity, isLoading, error, retry } = useDashboardData(user?.id, role);

  const permissions = useMemo(() => getPermissions(role), [role]);

  // Build metric cards based on role permissions
  const metricCards = useMemo(() => {
    return permissions.metricCards
      .map((key) => {
        const config = METRIC_CARD_CONFIG[key];
        if (!config) return null;
        return {
          key,
          ...config,
          value: metrics[key as keyof DashboardMetrics] ?? 0,
        };
      })
      .filter(Boolean) as Array<{
      key: string;
      labelKey: string;
      icon: typeof Wheat;
      color: string;
      href: string;
      value: number;
    }>;
  }, [permissions.metricCards, metrics]);

  // Build quick actions based on role permissions
  const quickActions = useMemo(() => {
    return permissions.quickActions
      .map((path) => {
        const config = QUICK_ACTION_CONFIG[path];
        if (!config) return null;
        return { href: path, ...config };
      })
      .filter(Boolean) as Array<{
      href: string;
      labelKey: string;
      icon: typeof Wheat;
    }>;
  }, [permissions.quickActions]);

  const capabilityCards = useMemo(() => {
    return permissions.pages
      .filter((path) => path !== '/dashboard')
      .map((path) => {
        const config = DASHBOARD_CAPABILITY_CONFIG[path];
        if (!config) return null;
        return { href: path, ...config };
      })
      .filter(Boolean) as Array<{
      href: string;
      labelKey: string;
      icon: typeof Wheat;
      descriptionEn: string;
      descriptionId: string;
    }>;
  }, [permissions.pages]);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('dashboard.welcome')}, {user?.username || 'User'}
        </h1>
        <p className="text-surface-500 mt-1">{t('dashboard.overview')}</p>
      </div>

      {/* Platform Capabilities */}
      {capabilityCards.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {lang === 'en' ? 'Platform Capabilities' : 'Kapabilitas Platform'}
              </h2>
              <p className="text-sm text-surface-500">
                {lang === 'en'
                  ? `Available for your current role: ${role ? t(`roles.${role}`) : 'User'}`
                  : `Tersedia untuk role saat ini: ${role ? t(`roles.${role}`) : 'User'}`}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {capabilityCards.map((capability) => {
              const Icon = capability.icon;
              return (
                <Link
                  key={capability.href}
                  href={capability.href}
                  className="group rounded-xl border border-surface-200 bg-white p-4 shadow-sm transition-colors hover:border-primary-200 hover:bg-primary-50/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center group-hover:bg-primary-100">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{t(capability.labelKey)}</p>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-surface-500">
                    {lang === 'en' ? capability.descriptionEn : capability.descriptionId}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {role === 'farmer' && <DailyInsightCard />}

      {role === 'farmer' && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          {[
            {
              title: lang === 'en' ? 'Active contract deal' : 'Kontrak deal aktif',
              value: '3',
              description: lang === 'en' ? 'Draft, proposed, and accepted demo contracts.' : 'Kontrak demo draft, proposed, dan accepted.',
              icon: FileSignature,
            },
            {
              title: lang === 'en' ? 'Goods monitoring' : 'Pemantauan barang',
              value: '68%',
              description: lang === 'en' ? 'Harvest and quality check progress.' : 'Progress panen dan quality check.',
              icon: Wheat,
            },
            {
              title: lang === 'en' ? 'Payment monitoring' : 'Pemantauan pembayaran',
              value: '40%',
              description: lang === 'en' ? 'Down payment and settlement milestones.' : 'Milestone DP dan pelunasan.',
              icon: CreditCard,
            },
            {
              title: lang === 'en' ? 'Live delivery map' : 'Peta delivery real time',
              value: '2',
              description: lang === 'en' ? 'Active pickup and in-transit logistics plans.' : 'Rencana pickup dan pengiriman aktif.',
              icon: MapPinned,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href="/dashboard/farmer-operations"
                className="rounded-xl border border-primary-100 bg-primary-50/50 p-4 transition-colors hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    <p className="mt-2 text-2xl font-bold text-primary-800">{item.value}</p>
                  </div>
                  <div className="rounded-lg bg-white p-2 text-primary-700">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-surface-600">{item.description}</p>
              </Link>
            );
          })}
        </div>
      )}

      {/* Error state with retry */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button
            onClick={retry}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? permissions.metricCards.map((key) => <MetricCardSkeleton key={key} />)
          : metricCards.map((m) => {
              const Icon = m.icon;
              return (
                <Link
                  key={m.key}
                  href={m.href}
                  className="group block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  <Card className="h-full transition-colors group-hover:border-primary-200 group-hover:bg-primary-50/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-surface-500 uppercase tracking-wide">
                          {t(m.labelKey)}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">{m.value}</p>
                      </div>
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${m.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.quickActions')}</h2>
          <div className="space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary-50 transition-colors group"
                >
                  <div className="h-9 w-9 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                    <Icon className="h-4 w-4 text-primary-700" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700">
                    {t(action.labelKey)}
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.recentActivity')}</h2>
          {isLoading ? (
            <ActivityListSkeleton />
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-surface-400 py-4">{t('dashboard.noActivity')}</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((item, i) => {
                const content = (
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-surface-400">{formatTimeAgo(item.created_at, lang)}</span>
                        <span className="text-xs bg-surface-100 text-surface-500 px-2 py-0.5 rounded-full">{item.type}</span>
                      </div>
                    </div>
                  </div>
                );

                if (item.href) {
                  return (
                    <Link
                      key={`${item.href}-${i}`}
                      href={item.href}
                      className="block rounded-lg pb-4 border-b border-surface-100 last:border-0 last:pb-0 hover:bg-primary-50/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <div key={i} className="pb-4 border-b border-surface-100 last:border-0 last:pb-0">
                    {content}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
