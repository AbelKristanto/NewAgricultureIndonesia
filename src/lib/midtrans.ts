/**
 * Server-only Midtrans Snap client (sandbox).
 * Reads MIDTRANS_SERVER_KEY — never import in client components.
 */

import { createHash } from 'crypto';

const SNAP_BASE_URL = 'https://app.sandbox.midtrans.com/snap/v1';

interface CreateSnapTransactionInput {
  orderId: string;
  grossAmount: number;
  customer: {
    firstName: string;
    email?: string;
  };
}

interface SnapTransactionResult {
  token: string;
  redirect_url: string;
}

export async function createSnapTransaction(
  input: CreateSnapTransactionInput
): Promise<SnapTransactionResult> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY!;
  const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;

  const res = await fetch(`${SNAP_BASE_URL}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.orderId,
        gross_amount: Math.round(input.grossAmount),
      },
      customer_details: {
        first_name: input.customer.firstName,
        email: input.customer.email,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Midtrans Snap transaction failed (${res.status}): ${body}`);
  }

  return res.json();
}

interface VerifyNotificationSignatureInput {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}

export function verifyNotificationSignature(input: VerifyNotificationSignatureInput): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY!;
  const expected = createHash('sha512')
    .update(`${input.order_id}${input.status_code}${input.gross_amount}${serverKey}`)
    .digest('hex');

  return expected === input.signature_key;
}
