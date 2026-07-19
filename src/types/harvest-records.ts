export type HarvestOutcome = 'success' | 'partial' | 'failed';
export type YieldUnit = 'kg' | 'ton' | 'quintal';

export interface HarvestRecord {
  id: string;
  land_plot_id: string;
  farmer_id: string;
  commodity: string;
  season_start: string | null;
  season_end: string;
  yield_value: number | null;
  yield_unit: YieldUnit;
  revenue: number | null;
  cost: number | null;
  outcome: HarvestOutcome;
  failure_reason: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateHarvestRecordInput {
  landPlotId: string;
  commodity: string;
  seasonStart?: string;
  seasonEnd?: string;
  yieldValue?: number;
  yieldUnit?: YieldUnit;
  revenue?: number;
  cost?: number;
  outcome?: HarvestOutcome;
  failureReason?: string;
  notes?: string;
}
