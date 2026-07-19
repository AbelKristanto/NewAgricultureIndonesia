import { NextResponse } from 'next/server';
import { generateContent, parseAIResponse } from '@/lib/gemini';
import { getSystemPrompt } from '@/lib/prompts/system-prompt';
import { buildMarketIntelligencePrompt, MarketIntelligenceInput } from '@/lib/prompts/market-intelligence-prompt';
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

interface MarketIntelligenceResult {
  demandOutlook: string;
  priceOutlook: string;
  trendNarrative: string;
  risks: string[];
  opportunities: string[];
}

export async function GET(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (!isRequestPermittedForApi(ctx, '/api/ai/market-intelligence')) {
    return createForbiddenResponse();
  }

  try {
    const supabase = createAdminClient();
    const history = await getUserAnalyses(supabase, 'market_intelligence_analyses', ctx.userId, 10);
    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    console.error('Market intelligence history fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (!isRequestPermittedForApi(ctx, '/api/ai/market-intelligence')) {
    return createForbiddenResponse();
  }

  const category = getEndpointCategory('/api/ai/market-intelligence');
  if (category) {
    const config = RATE_LIMITS[category];
    const rateLimitResult = await checkRateLimit(ctx.userId, category, config);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfterSeconds ?? 60);
    }
  }

  try {
    const body = await request.json() as Partial<MarketIntelligenceInput> & { lang?: 'en' | 'id' };
    if (!body.commodity || !body.province) {
      return NextResponse.json({ success: false, error: 'commodity and province are required' }, { status: 400 });
    }

    const lang: 'en' | 'id' = body.lang === 'en' ? 'en' : 'id';
    const input: MarketIntelligenceInput = {
      commodity: body.commodity,
      province: body.province,
      timeframe: body.timeframe || '3 months',
    };

    const supabase = createAdminClient();
    const systemPrompt = getSystemPrompt(lang);
    const userPrompt = buildMarketIntelligencePrompt(input);

    let responseText: string;
    try {
      responseText = await generateContent(systemPrompt, userPrompt);
    } catch (aiError: unknown) {
      if (category) {
        await decrementRateLimit(ctx.userId, category);
      }
      console.error('Market intelligence AI service error:', aiError);
      return NextResponse.json({ success: false, error: 'Gagal membuat analisis pasar' }, { status: 500 });
    }

    const parsed = parseAIResponse<MarketIntelligenceResult>(responseText);
    const resultData = parsed || { rawText: responseText };

    try {
      await saveAnalysis(
        supabase,
        'market_intelligence_analyses',
        ctx.userId,
        input as unknown as Record<string, unknown>,
        resultData as unknown as Record<string, unknown>
      );
    } catch (dbError) {
      console.error('Failed to save market intelligence analysis:', dbError);
    }

    return NextResponse.json({ success: true, data: resultData });
  } catch (error) {
    console.error('Market intelligence AI error:', error);
    return NextResponse.json({ success: false, error: 'Gagal membuat analisis pasar' }, { status: 500 });
  }
}
