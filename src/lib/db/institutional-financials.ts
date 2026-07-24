import { SupabaseClient } from '@supabase/supabase-js';

export interface InstitutionalCommodityBreakdown {
  commodity: string;
  revenue: number;
  cost: number;
  volume: number;
  transactionValue: number;
}

export interface InstitutionalFinancialSummary {
  totalRevenue: number;
  totalExpense: number;
  estimatedProfit: number;
  margin: number;
  totalProductionVolume: number;
  byCommodity: InstitutionalCommodityBreakdown[];
}

/**
 * Platform-wide financial + production aggregation for finance/government roles.
 * Uses the admin client to read across all farmers, bypassing the farmer-scoped
 * RLS that keeps harvest_records/transactions private in the per-farmer views.
 */
export async function getInstitutionalFinancialSummary(supabase: SupabaseClient): Promise<InstitutionalFinancialSummary> {
  const [harvestResult, transactionResult] = await Promise.all([
    supabase.from('harvest_records').select('commodity, revenue, cost, yield_value, yield_unit'),
    supabase.from('transactions').select('commodity, total_value, status').eq('status', 'completed'),
  ]);

  if (harvestResult.error) throw harvestResult.error;
  if (transactionResult.error) throw transactionResult.error;

  const byCommodity = new Map<string, InstitutionalCommodityBreakdown>();

  const getEntry = (commodity: string) => {
    let entry = byCommodity.get(commodity);
    if (!entry) {
      entry = { commodity, revenue: 0, cost: 0, volume: 0, transactionValue: 0 };
      byCommodity.set(commodity, entry);
    }
    return entry;
  };

  let harvestRevenue = 0;
  let harvestCost = 0;
  let totalProductionVolume = 0;

  for (const row of harvestResult.data || []) {
    const entry = getEntry(row.commodity);
    const revenue = row.revenue || 0;
    const cost = row.cost || 0;
    const volume = row.yield_unit === 'ton' ? (row.yield_value || 0) * 1000 : row.yield_value || 0;
    entry.revenue += revenue;
    entry.cost += cost;
    entry.volume += volume;
    harvestRevenue += revenue;
    harvestCost += cost;
    totalProductionVolume += volume;
  }

  let marketplaceRevenue = 0;
  for (const row of transactionResult.data || []) {
    const entry = getEntry(row.commodity);
    const value = row.total_value || 0;
    entry.transactionValue += value;
    marketplaceRevenue += value;
  }

  const totalRevenue = harvestRevenue + marketplaceRevenue;
  const totalExpense = harvestCost;
  const estimatedProfit = totalRevenue - totalExpense;
  const margin = totalRevenue > 0 ? (estimatedProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalExpense,
    estimatedProfit,
    margin,
    totalProductionVolume,
    byCommodity: Array.from(byCommodity.values()).sort((a, b) => b.revenue - a.revenue),
  };
}
