import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildAppendedCheckpoints, updateLogisticsPlan } from '@/lib/db/farmer-operations';
import { enrichCheckpointsWithSignedUrls } from '@/lib/storage';
import { getTransactionById } from '@/lib/db/transactions';
import { canUpdateLogisticsForTransaction } from '@/lib/transaction-negotiation';
import { FarmerLogisticsPlan } from '@/types/farmer-operations';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

const VALID_STATUSES = ['scheduled', 'pickup_pending', 'picked_up', 'in_transit', 'delivered', 'delayed', 'cancelled'];

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

    const { data: existing, error: fetchError } = await supabase
      .from('farmer_logistics_plans')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const plan = existing as FarmerLogisticsPlan;

    if (!plan.transaction_id) {
      return createForbiddenResponse('This logistics plan is not linked to a transaction');
    }
    const transaction = await getTransactionById(supabase, plan.transaction_id);
    if (!transaction || !canUpdateLogisticsForTransaction(transaction, ctx.userId, ctx.userRole)) {
      return createForbiddenResponse('Only an assigned logistics participant can update this plan');
    }

    const body = await request.json() as {
      status?: string;
      currentLat?: number;
      currentLng?: number;
      estimatedArrival?: string | null;
      appendCheckpoint?: { label: string; lat: number; lng: number };
    };

    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
      }
      updates.status = body.status;
    }
    if (body.currentLat !== undefined) updates.current_lat = body.currentLat;
    if (body.currentLng !== undefined) updates.current_lng = body.currentLng;
    if (body.estimatedArrival !== undefined) updates.estimated_arrival = body.estimatedArrival;

    if (body.appendCheckpoint) {
      updates.checkpoints = buildAppendedCheckpoints(plan.checkpoints, body.appendCheckpoint);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await updateLogisticsPlan(supabase, id, updates);
    updated.checkpoints = await enrichCheckpointsWithSignedUrls(supabase, updated.checkpoints);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Logistics plan update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update logistics plan' },
      { status: 500 }
    );
  }
}
