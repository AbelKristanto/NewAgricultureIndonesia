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
    pages: ['/dashboard', '/dashboard/farmer', '/dashboard/chat', '/dashboard/weather', '/dashboard/matching', '/dashboard/farmer-operations'],
    apiRoutes: ['/api/ai/farmer', '/api/ai/chat', '/api/ai/matching', '/api/ai/weather', '/api/transactions', '/api/farmer-operations', '/api/listings', '/api/notifications', '/api/payments'],
    metricCards: ['farmerAnalyses', 'transactions', 'chatConversations', 'weatherAnalyses'],
    quickActions: ['/dashboard/farmer', '/dashboard/farmer-operations', '/dashboard/weather', '/dashboard/chat', '/dashboard/matching'],
  },
  buyer: {
    homePage: '/dashboard/buyer',
    pages: ['/dashboard', '/dashboard/buyer', '/dashboard/chat', '/dashboard/matching', '/dashboard/transactions', '/dashboard/weather'],
    apiRoutes: ['/api/ai/buyer', '/api/ai/chat', '/api/ai/matching', '/api/ai/weather', '/api/transactions', '/api/listings', '/api/notifications', '/api/farmer-operations', '/api/payments'],
    metricCards: ['buyerAnalyses', 'transactions', 'matchingAnalyses', 'chatConversations'],
    quickActions: ['/dashboard/buyer', '/dashboard/matching', '/dashboard/chat', '/dashboard/transactions'],
  },
  government: {
    homePage: '/dashboard/policy',
    pages: ['/dashboard', '/dashboard/farmer', '/dashboard/buyer', '/dashboard/policy', '/dashboard/chat', '/dashboard/matching', '/dashboard/weather', '/dashboard/transactions', '/dashboard/simulation'],
    apiRoutes: ['/api/ai/farmer', '/api/ai/buyer', '/api/ai/policy', '/api/ai/chat', '/api/ai/matching', '/api/ai/weather', '/api/transactions', '/api/admin/simulation', '/api/listings', '/api/notifications', '/api/account'],
    metricCards: ['policyAnalyses', 'farmerAnalyses', 'buyerAnalyses', 'transactions'],
    quickActions: ['/dashboard/policy', '/dashboard/farmer', '/dashboard/buyer', '/dashboard/chat'],
  },
  supplier: {
    homePage: '/dashboard/matching',
    pages: ['/dashboard', '/dashboard/matching', '/dashboard/transactions', '/dashboard/chat', '/dashboard/weather'],
    apiRoutes: ['/api/ai/chat', '/api/ai/matching', '/api/ai/weather', '/api/transactions', '/api/listings', '/api/notifications'],
    metricCards: ['matchingAnalyses', 'transactions', 'chatConversations'],
    quickActions: ['/dashboard/matching', '/dashboard/transactions', '/dashboard/chat', '/dashboard/weather'],
  },
  logistics: {
    homePage: '/dashboard/transactions',
    pages: ['/dashboard', '/dashboard/matching', '/dashboard/transactions', '/dashboard/chat', '/dashboard/weather'],
    apiRoutes: ['/api/ai/chat', '/api/ai/matching', '/api/ai/weather', '/api/transactions', '/api/listings', '/api/notifications', '/api/farmer-operations'],
    metricCards: ['transactions', 'matchingAnalyses', 'chatConversations'],
    quickActions: ['/dashboard/transactions', '/dashboard/matching', '/dashboard/chat', '/dashboard/weather'],
  },
  finance: {
    homePage: '/dashboard/policy',
    pages: ['/dashboard', '/dashboard/policy', '/dashboard/matching', '/dashboard/transactions', '/dashboard/chat', '/dashboard/weather'],
    apiRoutes: ['/api/ai/policy', '/api/ai/chat', '/api/ai/matching', '/api/ai/weather', '/api/transactions', '/api/listings', '/api/notifications', '/api/farmer-operations', '/api/account'],
    metricCards: ['policyAnalyses', 'transactions', 'chatConversations'],
    quickActions: ['/dashboard/policy', '/dashboard/transactions', '/dashboard/chat', '/dashboard/weather'],
  },
  admin: {
    homePage: '/admin',
    pages: ['/admin'],
    apiRoutes: ['/api/admin-panel'],
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
