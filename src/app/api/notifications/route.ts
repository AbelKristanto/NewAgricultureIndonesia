import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getNotifications, getUnreadCount } from '@/lib/db/notifications';
import {
  getRequestContext,
  createUnauthorizedResponse,
} from '@/lib/api-helpers';

export async function GET(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get('limit'));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 20;

    const supabase = createAdminClient();
    const [notifications, unreadCount] = await Promise.all([
      getNotifications(supabase, ctx.userId, limit),
      getUnreadCount(supabase, ctx.userId),
    ]);
    return NextResponse.json({ success: true, data: { notifications, unreadCount } });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
