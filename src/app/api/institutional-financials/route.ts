import { NextResponse } from 'next/server';
import { getInstitutionalFinancialSummary } from '@/lib/db/institutional-financials';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getRequestContext,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from '@/lib/api-helpers';

export async function GET(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'finance' && ctx.userRole !== 'government') {
    return createForbiddenResponse();
  }

  try {
    const supabase = createAdminClient();
    const summary = await getInstitutionalFinancialSummary(supabase);
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    console.error('Institutional financials fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch institutional financial summary' }, { status: 500 });
  }
}
