import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTransactionById, updateTransaction } from '@/lib/db/transactions';
import {
  getRequestContext,
  createUnauthorizedResponse,
} from '@/lib/api-helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Extract user context from middleware headers
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  // All authenticated roles permitted — no role check needed

  try {
    const supabase = await createClient();
    const { id } = await params;
    const transaction = await getTransactionById(supabase, id);

    if (!transaction) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Ensure the user is a party to this transaction
    if (transaction.buyer_id !== ctx.userId && transaction.farmer_id !== ctx.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Transaction fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transaction' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Extract user context from middleware headers
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  // All authenticated roles permitted — no role check needed

  try {
    const supabase = await createClient();
    const { id } = await params;

    // Verify the user is a party to this transaction before allowing update
    const existing = await getTransactionById(supabase, id);
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (existing.buyer_id !== ctx.userId && existing.farmer_id !== ctx.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Only allow specific fields to be updated
    const allowedFields: Record<string, unknown> = {};
    const updatable = ['status', 'farmer_id', 'price_per_unit', 'total_value', 'terms', 'start_date', 'end_date'] as const;
    for (const field of updatable) {
      if (body[field] !== undefined) {
        allowedFields[field] = body[field];
      }
    }

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await updateTransaction(supabase, id, allowedFields);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Transaction update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}
