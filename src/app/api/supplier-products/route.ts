import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSupplierProduct, getSupplierProducts } from '@/lib/db/supplier-products';
import { CreateSupplierProductInput } from '@/types/supplier-products';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

export async function GET(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'supplier') {
    return createForbiddenResponse('Only suppliers can view their product catalog');
  }

  try {
    const supabase = createAdminClient();
    const products = await getSupplierProducts(supabase, ctx.userId);
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error('Supplier products fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'supplier') {
    return createForbiddenResponse('Only suppliers can add products');
  }

  try {
    const body = await request.json() as Partial<CreateSupplierProductInput>;
    if (!body.productName || !body.unit || body.pricePerUnit == null) {
      return NextResponse.json(
        { success: false, error: 'productName, unit, and pricePerUnit are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const product = await createSupplierProduct(supabase, ctx.userId, body as CreateSupplierProductInput);
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    console.error('Supplier product create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create product' }, { status: 500 });
  }
}
