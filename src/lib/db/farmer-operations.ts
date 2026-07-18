import { SupabaseClient } from '@supabase/supabase-js';
import {
  CreateFinancingOpportunityInput,
  CreateLogisticsPlanInput,
  FarmerActivitySummary,
  FarmerFinancingOpportunity,
  FarmerLogisticsPlan,
  FarmerOperationsData,
  LogisticsCheckpoint,
} from '@/types/farmer-operations';
import { Transaction } from '@/types/transaction';

/**
 * Marks any existing 'current' checkpoint as 'done' and appends the new
 * one as 'current'. Shared by the plain-JSON checkpoint PATCH and the
 * photo-upload checkpoint route so both stay in sync.
 */
export function buildAppendedCheckpoints(
  checkpoints: LogisticsCheckpoint[],
  newCheckpoint: { label: string; lat: number; lng: number; photoPath?: string | null }
): LogisticsCheckpoint[] {
  const next = checkpoints.map((checkpoint) =>
    checkpoint.status === 'current' ? { ...checkpoint, status: 'done' as const } : checkpoint
  );
  next.push({
    label: newCheckpoint.label,
    time: new Date().toISOString(),
    lat: newCheckpoint.lat,
    lng: newCheckpoint.lng,
    status: 'current',
    photo_path: newCheckpoint.photoPath ?? null,
  });
  return next;
}

export async function getFarmerOperations(
  supabase: SupabaseClient,
  farmerId: string
): Promise<FarmerOperationsData> {
  const [financingResult, logisticsResult, summariesResult] = await Promise.all([
    supabase
      .from('farmer_financing_opportunities')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('fit_score', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('farmer_logistics_plans')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('pickup_time', { ascending: true }),
    supabase
      .from('farmer_activity_summaries')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('updated_at', { ascending: false }),
  ]);

  if (financingResult.error) throw financingResult.error;
  if (logisticsResult.error) throw logisticsResult.error;
  if (summariesResult.error) throw summariesResult.error;

  return {
    financing: (financingResult.data || []) as FarmerFinancingOpportunity[],
    logistics: (logisticsResult.data || []) as FarmerLogisticsPlan[],
    summaries: (summariesResult.data || []) as FarmerActivitySummary[],
  };
}

export async function getLogisticsPlanByTransactionId(
  supabase: SupabaseClient,
  transactionId: string
): Promise<FarmerLogisticsPlan | null> {
  const { data, error } = await supabase
    .from('farmer_logistics_plans')
    .select('*')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (error) throw error;
  return data as FarmerLogisticsPlan | null;
}

export async function createLogisticsPlan(
  supabase: SupabaseClient,
  input: CreateLogisticsPlanInput
): Promise<FarmerLogisticsPlan> {
  const { data, error } = await supabase
    .from('farmer_logistics_plans')
    .insert({
      farmer_id: input.farmerId,
      transaction_id: input.transactionId,
      provider_name: input.providerName,
      commodity: input.commodity,
      volume: input.volume,
      volume_unit: input.volumeUnit,
      pickup_address: input.pickupAddress,
      pickup_lat: input.pickupLat,
      pickup_lng: input.pickupLng,
      destination_address: input.destinationAddress,
      destination_lat: input.destinationLat,
      destination_lng: input.destinationLng,
      current_lat: input.pickupLat,
      current_lng: input.pickupLng,
      pickup_time: input.pickupTime ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FarmerLogisticsPlan;
}

export async function updateLogisticsPlan(
  supabase: SupabaseClient,
  id: string,
  updates: Record<string, unknown>
): Promise<FarmerLogisticsPlan> {
  const { data, error } = await supabase
    .from('farmer_logistics_plans')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as FarmerLogisticsPlan;
}

/**
 * All transactions in a financeable stage — unfiltered by participant/ownership,
 * same rationale as the government simulation view: finance is neither buyer nor
 * farmer on a real transaction, so the normal per-user filter would show nothing.
 */
export async function getFinanceableTransactions(supabase: SupabaseClient): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .in('status', ['accepted', 'in_progress', 'completed'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Transaction[];
}

export async function getMyFinancingOffers(
  supabase: SupabaseClient,
  financeUserId: string
): Promise<FarmerFinancingOpportunity[]> {
  const { data, error } = await supabase
    .from('farmer_financing_opportunities')
    .select('*')
    .eq('created_by', financeUserId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as FarmerFinancingOpportunity[];
}

export async function getFinancingOpportunityById(
  supabase: SupabaseClient,
  id: string
): Promise<FarmerFinancingOpportunity | null> {
  const { data, error } = await supabase
    .from('farmer_financing_opportunities')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as FarmerFinancingOpportunity | null;
}

export async function createFinancingOpportunity(
  supabase: SupabaseClient,
  input: CreateFinancingOpportunityInput
): Promise<FarmerFinancingOpportunity> {
  const { data, error } = await supabase
    .from('farmer_financing_opportunities')
    .insert({
      farmer_id: input.farmerId,
      transaction_id: input.transactionId,
      created_by: input.createdBy,
      institution_name: input.institutionName,
      product_name: input.productName,
      amount_min: input.amountMin,
      amount_max: input.amountMax,
      interest_rate: input.interestRate ?? null,
      tenor_months: input.tenorMonths ?? null,
      requirements: input.requirements ?? [],
      contact: input.contact ?? {},
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FarmerFinancingOpportunity;
}

export async function updateFinancingOpportunity(
  supabase: SupabaseClient,
  id: string,
  updates: Record<string, unknown>
): Promise<FarmerFinancingOpportunity> {
  const { data, error } = await supabase
    .from('farmer_financing_opportunities')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as FarmerFinancingOpportunity;
}
