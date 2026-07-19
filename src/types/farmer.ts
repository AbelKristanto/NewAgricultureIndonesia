export interface FarmerInput {
  province: string;
  district: string;
  landSize: number;
  landUnit: 'hectares' | 'm2';
  soilType: string;
  waterSources: string[];
  currentCrops: string;
  budget: number;
  timeline: string;
  notes: string;
  lang: 'en' | 'id';
  landPlotId?: string | null;
}

export interface CropRecommendation {
  crop: string;
  suitabilityScore: number;
  reasoning: string;
  plantingSeason: string;
}

export interface YieldEstimate {
  crop: string;
  estimatedYieldPerHa: string;
  unit: string;
}

export interface CostProjection {
  category: string;
  estimatedCost: string;
  notes: string;
}

export interface FarmerAnalysis {
  cropRecommendations: CropRecommendation[];
  yieldEstimates: YieldEstimate[];
  costProjections: CostProjection[];
  weatherRisks: string;
  buyerMatching: string;
  inputRequirements: string;
  subsidies: string;
  rawText?: string;
}
