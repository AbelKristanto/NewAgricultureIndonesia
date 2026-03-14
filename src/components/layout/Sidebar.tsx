'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { Home, Wheat, ShoppingCart, Building2, MessageSquare, ChevronLeft, ChevronRight, Sprout } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', icon: Home, labelKey: 'nav.dashboard' },
  { href: '/dashboard/farmer', icon: Wheat, labelKey: 'nav.farmer' },
  { href: '/dashboard/buyer', icon: ShoppingCart, labelKey: 'nav.buyer' },
  { href: '/dashboard/policy', icon: Building2, labelKey: 'nav.policy' },
  { href: '/dashboard/chat', icon: MessageSquare, labelKey: 'nav.chat' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { role } = useRole();

  const roleLabelKey = `roles.${role}`;

  return (
    <aside
      className={clsx(
        'hidden md:flex flex-col bg-white border-r border-surface-200 transition-all duration-200 h-screen sticky top-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={clsx('flex items-center gap-3 p-4 border-b border-surface-200', collapsed && 'justify-center')}>
        <div className="h-9 w-9 bg-primary-700 rounded-lg flex items-center justify-center flex-shrink-0">
          <Sprout className="h-5 w-5 text-white" />
        </div>
        {!collapsed && <span className="font-bold text-gray-900 text-lg">Serenagri</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
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
      </nav>

      {/* User info */}
      {!collapsed && user && (
        <div className="p-4 border-t border-surface-200">
          <div className="text-sm font-medium text-gray-900">{user.username}</div>
          <div className="text-xs text-surface-500">{t(roleLabelKey)}</div>
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
