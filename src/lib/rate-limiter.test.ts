import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RATE_LIMITS,
  ENDPOINT_CATEGORY_MAP,
  getEndpointCategory,
  checkRateLimit,
  decrementRateLimit,
  RateLimitConfig,
} from './rate-limiter';

// Mock the admin client
const mockSingle = vi.fn();
const mockLimit = vi.fn(() => ({ single: mockSingle }));
const mockOrder = vi.fn(() => ({ limit: mockLimit }));
const mockGte = vi.fn(() => ({ order: mockOrder }));
const mockEqChain = vi.fn(() => ({ gte: mockGte }));
const mockEq = vi.fn(() => ({ eq: mockEqChain }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));

const mockUpdateEq2 = vi.fn(() => Promise.resolve({ error: null }));
const mockUpdateEq = vi.fn(() => ({ eq: mockUpdateEq2 }));
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));

const mockInsert = vi.fn(() => Promise.resolve({ error: null }));

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
  insert: mockInsert,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}));

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RATE_LIMITS configuration', () => {
    it('should define ai_analysis with 10 requests per 15 minutes', () => {
      expect(RATE_LIMITS.ai_analysis).toEqual({
        maxRequests: 10,
        windowMs: 900000,
      });
    });

    it('should define chat with 30 requests per 15 minutes', () => {
      expect(RATE_LIMITS.chat).toEqual({
        maxRequests: 30,
        windowMs: 900000,
      });
    });
  });

  describe('ENDPOINT_CATEGORY_MAP', () => {
    it('should map AI analysis endpoints to ai_analysis category', () => {
      expect(ENDPOINT_CATEGORY_MAP['/api/ai/buyer']).toBe('ai_analysis');
      expect(ENDPOINT_CATEGORY_MAP['/api/ai/farmer']).toBe('ai_analysis');
      expect(ENDPOINT_CATEGORY_MAP['/api/ai/matching']).toBe('ai_analysis');
      expect(ENDPOINT_CATEGORY_MAP['/api/ai/policy']).toBe('ai_analysis');
      expect(ENDPOINT_CATEGORY_MAP['/api/ai/weather']).toBe('ai_analysis');
    });

    it('should map chat endpoint to chat category', () => {
      expect(ENDPOINT_CATEGORY_MAP['/api/ai/chat']).toBe('chat');
    });
  });

  describe('getEndpointCategory()', () => {
    it('should return ai_analysis for AI analysis paths', () => {
      expect(getEndpointCategory('/api/ai/buyer')).toBe('ai_analysis');
      expect(getEndpointCategory('/api/ai/farmer')).toBe('ai_analysis');
      expect(getEndpointCategory('/api/ai/matching')).toBe('ai_analysis');
      expect(getEndpointCategory('/api/ai/policy')).toBe('ai_analysis');
      expect(getEndpointCategory('/api/ai/weather')).toBe('ai_analysis');
    });

    it('should return chat for chat path', () => {
      expect(getEndpointCategory('/api/ai/chat')).toBe('chat');
    });

    it('should return null for non-rate-limited paths', () => {
      expect(getEndpointCategory('/api/transactions')).toBeNull();
      expect(getEndpointCategory('/api/admin/simulation')).toBeNull();
      expect(getEndpointCategory('/api/auth/login')).toBeNull();
    });

    it('should match sub-paths of rate-limited endpoints', () => {
      expect(getEndpointCategory('/api/ai/buyer/analyze')).toBe('ai_analysis');
      expect(getEndpointCategory('/api/ai/chat/stream')).toBe('chat');
    });
  });

  describe('checkRateLimit()', () => {
    const config: RateLimitConfig = { maxRequests: 10, windowMs: 900000 };

    it('should skip rate limit for empty userId (unauthenticated)', async () => {
      const result = await checkRateLimit('', 'ai_analysis', config);
      expect(result).toEqual({ allowed: true, remaining: 10 });
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should allow request and create new record when no existing record', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await checkRateLimit('user-1', 'ai_analysis', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          endpoint: 'ai_analysis',
          request_count: 1,
        })
      );
    });

    it('should allow request and increment count when under limit', async () => {
      mockSingle.mockResolvedValue({
        data: { id: 'record-1', request_count: 5, window_start: new Date().toISOString() },
        error: null,
      });

      const result = await checkRateLimit('user-1', 'ai_analysis', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(mockUpdate).toHaveBeenCalledWith({ request_count: 6 });
    });

    it('should reject request when at limit', async () => {
      const windowStart = new Date(Date.now() - 300000); // 5 minutes ago
      mockSingle.mockResolvedValue({
        data: { id: 'record-1', request_count: 10, window_start: windowStart.toISOString() },
        error: null,
      });

      const result = await checkRateLimit('user-1', 'ai_analysis', config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
      // Window started 5 min ago, expires in 10 min = ~600 seconds
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(600);
      expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(599);
    });

    it('should calculate correct Retry-After value', async () => {
      // Window started exactly 10 minutes ago (600000ms)
      const windowStart = new Date(Date.now() - 600000);
      mockSingle.mockResolvedValue({
        data: { id: 'record-1', request_count: 10, window_start: windowStart.toISOString() },
        error: null,
      });

      const result = await checkRateLimit('user-1', 'ai_analysis', config);

      expect(result.allowed).toBe(false);
      // Window expires at windowStart + 900000ms = 300000ms from now = 300 seconds
      expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(299);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(301);
    });

    it('should fail open on database errors', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'UNKNOWN', message: 'Database error' },
      });

      const result = await checkRateLimit('user-1', 'ai_analysis', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
    });
  });

  describe('decrementRateLimit()', () => {
    it('should not query database for empty userId', async () => {
      await decrementRateLimit('', 'ai_analysis');
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should decrement count when record exists with count > 0', async () => {
      mockSingle.mockResolvedValue({
        data: { id: 'record-1', request_count: 5 },
        error: null,
      });

      await decrementRateLimit('user-1', 'ai_analysis');

      expect(mockUpdate).toHaveBeenCalledWith({ request_count: 4 });
    });

    it('should not decrement below 0', async () => {
      mockSingle.mockResolvedValue({
        data: { id: 'record-1', request_count: 0 },
        error: null,
      });

      await decrementRateLimit('user-1', 'ai_analysis');

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should handle missing record gracefully', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      // Should not throw
      await decrementRateLimit('user-1', 'ai_analysis');
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
