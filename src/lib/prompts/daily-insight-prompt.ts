export interface DailyInsightInput {
  landPlots: { name: string; commodity: string | null; province: string; status: string }[];
  recentHarvests: { commodity: string; outcome: string; seasonEnd: string }[];
  recentMonitoringLogs: { logType: string; loggedAt: string }[];
}

export function buildDailyInsightPrompt(input: DailyInsightInput): string {
  const plotsSummary = input.landPlots.length
    ? input.landPlots.map((p) => `- ${p.name} (${p.commodity ?? 'belum ditentukan'}, ${p.province}, status: ${p.status})`).join('\n')
    : 'Belum ada lahan terdaftar.';

  const harvestsSummary = input.recentHarvests.length
    ? input.recentHarvests.map((h) => `- ${h.commodity}: ${h.outcome} (${h.seasonEnd})`).join('\n')
    : 'Belum ada riwayat panen.';

  const monitoringSummary = input.recentMonitoringLogs.length
    ? input.recentMonitoringLogs.map((m) => `- ${m.logType} pada ${m.loggedAt}`).join('\n')
    : 'Belum ada catatan monitoring terbaru.';

  return `Generate one short, practical daily tip for this farmer based on their actual farm data below. Ground the tip in the data provided — do not invent conditions, prices, or weather events not implied by the data.

LAND PLOTS:
${plotsSummary}

RECENT HARVESTS:
${harvestsSummary}

RECENT MONITORING LOGS:
${monitoringSummary}

If the data is sparse (e.g. no land plots yet), give a general onboarding-oriented tip instead of fabricating specifics.

Respond ONLY with valid JSON matching this exact schema (no markdown, no explanation outside JSON):
{
  "tip": "string - one short, actionable tip (1-2 sentences)",
  "focusArea": "string - one of: irrigation, pest_prevention, harvest_timing, cost_management, market_timing, record_keeping, general",
  "reasoning": "string - one short sentence on why this tip applies today, referencing the farmer's own data"
}`;
}
