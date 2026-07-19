import { SupabaseClient } from '@supabase/supabase-js';
import { CreateLandPlotInput, LandPlot } from '@/types/land-plots';

export async function getLandPlots(supabase: SupabaseClient, farmerId: string): Promise<LandPlot[]> {
  const { data, error } = await supabase
    .from('land_plots')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as LandPlot[];
}

export async function getLandPlotById(supabase: SupabaseClient, id: string): Promise<LandPlot | null> {
  const { data, error } = await supabase
    .from('land_plots')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as LandPlot | null;
}

export async function createLandPlot(
  supabase: SupabaseClient,
  farmerId: string,
  input: CreateLandPlotInput
): Promise<LandPlot> {
  const { data, error } = await supabase
    .from('land_plots')
    .insert({
      farmer_id: farmerId,
      name: input.name,
      province: input.province,
      district: input.district ?? null,
      area_value: input.areaValue,
      area_unit: input.areaUnit,
      commodity: input.commodity ?? null,
      planting_date: input.plantingDate ?? null,
      harvest_estimate: input.harvestEstimate ?? null,
      status: input.status ?? 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data as LandPlot;
}

export async function updateLandPlot(
  supabase: SupabaseClient,
  id: string,
  updates: Record<string, unknown>
): Promise<LandPlot> {
  const { data, error } = await supabase
    .from('land_plots')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as LandPlot;
}

export async function deleteLandPlot(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('land_plots').delete().eq('id', id);
  if (error) throw error;
}
