import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { markAllNotificationsRead } from '@/lib/db/notifications';
import {
  getRequestContext,
  createUnauthorizedResponse,
} from '@/lib/api-helpers';

export async function PATCH(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  try {
    const supabase = createAdminClient();
    await markAllNotificationsRead(supabase, ctx.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notifications mark-all-read error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
