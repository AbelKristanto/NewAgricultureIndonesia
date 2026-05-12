import { describe, it, expect } from 'vitest';
import {
  RolePermissions,
  ROLE_PERMISSIONS,
  DEFAULT_PERMISSIONS,
  getPermissions,
  isPagePermitted,
  isApiRoutePermitted,
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

    it('each role should have pages, apiRoutes, metricCards, quickActions arrays', () => {
      for (const role of ALL_ROLES) {
        const perms = ROLE_PERMISSIONS[role];
        expect(Array.isArray(perms.pages)).toBe(true);
        expect(Array.isArray(perms.apiRoutes)).toBe(true);
        expect(Array.isArray(perms.metricCards)).toBe(true);
        expect(Array.isArray(perms.quickActions)).toBe(true);
      }
    });
  });

  describe('farmer permissions', () => {
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
        '/dashboard/farmer', '/dashboard/weather', '/dashboard/chat', '/dashboard/transactions',
      ]);
    });
  });

  describe('buyer permissions', () => {
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
      expect(ROLE_PERMISSIONS.supplier.metricCards).toEqual(['chatConversations', 'farmerAnalyses']);
    });

    it('should have correct quick actions', () => {
      expect(ROLE_PERMISSIONS.supplier.quickActions).toEqual([
        '/dashboard/farmer', '/dashboard/chat', '/dashboard/transactions',
      ]);
    });
  });

  describe('logistics permissions', () => {
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
      expect(ROLE_PERMISSIONS.logistics.metricCards).toEqual(['chatConversations', 'farmerAnalyses']);
    });

    it('should have correct quick actions', () => {
      expect(ROLE_PERMISSIONS.logistics.quickActions).toEqual([
        '/dashboard/chat', '/dashboard/transactions',
      ]);
    });
  });

  describe('finance permissions', () => {
    it('should have correct pages', () => {
      expect(ROLE_PERMISSIONS.finance.pages).toEqual([
        '/dashboard', '/dashboard/policy', '/dashboard/transactions', '/dashboard/chat', '/dashboard/weather',
      ]);
    });

    it('should have correct API routes', () => {
      expect(ROLE_PERMISSIONS.finance.apiRoutes).toEqual([
        '/api/ai/policy', '/api/ai/chat', '/api/ai/matching', '/api/ai/weather', '/api/transactions',
      ]);
    });

    it('should have correct metric cards', () => {
      expect(ROLE_PERMISSIONS.finance.metricCards).toEqual(['chatConversations', 'farmerAnalyses']);
    });

    it('should have correct quick actions', () => {
      expect(ROLE_PERMISSIONS.finance.quickActions).toEqual([
        '/dashboard/buyer', '/dashboard/chat', '/dashboard/transactions',
      ]);
    });
  });

  describe('DEFAULT_PERMISSIONS', () => {
    it('should have only /dashboard page', () => {
      expect(DEFAULT_PERMISSIONS.pages).toEqual(['/dashboard']);
    });

    it('should have chat and weather API routes', () => {
      expect(DEFAULT_PERMISSIONS.apiRoutes).toEqual(['/api/ai/chat', '/api/ai/weather']);
    });

    it('should have chatConversations metric card', () => {
      expect(DEFAULT_PERMISSIONS.metricCards).toEqual(['chatConversations']);
    });

    it('should have chat and weather quick actions', () => {
      expect(DEFAULT_PERMISSIONS.quickActions).toEqual(['/dashboard/chat', '/dashboard/weather']);
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
      expect(isApiRoutePermitted(null, '/api/ai/chat')).toBe(true);
      expect(isApiRoutePermitted(null, '/api/ai/weather')).toBe(true);
      expect(isApiRoutePermitted(null, '/api/ai/farmer')).toBe(false);
    });
  });
});
