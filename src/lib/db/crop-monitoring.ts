import { SupabaseClient } from '@supabase/supabase-js';
import { CropLogType, CropMonitoringLog } from '@/types/crop-monitoring';

export async function getCropLogs(supabase: SupabaseClient, landPlotId: string): Promise<CropMonitoringLog[]> {
  const { data, error } = await supabase
    .from('crop_monitoring_logs')
    .select('*')
    .eq('land_plot_id', landPlotId)
    .order('logged_at', { ascending: false });

  if (error) throw error;
  return (data || []) as CropMonitoringLog[];
}

export async function createCropLog(
  supabase: SupabaseClient,
  farmerId: string,
  landPlotId: string,
  logType: CropLogType,
  notes: string | null,
  photoPath: string | null
): Promise<CropMonitoringLog> {
  const { data, error } = await supabase
    .from('crop_monitoring_logs')
    .insert({
      farmer_id: farmerId,
      land_plot_id: landPlotId,
      log_type: logType,
      notes,
      photo_path: photoPath,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CropMonitoringLog;
}
