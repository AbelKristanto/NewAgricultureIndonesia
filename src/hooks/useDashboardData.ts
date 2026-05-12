'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { dashboardCache } from '@/lib/dashboard-cache';
import { getPermissions, UserRole } from '@/lib/rbac';

export interface DashboardMetrics {
  farmerAnalyses: number;
  buyerAnalyses: number;
  chatConversations: number;
  weatherAnalyses: number;
  matchingAnalyses: number;
  transactions: number;
  policyAnalyses: number;
}

export interface RecentActivityItem {
  type: string;
  title: string;
  created_at: string;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  recentActivity: RecentActivityItem[];
}

export interface UseDashboardDataReturn {
  metrics: DashboardMetrics;
  recentActivity: RecentActivityItem[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

const EMPTY_METRICS: DashboardMetrics = {
  farmerAnalyses: 0,
  buyerAnalyses: 0,
  chatConversations: 0,
  weatherAnalyses: 0,
  matchingAnalyses: 0,
  transactions: 0,
  policyAnalyses: 0,
};

function getCacheKey(userId: string, role: string): string {
  return `dashboard_${userId}_${role}`;
}

/**
 * Fetches a count from a Supabase table using head: true with count: 'exact'.
 * No row payloads are transferred.
 */
async function fetchCount(
  supabase: ReturnType<typeof createClient>,
  table: string,
  filterColumn: string | null,
  filterValue: string | null,
  signal: AbortSignal
): Promise<number> {
  let query = supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (filterColumn && filterValue) {
    query = query.eq(filterColumn, filterValue);
  }

  const { count, error } = await query.abortSignal(signal);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Fetches transaction count where user is buyer OR farmer.
 */
async function fetchTransactionCount(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  signal: AbortSignal
): Promise<number> {
  const { count, error } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .or(`buyer_id.eq.${userId},farmer_id.eq.${userId}`)
    .abortSignal(signal);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Builds metric fetch promises based on role permissions.
 * Returns metrics in parallel (single round-trip via Promise.all).
 */
async function fetchMetrics(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  role: UserRole | null | undefined,
  signal: AbortSignal
): Promise<DashboardMetrics> {
  const permissions = getPermissions(role);
  const metricCards = permissions.metricCards;
  const isGovernment = role === 'government';

  const metrics: DashboardMetrics = { ...EMPTY_METRICS };

  const fetchers: Array<{ key: keyof DashboardMetrics; promise: Promise<number> }> = [];

  for (const card of metricCards) {
    switch (card) {
      case 'farmerAnalyses':
        fetchers.push({
          key: 'farmerAnalyses',
          promise: fetchCount(
            supabase,
            'farmer_analyses',
            isGovernment ? null : 'user_id',
            isGovernment ? null : userId,
            signal
          ),
        });
        break;
      case 'buyerAnalyses':
        fetchers.push({
          key: 'buyerAnalyses',
          promise: fetchCount(
            supabase,
            'buyer_analyses',
            isGovernment ? null : 'user_id',
            isGovernment ? null : userId,
            signal
          ),
        });
        break;
      case 'chatConversations':
        fetchers.push({
          key: 'chatConversations',
          promise: fetchCount(supabase, 'chat_conversations', 'user_id', userId, signal),
        });
        break;
      case 'weatherAnalyses':
        fetchers.push({
          key: 'weatherAnalyses',
          promise: fetchCount(supabase, 'weather_analyses', 'user_id', userId, signal),
        });
        break;
      case 'matchingAnalyses':
        fetchers.push({
          key: 'matchingAnalyses',
          promise: fetchCount(supabase, 'matching_analyses', 'user_id', userId, signal),
        });
        break;
      case 'transactions':
        fetchers.push({
          key: 'transactions',
          promise: isGovernment
            ? fetchCount(supabase, 'transactions', null, null, signal)
            : fetchTransactionCount(supabase, userId, signal),
        });
        break;
      case 'policyAnalyses':
        fetchers.push({
          key: 'policyAnalyses',
          promise: fetchCount(
            supabase,
            'policy_analyses',
            isGovernment ? null : 'user_id',
            isGovernment ? null : userId,
            signal
          ),
        });
        break;
    }
  }

  // Execute all metric queries in parallel (single round-trip)
  const results = await Promise.all(fetchers.map((f) => f.promise));

  for (let i = 0; i < fetchers.length; i++) {
    metrics[fetchers[i].key] = results[i];
  }

  return metrics;
}

/**
 * Fetches recent activity items from relevant tables based on role.
 * Returns last 5 items sorted by created_at desc.
 */
async function fetchRecentActivity(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  role: UserRole | null | undefined,
  signal: AbortSignal
): Promise<RecentActivityItem[]> {
  const permissions = getPermissions(role);
  const pages = permissions.pages;

  const activityFetchers: Array<Promise<RecentActivityItem[]>> = [];

  // Farmer analyses activity
  if (pages.includes('/dashboard/farmer')) {
    activityFetchers.push(
      (async (): Promise<RecentActivityItem[]> => {
        const { data } = await supabase
          .from('farmer_analyses')
          .select('input, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5)
          .abortSignal(signal);
        return (data || []).map((row: { input: unknown; created_at: string }) => {
          const input = row.input as Record<string, string> | null;
          return {
            type: 'Farmer',
            title: input ? `${input.province || ''} - ${input.currentCrops || ''}` : 'Farmer Analysis',
            created_at: row.created_at,
          };
        });
      })()
    );
  }

  // Buyer analyses activity
  if (pages.includes('/dashboard/buyer')) {
    activityFetchers.push(
      (async (): Promise<RecentActivityItem[]> => {
        const { data } = await supabase
          .from('buyer_analyses')
          .select('input, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5)
          .abortSignal(signal);
        return (data || []).map((row: { input: unknown; created_at: string }) => {
          const input = row.input as Record<string, string> | null;
          return {
            type: 'Buyer',
            title: input ? `${input.commodityType || ''}` : 'Buyer Sourcing',
            created_at: row.created_at,
          };
        });
      })()
    );
  }

  // Policy analyses activity
  if (pages.includes('/dashboard/policy')) {
    activityFetchers.push(
      (async (): Promise<RecentActivityItem[]> => {
        const { data } = await supabase
          .from('policy_analyses')
          .select('input, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5)
          .abortSignal(signal);
        return (data || []).map((row: { input: unknown; created_at: string }) => {
          const input = row.input as Record<string, string[]> | null;
          return {
            type: 'Policy',
            title: input?.regions?.slice(0, 2).join(', ') || 'Policy Analysis',
            created_at: row.created_at,
          };
        });
      })()
    );
  }

  // Chat conversations activity
  if (pages.includes('/dashboard/chat')) {
    activityFetchers.push(
      (async (): Promise<RecentActivityItem[]> => {
        const { data } = await supabase
          .from('chat_conversations')
          .select('title, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5)
          .abortSignal(signal);
        return (data || []).map((row: { title: string | null; created_at: string }) => ({
          type: 'Chat',
          title: row.title || 'Chat',
          created_at: row.created_at,
        }));
      })()
    );
  }

  // Weather analyses activity
  if (pages.includes('/dashboard/weather')) {
    activityFetchers.push(
      (async (): Promise<RecentActivityItem[]> => {
        const { data } = await supabase
          .from('weather_analyses')
          .select('input, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5)
          .abortSignal(signal);
        return (data || []).map((row: { input: unknown; created_at: string }) => {
          const input = row.input as Record<string, string> | null;
          return {
            type: 'Weather',
            title: input?.location || 'Weather Analysis',
            created_at: row.created_at,
          };
        });
      })()
    );
  }

  // Matching analyses activity
  if (pages.includes('/dashboard/matching')) {
    activityFetchers.push(
      (async (): Promise<RecentActivityItem[]> => {
        const { data } = await supabase
          .from('matching_analyses')
          .select('input, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5)
          .abortSignal(signal);
        return (data || []).map((row: { input: unknown; created_at: string }) => {
          const input = row.input as Record<string, string> | null;
          return {
            type: 'Matching',
            title: input?.commodity || 'Matching Analysis',
            created_at: row.created_at,
          };
        });
      })()
    );
  }

  // Execute all activity queries in parallel (second round-trip)
  const allResults = await Promise.all(activityFetchers);
  const allItems = allResults.flat();

  // Sort by created_at descending and take top 5
  allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return allItems.slice(0, 5);
}

/**
 * Optimized dashboard data fetching hook.
 *
 * - Uses DashboardCache for stale-while-revalidate pattern
 * - Serves cached data on re-navigation within 60 seconds, triggers background refresh
 * - Fetches metrics counts using head: true with count: 'exact' (no row payloads)
 * - Uses parallel queries (Promise.all) for all metrics in max 2 sequential round-trips
 * - Skips re-fetch on re-renders that don't affect user identity or route
 * - If background refresh fails, keeps showing cached data without error
 */
export function useDashboardData(
  userId: string | undefined,
  role: UserRole | null | undefined
): UseDashboardDataReturn {
  const [data, setData] = useState<DashboardData>({
    metrics: EMPTY_METRICS,
    recentActivity: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track previous userId/role to skip re-fetch on unchanged re-renders
  const prevParamsRef = useRef<{ userId: string | undefined; role: UserRole | null | undefined }>({
    userId: undefined,
    role: undefined,
  });
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const supabaseRef = useRef(createClient());

  const fetchData = useCallback(
    async (isBackground: boolean = false) => {
      if (!userId) return;

      // Abort any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      if (!isBackground) {
        setError(null);
      }

      const supabase = supabaseRef.current;

      try {
        // Round-trip 1: Fetch all metric counts in parallel
        const metrics = await fetchMetrics(supabase, userId, role, abortController.signal);

        if (!isMountedRef.current || abortController.signal.aborted) return;

        // Round-trip 2: Fetch recent activity in parallel
        const recentActivity = await fetchRecentActivity(supabase, userId, role, abortController.signal);

        if (!isMountedRef.current || abortController.signal.aborted) return;

        const newData: DashboardData = { metrics, recentActivity };

        // Store in cache
        const cacheKey = getCacheKey(userId, role || 'unknown');
        dashboardCache.set(cacheKey, newData);

        // Update state
        setData(newData);
        setError(null);
        setIsLoading(false);
      } catch (err: unknown) {
        if (!isMountedRef.current || abortController.signal.aborted) return;

        // If this is a background refresh, silently fail and keep cached data
        if (isBackground) return;

        const message = err instanceof Error ? err.message : 'Failed to load dashboard data';
        setError(message);
        setIsLoading(false);
      }
    },
    [userId, role]
  );

  useEffect(() => {
    isMountedRef.current = true;

    // Skip re-fetch if userId and role haven't changed
    if (
      prevParamsRef.current.userId === userId &&
      prevParamsRef.current.role === role
    ) {
      return;
    }

    prevParamsRef.current = { userId, role };

    if (!userId) {
      setIsLoading(false);
      return;
    }

    // Check cache first — stale-while-revalidate pattern
    const cacheKey = getCacheKey(userId, role || 'unknown');
    const cached = dashboardCache.get<DashboardData>(cacheKey);

    if (cached) {
      // Serve cached data immediately
      setData(cached);
      setIsLoading(false);
      setError(null);

      // Trigger background refresh (won't show error if it fails)
      fetchData(true);
    } else {
      // No cache — fetch fresh data
      setIsLoading(true);
      fetchData(false);
    }

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [userId, role, fetchData]);

  const retry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchData(false);
  }, [fetchData]);

  return {
    metrics: data.metrics,
    recentActivity: data.recentActivity,
    isLoading,
    error,
    retry,
  };
}
