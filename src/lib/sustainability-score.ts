import { CreateAssessmentInput, SustainabilityTier } from '@/types/sustainability';

const PESTICIDE_POINTS: Record<CreateAssessmentInput['pesticideUsage'], number> = {
  none: 25,
  low: 15,
  moderate: 5,
  high: 0,
};

const WASTE_POINTS: Record<CreateAssessmentInput['wasteManagement'], number> = {
  advanced: 10,
  basic: 5,
  none: 0,
};

/**
 * Deterministic, transparent scoring — not AI-generated, since the self-reported
 * inputs don't support fabricating AI "insight" beyond a simple weighted sum.
 */
export function computeSustainabilityScore(input: CreateAssessmentInput): number {
  let score = 0;
  if (input.organicCertified) score += 25;
  if (input.waterConservation) score += 20;
  if (input.cropRotation) score += 20;
  score += PESTICIDE_POINTS[input.pesticideUsage];
  score += WASTE_POINTS[input.wasteManagement];
  return Math.min(100, score);
}

export function getSustainabilityTier(score: number): SustainabilityTier {
  if (score >= 75) return 'gold';
  if (score >= 50) return 'silver';
  return 'bronze';
}
