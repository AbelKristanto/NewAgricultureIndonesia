import { SupabaseClient } from '@supabase/supabase-js';
import {
  BuyerDemandListing,
  CreateDemandListingInput,
  CreateSupplyListingInput,
  FarmerSupplyListing,
} from '@/types/listings';

export async function createSupplyListing(
  supabase: SupabaseClient,
  farmerId: string,
  input: CreateSupplyListingInput
): Promise<FarmerSupplyListing> {
  const { data, error } = await supabase
    .from('farmer_supply_listings')
    .insert({
      farmer_id: farmerId,
      commodity: input.commodity,
      volume: input.volume,
      volume_unit: input.volumeUnit,
      quality_grade: input.qualityGrade,
      region_province: input.regionProvince,
      region_city: input.regionCity ?? null,
      timeline: input.timeline,
      price_expectation: input.priceExpectation ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FarmerSupplyListing;
}

export async function createDemandListing(
  supabase: SupabaseClient,
  buyerId: string,
  input: CreateDemandListingInput
): Promise<BuyerDemandListing> {
  const { data, error } = await supabase
    .from('buyer_demand_listings')
    .insert({
      buyer_id: buyerId,
      commodity: input.commodity,
      volume: input.volume,
      volume_unit: input.volumeUnit,
      quality_grade: input.qualityGrade,
      delivery_province: input.deliveryProvince,
      delivery_city: input.deliveryCity ?? null,
      timeline: input.timeline,
      price_expectation: input.priceExpectation ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as BuyerDemandListing;
}

export async function getMySupplyListings(
  supabase: SupabaseClient,
  farmerId: string
): Promise<FarmerSupplyListing[]> {
  const { data, error } = await supabase
    .from('farmer_supply_listings')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as FarmerSupplyListing[];
}

export async function getMyDemandListings(
  supabase: SupabaseClient,
  buyerId: string
): Promise<BuyerDemandListing[]> {
  const { data, error } = await supabase
    .from('buyer_demand_listings')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as BuyerDemandListing[];
}

export async function getActiveSupplyListings(
  supabase: SupabaseClient,
  excludeFarmerId?: string
): Promise<FarmerSupplyListing[]> {
  let query = supabase
    .from('farmer_supply_listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (excludeFarmerId) {
    query = query.neq('farmer_id', excludeFarmerId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as FarmerSupplyListing[];
}

export async function getActiveDemandListings(
  supabase: SupabaseClient,
  excludeBuyerId?: string
): Promise<BuyerDemandListing[]> {
  let query = supabase
    .from('buyer_demand_listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (excludeBuyerId) {
    query = query.neq('buyer_id', excludeBuyerId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as BuyerDemandListing[];
}

export async function getSupplyListingById(
  supabase: SupabaseClient,
  id: string
): Promise<FarmerSupplyListing | null> {
  const { data, error } = await supabase
    .from('farmer_supply_listings')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as FarmerSupplyListing | null;
}

export async function getDemandListingById(
  supabase: SupabaseClient,
  id: string
): Promise<BuyerDemandListing | null> {
  const { data, error } = await supabase
    .from('buyer_demand_listings')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as BuyerDemandListing | null;
}

export async function updateSupplyListing(
  supabase: SupabaseClient,
  id: string,
  updates: Record<string, unknown>
): Promise<FarmerSupplyListing> {
  const { data, error } = await supabase
    .from('farmer_supply_listings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as FarmerSupplyListing;
}

export async function updateDemandListing(
  supabase: SupabaseClient,
  id: string,
  updates: Record<string, unknown>
): Promise<BuyerDemandListing> {
  const { data, error } = await supabase
    .from('buyer_demand_listings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as BuyerDemandListing;
}

export async function deleteSupplyListing(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('farmer_supply_listings').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteDemandListing(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('buyer_demand_listings').delete().eq('id', id);
  if (error) throw error;
}

export async function markListingsMatched(
  supabase: SupabaseClient,
  supplyListingId: string,
  demandListingId: string,
  transactionId: string
): Promise<void> {
  const [supplyResult, demandResult] = await Promise.all([
    supabase
      .from('farmer_supply_listings')
      .update({ status: 'matched', matched_transaction_id: transactionId })
      .eq('id', supplyListingId),
    supabase
      .from('buyer_demand_listings')
      .update({ status: 'matched', matched_transaction_id: transactionId })
      .eq('id', demandListingId),
  ]);

  if (supplyResult.error) throw supplyResult.error;
  if (demandResult.error) throw demandResult.error;
}
