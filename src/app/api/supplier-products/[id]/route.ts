import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteSupplierProduct, getSupplierProductById, updateSupplierProduct } from '@/lib/db/supplier-products';
import { INPUT_ITEM_TYPES } from '@/lib/constants';
import { UpdateSupplierProductInput } from '@/types/supplier-products';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

const VALID_TYPES = INPUT_ITEM_TYPES.map((t) => t.value);
const VALID_STATUSES = ['active', 'inactive'];

function buildUpdates(body: UpdateSupplierProductInput): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (body.productName !== undefined) updates.product_name = body.productName;
  if (body.productType !== undefined && VALID_TYPES.includes(body.productType)) updates.product_type = body.productType;
  if (body.unit !== undefined) updates.unit = body.unit;
  if (body.pricePerUnit !== undefined) updates.price_per_unit = body.pricePerUnit;
  if (body.stockQuantity !== undefined) updates.stock_quantity = body.stockQuantity;
  if (body.description !== undefined) updates.description = body.description;
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
  if (ctx.userRole !== 'supplier') {
    return createForbiddenResponse('Only suppliers can update products');
  }

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const existing = await getSupplierProductById(supabase, id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (existing.supplier_id !== ctx.userId) {
      return createForbiddenResponse('You can only update your own products');
    }

    const body = await request.json() as UpdateSupplierProductInput;
    const updates = buildUpdates(body);
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await updateSupplierProduct(supabase, id, updates);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Supplier product update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update product' }, { status: 500 });
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
  if (ctx.userRole !== 'supplier') {
    return createForbiddenResponse('Only suppliers can delete products');
  }

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const existing = await getSupplierProductById(supabase, id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (existing.supplier_id !== ctx.userId) {
      return createForbiddenResponse('You can only delete your own products');
    }

    await deleteSupplierProduct(supabase, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Supplier product delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete product' }, { status: 500 });
  }
}
