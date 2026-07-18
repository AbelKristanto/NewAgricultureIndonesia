import { SupabaseClient } from '@supabase/supabase-js';
import { CreatePaymentInput, Payment, PaymentStatus } from '@/types/payment';

export async function createPayment(
  supabase: SupabaseClient,
  input: CreatePaymentInput
): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      transaction_id: input.transactionId,
      order_id: input.orderId,
      amount: input.amount,
      snap_token: input.snapToken,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Payment;
}

export async function getPaymentsForTransaction(
  supabase: SupabaseClient,
  transactionId: string
): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Payment[];
}

export async function getPaymentByOrderId(
  supabase: SupabaseClient,
  orderId: string
): Promise<Payment | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (error) throw error;
  return data as Payment | null;
}

export async function updatePaymentByOrderId(
  supabase: SupabaseClient,
  orderId: string,
  updates: { status?: PaymentStatus; paymentType?: string | null; rawNotification?: Record<string, unknown> | null }
): Promise<Payment> {
  const payload: Record<string, unknown> = {};
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.paymentType !== undefined) payload.payment_type = updates.paymentType;
  if (updates.rawNotification !== undefined) payload.raw_notification = updates.rawNotification;

  const { data, error } = await supabase
    .from('payments')
    .update(payload)
    .eq('order_id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data as Payment;
}
