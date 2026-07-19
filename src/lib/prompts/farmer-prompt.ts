import { FarmerInput } from '@/types/farmer';
import { LandPlot } from '@/types/land-plots';

const LAND_PLOT_STATUS_LABEL: Record<LandPlot['status'], string> = {
  active: 'actively planted (a crop is currently growing on this plot)',
  fallow: 'fallow / empty (no crop currently planted)',
  harvested: 'recently harvested (awaiting the next planting cycle)',
};

export function buildFarmerPrompt(input: FarmerInput, landPlot?: LandPlot | null): string {
  const landPlotSection = landPlot
    ? `
REGISTERED LAND PLOT:
- Plot name: ${landPlot.name}
- Current status: ${LAND_PLOT_STATUS_LABEL[landPlot.status]}
- Planting date: ${landPlot.planting_date || 'Not recorded'}
- Harvest estimate: ${landPlot.harvest_estimate || 'Not recorded'}

This analysis is for a real, registered land plot. Factor its current status into your recommendations - for example, do not recommend immediate replanting if the plot is actively planted with a recent planting date; if it is fallow or recently harvested, prioritize recommendations for the next planting cycle.
`
    : '';

  return `Analyze the following farmer's land data and provide comprehensive crop recommendations.

FARMER DATA:
- Province: ${input.province}
- District: ${input.district}
- Land Size: ${input.landSize} ${input.landUnit}
- Soil Type: ${input.soilType}
- Water Sources: ${input.waterSources.join(', ')}
- Current/Previous Crops: ${input.currentCrops || 'Not specified'}
- Available Budget: IDR ${input.budget.toLocaleString()}
- Target Timeline: ${input.timeline}
- Additional Notes: ${input.notes || 'None'}
${landPlotSection}
Respond ONLY with valid JSON matching this exact schema (no markdown, no explanation outside JSON):
{
  "cropRecommendations": [
    {
      "crop": "string - crop name",
      "suitabilityScore": "number 0-100",
      "reasoning": "string - why this crop is suitable",
      "plantingSeason": "string - best planting time"
    }
  ],
  "yieldEstimates": [
    {
      "crop": "string",
      "estimatedYieldPerHa": "string with number",
      "unit": "string - tons/kg/quintal"
    }
  ],
  "costProjections": [
    {
      "category": "string - e.g. Seeds, Fertilizer, Labor",
      "estimatedCost": "string - IDR amount",
      "notes": "string"
    }
  ],
  "weatherRisks": "string - paragraph about weather risks for this region and recommended crops",
  "buyerMatching": "string - paragraph about potential market and buyers for recommended crops",
  "inputRequirements": "string - paragraph about seeds, fertilizers, tools needed",
  "subsidies": "string - paragraph about available government subsidies and financing options"
}

Provide at least 3 crop recommendations ranked by profit potential. Be specific to the Indonesian region provided. Include realistic cost estimates in IDR.`;
}
