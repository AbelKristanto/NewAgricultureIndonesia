export interface MarketIntelligenceInput {
  commodity: string;
  province: string;
  timeframe: string;
}

export function buildMarketIntelligencePrompt(input: MarketIntelligenceInput): string {
  return `Provide a market intelligence briefing for the following commodity and region, covering demand outlook, price outlook, and general market trends.

COMMODITY: ${input.commodity}
PROVINCE: ${input.province}
TIMEFRAME: ${input.timeframe}

Respond ONLY with valid JSON matching this exact schema (no markdown, no explanation outside JSON):
{
  "demandOutlook": "string - 1-2 sentences on expected demand direction and drivers",
  "priceOutlook": "string - 1-2 sentences on expected price direction and drivers",
  "trendNarrative": "string - 1-2 paragraphs on broader market trends relevant to this commodity and region",
  "risks": ["string - short risk factor"],
  "opportunities": ["string - short opportunity"]
}`;
}
