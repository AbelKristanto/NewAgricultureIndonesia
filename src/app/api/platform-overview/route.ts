import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlatformOverview } from '@/lib/db/admin';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

export async function GET(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'government') {
    return createForbiddenResponse('Only government accounts can view the platform overview');
  }

  try {
    const supabase = createAdminClient();
    const overview = await getPlatformOverview(supabase);
    return NextResponse.json({ success: true, data: overview });
  } catch (error) {
    console.error('Platform overview fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch platform overview' }, { status: 500 });
  }
}
