import { SupabaseClient } from '@supabase/supabase-js';
import { PlantScan, PlantScanResult } from '@/types/plant-scan';

export async function getPlantScans(supabase: SupabaseClient, farmerId: string, limit = 20): Promise<PlantScan[]> {
  const { data, error } = await supabase
    .from('plant_scans')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as PlantScan[];
}

export async function createPlantScan(
  supabase: SupabaseClient,
  farmerId: string,
  landPlotId: string | null,
  photoPath: string,
  result: PlantScanResult | { rawText: string }
): Promise<PlantScan> {
  const { data, error } = await supabase
    .from('plant_scans')
    .insert({
      farmer_id: farmerId,
      land_plot_id: landPlotId,
      photo_path: photoPath,
      result,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PlantScan;
}
