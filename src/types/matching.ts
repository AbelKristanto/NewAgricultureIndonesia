export interface MatchingInput {
  commodity: string;
  volume: number;
  volumeUnit: 'tons' | 'kg';
  deliveryProvince: string;
  deliveryCity: string;
  qualityGrade: string;
  timeline: string;
  notes: string;
  lang: 'en' | 'id';
}

export interface MatchingAnalysis {
  matchedRegions: string;
  capacityEstimates: string;
  logisticsFeasibility: string;
  timeline: string;
  priceAnalysis: string;
  recommendations: string;
  rawText?: string;
}
