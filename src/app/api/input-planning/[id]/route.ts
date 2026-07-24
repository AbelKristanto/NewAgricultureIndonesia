import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteInputPlan, getInputPlanById, updateInputPlan } from '@/lib/db/input-planning';
import { INPUT_ITEM_TYPES, INPUT_PLAN_STATUSES } from '@/lib/constants';
import { UpdateInputPlanInput } from '@/types/input-planning';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

const VALID_STATUSES = INPUT_PLAN_STATUSES.map((s) => s.value);
const VALID_TYPES = INPUT_ITEM_TYPES.map((t) => t.value);

function buildUpdates(body: UpdateInputPlanInput): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (body.landPlotId !== undefined) updates.land_plot_id = body.landPlotId;
  if (body.commodity !== undefined) updates.commodity = body.commodity;
  if (body.seasonLabel !== undefined) updates.season_label = body.seasonLabel;
  if (body.itemName !== undefined) updates.item_name = body.itemName;
  if (body.itemType !== undefined && VALID_TYPES.includes(body.itemType)) updates.item_type = body.itemType;
  if (body.quantity !== undefined) updates.quantity = body.quantity;
  if (body.unit !== undefined) updates.unit = body.unit;
  if (body.unitCost !== undefined) updates.unit_cost = body.unitCost;
  if (body.status !== undefined && VALID_STATUSES.includes(body.status)) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes;
  return updates;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'farmer') {
    return createForbiddenResponse('Only farmers can update input plans');
  }

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const existing = await getInputPlanById(supabase, id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (existing.farmer_id !== ctx.userId) {
      return createForbiddenResponse('You can only update your own input plans');
    }

    const body = await request.json() as UpdateInputPlanInput;
    const updates = buildUpdates(body);
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await updateInputPlan(supabase, id, updates);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Input plan update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update input plan' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'farmer') {
    return createForbiddenResponse('Only farmers can delete input plans');
  }

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const existing = await getInputPlanById(supabase, id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (existing.farmer_id !== ctx.userId) {
      return createForbiddenResponse('You can only delete your own input plans');
    }

    await deleteInputPlan(supabase, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Input plan delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete input plan' }, { status: 500 });
  }
}
