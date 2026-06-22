'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { getPermissions } from '@/lib/rbac';
import { useDashboardData, DashboardMetrics } from '@/hooks/useDashboardData';
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
} from 'lucide-react';
import Link from 'next/link';

function timeAgo(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (lang === 'id') {
    if (mins < 60) return `${mins} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    return `${days} hari lalu`;
  }
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
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
    descriptionEn: 'Plan sourcing demand, supplier regions, capacity, delivery timelines, and supply risks.',
    descriptionId: 'Rencanakan kebutuhan sourcing, wilayah supplier, kapasitas, timeline kirim, dan risiko pasokan.',
  },
  '/dashboard/policy': {
    labelKey: 'nav.policy',
    icon: BarChart3,
    descriptionEn: 'Review production, supply-demand gaps, risk zones, recommendations, and priority actions.',
    descriptionId: 'Pantau produksi, gap supply-demand, zona risiko, rekomendasi, dan aksi prioritas.',
  },
  '/dashboard/matching': {
    labelKey: 'nav.matching',
    icon: Handshake,
    descriptionEn: 'Match commodity needs with supply regions, logistics feasibility, timeline, and price fit.',
    descriptionId: 'Cocokkan kebutuhan komoditas dengan wilayah pasokan, logistik, timeline, dan harga.',
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
    descriptionEn: 'Create, inspect, negotiate, and monitor role-based agricultural supply transactions.',
    descriptionId: 'Buat, cek, negosiasikan, dan pantau transaksi pasokan pertanian sesuai role.',
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
                        <span className="text-xs text-surface-400">{timeAgo(item.created_at, lang)}</span>
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
