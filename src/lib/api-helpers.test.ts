import { describe, it, expect } from 'vitest';
import {
  getRequestContext,
  createForbiddenResponse,
  createUnauthorizedResponse,
  createRateLimitResponse,
  isRequestPermittedForApi,
} from './api-helpers';

describe('API Helpers', () => {
  describe('getRequestContext()', () => {
    function createRequest(headers: Record<string, string>): Request {
      return new Request('http://localhost/api/test', {
        headers: new Headers(headers),
      });
    }

    it('should return RequestContext when both headers are present with valid role', () => {
      const request = createRequest({
        'x-user-id': 'user-123',
        'x-user-role': 'farmer',
      });

      const result = getRequestContext(request);
      expect(result).toEqual({ userId: 'user-123', userRole: 'farmer' });
    });

    it('should return null when x-user-id header is missing', () => {
      const request = createRequest({
        'x-user-role': 'farmer',
      });

      const result = getRequestContext(request);
      expect(result).toBeNull();
    });

    it('should return null when x-user-role header is missing', () => {
      const request = createRequest({
        'x-user-id': 'user-123',
      });

      const result = getRequestContext(request);
      expect(result).toBeNull();
    });

    it('should return null when both headers are missing', () => {
      const request = createRequest({});

      const result = getRequestContext(request);
      expect(result).toBeNull();
    });

    it('should return null for invalid role value', () => {
      const request = createRequest({
        'x-user-id': 'user-123',
        'x-user-role': 'superadmin',
      });

      const result = getRequestContext(request);
      expect(result).toBeNull();
    });

    it('should return null for empty role value', () => {
      const request = createRequest({
        'x-user-id': 'user-123',
        'x-user-role': '',
      });

      const result = getRequestContext(request);
      expect(result).toBeNull();
    });

    it('should accept all valid roles', () => {
      const validRoles = ['farmer', 'buyer', 'supplier', 'logistics', 'finance', 'government'];

      for (const role of validRoles) {
        const request = createRequest({
          'x-user-id': 'user-456',
          'x-user-role': role,
        });

        const result = getRequestContext(request);
        expect(result).toEqual({ userId: 'user-456', userRole: role });
      }
    });
  });

  describe('createForbiddenResponse()', () => {
    it('should return 403 status with default message', async () => {
      const response = createForbiddenResponse();

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).toEqual({ error: 'Insufficient permissions' });
    });

    it('should return 403 status with custom message', async () => {
      const response = createForbiddenResponse('Custom forbidden message');

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).toEqual({ error: 'Custom forbidden message' });
    });
  });

  describe('isRequestPermittedForApi()', () => {
    it('should allow government to run farmer and buyer analyses according to RBAC', () => {
      expect(isRequestPermittedForApi({ userId: 'gov-1', userRole: 'government' }, '/api/ai/farmer')).toBe(true);
      expect(isRequestPermittedForApi({ userId: 'gov-1', userRole: 'government' }, '/api/ai/buyer')).toBe(true);
    });

    it('should block roles from APIs outside their permissions', () => {
      expect(isRequestPermittedForApi({ userId: 'farmer-1', userRole: 'farmer' }, '/api/ai/buyer')).toBe(false);
      expect(isRequestPermittedForApi({ userId: 'finance-1', userRole: 'finance' }, '/api/admin/simulation')).toBe(false);
    });
  });

  describe('createUnauthorizedResponse()', () => {
    it('should return 401 status with default message', async () => {
      const response = createUnauthorizedResponse();

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: 'Authentication required' });
    });

    it('should return 401 status with custom message', async () => {
      const response = createUnauthorizedResponse('Session expired');

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: 'Session expired' });
    });
  });

  describe('createRateLimitResponse()', () => {
    it('should return 429 status with rate limit message', async () => {
      const response = createRateLimitResponse(60);

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body).toEqual({ error: 'Rate limit exceeded' });
    });

    it('should include Retry-After header with seconds value', () => {
      const response = createRateLimitResponse(120);

      expect(response.headers.get('Retry-After')).toBe('120');
    });

    it('should handle zero retry-after value', () => {
      const response = createRateLimitResponse(0);

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('0');
    });
  });
});
