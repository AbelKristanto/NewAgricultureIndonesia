import { SupabaseClient } from '@supabase/supabase-js';
import { CreateHarvestRecordInput, HarvestRecord } from '@/types/harvest-records';

export async function getHarvestRecords(supabase: SupabaseClient, farmerId: string): Promise<HarvestRecord[]> {
  const { data, error } = await supabase
    .from('harvest_records')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('season_end', { ascending: false });

  if (error) throw error;
  return (data || []) as HarvestRecord[];
}

export async function createHarvestRecord(
  supabase: SupabaseClient,
  farmerId: string,
  input: CreateHarvestRecordInput
): Promise<HarvestRecord> {
  const { data, error } = await supabase
    .from('harvest_records')
    .insert({
      farmer_id: farmerId,
      land_plot_id: input.landPlotId,
      commodity: input.commodity,
      season_start: input.seasonStart ?? null,
      season_end: input.seasonEnd ?? undefined,
      yield_value: input.yieldValue ?? null,
      yield_unit: input.yieldUnit ?? 'kg',
      revenue: input.revenue ?? null,
      cost: input.cost ?? null,
      outcome: input.outcome ?? 'success',
      failure_reason: input.failureReason ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as HarvestRecord;
}
