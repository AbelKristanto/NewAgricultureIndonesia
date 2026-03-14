import { BuyerInput } from '@/types/buyer';

export function buildBuyerPrompt(input: BuyerInput): string {
  return `Analyze the following buyer demand and provide comprehensive supply chain analysis for Indonesia.

BUYER DEMAND:
- Commodity: ${input.commodityType}
- Volume Required: ${input.volume} ${input.volumeUnit}
- Quality Grade: ${input.qualityGrade}
- Delivery Province: ${input.deliveryProvince}
- Delivery City: ${input.deliveryCity}
- Period: ${input.startMonth} to ${input.endMonth}
- Frequency: ${input.frequency}
- Budget Range: IDR ${input.budgetMin.toLocaleString()} - ${input.budgetMax.toLocaleString()}
- Special Requirements: ${input.specialRequirements || 'None'}

Respond ONLY with valid JSON matching this exact schema (no markdown, no explanation outside JSON):
{
  "productionRegions": "string - detailed analysis of which Indonesian provinces/districts produce this commodity, with estimated volumes",
  "supplyCapacity": "string - analysis of available supply capacity from each identified region",
  "logisticsRoutes": "string - recommended shipping routes, ports, and transport modes from production regions to delivery location",
  "deliveryTimeline": "string - estimated lead times and scheduling considerations",
  "supplyRisk": "string - analysis of risks including seasonal availability, weather, price volatility, and quality consistency",
  "recommendedSuppliers": "string - types of suppliers to engage (cooperatives, aggregators, direct farmers) with recommendations"
}

Be specific about Indonesian geography, transportation infrastructure, and regional agricultural characteristics.`;
}
