import { UserRole } from '@/types/auth';

export type { UserRole };

export interface RolePermissions {
  homePage: string;
  pages: string[];
  apiRoutes: string[];
  metricCards: string[];
  quickActions: string[];
}

export const VALID_USER_ROLES: UserRole[] = [
  'farmer',
  'buyer',
  'supplier',
  'logistics',
  'finance',
  'government',
  'admin',
];

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  farmer: {
    homePage: '/dashboard/farmer',
    pages: ['/dashboard', '/dashboard/farmer', '/dashboard/chat', '/dashboard/weather', '/dashboard/matching', '/dashboard/farmer-operations', '/dashboard/land-plots', '/dashboard/monitoring', '/dashboard/production-history', '/dashboard/calendar', '/dashboard/financial', '/dashboard/activity', '/dashboard/transactions', '/dashboard/notifications', '/dashboard/profile', '/dashboard/settings', '/dashboard/help', '/dashboard/community', '/dashboard/contracts', '/dashboard/sustainability', '/dashboard/market-intelligence', '/dashboard/pest-alert', '/dashboard/plant-scan'],
    apiRoutes: ['/api/ai/farmer', '/api/ai/chat', '/api/ai/matching', '/api/ai/weather', '/api/ai/calendar', '/api/transactions', '/api/farmer-operations', '/api/listings', '/api/notifications', '/api/payments', '/api/land-plots', '/api/crop-monitoring', '/api/harvest-records', '/api/community', '/api/contracts', '/api/sustainability', '/api/ai/market-intelligence', '/api/ai/pest-alert', '/api/plant-scans', '/api/ai/daily-insight', '/api/ai/performance-analysis'],
    metricCards: ['farmerAnalyses', 'transactions', 'chatConversations', 'weatherAnalyses'],
    quickActions: ['/dashboard/farmer', '/dashboard/farmer-operations', '/dashboard/land-plots', '/dashboard/monitoring', '/dashboard/production-history', '/dashboard/calendar', '/dashboard/financial', '/dashboard/activity', '/dashboard/weather', '/dashboard/chat', '/dashboard/matching', '/dashboard/transactions'],
  },
  buyer: {
    homePage: '/dashboard/buyer',
    pages: ['/dashboard', '/dashboard/buyer', '/dashboard/chat', '/dashboard/matching', '/dashboard/transactions', '/dashboard/farmer-operations', '/dashboard/activity', '/dashboard/notifications', '/dashboard/profile', '/dashboard/settings', '/dashboard/help', '/dashboard/community', '/dashboard/warehouse', '/dashboard/contracts', '/dashboard/sustainability', '/dashboard/esg-report', '/dashboard/market-intelligence'],
    apiRoutes: ['/api/ai/buyer', '/api/ai/chat', '/api/ai/matching', '/api/transactions', '/api/listings', '/api/notifications', '/api/farmer-operations', '/api/payments', '/api/community', '/api/warehouses', '/api/contracts', '/api/sustainability', '/api/ai/esg-report', '/api/ai/market-intelligence'],
    metricCards: ['buyerAnalyses', 'transactions', 'matchingAnalyses', 'chatConversations'],
    quickActions: ['/dashboard/buyer', '/dashboard/matching', '/dashboard/chat', '/dashboard/transactions'],
  },
  government: {
    homePage: '/dashboard/policy',
    pages: ['/dashboard', '/dashboard/policy', '/dashboard/chat', '/dashboard/simulation', '/dashboard/activity', '/dashboard/notifications', '/dashboard/profile', '/dashboard/settings', '/dashboard/help', '/dashboard/sustainability', '/dashboard/esg-report', '/dashboard/market-intelligence', '/dashboard/pest-alert', '/dashboard/platform-overview', '/dashboard/institutional-financial'],
    apiRoutes: ['/api/ai/policy', '/api/ai/chat', '/api/admin/simulation', '/api/notifications', '/api/account', '/api/sustainability', '/api/ai/esg-report', '/api/ai/market-intelligence', '/api/ai/pest-alert', '/api/platform-overview', '/api/institutional-financials', '/api/ai/regional-analytics'],
    metricCards: ['policyAnalyses'],
    quickActions: ['/dashboard/policy', '/dashboard/simulation', '/dashboard/platform-overview', '/dashboard/chat'],
  },
  supplier: {
    homePage: '/dashboard/matching',
    pages: ['/dashboard', '/dashboard/matching', '/dashboard/transactions', '/dashboard/chat', '/dashboard/activity', '/dashboard/notifications', '/dashboard/profile', '/dashboard/settings', '/dashboard/help', '/dashboard/community', '/dashboard/warehouse', '/dashboard/market-intelligence'],
    apiRoutes: ['/api/ai/chat', '/api/ai/matching', '/api/transactions', '/api/listings', '/api/notifications', '/api/community', '/api/warehouses', '/api/ai/market-intelligence'],
    metricCards: ['matchingAnalyses', 'transactions', 'chatConversations'],
    quickActions: ['/dashboard/matching', '/dashboard/transactions', '/dashboard/chat', '/dashboard/warehouse'],
  },
  logistics: {
    homePage: '/dashboard/transactions',
    pages: ['/dashboard', '/dashboard/transactions', '/dashboard/chat', '/dashboard/farmer-operations', '/dashboard/activity', '/dashboard/notifications', '/dashboard/profile', '/dashboard/settings', '/dashboard/help', '/dashboard/community', '/dashboard/warehouse'],
    apiRoutes: ['/api/ai/chat', '/api/transactions', '/api/listings', '/api/notifications', '/api/farmer-operations', '/api/community', '/api/warehouses'],
    metricCards: ['transactions', 'chatConversations'],
    quickActions: ['/dashboard/transactions', '/dashboard/farmer-operations', '/dashboard/warehouse', '/dashboard/chat'],
  },
  finance: {
    homePage: '/dashboard/policy',
    pages: ['/dashboard', '/dashboard/policy', '/dashboard/transactions', '/dashboard/chat', '/dashboard/farmer-operations', '/dashboard/activity', '/dashboard/notifications', '/dashboard/profile', '/dashboard/settings', '/dashboard/help', '/dashboard/sustainability', '/dashboard/esg-report', '/dashboard/institutional-financial', '/dashboard/market-intelligence'],
    apiRoutes: ['/api/ai/policy', '/api/ai/chat', '/api/transactions', '/api/listings', '/api/notifications', '/api/farmer-operations', '/api/account', '/api/sustainability', '/api/ai/esg-report', '/api/institutional-financials', '/api/ai/market-intelligence'],
    metricCards: ['policyAnalyses', 'transactions', 'chatConversations'],
    quickActions: ['/dashboard/policy', '/dashboard/transactions', '/dashboard/chat', '/dashboard/institutional-financial'],
  },
  admin: {
    homePage: '/admin',
    pages: ['/admin'],
    apiRoutes: ['/api/admin-panel', '/api/ai/esg-report', '/api/ai/market-intelligence', '/api/ai/regional-analytics', '/api/notifications'],
    metricCards: [],
    quickActions: [],
  },
};

