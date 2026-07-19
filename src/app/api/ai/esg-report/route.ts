import { NextResponse } from 'next/server';
import { generateContent, parseAIResponse } from '@/lib/gemini';
import { getSystemPrompt } from '@/lib/prompts/system-prompt';
import { buildEsgReportPrompt } from '@/lib/prompts/esg-report-prompt';
import { computeEsgSummary } from '@/lib/esg-calculator';
import { getLeaderboard } from '@/lib/db/sustainability';
import { saveAnalysis, getUserAnalyses } from '@/lib/db/analyses';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getRequestContext,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createRateLimitResponse,
  isRequestPermittedForApi,
} from '@/lib/api-helpers';
import {
  getEndpointCategory,
  checkRateLimit,
  decrementRateLimit,
  RATE_LIMITS,
} from '@/lib/rate-limiter';

interface EsgNarrative {
  narrative: string;
  recommendations: string[];
}

export async function GET(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (!isRequestPermittedForApi(ctx, '/api/ai/esg-report')) {
    return createForbiddenResponse();
  }

  try {
    const supabase = createAdminClient();
    const history = await getUserAnalyses(supabase, 'esg_reports', ctx.userId, 10);
    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    console.error('ESG report history fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch ESG report history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (!isRequestPermittedForApi(ctx, '/api/ai/esg-report')) {
    return createForbiddenResponse();
  }

  const category = getEndpointCategory('/api/ai/esg-report');
  if (category) {
    const config = RATE_LIMITS[category];
    const rateLimitResult = await checkRateLimit(ctx.userId, category, config);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfterSeconds ?? 60);
    }
  }

  try {
    const body = await request.json() as { scope?: string; lang?: 'en' | 'id' };
    const scope = body.scope === 'commodity' ? 'commodity' : 'platform';
    const lang: 'en' | 'id' = body.lang === 'en' ? 'en' : 'id';

    const supabase = createAdminClient();
    const assessments = await getLeaderboard(supabase);
    const computed = computeEsgSummary(assessments);

    const systemPrompt = getSystemPrompt(lang);
    const userPrompt = buildEsgReportPrompt(scope, computed);

    let responseText: string;
    try {
      responseText = await generateContent(systemPrompt, userPrompt);
    } catch (aiError: unknown) {
      if (category) {
        await decrementRateLimit(ctx.userId, category);
      }
      console.error('ESG report AI service error:', aiError);
      return NextResponse.json({ success: false, error: 'Gagal membuat laporan ESG' }, { status: 500 });
    }

    const parsed = parseAIResponse<EsgNarrative>(responseText);
    const resultData = { computed, ...(parsed || { rawText: responseText }) };

    try {
      await saveAnalysis(
        supabase,
        'esg_reports',
        ctx.userId,
        { scope },
        resultData as unknown as Record<string, unknown>
      );
    } catch (dbError) {
      console.error('Failed to save ESG report:', dbError);
    }

    return NextResponse.json({ success: true, data: resultData });
  } catch (error) {
    console.error('ESG report AI error:', error);
    return NextResponse.json({ success: false, error: 'Gagal membuat laporan ESG' }, { status: 500 });
  }
}
