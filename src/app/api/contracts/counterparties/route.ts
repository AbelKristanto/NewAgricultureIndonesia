import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDistinctCounterparties } from '@/lib/db/transactions';
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
  if (ctx.userRole !== 'farmer' && ctx.userRole !== 'buyer') {
    return createForbiddenResponse('Only farmers and buyers can look up counterparties');
  }

  try {
    const supabase = createAdminClient();
    const counterparties = await getDistinctCounterparties(supabase, ctx.userId, ctx.userRole);
    return NextResponse.json({ success: true, data: counterparties });
  } catch (error) {
    console.error('Counterparties fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch counterparties' }, { status: 500 });
  }
}
