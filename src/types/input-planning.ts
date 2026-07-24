export type InputItemType = 'seed' | 'fertilizer' | 'pesticide' | 'equipment' | 'other';
export type InputPlanStatus = 'planned' | 'purchased' | 'used';

export interface FarmerInputPlan {
  id: string;
  farmer_id: string;
  land_plot_id: string | null;
  commodity: string | null;
  season_label: string | null;
  item_name: string;
  item_type: InputItemType;
  quantity: number;
  unit: string;
  unit_cost: number | null;
  status: InputPlanStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInputPlanInput {
  landPlotId?: string;
  commodity?: string;
  seasonLabel?: string;
  itemName: string;
  itemType?: InputItemType;
  quantity: number;
  unit: string;
  unitCost?: number;
  status?: InputPlanStatus;
  notes?: string;
}

export type UpdateInputPlanInput = Partial<CreateInputPlanInput>;
