/**
 * Rate limiter module for API endpoints.
 * Uses the `rate_limits` Supabase table with service_role client to bypass RLS.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

/**
 * Rate limit configurations per endpoint category.
 * - ai_analysis: 10 requests per 15-minute window (buyer, farmer, matching, policy, weather)
 * - chat: 30 requests per 15-minute window
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  ai_analysis: { maxRequests: 10, windowMs: 900000 }, // 15 minutes
  chat: { maxRequests: 30, windowMs: 900000 },        // 15 minutes
};

/**
 * Maps API route paths to their rate limit category.
 */
export const ENDPOINT_CATEGORY_MAP: Record<string, string> = {
  '/api/ai/buyer': 'ai_analysis',
  '/api/ai/farmer': 'ai_analysis',
  '/api/ai/matching': 'ai_analysis',
  '/api/ai/policy': 'ai_analysis',
  '/api/ai/weather': 'ai_analysis',
  '/api/ai/calendar': 'ai_analysis',
  '/api/ai/esg-report': 'ai_analysis',
  '/api/ai/market-intelligence': 'ai_analysis',
  '/api/ai/pest-alert': 'ai_analysis',
  '/api/plant-scans': 'ai_analysis',
  '/api/ai/daily-insight': 'ai_analysis',
  '/api/ai/performance-analysis': 'ai_analysis',
  '/api/ai/regional-analytics': 'ai_analysis',
  '/api/ai/chat': 'chat',
};

/**
 * Returns the rate limit category for a given API path, or null if not rate-limited.
 */
export function getEndpointCategory(pathname: string): string | null {
  for (const [prefix, category] of Object.entries(ENDPOINT_CATEGORY_MAP)) {
    if (pathname.startsWith(prefix)) {
      return category;
    }
  }
  return null;
}

/**
 * Checks whether a user is within their rate limit for a given endpoint category.
 *
 * Sliding window approach:
 * 1. Look for an existing record for (user_id, endpoint) where window_start is within the last windowMs.
 * 2. If exists and request_count >= max, reject with Retry-After.
 * 3. If exists and request_count < max, increment request_count.
 * 4. If not exists, create a new record with request_count = 1 and window_start = now.
 *
 * Skips rate limit check for unauthenticated requests (userId is empty/null).
 */
export async function checkRateLimit(
  userId: string,
  endpoint: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Skip rate limit for unauthenticated requests
  if (!userId) {
    return { allowed: true, remaining: config.maxRequests };
  }

  const supabase = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  // Query for existing rate limit record within the current window
  const { data: existing, error: selectError } = await supabase
    .from('rate_limits')
    .select('id, request_count, window_start')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is expected for new users
    // For other errors, allow the request (fail open) but log
    console.error('[RateLimiter] Error querying rate_limits:', selectError);
    return { allowed: true, remaining: config.maxRequests };
  }

  if (existing) {
    // Record exists within the window
    if (existing.request_count >= config.maxRequests) {
      // Rate limit exceeded — calculate Retry-After
      const windowExpiry = new Date(existing.window_start).getTime() + config.windowMs;
      const retryAfterSeconds = Math.ceil((windowExpiry - now.getTime()) / 1000);

      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(retryAfterSeconds, 1),
      };
    }

    // Increment request count
    const { error: updateError } = await supabase
      .from('rate_limits')
      .update({ request_count: existing.request_count + 1 })
      .eq('id', existing.id);

    if (updateError) {
      console.error('[RateLimiter] Error incrementing rate_limits:', updateError);
    }

    return {
      allowed: true,
      remaining: config.maxRequests - existing.request_count - 1,
    };
  }

  // No existing record — create a new one
  const { error: insertError } = await supabase
    .from('rate_limits')
    .insert({
      user_id: userId,
      endpoint,
      request_count: 1,
      window_start: now.toISOString(),
    });

  if (insertError) {
    console.error('[RateLimiter] Error inserting rate_limits:', insertError);
  }

  return {
    allowed: true,
    remaining: config.maxRequests - 1,
  };
}

/**
 * Decrements the rate limit counter for a user/endpoint in the current window.
 * Used to roll back the count when the AI service returns a 5xx error,
 * so server failures don't penalize the user.
 */
export async function decrementRateLimit(
  userId: string,
  endpoint: string
): Promise<void> {
  if (!userId) return;

  const supabase = createAdminClient();
  const now = new Date();
  const windowMs = RATE_LIMITS[endpoint]?.windowMs ?? 900000;
  const windowStart = new Date(now.getTime() - windowMs);

  // Find the current window record
  const { data: existing, error: selectError } = await supabase
    .from('rate_limits')
    .select('id, request_count')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .single();

  if (selectError || !existing) {
    // No record to decrement — nothing to do
    return;
  }

  if (existing.request_count <= 0) {
    // Already at 0, don't go negative
    return;
  }

  const { error: updateError } = await supabase
    .from('rate_limits')
    .update({ request_count: existing.request_count - 1 })
    .eq('id', existing.id);

  if (updateError) {
    console.error('[RateLimiter] Error decrementing rate_limits:', updateError);
  }
}
