export type CropLogType = 'watering' | 'fertilizing' | 'condition_note' | 'other';

export interface CropMonitoringLog {
  id: string;
  land_plot_id: string;
  farmer_id: string;
  log_type: CropLogType;
  notes: string | null;
  photo_path: string | null;
  photo_url?: string | null;
  logged_at: string;
  created_at: string;
}
