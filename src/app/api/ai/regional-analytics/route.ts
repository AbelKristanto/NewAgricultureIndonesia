import { NextResponse } from 'next/server';
import { generateContent, parseAIResponse } from '@/lib/gemini';
import { getSystemPrompt } from '@/lib/prompts/system-prompt';
import { buildRegionalAnalyticsPrompt } from '@/lib/prompts/regional-analytics-prompt';
import { getRegionalDistribution } from '@/lib/db/regional-data';
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

interface RegionalAnalyticsResult {
  regionalSummary: { province: string; narrative: string; opportunities: string[]; risks: string[] }[];
  nationalTrends: string;
}

export async function GET(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (!isRequestPermittedForApi(ctx, '/api/ai/regional-analytics')) {
    return createForbiddenResponse();
  }

  try {
    const supabase = createAdminClient();
    const history = await getUserAnalyses(supabase, 'regional_analyses', ctx.userId, 5);
    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    console.error('Regional analytics history fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (!isRequestPermittedForApi(ctx, '/api/ai/regional-analytics')) {
    return createForbiddenResponse();
  }

  const category = getEndpointCategory('/api/ai/regional-analytics');
  if (category) {
    const config = RATE_LIMITS[category];
    const rateLimitResult = await checkRateLimit(ctx.userId, category, config);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfterSeconds ?? 60);
    }
  }

  try {
    const body = await request.json().catch(() => ({})) as { lang?: 'en' | 'id' };
    const lang: 'en' | 'id' = body.lang === 'en' ? 'en' : 'id';

    const supabase = createAdminClient();
    const regionalDistribution = await getRegionalDistribution(supabase);

    const systemPrompt = getSystemPrompt(lang);
    const userPrompt = buildRegionalAnalyticsPrompt(regionalDistribution);

    let responseText: string;
    try {
      responseText = await generateContent(systemPrompt, userPrompt);
    } catch (aiError: unknown) {
      if (category) {
        await decrementRateLimit(ctx.userId, category);
      }
      console.error('Regional analytics AI service error:', aiError);
      return NextResponse.json({ success: false, error: 'Gagal membuat analitik regional' }, { status: 500 });
    }

    const parsed = parseAIResponse<RegionalAnalyticsResult>(responseText);
    const resultData = parsed || { rawText: responseText };

    try {
      await saveAnalysis(
        supabase,
        'regional_analyses',
        ctx.userId,
        { regionalDistribution } as unknown as Record<string, unknown>,
        resultData as unknown as Record<string, unknown>
      );
    } catch (dbError) {
      console.error('Failed to save regional analysis:', dbError);
    }

    return NextResponse.json({ success: true, data: resultData });
  } catch (error) {
    console.error('Regional analytics error:', error);
    return NextResponse.json({ success: false, error: 'Gagal membuat analitik regional' }, { status: 500 });
  }
}
