import { NextResponse } from 'next/server';
import { generateContent, parseAIResponse } from '@/lib/gemini';
import { getSystemPrompt } from '@/lib/prompts/system-prompt';
import { buildCalendarPrompt } from '@/lib/prompts/calendar-prompt';
import { CalendarAnalysis, CalendarInput } from '@/types/calendar';
import { saveAnalysis, getUserAnalyses } from '@/lib/db/analyses';
import { getLandPlotById } from '@/lib/db/land-plots';
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

export async function GET(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (!isRequestPermittedForApi(ctx, '/api/ai/calendar')) {
    return createForbiddenResponse();
  }

  try {
    const supabase = createAdminClient();
    const history = await getUserAnalyses(supabase, 'calendar_analyses', ctx.userId, 10);
    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    console.error('Calendar history fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch calendar history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (!isRequestPermittedForApi(ctx, '/api/ai/calendar')) {
    return createForbiddenResponse();
  }

  const category = getEndpointCategory('/api/ai/calendar');
  if (category) {
    const config = RATE_LIMITS[category];
    const rateLimitResult = await checkRateLimit(ctx.userId, category, config);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfterSeconds ?? 60);
    }
  }

  try {
    const body = await request.json() as { landPlotId?: string; lang?: 'en' | 'id' };
    if (!body.landPlotId) {
      return NextResponse.json({ success: false, error: 'landPlotId is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const plot = await getLandPlotById(supabase, body.landPlotId);
    if (!plot) {
      return NextResponse.json({ success: false, error: 'Land plot not found' }, { status: 404 });
    }
    if (plot.farmer_id !== ctx.userId) {
      return createForbiddenResponse('You can only generate a calendar for your own land plots');
    }
    if (!plot.planting_date) {
      return NextResponse.json(
        { success: false, error: 'Set a planting date for this plot first' },
        { status: 400 }
      );
    }

    const lang: 'en' | 'id' = body.lang === 'en' ? 'en' : 'id';
    const input: CalendarInput = {
      landPlotId: plot.id,
      commodity: plot.commodity || 'unknown',
      plantingDate: plot.planting_date,
      province: plot.province,
      lang,
    };

    const systemPrompt = getSystemPrompt(lang);
    const userPrompt = buildCalendarPrompt(input);

    let responseText: string;
    try {
      responseText = await generateContent(systemPrompt, userPrompt);
    } catch (aiError: unknown) {
      if (category) {
        await decrementRateLimit(ctx.userId, category);
      }
      console.error('Calendar AI service error:', aiError);
      return NextResponse.json(
        { success: false, error: 'Gagal membuat kalender' },
        { status: 500 }
      );
    }

    const parsed = parseAIResponse<CalendarAnalysis>(responseText);
    const resultData = parsed || { rawText: responseText };

    try {
      await saveAnalysis(
        supabase,
        'calendar_analyses',
        ctx.userId,
        input as unknown as Record<string, unknown>,
        resultData as unknown as Record<string, unknown>,
        { land_plot_id: plot.id }
      );
    } catch (dbError) {
      console.error('Failed to save calendar analysis:', dbError);
    }

    return NextResponse.json({ success: true, data: resultData });
  } catch (error) {
    console.error('Calendar AI error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal membuat kalender' },
      { status: 500 }
    );
  }
}
