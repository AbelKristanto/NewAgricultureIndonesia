import { SupabaseClient } from '@supabase/supabase-js';

export interface RegionalProvinceData {
  province: string;
  landPlotsByCommodity: Record<string, number>;
  supplyListings: number;
  demandListings: number;
}

export type RegionalDistribution = RegionalProvinceData[];

/**
 * Aggregates real province-level activity from land_plots, farmer_supply_listings,
 * and buyer_demand_listings — `profiles` has no province column, so regional
 * analysis is grounded in these tables instead.
 */
export async function getRegionalDistribution(supabase: SupabaseClient): Promise<RegionalDistribution> {
  const [landPlotsResult, supplyResult, demandResult] = await Promise.all([
    supabase.from('land_plots').select('province, commodity'),
    supabase.from('farmer_supply_listings').select('region_province'),
    supabase.from('buyer_demand_listings').select('delivery_province'),
  ]);

  if (landPlotsResult.error) throw landPlotsResult.error;
  if (supplyResult.error) throw supplyResult.error;
  if (demandResult.error) throw demandResult.error;

  const byProvince = new Map<string, RegionalProvinceData>();

  const getEntry = (province: string) => {
    let entry = byProvince.get(province);
    if (!entry) {
      entry = { province, landPlotsByCommodity: {}, supplyListings: 0, demandListings: 0 };
      byProvince.set(province, entry);
    }
    return entry;
  };

  for (const row of landPlotsResult.data || []) {
    const entry = getEntry(row.province);
    const commodity = row.commodity || 'unknown';
    entry.landPlotsByCommodity[commodity] = (entry.landPlotsByCommodity[commodity] || 0) + 1;
  }

  for (const row of supplyResult.data || []) {
    const entry = getEntry(row.region_province);
    entry.supplyListings += 1;
  }

  for (const row of demandResult.data || []) {
    const entry = getEntry(row.delivery_province);
    entry.demandListings += 1;
  }

  return Array.from(byProvince.values()).sort(
    (a, b) => (b.supplyListings + b.demandListings) - (a.supplyListings + a.demandListings)
  );
}
