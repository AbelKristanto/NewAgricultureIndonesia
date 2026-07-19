'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRole } from '@/contexts/RoleContext';
import { getPermissions } from '@/lib/rbac';
import Logo from '@/components/brand/Logo';
import { Home, Wheat, ShoppingCart, Building2, MessageSquare, Handshake, CloudSun, FileSignature, FlaskConical, Menu, X, Route, Map, Sprout, History, CalendarDays, Wallet, Clock, Bell, User, Settings, LifeBuoy, Users, Warehouse, ScrollText, Leaf, Globe2, TrendingUp, ShieldAlert, Camera, Globe } from 'lucide-react';
import clsx from 'clsx';

const primaryNav = [
  { href: '/dashboard', icon: Home, labelKey: 'nav.dashboard' },
  { href: '/dashboard/farmer', icon: Wheat, labelKey: 'nav.farmer' },
  { href: '/dashboard/buyer', icon: ShoppingCart, labelKey: 'nav.buyer' },
  { href: '/dashboard/policy', icon: Building2, labelKey: 'nav.policy' },
  { href: '/dashboard/chat', icon: MessageSquare, labelKey: 'nav.chat' },
];

const secondaryNav = [
  { href: '/dashboard/matching', icon: Handshake, labelKey: 'nav.matching' },
  { href: '/dashboard/farmer-operations', icon: Route, labelKey: 'nav.farmerOperations' },
  { href: '/dashboard/land-plots', icon: Map, labelKey: 'nav.landPlots' },
  { href: '/dashboard/monitoring', icon: Sprout, labelKey: 'nav.monitoring' },
  { href: '/dashboard/production-history', icon: History, labelKey: 'nav.productionHistory' },
  { href: '/dashboard/calendar', icon: CalendarDays, labelKey: 'nav.calendar' },
  { href: '/dashboard/financial', icon: Wallet, labelKey: 'nav.financial' },
  { href: '/dashboard/activity', icon: Clock, labelKey: 'nav.activity' },
  { href: '/dashboard/weather', icon: CloudSun, labelKey: 'nav.weather' },
  { href: '/dashboard/transactions', icon: FileSignature, labelKey: 'nav.transactions' },
  { href: '/dashboard/simulation', icon: FlaskConical, labelKey: 'nav.simulation' },
  { href: '/dashboard/community', icon: Users, labelKey: 'nav.community' },
  { href: '/dashboard/warehouse', icon: Warehouse, labelKey: 'nav.warehouse' },
  { href: '/dashboard/contracts', icon: ScrollText, labelKey: 'nav.contracts' },
  { href: '/dashboard/sustainability', icon: Leaf, labelKey: 'nav.sustainability' },
  { href: '/dashboard/esg-report', icon: Globe2, labelKey: 'nav.esgReport' },
  { href: '/dashboard/market-intelligence', icon: TrendingUp, labelKey: 'nav.marketIntelligence' },
  { href: '/dashboard/pest-alert', icon: ShieldAlert, labelKey: 'nav.pestAlert' },
  { href: '/dashboard/plant-scan', icon: Camera, labelKey: 'nav.plantScan' },
  { href: '/dashboard/platform-overview', icon: Globe, labelKey: 'nav.platformOverview' },
  { href: '/dashboard/notifications', icon: Bell, labelKey: 'nav.notifications' },
  { href: '/dashboard/profile', icon: User, labelKey: 'nav.profile' },
  { href: '/dashboard/settings', icon: Settings, labelKey: 'nav.settings' },
  { href: '/dashboard/help', icon: LifeBuoy, labelKey: 'nav.help' },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();
  const { role } = useRole();

  const permittedPages = useMemo(() => getPermissions(role).pages, [role]);

  const filteredPrimaryNav = useMemo(
    () => primaryNav.filter((item) => permittedPages.includes(item.href)),
    [permittedPages]
  );

  const filteredSecondaryNav = useMemo(
    () => secondaryNav.filter((item) => permittedPages.includes(item.href)),
    [permittedPages]
  );

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 h-12 w-12 bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center"
      >
        <Menu className="h-6 w-6" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white z-50 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-surface-200">
              <Logo className="h-10 w-[170px]" priority />
              <button onClick={() => setOpen(false)} className="text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-3 space-y-1">
              {filteredPrimaryNav.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-surface-100 hover:text-gray-900'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{t(item.labelKey)}</span>
                  </Link>
                );
              })}

              {filteredSecondaryNav.length > 0 && (
                <div className="border-t border-surface-200 my-2" />
              )}

              {filteredSecondaryNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-surface-100 hover:text-gray-900'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
