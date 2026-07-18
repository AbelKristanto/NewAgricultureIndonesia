import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAllTransactionsAdmin } from '@/lib/db/admin';
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
  if (ctx.userRole !== 'admin') {
    return createForbiddenResponse('Only admins can view all transactions');
  }

  try {
    const supabase = createAdminClient();
    const transactions = await getAllTransactionsAdmin(supabase);
    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Admin transactions fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
