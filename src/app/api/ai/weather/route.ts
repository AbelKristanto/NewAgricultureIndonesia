import { NextResponse } from 'next/server';
import { generateContent, parseAIResponse } from '@/lib/gemini';
import { getSystemPrompt } from '@/lib/prompts/system-prompt';
import { buildWeatherPrompt } from '@/lib/prompts/weather-prompt';
import { WeatherInput, WeatherAnalysis } from '@/types/weather';
import { saveAnalysis } from '@/lib/db/analyses';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBmkgForecast, summarizeForPrompt, BmkgForecast } from '@/lib/bmkg';
import { BMKG_REGION_MAP } from '@/lib/bmkg-regions';
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

  if (!isRequestPermittedForApi(ctx, '/api/ai/weather')) {
    return createForbiddenResponse();
  }

  // Check rate limit
  const category = getEndpointCategory('/api/ai/weather');
  if (category) {
    const config = RATE_LIMITS[category];
    const rateLimitResult = await checkRateLimit(ctx.userId, category, config);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfterSeconds ?? 60);
    }
  }

  try {
    const body: WeatherInput = await request.json();
    const systemPrompt = getSystemPrompt(body.lang);

    let bmkg: BmkgForecast | null = null;
    const region = BMKG_REGION_MAP[body.regions[0]];
    if (region) {
      try {
        bmkg = await getBmkgForecast(region.adm4);
      } catch (bmkgError) {
        // BMKG being unreachable/invalid must never break the AI analysis.
        console.error('BMKG fetch error:', bmkgError);
      }
    }

    const userPrompt = buildWeatherPrompt(body, bmkg ? summarizeForPrompt(bmkg) : undefined);

    let responseText: string;
    try {
      responseText = await generateContent(systemPrompt, userPrompt);
    } catch (aiError: unknown) {
      // Decrement rate limit on 5xx AI service errors
      if (category) {
        await decrementRateLimit(ctx.userId, category);
      }
      console.error('Weather AI service error:', aiError);
      return NextResponse.json(
        { success: false, error: 'Gagal menghasilkan analisis' },
        { status: 500 }
      );
    }

    const parsed = parseAIResponse<WeatherAnalysis>(responseText);
    const resultData = parsed || { rawText: responseText };

    // Persist to database using admin client
    try {
      const supabase = createAdminClient();
      await saveAnalysis(supabase, 'weather_analyses', ctx.userId, body as unknown as Record<string, unknown>, resultData as unknown as Record<string, unknown>);
    } catch (dbError) {
      console.error('Failed to save weather analysis:', dbError);
    }

    return NextResponse.json({ success: true, data: resultData, bmkg });
  } catch (error) {
    console.error('Weather AI error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghasilkan analisis' },
      { status: 500 }
    );
  }
}
