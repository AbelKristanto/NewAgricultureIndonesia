import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DashboardCache, dashboardCache } from './dashboard-cache';

describe('DashboardCache', () => {
  let cache: DashboardCache;

  beforeEach(() => {
    cache = new DashboardCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('get', () => {
    it('returns null for a key that does not exist', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('returns cached data within TTL', () => {
      cache.set('metrics', { count: 5 });
      expect(cache.get<{ count: number }>('metrics')).toEqual({ count: 5 });
    });

    it('returns null after TTL expires (60 seconds)', () => {
      cache.set('metrics', { count: 5 });

      // Advance time by 61 seconds (past TTL)
      vi.advanceTimersByTime(60001);

      expect(cache.get('metrics')).toBeNull();
    });

    it('returns data at exactly TTL boundary (not yet expired)', () => {
      cache.set('metrics', { count: 5 });

      // At exactly 60 seconds, age === TTL, not > TTL, so still valid
      vi.advanceTimersByTime(60000);

      expect(cache.get<{ count: number }>('metrics')).toEqual({ count: 5 });
    });

    it('returns data just before TTL expires', () => {
      cache.set('metrics', { count: 5 });

      // Advance time by 59.999 seconds
      vi.advanceTimersByTime(59999);

      expect(cache.get<{ count: number }>('metrics')).toEqual({ count: 5 });
    });
  });

  describe('set', () => {
    it('stores data that can be retrieved', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('overwrites existing data for the same key', () => {
      cache.set('key1', 'old');
      cache.set('key1', 'new');
      expect(cache.get('key1')).toBe('new');
    });

    it('resets the timestamp when overwriting', () => {
      cache.set('key1', 'first');

      // Advance 50 seconds
      vi.advanceTimersByTime(50000);

      // Overwrite resets the timestamp
      cache.set('key1', 'second');

      // Advance another 50 seconds (100s total from first set, 50s from second)
      vi.advanceTimersByTime(50000);

      // Should still be valid since second set was 50s ago
      expect(cache.get('key1')).toBe('second');
    });
  });

  describe('invalidate', () => {
    it('removes a specific key from the cache', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.invalidate('key1');

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });

    it('does not throw when invalidating a non-existent key', () => {
      expect(() => cache.invalidate('nonexistent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('removes all entries from the cache', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });
  });

  describe('custom TTL', () => {
    it('respects custom TTL value', () => {
      const shortCache = new DashboardCache(5000); // 5 seconds
      shortCache.set('key', 'value');

      vi.advanceTimersByTime(4999);
      expect(shortCache.get('key')).toBe('value');

      vi.advanceTimersByTime(2);
      expect(shortCache.get('key')).toBeNull();
    });
  });

  describe('singleton instance', () => {
    it('exports a singleton dashboardCache instance', () => {
      expect(dashboardCache).toBeInstanceOf(DashboardCache);
    });
  });
});
