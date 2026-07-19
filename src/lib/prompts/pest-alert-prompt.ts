export interface PestAlertInput {
  commodity: string;
  province: string;
  landPlotName?: string;
  symptoms?: string;
}

export function buildPestAlertPrompt(input: PestAlertInput): string {
  return `Assess disease and pest risk for the following crop and provide preventive guidance.

COMMODITY: ${input.commodity}
PROVINCE: ${input.province}
${input.landPlotName ? `LAND PLOT: ${input.landPlotName}\n` : ''}${input.symptoms ? `OBSERVED SYMPTOMS: ${input.symptoms}\n` : 'OBSERVED SYMPTOMS: none reported — assess general seasonal risk for this commodity and region.\n'}
Respond ONLY with valid JSON matching this exact schema (no markdown, no explanation outside JSON):
{
  "riskLevel": "string - one of: low, moderate, high",
  "likelyPestsOrDiseases": ["string - name of a likely pest or disease given the data"],
  "preventiveActions": ["string - concrete preventive action"],
  "monitoringChecklist": ["string - short monitoring checklist item"]
}`;
}
