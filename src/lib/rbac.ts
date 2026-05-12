import { UserRole } from '@/types/auth';

export type { UserRole };

export interface RolePermissions {
  pages: string[];
  apiRoutes: string[];
  metricCards: string[];
  quickActions: string[];
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  farmer: {
    pages: ['/dashboard', '/dashboard/farmer', '/dashboard/chat', '/dashboard/weather', '/dashboard/matching'],
    apiRoutes: ['/api/ai/farmer', '/api/ai/chat', '/api/ai/matching', '/api/ai/weather', '/api/transactions'],
    metricCards: ['farmerAnalyses', 'chatConversations', 'weatherAnalyses'],
    quickActions: ['/dashboard/farmer', '/dashboard/weather', '/dashboard/chat', '/dashboard/transactions'],
  },
  buyer: {
    pages: ['/dashboard', '/dashboard/buyer', '/dashboard/chat', '/dashboard/matching', '/dashboard/transactions', '/dashboard/weather'],
    apiRoutes: ['/api/ai/buyer', '/api/ai/chat', '/api/ai/matching', '/api/ai/weather', '/api/transactions'],
    metricCards: ['buyerAnalyses', 'transactions', 'matchingAnalyses', 'chatConversations'],
    quickActions: ['/dashboard/buyer', '/dashboard/matching', '/dashboard/chat', '/dashboard/transactions'],
  },
  government: {
    pages: ['/dashboard', '/dashboard/farmer', '/dashboard/buyer', '/dashboard/policy', '/dashboard/chat', '/dashboard/matching', '/dashboard/weather', '/dashboard/transactions', '/dashboard/simulation'],
    apiRoutes: ['/api/ai/farmer', '/api/ai/buyer', '/api/ai/policy', '/api/ai/chat', '/api/ai/matching', '/api/ai/weather', '/api/transactions', '/api/admin/simulation'],
    metricCards: ['policyAnalyses', 'farmerAnalyses', 'buyerAnalyses', 'transactions'],
    quickActions: ['/dashboard/policy', '/dashboard/farmer', '/dashboard/buyer', '/dashboard/chat'],
  },
  supplier: {
    pages: ['/dashboard', '/dashboard/matching', '/dashboard/transactions', '/dashboard/chat', '/dashboard/weather'],
    apiRoutes: ['/api/ai/chat', '/api/ai/matching', '/api/ai/weather', '/api/transactions'],
    metricCards: ['chatConversations', 'farmerAnalyses'],
    quickActions: ['/dashboard/farmer', '/dashboard/chat', '/dashboard/transactions'],
  },
  logistics: {
    pages: ['/dashboard', '/dashboard/matching', '/dashboard/transactions', '/dashboard/chat', '/dashboard/weather'],
    apiRoutes: ['/api/ai/chat', '/api/ai/matching', '/api/ai/weather', '/api/transactions'],
    metricCards: ['chatConversations', 'farmerAnalyses'],
    quickActions: ['/dashboard/chat', '/dashboard/transactions'],
  },
  finance: {
    pages: ['/dashboard', '/dashboard/policy', '/dashboard/transactions', '/dashboard/chat', '/dashboard/weather'],
    apiRoutes: ['/api/ai/policy', '/api/ai/chat', '/api/ai/matching', '/api/ai/weather', '/api/transactions'],
    metricCards: ['chatConversations', 'farmerAnalyses'],
    quickActions: ['/dashboard/buyer', '/dashboard/chat', '/dashboard/transactions'],
  },
};

export const DEFAULT_PERMISSIONS: RolePermissions = {
  pages: ['/dashboard'],
  apiRoutes: ['/api/ai/chat', '/api/ai/weather'],
  metricCards: ['chatConversations'],
  quickActions: ['/dashboard/chat', '/dashboard/weather'],
};

export function getPermissions(role: UserRole | null | undefined): RolePermissions {
  if (!role || !(role in ROLE_PERMISSIONS)) return DEFAULT_PERMISSIONS;
  return ROLE_PERMISSIONS[role];
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
