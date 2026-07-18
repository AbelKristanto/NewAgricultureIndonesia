import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { markNotificationRead } from '@/lib/db/notifications';
import {
  getRequestContext,
  createUnauthorizedResponse,
} from '@/lib/api-helpers';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  try {
    const { id } = await params;
    const supabase = createAdminClient();
    await markNotificationRead(supabase, ctx.userId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}
