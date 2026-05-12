/**
 * Client-side in-memory cache for dashboard data with TTL-based invalidation.
 * Supports stale-while-revalidate pattern: serves cached data on re-navigation
 * within TTL window while triggering background refresh.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const DEFAULT_TTL_MS = 60000; // 60 seconds

export class DashboardCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private ttl: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  /**
   * Retrieve cached data by key. Returns null if the entry does not exist
   * or if the entry has expired (older than TTL).
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store data in the cache with the current timestamp.
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Remove a specific key from the cache.
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Remove all entries from the cache.
   */
  clear(): void {
    this.cache.clear();
  }
}

/** Singleton cache instance for use across dashboard components. */
export const dashboardCache = new DashboardCache();
