import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getFarmerOperations } from '@/lib/db/farmer-operations';
import { enrichCheckpointsWithSignedUrls } from '@/lib/storage';
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

  if (!['farmer', 'government'].includes(ctx.userRole)) {
    return createForbiddenResponse('Only farmers and government monitors can view farmer operations');
  }

  try {
    const supabase = createAdminClient();
    const data = await getFarmerOperations(supabase, ctx.userId);
    data.logistics = await Promise.all(
      data.logistics.map(async (plan) => ({
        ...plan,
        checkpoints: await enrichCheckpointsWithSignedUrls(supabase, plan.checkpoints),
      }))
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Farmer operations fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch farmer operations' },
      { status: 500 }
    );
  }
}
