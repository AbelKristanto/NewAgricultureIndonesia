import { PolicyQuery } from '@/types/policy';

export function buildPolicyPrompt(query: PolicyQuery): string {
  return `Analyze the following agricultural policy query for Indonesia and provide comprehensive insights.

POLICY QUERY:
- Regions: ${query.regions.join(', ') || 'National'}
- Commodities: ${query.commodities.join(', ') || 'All major commodities'}
- Analysis Types: ${query.analysisTypes.join(', ')}
- Time Horizon: ${query.timeHorizon}

Respond ONLY with valid JSON matching this exact schema (no markdown, no explanation outside JSON):
{
  "productionOverview": "string - detailed overview of production capacity across specified regions and commodities",
  "supplyDemandAnalysis": "string - analysis of supply-demand gaps, surplus/shortage areas, and market dynamics",
  "riskZones": "string - identification of areas vulnerable to climate, logistics, or economic disruption",
  "policyRecommendations": "string - specific policy interventions recommended (subsidies, infrastructure, trade policy, crop diversification)",
  "priorityActions": "string - ranked list of most impactful policy actions with justification"
}

Base analysis on realistic Indonesian agricultural data. Reference specific provinces, production statistics, and government programs where relevant.`;
}
