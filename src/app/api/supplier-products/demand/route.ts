import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAggregateInputDemand } from '@/lib/db/supplier-products';
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
  if (ctx.userRole !== 'supplier') {
    return createForbiddenResponse('Only suppliers can view aggregate input demand');
  }

  try {
    const supabase = createAdminClient();
    const demand = await getAggregateInputDemand(supabase);
    return NextResponse.json({ success: true, data: demand });
  } catch (error) {
    console.error('Aggregate input demand fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch demand data' }, { status: 500 });
  }
}
