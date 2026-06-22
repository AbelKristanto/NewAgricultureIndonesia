import { describe, it, expect } from 'vitest';
import {
  ROLE_PERMISSIONS,
  DEFAULT_PERMISSIONS,
  getDefaultDashboardPage,
  getPermissions,
  isPagePermitted,
  isApiRoutePermitted,
  normalizeUserRole,
} from './rbac';
import { UserRole } from '@/types/auth';

describe('RBAC Permission Configuration', () => {
  const ALL_ROLES: UserRole[] = ['farmer', 'buyer', 'supplier', 'logistics', 'finance', 'government'];

  describe('RolePermissions interface coverage', () => {
    it('should have all 6 roles defined in ROLE_PERMISSIONS', () => {
      for (const role of ALL_ROLES) {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
      }
    });

    it('each role should have homePage, pages, apiRoutes, metricCards, quickActions', () => {
      for (const role of ALL_ROLES) {
        const perms = ROLE_PERMISSIONS[role];
        expect(typeof perms.homePage).toBe('string');
        expect(Array.isArray(perms.pages)).toBe(true);
        expect(Array.isArray(perms.apiRoutes)).toBe(true);
        expect(Array.isArray(perms.metricCards)).toBe(true);
        expect(Array.isArray(perms.quickActions)).toBe(true);
      }
    });
  });

  describe('farmer permissions', () => {
    it('should have correct home page', () => {
      expect(ROLE_PERMISSIONS.farmer.homePage).toBe('/dashboard/farmer');
    });

    it('should have correct pages', () => {
      expect(ROLE_PERMISSIONS.farmer.pages).toEqual([
        '/dashboard', '/dashboard/farmer', '/dashboard/chat', '/dashboard/weather', '/dashboard/matching',
      ]);
    });

    it('should have correct API routes', () => {
      expect(ROLE_PERMISSIONS.farmer.apiRoutes).toEqual([
        '/api/ai/farmer', '/api/ai/chat', '/api/ai/matching', '/api/ai/weather', '/api/transactions',
      ]);
    });

    it('should have correct metric cards', () => {
      expect(ROLE_PERMISSIONS.farmer.metricCards).toEqual(['farmerAnalyses', 'chatConversations', 'weatherAnalyses']);
    });

    it('should have correct quick actions', () => {
      expect(ROLE_PERMISSIONS.farmer.quickActions).toEqual([
        '/dashboard/farmer', '/dashboard/weather', '/dashboard/chat', '/dashboard/matching',
      ]);
    });
  });

  describe('buyer permissions', () => {
    it('should have correct home page', () => {
      expect(ROLE_PERMISSIONS.buyer.homePage).toBe('/dashboard/buyer');
    });

    it('should have correct pages', () => {
      expect(ROLE_PERMISSIONS.buyer.pages).toEqual([
        '/dashboard', '/dashboard/buyer', '/dashboard/chat', '/dashboard/matching', '/dashboard/transactions', '/dashboard/weather',
      ]);
    });

    it('should have correct API routes', () => {
      expect(ROLE_PERMISSIONS.buyer.apiRoutes).toEqual([
        '/api/ai/buyer', '/api/ai/chat', '/api/ai/matching', '/api/ai/weather', '/api/transactions',
      ]);
    });

    it('should have correct metric cards', () => {
      expect(ROLE_PERMISSIONS.buyer.metricCards).toEqual(['buyerAnalyses', 'transactions', 'matchingAnalyses', 'chatConversations']);
    });

    it('should have correct quick actions', () => {
      expect(ROLE_PERMISSIONS.buyer.quickActions).toEqual([
        '/dashboard/buyer', '/dashboard/matching', '/dashboard/chat', '/dashboard/transactions',
      ]);
    });
  });

  describe('government permissions', () => {
    it('should have correct home page', () => {
      expect(ROLE_PERMISSIONS.government.homePage).toBe('/dashboard/policy');
    });

    it('should have correct pages', () => {
      expect(ROLE_PERMISSIONS.government.pages).toEqual([
        '/dashboard', '/dashboard/farmer', '/dashboard/buyer', '/dashboard/policy', '/dashboard/chat', '/dashboard/matching', '/dashboard/weather', '/dashboard/transactions', '/dashboard/simulation',
      ]);
    });

    it('should have correct API routes', () => {
      expect(ROLE_PERMISSIONS.government.apiRoutes).toEqual([
        '/api/ai/farmer', '/api/ai/buyer', '/api/ai/policy', '/api/ai/chat', '/api/ai/matching', '/api/ai/weather', '/api/transactions', '/api/admin/simulation',
      ]);
    });

    it('should have correct metric cards', () => {
      expect(ROLE_PERMISSIONS.government.metricCards).toEqual(['policyAnalyses', 'farmerAnalyses', 'buyerAnalyses', 'transactions']);
    });

    it('should have correct quick actions', () => {
      expect(ROLE_PERMISSIONS.government.quickActions).toEqual([
        '/dashboard/policy', '/dashboard/farmer', '/dashboard/buyer', '/dashboard/chat',
      ]);
    });
  });

  describe('supplier permissions', () => {
    it('should have correct home page', () => {
      expect(ROLE_PERMISSIONS.supplier.homePage).toBe('/dashboard/matching');
    });

    it('should have correct pages', () => {
      expect(ROLE_PERMISSIONS.supplier.pages).toEqual([
        '/dashboard', '/dashboard/matching', '/dashboard/transactions', '/dashboard/chat', '/dashboard/weather',
      ]);
    });

    it('should have correct API routes', () => {
      expect(ROLE_PERMISSIONS.supplier.apiRoutes).toEqual([
        '/api/ai/chat', '/api/ai/matching', '/api/ai/weather', '/api/transactions',
      ]);
    });

    it('should have correct metric cards', () => {
      expect(ROLE_PERMISSIONS.supplier.metricCards).toEqual(['matchingAnalyses', 'transactions', 'chatConversations']);
    });

    it('should have correct quick actions', () => {
      expect(ROLE_PERMISSIONS.supplier.quickActions).toEqual([
        '/dashboard/matching', '/dashboard/transactions', '/dashboard/chat', '/dashboard/weather',
      ]);
    });
  });

  describe('logistics permissions', () => {
    it('should have correct home page', () => {
      expect(ROLE_PERMISSIONS.logistics.homePage).toBe('/dashboard/transactions');
    });

    it('should have correct pages', () => {
      expect(ROLE_PERMISSIONS.logistics.pages).toEqual([
        '/dashboard', '/dashboard/matching', '/dashboard/transactions', '/dashboard/chat', '/dashboard/weather',
      ]);
    });

    it('should have correct API routes', () => {
      expect(ROLE_PERMISSIONS.logistics.apiRoutes).toEqual([
        '/api/ai/chat', '/api/ai/matching', '/api/ai/weather', '/api/transactions',
      ]);
    });

    it('should have correct metric cards', () => {
      expect(ROLE_PERMISSIONS.logistics.metricCards).toEqual(['transactions', 'matchingAnalyses', 'chatConversations']);
    });

    it('should have correct quick actions', () => {
      expect(ROLE_PERMISSIONS.logistics.quickActions).toEqual([
        '/dashboard/transactions', '/dashboard/matching', '/dashboard/chat', '/dashboard/weather',
      ]);
    });
  });

  describe('finance permissions', () => {
    it('should have correct home page', () => {
      expect(ROLE_PERMISSIONS.finance.homePage).toBe('/dashboard/policy');
    });

    it('should have correct pages', () => {
      expect(ROLE_PERMISSIONS.finance.pages).toEqual([
        '/dashboard', '/dashboard/policy', '/dashboard/transactions', '/dashboard/chat', '/dashboard/weather',
      ]);
    });

    it('should have correct API routes', () => {
      expect(ROLE_PERMISSIONS.finance.apiRoutes).toEqual([
        '/api/ai/policy', '/api/ai/chat', '/api/ai/weather', '/api/transactions',
      ]);
    });

    it('should have correct metric cards', () => {
      expect(ROLE_PERMISSIONS.finance.metricCards).toEqual(['policyAnalyses', 'transactions', 'chatConversations']);
    });

    it('should have correct quick actions', () => {
      expect(ROLE_PERMISSIONS.finance.quickActions).toEqual([
        '/dashboard/policy', '/dashboard/transactions', '/dashboard/chat', '/dashboard/weather',
      ]);
    });
  });

  describe('DEFAULT_PERMISSIONS', () => {
    it('should redirect unknown roles to /dashboard', () => {
      expect(DEFAULT_PERMISSIONS.homePage).toBe('/dashboard');
    });

    it('should have only /dashboard page', () => {
      expect(DEFAULT_PERMISSIONS.pages).toEqual(['/dashboard']);
    });

    it('should not expose any API routes', () => {
      expect(DEFAULT_PERMISSIONS.apiRoutes).toEqual([]);
    });

    it('should not expose metric cards', () => {
      expect(DEFAULT_PERMISSIONS.metricCards).toEqual([]);
    });

    it('should not expose quick actions', () => {
      expect(DEFAULT_PERMISSIONS.quickActions).toEqual([]);
    });
  });

  describe('getPermissions()', () => {
    it('should return role permissions for valid roles', () => {
      for (const role of ALL_ROLES) {
        expect(getPermissions(role)).toBe(ROLE_PERMISSIONS[role]);
      }
    });

    it('should return DEFAULT_PERMISSIONS for null', () => {
      expect(getPermissions(null)).toBe(DEFAULT_PERMISSIONS);
    });

    it('should return DEFAULT_PERMISSIONS for undefined', () => {
      expect(getPermissions(undefined)).toBe(DEFAULT_PERMISSIONS);
    });

    it('should return DEFAULT_PERMISSIONS for unknown role string', () => {
      expect(getPermissions('admin' as UserRole)).toBe(DEFAULT_PERMISSIONS);
      expect(getPermissions('' as UserRole)).toBe(DEFAULT_PERMISSIONS);
    });
  });

  describe('normalizeUserRole()', () => {
    it('should return the role when valid', () => {
      expect(normalizeUserRole('farmer')).toBe('farmer');
      expect(normalizeUserRole('government')).toBe('government');
    });

    it('should return null for invalid values', () => {
      expect(normalizeUserRole('admin')).toBeNull();
      expect(normalizeUserRole('')).toBeNull();
      expect(normalizeUserRole(null)).toBeNull();
    });
  });

  describe('getDefaultDashboardPage()', () => {
    it('should return role-specific home pages', () => {
      expect(getDefaultDashboardPage('farmer')).toBe('/dashboard/farmer');
      expect(getDefaultDashboardPage('buyer')).toBe('/dashboard/buyer');
      expect(getDefaultDashboardPage('supplier')).toBe('/dashboard/matching');
      expect(getDefaultDashboardPage('logistics')).toBe('/dashboard/transactions');
      expect(getDefaultDashboardPage('finance')).toBe('/dashboard/policy');
      expect(getDefaultDashboardPage('government')).toBe('/dashboard/policy');
    });

    it('should return the generic dashboard for unknown roles', () => {
      expect(getDefaultDashboardPage(null)).toBe('/dashboard');
      expect(getDefaultDashboardPage('admin' as UserRole)).toBe('/dashboard');
    });
  });

  describe('permission consistency', () => {
    it('should keep each home page inside the accessible pages list', () => {
      for (const role of ALL_ROLES) {
        const perms = ROLE_PERMISSIONS[role];
        expect(perms.pages).toContain(perms.homePage);
      }
    });

    it('should keep quick actions inside the accessible pages list', () => {
      for (const role of ALL_ROLES) {
        const perms = ROLE_PERMISSIONS[role];
        for (const quickAction of perms.quickActions) {
          expect(perms.pages).toContain(quickAction);
        }
      }
    });
  });

  describe('isPagePermitted()', () => {
    it('should return true for exact page match', () => {
      expect(isPagePermitted('farmer', '/dashboard')).toBe(true);
      expect(isPagePermitted('farmer', '/dashboard/farmer')).toBe(true);
    });

    it('should return true for sub-path of permitted page', () => {
      expect(isPagePermitted('farmer', '/dashboard/farmer/details')).toBe(true);
    });

    it('should return false for non-permitted page', () => {
      expect(isPagePermitted('farmer', '/dashboard/buyer')).toBe(false);
      expect(isPagePermitted('farmer', '/dashboard/policy')).toBe(false);
      expect(isPagePermitted('farmer', '/dashboard/simulation')).toBe(false);
    });

    it('should use DEFAULT_PERMISSIONS for null role', () => {
      expect(isPagePermitted(null, '/dashboard')).toBe(true);
      expect(isPagePermitted(null, '/dashboard/farmer')).toBe(false);
      expect(isPagePermitted(null, '/dashboard/chat')).toBe(false);
    });

    it('should not match partial path names', () => {
      // /dashboard/farm should not match /dashboard/farmer
      expect(isPagePermitted('buyer', '/dashboard/farmerstuff')).toBe(false);
    });
  });

  describe('isApiRoutePermitted()', () => {
    it('should return true for permitted API routes', () => {
      expect(isApiRoutePermitted('farmer', '/api/ai/farmer')).toBe(true);
      expect(isApiRoutePermitted('farmer', '/api/ai/chat')).toBe(true);
    });

    it('should return true for sub-paths of permitted API routes', () => {
      expect(isApiRoutePermitted('farmer', '/api/ai/farmer/analyze')).toBe(true);
    });

    it('should return false for non-permitted API routes', () => {
      expect(isApiRoutePermitted('farmer', '/api/ai/buyer')).toBe(false);
      expect(isApiRoutePermitted('farmer', '/api/admin/simulation')).toBe(false);
    });

    it('should restrict /api/admin/simulation to government only', () => {
      expect(isApiRoutePermitted('government', '/api/admin/simulation')).toBe(true);
      expect(isApiRoutePermitted('farmer', '/api/admin/simulation')).toBe(false);
      expect(isApiRoutePermitted('buyer', '/api/admin/simulation')).toBe(false);
      expect(isApiRoutePermitted('supplier', '/api/admin/simulation')).toBe(false);
      expect(isApiRoutePermitted('logistics', '/api/admin/simulation')).toBe(false);
      expect(isApiRoutePermitted('finance', '/api/admin/simulation')).toBe(false);
    });

    it('should use DEFAULT_PERMISSIONS for null role', () => {
      expect(isApiRoutePermitted(null, '/api/ai/chat')).toBe(false);
      expect(isApiRoutePermitted(null, '/api/ai/weather')).toBe(false);
      expect(isApiRoutePermitted(null, '/api/ai/farmer')).toBe(false);
    });

    it('should block finance from matching API access', () => {
      expect(isApiRoutePermitted('finance', '/api/ai/matching')).toBe(false);
    });
  });
});
