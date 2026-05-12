import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTransaction, getUserTransactions } from '@/lib/db/transactions';
import { CreateTransactionInput } from '@/types/transaction';
import {
  getRequestContext,
  createUnauthorizedResponse,
} from '@/lib/api-helpers';

export async function GET(request: Request) {
  // Extract user context from middleware headers
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  // All authenticated roles permitted — no role check needed

  try {
    const supabase = await createClient();
    const transactions = await getUserTransactions(supabase, ctx.userId);
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
  // Extract user context from middleware headers
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  // All authenticated roles permitted — no role check needed

  try {
    const supabase = await createClient();
    const body: CreateTransactionInput = await request.json();

    const transaction = await createTransaction(supabase, ctx.userId, {
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
