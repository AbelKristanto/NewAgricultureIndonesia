import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPaymentByOrderId, updatePaymentByOrderId } from '@/lib/db/payments';
import { getTransactionById } from '@/lib/db/transactions';
import { createNotification } from '@/lib/db/notifications';
import { buildPaymentNotification } from '@/lib/notification-copy';
import { verifyNotificationSignature } from '@/lib/midtrans';
import { PaymentStatus } from '@/types/payment';

const KNOWN_STATUSES: PaymentStatus[] = [
  'pending', 'settlement', 'capture', 'deny', 'cancel', 'expire', 'failure',
];

interface MidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  payment_type?: string;
  [key: string]: unknown;
}

export async function POST(request: Request) {
  let body: MidtransNotification;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (!body.order_id || !body.status_code || !body.gross_amount || !body.signature_key) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const validSignature = verifyNotificationSignature({
    order_id: body.order_id,
    status_code: body.status_code,
    gross_amount: body.gross_amount,
    signature_key: body.signature_key,
  });

  if (!validSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const payment = await getPaymentByOrderId(supabase, body.order_id);
    if (!payment) {
      console.error('Midtrans webhook: no payment found for order_id', body.order_id);
      return NextResponse.json({ success: true });
    }

    const nextStatus = body.transaction_status as PaymentStatus;
    if (!KNOWN_STATUSES.includes(nextStatus)) {
      console.error('Midtrans webhook: unrecognized transaction_status', body.transaction_status);
      return NextResponse.json({ success: true });
    }

    await updatePaymentByOrderId(supabase, body.order_id, {
      status: nextStatus,
      paymentType: body.payment_type ?? null,
      rawNotification: body,
    });

    try {
      if (nextStatus === 'settlement' || nextStatus === 'capture') {
        const transaction = await getTransactionById(supabase, payment.transaction_id);
        if (transaction) {
          const copy = buildPaymentNotification('succeeded', transaction.commodity, payment.amount);
          const recipients = [transaction.buyer_id, transaction.farmer_id].filter(Boolean) as string[];
          for (const userId of recipients) {
            await createNotification(supabase, {
              userId,
              type: copy.type,
              title: copy.title,
              body: copy.body,
              link: '/dashboard/transactions',
              relatedTransactionId: transaction.id,
            });
          }
        }
      } else if (['deny', 'cancel', 'expire', 'failure'].includes(nextStatus)) {
        const transaction = await getTransactionById(supabase, payment.transaction_id);
        if (transaction) {
          const copy = buildPaymentNotification('failed', transaction.commodity, payment.amount);
          await createNotification(supabase, {
            userId: transaction.buyer_id,
            type: copy.type,
            title: copy.title,
            body: copy.body,
            link: '/dashboard/transactions',
            relatedTransactionId: transaction.id,
          });
        }
      }
    } catch (notificationError) {
      console.error('Failed to create payment notification:', notificationError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Midtrans webhook processing error:', error);
    // Non-2xx so Midtrans retries — this is a genuine write failure, not
    // just a best-effort notification miss (that's handled separately above).
    return NextResponse.json({ success: false, error: 'Failed to process notification' }, { status: 500 });
  }
}
