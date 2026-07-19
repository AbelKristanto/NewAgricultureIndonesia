import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createWarehouse, getWarehouses } from '@/lib/db/warehouses';
import { CreateWarehouseInput } from '@/types/warehouse';
import {
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

export async function GET(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  try {
    const supabase = createAdminClient();
    const warehouses = await getWarehouses(supabase, ctx.userId);
    return NextResponse.json({ success: true, data: warehouses });
  } catch (error) {
    console.error('Warehouses fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch warehouses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  try {
    const body = await request.json() as Partial<CreateWarehouseInput>;
    if (!body.name || !body.province) {
      return NextResponse.json({ success: false, error: 'name and province are required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const warehouse = await createWarehouse(supabase, ctx.userId, body as CreateWarehouseInput);
    return NextResponse.json({ success: true, data: warehouse }, { status: 201 });
  } catch (error) {
    console.error('Warehouse create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create warehouse' }, { status: 500 });
  }
}
