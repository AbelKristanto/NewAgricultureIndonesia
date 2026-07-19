import { SustainabilityAssessmentWithUsername } from '@/types/sustainability';
import { getSustainabilityTier } from '@/lib/sustainability-score';

export interface EsgComputed {
  farmerCount: number;
  averageScore: number;
  tierDistribution: { gold: number; silver: number; bronze: number };
  estimatedCarbonImpactIndex: number;
}

/**
 * Deterministic aggregation over self-reported sustainability assessments.
 * "estimatedCarbonImpactIndex" is explicitly an estimate derived from the organic/
 * pesticide mix of self-reported data — there is no sensor/measured emissions data
 * in this app, so it must never be presented as measured CO2.
 */
export function computeEsgSummary(assessments: SustainabilityAssessmentWithUsername[]): EsgComputed {
  if (assessments.length === 0) {
    return {
      farmerCount: 0,
      averageScore: 0,
      tierDistribution: { gold: 0, silver: 0, bronze: 0 },
      estimatedCarbonImpactIndex: 0,
    };
  }

  const tierDistribution = { gold: 0, silver: 0, bronze: 0 };
  let totalScore = 0;
  let organicCount = 0;
  let lowPesticideCount = 0;

  for (const a of assessments) {
    totalScore += a.score;
    tierDistribution[getSustainabilityTier(a.score)] += 1;
    if (a.organic_certified) organicCount += 1;
    if (a.pesticide_usage === 'none' || a.pesticide_usage === 'low') lowPesticideCount += 1;
  }

  const organicShare = organicCount / assessments.length;
  const lowPesticideShare = lowPesticideCount / assessments.length;
  const estimatedCarbonImpactIndex = Math.round((organicShare * 60 + lowPesticideShare * 40));

  return {
    farmerCount: assessments.length,
    averageScore: Math.round(totalScore / assessments.length),
    tierDistribution,
    estimatedCarbonImpactIndex,
  };
}
