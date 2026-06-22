import { NextResponse } from 'next/server';
import { generateContent, parseAIResponse } from '@/lib/gemini';
import { getSystemPrompt } from '@/lib/prompts/system-prompt';
import { buildMatchingPrompt } from '@/lib/prompts/matching-prompt';
import { MatchingInput, MatchingAnalysis } from '@/types/matching';
import { saveAnalysis } from '@/lib/db/analyses';
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

  if (!isRequestPermittedForApi(ctx, '/api/ai/matching')) {
    return createForbiddenResponse();
  }

  // Check rate limit
  const category = getEndpointCategory('/api/ai/matching');
  if (category) {
    const config = RATE_LIMITS[category];
    const rateLimitResult = await checkRateLimit(ctx.userId, category, config);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfterSeconds ?? 60);
    }
  }

  try {
    const body: MatchingInput = await request.json();
    const systemPrompt = getSystemPrompt(body.lang);
    const userPrompt = buildMatchingPrompt(body);

    let responseText: string;
    try {
      responseText = await generateContent(systemPrompt, userPrompt);
    } catch (aiError: unknown) {
      // Decrement rate limit on 5xx AI service errors
      if (category) {
        await decrementRateLimit(ctx.userId, category);
      }
      console.error('Matching AI service error:', aiError);
      return NextResponse.json(
        { success: false, error: 'Gagal menghasilkan analisis' },
        { status: 500 }
      );
    }

    const parsed = parseAIResponse<MatchingAnalysis>(responseText);
    const resultData = parsed || { rawText: responseText };

    // Persist to database using admin client
    try {
      const supabase = createAdminClient();
      await saveAnalysis(supabase, 'matching_analyses', ctx.userId, body as unknown as Record<string, unknown>, resultData as unknown as Record<string, unknown>);
    } catch (dbError) {
      console.error('Failed to save matching analysis:', dbError);
    }

    return NextResponse.json({ success: true, data: resultData });
  } catch (error) {
    console.error('Matching AI error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghasilkan analisis' },
      { status: 500 }
    );
  }
}
