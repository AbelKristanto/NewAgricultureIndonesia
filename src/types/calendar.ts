export type CalendarActivityType = 'watering' | 'fertilizing' | 'pesticide' | 'harvest' | 'delivery' | 'other';

export interface CalendarInput {
  landPlotId: string;
  commodity: string;
  plantingDate: string;
  province: string;
  lang: 'en' | 'id';
}

export interface CalendarActivity {
  type: CalendarActivityType;
  label: string;
  suggestedDate: string;
  notes: string;
}

export interface CalendarAnalysis {
  activities: CalendarActivity[];
  summary?: string;
  rawText?: string;
}
