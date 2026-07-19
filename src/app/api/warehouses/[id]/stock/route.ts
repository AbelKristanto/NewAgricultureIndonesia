import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createStockEntry, getStockEntries, getWarehouseById } from '@/lib/db/warehouses';
import { CreateStockEntryInput } from '@/types/warehouse';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

export async function GET(
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

    const warehouse = await getWarehouseById(supabase, id);
    if (!warehouse) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (warehouse.owner_id !== ctx.userId) {
      return createForbiddenResponse('You can only view stock for your own warehouses');
    }

    const entries = await getStockEntries(supabase, id);
    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    console.error('Warehouse stock fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stock entries' }, { status: 500 });
  }
}

export async function POST(
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

    const warehouse = await getWarehouseById(supabase, id);
    if (!warehouse) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (warehouse.owner_id !== ctx.userId) {
      return createForbiddenResponse('You can only record stock for your own warehouses');
    }

    const body = await request.json() as Partial<CreateStockEntryInput>;
    if (!body.commodity || !body.quantity || !body.entryType) {
      return NextResponse.json(
        { success: false, error: 'commodity, quantity, and entryType are required' },
        { status: 400 }
      );
    }
    if (body.entryType !== 'in' && body.entryType !== 'out') {
      return NextResponse.json({ success: false, error: 'entryType must be "in" or "out"' }, { status: 400 });
    }

    const entry = await createStockEntry(supabase, id, body as CreateStockEntryInput);
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error) {
    console.error('Warehouse stock create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to record stock entry' }, { status: 500 });
  }
}
