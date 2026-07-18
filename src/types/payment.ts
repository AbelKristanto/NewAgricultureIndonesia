export type PaymentStatus =
  | 'pending'
  | 'settlement'
  | 'capture'
  | 'deny'
  | 'cancel'
  | 'expire'
  | 'failure';

export interface Payment {
  id: string;
  transaction_id: string;
  order_id: string;
  amount: number;
  status: PaymentStatus;
  payment_type: string | null;
  snap_token: string | null;
  raw_notification: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentInput {
  transactionId: string;
  orderId: string;
  amount: number;
  snapToken: string;
}
