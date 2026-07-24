import { NextResponse } from 'next/server';
import { generateContent, parseAIResponse } from '@/lib/gemini';
import { getSystemPrompt } from '@/lib/prompts/system-prompt';
import { buildPerformanceAnalysisPrompt, PerformanceAnalysisInput } from '@/lib/prompts/performance-analysis-prompt';
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

interface PerformanceAnalysisResult {
  narrative: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
}

export async function GET(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (!isRequestPermittedForApi(ctx, '/api/ai/performance-analysis')) {
    return createForbiddenResponse();
  }

  try {
    const supabase = createAdminClient();
    const history = await getUserAnalyses(supabase, 'performance_analyses', ctx.userId, 5);
    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    console.error('Performance analysis history fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (!isRequestPermittedForApi(ctx, '/api/ai/performance-analysis')) {
    return createForbiddenResponse();
  }
  if (ctx.userRole !== 'farmer') {
    return createForbiddenResponse();
  }

  const category = getEndpointCategory('/api/ai/performance-analysis');
  if (category) {
    const config = RATE_LIMITS[category];
    const rateLimitResult = await checkRateLimit(ctx.userId, category, config);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfterSeconds ?? 60);
    }
  }

  try {
    const body = await request.json() as PerformanceAnalysisInput & { lang?: 'en' | 'id' };
    if (typeof body.totalRevenue !== 'number' || typeof body.totalExpense !== 'number') {
      return NextResponse.json({ success: false, error: 'totalRevenue and totalExpense are required' }, { status: 400 });
    }

    const input: PerformanceAnalysisInput = {
      totalRevenue: body.totalRevenue,
      totalExpense: body.totalExpense,
      estimatedProfit: body.estimatedProfit,
      margin: body.margin,
      monthlyBuckets: body.monthlyBuckets || [],
      costFlags: body.costFlags || [],
    };

    const lang: 'en' | 'id' = body.lang === 'en' ? 'en' : 'id';
    const systemPrompt = getSystemPrompt(lang);
    const userPrompt = buildPerformanceAnalysisPrompt(input);

    let responseText: string;
    try {
      responseText = await generateContent(systemPrompt, userPrompt);
    } catch (aiError: unknown) {
      if (category) {
        await decrementRateLimit(ctx.userId, category);
      }
      console.error('Performance analysis AI service error:', aiError);
      return NextResponse.json({ success: false, error: 'Gagal membuat analisis performa' }, { status: 500 });
    }

    const parsed = parseAIResponse<PerformanceAnalysisResult>(responseText);
    const resultData = parsed || { rawText: responseText };

    const supabase = createAdminClient();
    try {
      await saveAnalysis(
        supabase,
        'performance_analyses',
        ctx.userId,
        input as unknown as Record<string, unknown>,
        resultData as unknown as Record<string, unknown>
      );
    } catch (dbError) {
      console.error('Failed to save performance analysis:', dbError);
    }

    return NextResponse.json({ success: true, data: resultData });
  } catch (error) {
    console.error('Performance analysis error:', error);
    return NextResponse.json({ success: false, error: 'Gagal membuat analisis performa' }, { status: 500 });
  }
}
