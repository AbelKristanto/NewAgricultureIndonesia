export interface BuyerInput {
  commodityType: string;
  volume: number;
  volumeUnit: 'tons' | 'kg';
  qualityGrade: string;
  deliveryProvince: string;
  deliveryCity: string;
  startMonth: string;
  endMonth: string;
  frequency: string;
  budgetMin: number;
  budgetMax: number;
  specialRequirements: string;
  lang: 'en' | 'id';
}

export interface BuyerAnalysis {
  productionRegions: string;
  supplyCapacity: string;
  logisticsRoutes: string;
  deliveryTimeline: string;
  supplyRisk: string;
  recommendedSuppliers: string;
  rawText?: string;
}