export const DEFAULT_PERMISSIONS: RolePermissions = {
  homePage: '/dashboard',
  pages: ['/dashboard'],
  apiRoutes: [],
  metricCards: [],
  quickActions: [],
};

export function normalizeUserRole(role: unknown): UserRole | null {
  if (typeof role !== 'string') return null;
  return VALID_USER_ROLES.includes(role as UserRole) ? (role as UserRole) : null;
}

export function getPermissions(role: UserRole | null | undefined): RolePermissions {
  const normalizedRole = normalizeUserRole(role);
  if (!normalizedRole) return DEFAULT_PERMISSIONS;
  return ROLE_PERMISSIONS[normalizedRole];
}

export function isPagePermitted(role: UserRole | null | undefined, pathname: string): boolean {
  const perms = getPermissions(role);
  return perms.pages.some(p => {
    if (pathname === p) return true;
    // Only allow sub-path matching for pages deeper than /dashboard
    if (p !== '/dashboard' && pathname.startsWith(p + '/')) return true;
    return false;
  });
}

export function isApiRoutePermitted(role: UserRole | null | undefined, pathname: string): boolean {
  const perms = getPermissions(role);
  return perms.apiRoutes.some(prefix => pathname.startsWith(prefix));
}

export function getDefaultDashboardPage(role: UserRole | null | undefined): string {
  return getPermissions(role).homePage;
}
