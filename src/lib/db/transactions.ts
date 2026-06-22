import { SupabaseClient } from '@supabase/supabase-js';
import { Transaction, TransactionTerms } from '@/types/transaction';
import { canAccessTransaction } from '@/lib/transaction-negotiation';

export async function createTransaction(
  supabase: SupabaseClient,
  buyerId: string,
  input: {
    commodity: string;
    volume: number;
    volume_unit: string;
    price_per_unit?: number | null;
    total_value?: number | null;
    delivery_province: string;
    delivery_city?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    farmer_id?: string | null;
    status?: string;
    terms?: TransactionTerms | null;
  }
) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({ buyer_id: buyerId, ...input })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserTransactions(
  supabase: SupabaseClient,
  userId: string,
  limit = 20
) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return ((data || []) as Transaction[])
    .filter((transaction) => canAccessTransaction(transaction, userId))
    .slice(0, limit);
}

export async function getTransactionById(
  supabase: SupabaseClient,
  id: string
) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateTransaction(
  supabase: SupabaseClient,
  id: string,
  updates: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
