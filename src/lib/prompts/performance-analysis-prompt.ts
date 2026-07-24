export interface PerformanceAnalysisInput {
  totalRevenue: number;
  totalExpense: number;
  estimatedProfit: number;
  margin: number;
  monthlyBuckets: { month: string; income: number; expense: number }[];
  costFlags: { commodity: string; deltaPercent: number }[];
}

export function buildPerformanceAnalysisPrompt(input: PerformanceAnalysisInput): string {
  const monthlySummary = input.monthlyBuckets.length
    ? input.monthlyBuckets.map((b) => `- ${b.month}: pendapatan ${b.income}, pengeluaran ${b.expense}, net ${b.income - b.expense}`).join('\n')
    : 'Belum ada data bulanan.';

  const costFlagsSummary = input.costFlags.length
    ? input.costFlags.map((f) => `- ${f.commodity}: biaya naik ${f.deltaPercent.toFixed(0)}% dibanding musim sebelumnya`).join('\n')
    : 'Tidak ada lonjakan biaya yang terdeteksi.';

  return `Analyze this farmer's financial performance using ONLY the pre-computed numbers below. Do not invent figures beyond what is given — narrate and interpret them.

TOTAL REVENUE: ${input.totalRevenue}
TOTAL EXPENSE: ${input.totalExpense}
ESTIMATED PROFIT: ${input.estimatedProfit}
PROFIT MARGIN: ${input.margin.toFixed(1)}%

MONTHLY CASHFLOW:
${monthlySummary}

COST SPIKE FLAGS:
${costFlagsSummary}

Respond ONLY with valid JSON matching this exact schema (no markdown, no explanation outside JSON):
{
  "narrative": "string - 2-3 sentence summary of overall financial performance",
  "strengths": ["string - a specific strength shown by the numbers"],
  "concerns": ["string - a specific concern shown by the numbers"],
  "recommendations": ["string - a concrete, actionable recommendation"]
}`;
}
