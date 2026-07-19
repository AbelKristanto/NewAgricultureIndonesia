export interface PlantScanResult {
  diagnosis: string;
  confidence: 'low' | 'medium' | 'high';
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  recommendedActions: string[];
}

export interface PlantScan {
  id: string;
  farmer_id: string;
  land_plot_id: string | null;
  photo_path: string;
  photo_url?: string | null;
  result: PlantScanResult | { rawText: string };
  created_at: string;
}
