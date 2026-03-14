import { WeatherInput } from '@/types/weather';

export function buildWeatherPrompt(input: WeatherInput): string {
  return `Analyze the following weather scenario and its impact on agricultural production in Indonesia.

WEATHER SCENARIO:
- Regions: ${input.regions.join(', ') || 'National'}
- Crops: ${input.crops.join(', ') || 'All major crops'}
- Weather Event: ${input.scenario}
- Season: ${input.season}
- Additional Notes: ${input.notes || 'None'}

Respond ONLY with valid JSON matching this exact schema (no markdown, no explanation outside JSON):
{
  "impactAssessment": "string - detailed analysis of how this weather event affects the specified crops in the specified regions, including expected yield reduction percentages, crop damage types, and historical precedents",
  "cropAdjustments": "string - specific crop selection changes recommended in response to this weather event, including alternative varieties, substitute crops, and timing adjustments",
  "irrigationPlanning": "string - water management strategies including irrigation scheduling changes, drainage improvements, water conservation measures, and infrastructure recommendations",
  "revisedSchedule": "string - adjusted planting and harvesting calendar accounting for the weather event, including optimal planting windows, delayed harvest strategies, and contingency timelines",
  "mitigationStrategies": "string - comprehensive list of practical actions farmers can take to reduce losses, including soil protection, pest management changes, insurance options, and government assistance programs",
  "riskLevel": "string - overall risk assessment (Critical/High/Medium/Low) with justification, probability estimates, and comparison to normal season conditions"
}

Base analysis on realistic Indonesian agricultural and meteorological data. Reference specific provinces, crop varieties, and historical weather events where relevant.`;
}
