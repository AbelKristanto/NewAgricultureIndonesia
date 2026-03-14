export interface WeatherInput {
  regions: string[];
  crops: string[];
  scenario: string;
  season: string;
  notes: string;
  lang: 'en' | 'id';
}

export interface WeatherAnalysis {
  impactAssessment: string;
  cropAdjustments: string;
  irrigationPlanning: string;
  revisedSchedule: string;
  mitigationStrategies: string;
  riskLevel: string;
  rawText?: string;
}
