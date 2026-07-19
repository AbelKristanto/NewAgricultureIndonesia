import { SupabaseClient } from '@supabase/supabase-js';
import { ContractStatus, CreateContractInput, FarmingContract } from '@/types/contract';

const CONTRACT_STATUS_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  proposed: ['active', 'cancelled'],
  active: ['fulfilled', 'breached', 'cancelled'],
  fulfilled: [],
  breached: [],
  cancelled: [],
};

export function isContractTransitionAllowed(current: ContractStatus, next: ContractStatus): boolean {
  return CONTRACT_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

export async function getContracts(
  supabase: SupabaseClient,
  userId: string,
  role: 'farmer' | 'buyer'
): Promise<FarmingContract[]> {
  const column = role === 'farmer' ? 'farmer_id' : 'buyer_id';
  const { data, error } = await supabase
    .from('farming_contracts')
    .select('*')
    .eq(column, userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as FarmingContract[];
}

export async function getContractById(supabase: SupabaseClient, id: string): Promise<FarmingContract | null> {
  const { data, error } = await supabase
    .from('farming_contracts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as FarmingContract | null;
}

export async function createContract(
  supabase: SupabaseClient,
  creatorId: string,
  creatorRole: 'farmer' | 'buyer',
  input: CreateContractInput
): Promise<FarmingContract> {
  const farmerId = creatorRole === 'farmer' ? creatorId : input.counterpartyId;
  const buyerId = creatorRole === 'buyer' ? creatorId : input.counterpartyId;

  const { data, error } = await supabase
    .from('farming_contracts')
    .insert({
      farmer_id: farmerId,
      buyer_id: buyerId,
      commodity: input.commodity,
      agreed_volume: input.agreedVolume,
      volume_unit: input.volumeUnit ?? 'kg',
      agreed_price_per_unit: input.agreedPricePerUnit ?? null,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      delivery_schedule: input.deliverySchedule ?? null,
      terms: input.terms ?? null,
      created_by: creatorId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FarmingContract;
}

export async function updateContractStatus(
  supabase: SupabaseClient,
  id: string,
  status: ContractStatus
): Promise<FarmingContract> {
  const { data, error } = await supabase
    .from('farming_contracts')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as FarmingContract;
}
