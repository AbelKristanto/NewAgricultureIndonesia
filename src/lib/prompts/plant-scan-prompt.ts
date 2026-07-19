export function buildPlantScanPrompt(commodity?: string): string {
  return `Examine the attached plant photo${commodity ? ` (reported commodity: ${commodity})` : ''} and diagnose its health condition, looking for signs of disease, pest damage, nutrient deficiency, or other stress. If the photo does not clearly show a plant, say so in the diagnosis and set severity to "none".

Respond ONLY with valid JSON matching this exact schema (no markdown, no explanation outside JSON):
{
  "diagnosis": "string - what you observe and your best assessment of the cause",
  "confidence": "string - one of: low, medium, high",
  "severity": "string - one of: none, mild, moderate, severe",
  "recommendedActions": ["string - concrete next step"]
}`;
}
