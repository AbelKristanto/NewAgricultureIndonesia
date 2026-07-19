import { NextResponse } from 'next/server';
import { generateContent, parseAIResponse } from '@/lib/gemini';
import { getSystemPrompt } from '@/lib/prompts/system-prompt';
import { buildFarmerPrompt } from '@/lib/prompts/farmer-prompt';
import { FarmerInput, FarmerAnalysis } from '@/types/farmer';
import { saveAnalysis } from '@/lib/db/analyses';
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

export async function POST(request: Request) {
  // Extract user context from middleware headers
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  if (!isRequestPermittedForApi(ctx, '/api/ai/farmer')) {
    return createForbiddenResponse();
  }

  // Check rate limit
  const category = getEndpointCategory('/api/ai/farmer');
  if (category) {
    const config = RATE_LIMITS[category];
    const rateLimitResult = await checkRateLimit(ctx.userId, category, config);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfterSeconds ?? 60);
    }
  }

  try {
    const body: FarmerInput = await request.json();

    const supabase = createAdminClient();
    let landPlot = null;
    if (body.landPlotId) {
      landPlot = await getLandPlotById(supabase, body.landPlotId);
      if (!landPlot) {
        return NextResponse.json({ success: false, error: 'Land plot not found' }, { status: 404 });
      }
      if (landPlot.farmer_id !== ctx.userId) {
        return createForbiddenResponse('You can only use your own land plots');
      }
    }

    const systemPrompt = getSystemPrompt(body.lang);
    const userPrompt = buildFarmerPrompt(body, landPlot);

    let responseText: string;
    try {
      responseText = await generateContent(systemPrompt, userPrompt);
    } catch (aiError: unknown) {
      // Decrement rate limit on 5xx AI service errors
      if (category) {
        await decrementRateLimit(ctx.userId, category);
      }
      console.error('Farmer AI service error:', aiError);
      return NextResponse.json(
        { success: false, error: 'Gagal menghasilkan analisis' },
        { status: 500 }
      );
    }

    const parsed = parseAIResponse<FarmerAnalysis>(responseText);
    const resultData = parsed || { rawText: responseText };

    // Persist to database using admin client
    try {
      await saveAnalysis(
        supabase,
        'farmer_analyses',
        ctx.userId,
        body as unknown as Record<string, unknown>,
        resultData as unknown as Record<string, unknown>,
        { land_plot_id: landPlot?.id ?? null }
      );
    } catch (dbError) {
      console.error('Failed to save farmer analysis:', dbError);
    }

    return NextResponse.json({ success: true, data: resultData });
  } catch (error) {
    console.error('Farmer AI error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghasilkan analisis' },
      { status: 500 }
    );
  }
}
