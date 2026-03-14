import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTransaction, getUserTransactions } from '@/lib/db/transactions';
import { CreateTransactionInput } from '@/types/transaction';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const transactions = await getUserTransactions(supabase, user.id);
    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: CreateTransactionInput = await request.json();

    const transaction = await createTransaction(supabase, user.id, {
      commodity: body.commodity,
      volume: body.volume,
      volume_unit: body.volumeUnit,
      price_per_unit: body.pricePerUnit,
      delivery_province: body.deliveryProvince,
      delivery_city: body.deliveryCity,
      start_date: body.startDate,
      end_date: body.endDate,
      farmer_id: body.farmerId,
      terms: body.terms,
    });

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error) {
    console.error('Transaction create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
