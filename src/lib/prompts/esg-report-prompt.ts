import { EsgComputed } from '@/lib/esg-calculator';

export function buildEsgReportPrompt(scope: string, computed: EsgComputed): string {
  return `Write a short, readable ESG (Environmental, Social, Governance) narrative report based on the following ALREADY-COMPUTED numbers. Do not invent new numbers — only interpret and explain the ones given. Clearly label any carbon figure as an estimate, not a measured value.

SCOPE: ${scope}
COMPUTED DATA:
- Farmers assessed: ${computed.farmerCount}
- Average sustainability score (0-100): ${computed.averageScore}
- Tier distribution: Gold ${computed.tierDistribution.gold}, Silver ${computed.tierDistribution.silver}, Bronze ${computed.tierDistribution.bronze}
- Estimated carbon impact index (0-100, higher = more favorable practices, NOT measured CO2): ${computed.estimatedCarbonImpactIndex}

Respond ONLY with valid JSON matching this exact schema (no markdown, no explanation outside JSON):
{
  "narrative": "string - 2-3 short paragraphs summarizing environmental practices, the tier distribution, and what the carbon impact index estimate suggests",
  "recommendations": ["string - 3-5 concrete, actionable recommendations to improve the average score and reduce estimated impact"]
}`;
}
