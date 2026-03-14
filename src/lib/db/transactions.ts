import { SupabaseClient } from '@supabase/supabase-js';

export async function createTransaction(
  supabase: SupabaseClient,
  buyerId: string,
  input: {
    commodity: string;
    volume: number;
    volume_unit: string;
    price_per_unit?: number;
    total_value?: number;
    delivery_province: string;
    delivery_city?: string;
    start_date?: string;
    end_date?: string;
    farmer_id?: string;
    status?: string;
    terms?: Record<string, unknown>;
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
    .or(`buyer_id.eq.${userId},farmer_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
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
