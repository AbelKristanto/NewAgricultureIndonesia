/**
 * Server-only Supabase admin client using SUPABASE_SERVICE_ROLE_KEY.
 * Bypasses Row Level Security — only import in API routes / server code.
 */

import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
