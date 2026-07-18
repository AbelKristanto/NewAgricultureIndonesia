import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createPayment, getPaymentsForTransaction } from '@/lib/db/payments';
import { getTransactionById } from '@/lib/db/transactions';
import { canAccessTransaction } from '@/lib/transaction-negotiation';
import { createSnapTransaction } from '@/lib/midtrans';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

const PAYABLE_STATUSES = ['accepted', 'in_progress', 'completed'];

export async function GET(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get('transactionId');
  if (!transactionId) {
    return NextResponse.json({ success: false, error: 'transactionId is required' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const transaction = await getTransactionById(supabase, transactionId);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    if (!canAccessTransaction(transaction, ctx.userId)) {
      return createForbiddenResponse('You do not have access to this transaction');
    }

    const payments = await getPaymentsForTransaction(supabase, transactionId);
    return NextResponse.json({ success: true, data: payments });
  } catch (error) {
    console.error('Payments fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'buyer') {
    return createForbiddenResponse('Only buyers can initiate payment');
  }

  try {
    const body = await request.json() as { transactionId?: string };
    if (!body.transactionId) {
      return NextResponse.json({ success: false, error: 'transactionId is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const transaction = await getTransactionById(supabase, body.transactionId);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    if (transaction.buyer_id !== ctx.userId) {
      return createForbiddenResponse('Only the buyer on this transaction can pay for it');
    }
    if (!PAYABLE_STATUSES.includes(transaction.status)) {
      return NextResponse.json(
        { success: false, error: 'Transaction must be accepted before it can be paid' },
        { status: 400 }
      );
    }
    if (!transaction.total_value) {
      return NextResponse.json(
        { success: false, error: 'Transaction has no agreed total value yet' },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', ctx.userId)
      .maybeSingle();

    const orderId = `TRX-${transaction.id.slice(0, 8)}-${Date.now()}`;
    const snap = await createSnapTransaction({
      orderId,
      grossAmount: transaction.total_value,
      customer: { firstName: profile?.username || 'Buyer' },
    });

    const payment = await createPayment(supabase, {
      transactionId: transaction.id,
      orderId,
      amount: transaction.total_value,
      snapToken: snap.token,
    });

    return NextResponse.json({ success: true, data: { snapToken: snap.token, orderId, payment } }, { status: 201 });
  } catch (error) {
    console.error('Payment initiation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to initiate payment' }, { status: 500 });
  }
}
