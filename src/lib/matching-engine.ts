import { BuyerDemandListing, FarmerSupplyListing } from '@/types/listings';

export interface MatchResult {
  score: number;
  reasons: string[];
}

function toTons(volume: number, unit: string): number {
  return unit === 'kg' ? volume / 1000 : volume;
}

const QUALITY_RANK: Record<string, number> = {
  standard: 0,
  'grade-b': 1,
  'grade-a': 2,
  premium: 3,
};

function qualityRank(grade: string): number {
  return QUALITY_RANK[grade] ?? 0;
}

/**
 * Scores a farmer supply listing against a buyer demand listing.
 * Returns null when the commodity differs — that's a hard filter, not a scoring dimension.
 * Shared by the Matching page (client) and API routes so ranking stays consistent everywhere.
 */
export function scoreMatch(
  supply: Pick<FarmerSupplyListing, 'commodity' | 'volume' | 'volume_unit' | 'quality_grade' | 'region_province' | 'region_city' | 'timeline'>,
  demand: Pick<BuyerDemandListing, 'commodity' | 'volume' | 'volume_unit' | 'quality_grade' | 'delivery_province' | 'delivery_city' | 'timeline'>
): MatchResult | null {
  if (supply.commodity !== demand.commodity) {
    return null;
  }

  const reasons: string[] = [];
  let score = 0;

  const supplyVolume = toTons(supply.volume, supply.volume_unit);
  const demandVolume = toTons(demand.volume, demand.volume_unit);
  if (demandVolume <= 0 || supplyVolume >= demandVolume * 0.7) {
    score += 40;
    reasons.push('volume');
  } else {
    score += Math.max(0, Math.round((supplyVolume / (demandVolume * 0.7)) * 40));
  }

  const qualityFits = qualityRank(supply.quality_grade) >= qualityRank(demand.quality_grade);
  if (qualityFits) {
    score += 25;
    reasons.push('quality');
  }

  if (supply.region_province === demand.delivery_province) {
    score += 15;
    reasons.push('province');
    const supplyCity = (supply.region_city || '').trim().toLowerCase();
    const demandCity = (demand.delivery_city || '').trim().toLowerCase();
    if (supplyCity && demandCity && (supplyCity.includes(demandCity) || demandCity.includes(supplyCity))) {
      score += 10;
      reasons.push('city');
    }
  }

  if (supply.timeline === demand.timeline) {
    score += 10;
    reasons.push('timeline');
  } else {
    score += 5;
  }

  return { score: Math.min(100, score), reasons };
}
