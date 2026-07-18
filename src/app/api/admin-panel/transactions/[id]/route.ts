import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteTransactionAdmin } from '@/lib/db/admin';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'admin') {
    return createForbiddenResponse('Only admins can delete transactions');
  }

  try {
    const { id } = await params;
    const supabase = createAdminClient();
    await deleteTransactionAdmin(supabase, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin transaction delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
