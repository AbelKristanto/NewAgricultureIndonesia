export type LandPlotStatus = 'active' | 'fallow' | 'harvested';
export type LandAreaUnit = 'hectares' | 'm2';

export interface LandPlot {
  id: string;
  farmer_id: string;
  name: string;
  province: string;
  district: string | null;
  area_value: number;
  area_unit: LandAreaUnit;
  commodity: string | null;
  planting_date: string | null;
  harvest_estimate: string | null;
  status: LandPlotStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateLandPlotInput {
  name: string;
  province: string;
  district?: string;
  areaValue: number;
  areaUnit: LandAreaUnit;
  commodity?: string;
  plantingDate?: string;
  harvestEstimate?: string;
  status?: LandPlotStatus;
}

export type UpdateLandPlotInput = Partial<CreateLandPlotInput>;
