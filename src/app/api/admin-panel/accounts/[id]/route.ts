import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/db/notifications';
import { buildAccountVerificationNotification } from '@/lib/notification-copy';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

type VerificationIntent = 'approve' | 'reject';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'admin') {
    return createForbiddenResponse('Only admins can review account verification');
  }

  try {
    const { id } = await params;
    const body = await request.json() as { intent?: VerificationIntent };
    if (body.intent !== 'approve' && body.intent !== 'reject') {
      return NextResponse.json({ success: false, error: 'Invalid intent' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('id, status, institution_name')
      .eq('id', id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (existing.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `This account must be pending to review (currently "${existing.status}")` },
        { status: 400 }
      );
    }

    const nextStatus = body.intent === 'approve' ? 'approved' : 'rejected';
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ status: nextStatus })
      .eq('id', id)
      .select()
      .single();
    if (updateError) throw updateError;

    try {
      const copy = buildAccountVerificationNotification(
        body.intent === 'approve' ? 'approved' : 'rejected',
        existing.institution_name
      );
      await createNotification(supabase, {
        userId: id,
        type: copy.type,
        title: copy.title,
        body: copy.body,
        link: '/dashboard',
      });
    } catch (notificationError) {
      console.error('Failed to create account verification notification:', notificationError);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Account verification review error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to review account verification' },
      { status: 500 }
    );
  }
}
