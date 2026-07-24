import { RegionalDistribution } from '@/lib/db/regional-data';

export function buildRegionalAnalyticsPrompt(regionalDistribution: RegionalDistribution): string {
  const regionsSummary = regionalDistribution.length
    ? regionalDistribution
        .slice(0, 15)
        .map((r) => {
          const commodities = Object.entries(r.landPlotsByCommodity)
            .map(([c, count]) => `${c} (${count} lahan)`)
            .join(', ') || 'belum ada data lahan';
          return `- ${r.province}: ${commodities}; supply listings: ${r.supplyListings}; demand listings: ${r.demandListings}`;
        })
        .join('\n')
    : 'Belum ada data regional yang tercatat.';

  return `Analyze the following real regional agricultural activity data across Indonesian provinces. Base your analysis ONLY on the data given — do not invent statistics not implied by it.

REGIONAL DATA:
${regionsSummary}

Respond ONLY with valid JSON matching this exact schema (no markdown, no explanation outside JSON):
{
  "regionalSummary": [
    {
      "province": "string - province name from the data",
      "narrative": "string - 1-2 sentence read on this province's activity",
      "opportunities": ["string - a specific opportunity implied by the data"],
      "risks": ["string - a specific risk or gap implied by the data"]
    }
  ],
  "nationalTrends": "string - 2-3 sentence summary of cross-province patterns"
}

Only include provinces that appear in the data above. If the data is sparse, keep regionalSummary short rather than fabricating provinces.`;
}
