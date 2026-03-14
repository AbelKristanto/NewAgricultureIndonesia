import { MatchingInput } from '@/types/matching';

export function buildMatchingPrompt(input: MatchingInput): string {
  return `Analyze the following commodity demand and identify the best Indonesian supplier regions for supply-demand matching.

BUYER DEMAND:
- Commodity: ${input.commodity}
- Volume Required: ${input.volume} ${input.volumeUnit}
- Quality Grade: ${input.qualityGrade}
- Delivery Province: ${input.deliveryProvince}
- Delivery City: ${input.deliveryCity}
- Desired Timeline: ${input.timeline}
- Additional Notes: ${input.notes || 'None'}

Respond ONLY with valid JSON matching this exact schema (no markdown, no explanation outside JSON):
{
  "matchedRegions": "string - detailed list of Indonesian provinces/districts that produce this commodity, with estimated annual production volumes and suitability for the requested quality grade",
  "capacityEstimates": "string - analysis of how much each matched region can realistically supply, considering existing commitments and seasonal availability",
  "logisticsFeasibility": "string - transport routes, infrastructure quality, estimated shipping times, and cold chain requirements from each matched region to the delivery location",
  "timeline": "string - harvest calendars for each matched region, lead times for procurement, and scheduling recommendations to meet the buyer's timeline",
  "priceAnalysis": "string - current market price ranges for this commodity in each region, price trends, and cost comparison including transport costs to delivery location",
  "recommendations": "string - ranked list of recommended supplier regions with justification, suggested procurement strategy, and risk mitigation advice"
}

Be specific about Indonesian geography, production statistics, and market dynamics. Reference actual provinces, districts, cooperatives, and market infrastructure.`;
}
