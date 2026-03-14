export interface PolicyQuery {
  regions: string[];
  commodities: string[];
  analysisTypes: string[];
  timeHorizon: string;
  lang: 'en' | 'id';
}

export interface PolicyInsights {
  productionOverview: string;
  supplyDemandAnalysis: string;
  riskZones: string;
  policyRecommendations: string;
  priorityActions: string;
  rawText?: string;
}
