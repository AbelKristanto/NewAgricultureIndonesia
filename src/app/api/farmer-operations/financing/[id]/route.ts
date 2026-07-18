import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getFinancingOpportunityById, updateFinancingOpportunity } from '@/lib/db/farmer-operations';
import { createNotification } from '@/lib/db/notifications';
import { buildFinancingNotification } from '@/lib/notification-copy';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

type FinancingIntent = 'request' | 'review' | 'approve' | 'reject';

const INTENT_TRANSITIONS: Record<FinancingIntent, { from: string; to: string; actor: 'farmer' | 'finance' }> = {
  request: { from: 'available', to: 'requested', actor: 'farmer' },
  review: { from: 'requested', to: 'reviewing', actor: 'finance' },
  approve: { from: 'reviewing', to: 'approved', actor: 'finance' },
  reject: { from: 'reviewing', to: 'rejected', actor: 'finance' },
};

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

    const existing = await getFinancingOpportunityById(supabase, id);
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json() as { intent?: FinancingIntent };
    const transition = body.intent ? INTENT_TRANSITIONS[body.intent] : undefined;
    if (!transition) {
      return NextResponse.json({ error: 'Invalid intent' }, { status: 400 });
    }

    if (transition.actor === 'farmer' && existing.farmer_id !== ctx.userId) {
      return createForbiddenResponse('Only the farmer this offer was made to can do this');
    }
    if (transition.actor === 'finance' && existing.created_by !== ctx.userId) {
      return createForbiddenResponse('Only the institution that created this offer can do this');
    }
    if (existing.status !== transition.from) {
      return NextResponse.json(
        { error: `This offer must be "${transition.from}" for that action (currently "${existing.status}")` },
        { status: 400 }
      );
    }

    const updated = await updateFinancingOpportunity(supabase, id, { status: transition.to });

    try {
      const notifyUserId = transition.actor === 'farmer' ? existing.created_by : existing.farmer_id;
      const event = body.intent === 'request' ? 'requested'
        : body.intent === 'review' ? 'reviewing'
        : body.intent === 'approve' ? 'approved'
        : 'rejected';
      if (notifyUserId) {
        const copy = buildFinancingNotification(event, existing.institution_name, existing.product_name);
        await createNotification(supabase, {
          userId: notifyUserId,
          type: copy.type,
          title: copy.title,
          body: copy.body,
          link: transition.actor === 'farmer' ? '/dashboard/policy' : '/dashboard/farmer-operations',
          relatedTransactionId: existing.transaction_id,
        });
      }
    } catch (notificationError) {
      console.error('Failed to create financing status notification:', notificationError);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Financing offer update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update financing offer' },
      { status: 500 }
    );
  }
}
