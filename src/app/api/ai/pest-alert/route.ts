import { NextResponse } from 'next/server';
import { generateContent, parseAIResponse } from '@/lib/gemini';
import { getSystemPrompt } from '@/lib/prompts/system-prompt';
import { buildPestAlertPrompt, PestAlertInput } from '@/lib/prompts/pest-alert-prompt';
import { getLandPlotById } from '@/lib/db/land-plots';
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

interface PestAlertResult {
  riskLevel: 'low' | 'moderate' | 'high';
  likelyPestsOrDiseases: string[];
  preventiveActions: string[];
  monitoringChecklist: string[];
}

export async function GET(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (!isRequestPermittedForApi(ctx, '/api/ai/pest-alert')) {
    return createForbiddenResponse();
  }

  try {
    const supabase = createAdminClient();
    const history = await getUserAnalyses(supabase, 'pest_alert_analyses', ctx.userId, 10);
    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    console.error('Pest alert history fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (!isRequestPermittedForApi(ctx, '/api/ai/pest-alert')) {
    return createForbiddenResponse();
  }

  const category = getEndpointCategory('/api/ai/pest-alert');
  if (category) {
    const config = RATE_LIMITS[category];
    const rateLimitResult = await checkRateLimit(ctx.userId, category, config);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfterSeconds ?? 60);
    }
  }

  try {
    const body = await request.json() as {
      commodity?: string;
      province?: string;
      landPlotId?: string;
      symptoms?: string;
      lang?: 'en' | 'id';
    };
    if (!body.commodity || !body.province) {
      return NextResponse.json({ success: false, error: 'commodity and province are required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    let landPlotName: string | undefined;

    if (body.landPlotId) {
      if (ctx.userRole !== 'farmer') {
        return createForbiddenResponse('Only farmers can scope an assessment to a land plot');
      }
      const plot = await getLandPlotById(supabase, body.landPlotId);
      if (!plot) {
        return NextResponse.json({ success: false, error: 'Land plot not found' }, { status: 404 });
      }
      if (plot.farmer_id !== ctx.userId) {
        return createForbiddenResponse('You can only assess your own land plots');
      }
      landPlotName = plot.name;
    }

    const lang: 'en' | 'id' = body.lang === 'en' ? 'en' : 'id';
    const input: PestAlertInput = {
      commodity: body.commodity,
      province: body.province,
      landPlotName,
      symptoms: body.symptoms,
    };

    const systemPrompt = getSystemPrompt(lang);
    const userPrompt = buildPestAlertPrompt(input);

    let responseText: string;
    try {
      responseText = await generateContent(systemPrompt, userPrompt);
    } catch (aiError: unknown) {
      if (category) {
        await decrementRateLimit(ctx.userId, category);
      }
      console.error('Pest alert AI service error:', aiError);
      return NextResponse.json({ success: false, error: 'Gagal membuat penilaian risiko' }, { status: 500 });
    }

    const parsed = parseAIResponse<PestAlertResult>(responseText);
    const resultData = parsed || { rawText: responseText };

    try {
      await saveAnalysis(
        supabase,
        'pest_alert_analyses',
        ctx.userId,
        input as unknown as Record<string, unknown>,
        resultData as unknown as Record<string, unknown>,
        body.landPlotId ? { land_plot_id: body.landPlotId } : undefined
      );
    } catch (dbError) {
      console.error('Failed to save pest alert analysis:', dbError);
    }

    return NextResponse.json({ success: true, data: resultData });
  } catch (error) {
    console.error('Pest alert AI error:', error);
    return NextResponse.json({ success: false, error: 'Gagal membuat penilaian risiko' }, { status: 500 });
  }
}
