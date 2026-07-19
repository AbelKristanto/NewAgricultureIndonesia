import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/db/notifications';
import { buildAccountVerificationNotification, buildAccountStatusNotification } from '@/lib/notification-copy';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

type AccountIntent = 'approve' | 'reject' | 'deactivate' | 'reactivate';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'admin') {
    return createForbiddenResponse('Only admins can update accounts');
  }

  try {
    const { id } = await params;
    const body = await request.json() as { intent?: AccountIntent };
    const intent = body.intent;
    if (intent !== 'approve' && intent !== 'reject' && intent !== 'deactivate' && intent !== 'reactivate') {
      return NextResponse.json({ success: false, error: 'Invalid intent' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('id, status, institution_name, role')
      .eq('id', id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (intent === 'approve' || intent === 'reject') {
      if (existing.status !== 'pending') {
        return NextResponse.json(
          { success: false, error: `This account must be pending to review (currently "${existing.status}")` },
          { status: 400 }
        );
      }
    } else if (intent === 'deactivate') {
      if (existing.role === 'admin') {
        return NextResponse.json({ success: false, error: 'Admin accounts cannot be deactivated' }, { status: 400 });
      }
      if (existing.status !== 'approved') {
        return NextResponse.json(
          { success: false, error: `This account must be approved to deactivate (currently "${existing.status}")` },
          { status: 400 }
        );
      }
    } else if (intent === 'reactivate') {
      if (existing.status !== 'deactivated') {
        return NextResponse.json(
          { success: false, error: `This account must be deactivated to reactivate (currently "${existing.status}")` },
          { status: 400 }
        );
      }
    }

    const nextStatus =
      intent === 'approve' ? 'approved' :
      intent === 'reject' ? 'rejected' :
      intent === 'deactivate' ? 'deactivated' :
      'approved'; // reactivate

    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ status: nextStatus })
      .eq('id', id)
      .select()
      .single();
    if (updateError) throw updateError;

    // Deactivation intentionally fires no notification — the affected user is
    // blocked from every dashboard route (including the NotificationBell)
    // until reactivated, so it would be unreachable until then anyway.
    if (intent !== 'deactivate') {
      try {
        const copy = intent === 'reactivate'
          ? buildAccountStatusNotification()
          : buildAccountVerificationNotification(intent === 'approve' ? 'approved' : 'rejected', existing.institution_name);
        await createNotification(supabase, {
          userId: id,
          type: copy.type,
          title: copy.title,
          body: copy.body,
          link: '/dashboard',
        });
      } catch (notificationError) {
        console.error('Failed to create account status notification:', notificationError);
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Account status update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update account' },
      { status: 500 }
    );
  }
}
