'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { getPermissions } from '@/lib/rbac';
import Logo from '@/components/brand/Logo';
import { Home, Wheat, ShoppingCart, Building2, MessageSquare, Handshake, CloudSun, FileSignature, FlaskConical, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useMemo, useState } from 'react';

const primaryNav = [
  { href: '/dashboard', icon: Home, labelKey: 'nav.dashboard' },
  { href: '/dashboard/farmer', icon: Wheat, labelKey: 'nav.farmer' },
  { href: '/dashboard/buyer', icon: ShoppingCart, labelKey: 'nav.buyer' },
  { href: '/dashboard/policy', icon: Building2, labelKey: 'nav.policy' },
  { href: '/dashboard/chat', icon: MessageSquare, labelKey: 'nav.chat' },
];

const secondaryNav = [
  { href: '/dashboard/matching', icon: Handshake, labelKey: 'nav.matching' },
  { href: '/dashboard/weather', icon: CloudSun, labelKey: 'nav.weather' },
  { href: '/dashboard/transactions', icon: FileSignature, labelKey: 'nav.transactions' },
  { href: '/dashboard/simulation', icon: FlaskConical, labelKey: 'nav.simulation' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useAuth();
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
    <aside
      className={clsx(
        'hidden md:flex flex-col bg-white border-r border-surface-200 transition-all duration-200 h-screen sticky top-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={clsx('flex items-center gap-3 p-4 border-b border-surface-200', collapsed && 'justify-center')}>
        <Logo
          variant={collapsed ? 'mark' : 'full'}
          className={collapsed ? 'h-9 w-9' : 'h-10 w-[160px]'}
          imageClassName={collapsed ? 'drop-shadow-sm' : undefined}
          priority
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredPrimaryNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-surface-100 hover:text-gray-900',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? t(item.labelKey) : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </Link>
          );
        })}

        {filteredSecondaryNav.length > 0 && (
          <div className={clsx('border-t border-surface-200 my-2', collapsed && 'mx-1')} />
        )}

        {filteredSecondaryNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-surface-100 hover:text-gray-900',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? t(item.labelKey) : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      {!collapsed && user && (
        <div className="p-4 border-t border-surface-200">
          <div className="text-sm font-medium text-gray-900">{user.username}</div>
          {role && <div className="text-xs text-surface-500">{t(`roles.${role}`)}</div>}
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center p-3 border-t border-surface-200 text-surface-400 hover:text-gray-700 transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
