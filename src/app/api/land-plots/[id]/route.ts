import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteLandPlot, getLandPlotById, updateLandPlot } from '@/lib/db/land-plots';
import { LAND_PLOT_STATUSES } from '@/lib/constants';
import { UpdateLandPlotInput } from '@/types/land-plots';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

const VALID_STATUSES = LAND_PLOT_STATUSES.map((s) => s.value);
const VALID_AREA_UNITS = ['hectares', 'm2'];

function buildUpdates(body: UpdateLandPlotInput): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.province !== undefined) updates.province = body.province;
  if (body.district !== undefined) updates.district = body.district;
  if (body.areaValue !== undefined) updates.area_value = body.areaValue;
  if (body.areaUnit !== undefined && VALID_AREA_UNITS.includes(body.areaUnit)) updates.area_unit = body.areaUnit;
  if (body.commodity !== undefined) updates.commodity = body.commodity;
  if (body.plantingDate !== undefined) updates.planting_date = body.plantingDate;
  if (body.harvestEstimate !== undefined) updates.harvest_estimate = body.harvestEstimate;
  if (body.status !== undefined && VALID_STATUSES.includes(body.status)) updates.status = body.status;
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
    return createForbiddenResponse('Only farmers can update land plots');
  }

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const existing = await getLandPlotById(supabase, id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (existing.farmer_id !== ctx.userId) {
      return createForbiddenResponse('You can only update your own land plots');
    }

    const body = await request.json() as UpdateLandPlotInput;
    const updates = buildUpdates(body);
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await updateLandPlot(supabase, id, updates);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Land plot update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update land plot' }, { status: 500 });
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
    return createForbiddenResponse('Only farmers can delete land plots');
  }

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const existing = await getLandPlotById(supabase, id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (existing.farmer_id !== ctx.userId) {
      return createForbiddenResponse('You can only delete your own land plots');
    }

    await deleteLandPlot(supabase, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Land plot delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete land plot' }, { status: 500 });
  }
}
