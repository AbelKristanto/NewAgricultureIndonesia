export type PesticideUsage = 'none' | 'low' | 'moderate' | 'high';
export type WasteManagement = 'none' | 'basic' | 'advanced';
export type SustainabilityTier = 'bronze' | 'silver' | 'gold';

export interface SustainabilityAssessment {
  id: string;
  farmer_id: string;
  land_plot_id: string | null;
  water_conservation: boolean;
  pesticide_usage: PesticideUsage;
  organic_certified: boolean;
  crop_rotation: boolean;
  waste_management: WasteManagement;
  score: number;
  created_at: string;
}

export interface SustainabilityAssessmentWithUsername extends SustainabilityAssessment {
  farmer_username: string | null;
}

export interface CreateAssessmentInput {
  landPlotId?: string;
  waterConservation: boolean;
  pesticideUsage: PesticideUsage;
  organicCertified: boolean;
  cropRotation: boolean;
  wasteManagement: WasteManagement;
}
