import { FarmerInput } from '@/types/farmer';

export function buildFarmerPrompt(input: FarmerInput): string {
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
