import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteSubsidy, getSubsidyById, updateSubsidy } from '@/lib/db/subsidies';
import { SUBSIDY_STATUSES, SUBSIDY_TYPES } from '@/lib/constants';
import { UpdateSubsidyInput } from '@/types/subsidies';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

const VALID_STATUSES = SUBSIDY_STATUSES.map((s) => s.value);
const VALID_TYPES = SUBSIDY_TYPES.map((t) => t.value);

function buildUpdates(body: UpdateSubsidyInput): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (body.programName !== undefined) updates.program_name = body.programName;
  if (body.institutionName !== undefined) updates.institution_name = body.institutionName;
  if (body.subsidyType !== undefined && VALID_TYPES.includes(body.subsidyType)) updates.subsidy_type = body.subsidyType;
  if (body.amount !== undefined) updates.amount = body.amount;
  if (body.status !== undefined && VALID_STATUSES.includes(body.status)) updates.status = body.status;
  if (body.applicationDate !== undefined) updates.application_date = body.applicationDate;
  if (body.disbursementDate !== undefined) updates.disbursement_date = body.disbursementDate;
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
    return createForbiddenResponse('Only farmers can update subsidies');
  }

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const existing = await getSubsidyById(supabase, id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (existing.farmer_id !== ctx.userId) {
      return createForbiddenResponse('You can only update your own subsidies');
    }

    const body = await request.json() as UpdateSubsidyInput;
    const updates = buildUpdates(body);
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await updateSubsidy(supabase, id, updates);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Subsidy update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update subsidy' }, { status: 500 });
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
    return createForbiddenResponse('Only farmers can delete subsidies');
  }

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const existing = await getSubsidyById(supabase, id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (existing.farmer_id !== ctx.userId) {
      return createForbiddenResponse('You can only delete your own subsidies');
    }

    await deleteSubsidy(supabase, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subsidy delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete subsidy' }, { status: 500 });
  }
}
