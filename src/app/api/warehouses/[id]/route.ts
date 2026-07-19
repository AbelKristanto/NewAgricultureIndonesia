import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteWarehouse, getWarehouseById, updateWarehouse } from '@/lib/db/warehouses';
import { UpdateWarehouseInput } from '@/types/warehouse';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

function buildUpdates(body: UpdateWarehouseInput): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.province !== undefined) updates.province = body.province;
  if (body.city !== undefined) updates.city = body.city;
  if (body.capacityValue !== undefined) updates.capacity_value = body.capacityValue;
  if (body.capacityUnit !== undefined) updates.capacity_unit = body.capacityUnit;
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

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const existing = await getWarehouseById(supabase, id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (existing.owner_id !== ctx.userId) {
      return createForbiddenResponse('You can only update your own warehouses');
    }

    const body = await request.json() as UpdateWarehouseInput;
    const updates = buildUpdates(body);
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await updateWarehouse(supabase, id, updates);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Warehouse update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update warehouse' }, { status: 500 });
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

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const existing = await getWarehouseById(supabase, id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (existing.owner_id !== ctx.userId) {
      return createForbiddenResponse('You can only delete your own warehouses');
    }

    await deleteWarehouse(supabase, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Warehouse delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete warehouse' }, { status: 500 });
  }
}
