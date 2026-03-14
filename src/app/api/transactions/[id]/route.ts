import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTransactionById, updateTransaction } from '@/lib/db/transactions';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const transaction = await getTransactionById(supabase, id);

    if (!transaction) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Ensure the user is a party to this transaction
    if (transaction.buyer_id !== user.id && transaction.farmer_id !== user.id) {
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Verify the user is a party to this transaction before allowing update
    const existing = await getTransactionById(supabase, id);
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (existing.buyer_id !== user.id && existing.farmer_id !== user.id) {
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
