import { NextResponse } from 'next/server';
import { generateContent, parseAIResponse } from '@/lib/gemini';
import { getSystemPrompt } from '@/lib/prompts/system-prompt';
import { buildDailyInsightPrompt, DailyInsightInput } from '@/lib/prompts/daily-insight-prompt';
import { getLandPlots } from '@/lib/db/land-plots';
import { getHarvestRecords } from '@/lib/db/harvest-records';
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

interface DailyInsightResult {
  tip: string;
  focusArea: string;
  reasoning: string;
}

export async function GET(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (!isRequestPermittedForApi(ctx, '/api/ai/daily-insight')) {
    return createForbiddenResponse();
  }
  if (ctx.userRole !== 'farmer') {
    return createForbiddenResponse();
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  try {
    const { data: existing, error: existingError } = await supabase
      .from('daily_insights')
      .select('id, content, created_at')
      .eq('user_id', ctx.userId)
      .eq('insight_date', today)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) {
      return NextResponse.json({ success: true, data: existing.content, cached: true });
    }

    const category = getEndpointCategory('/api/ai/daily-insight');
    if (category) {
      const config = RATE_LIMITS[category];
      const rateLimitResult = await checkRateLimit(ctx.userId, category, config);
      if (!rateLimitResult.allowed) {
        return createRateLimitResponse(rateLimitResult.retryAfterSeconds ?? 60);
      }
    }

    const [landPlots, harvestRecords] = await Promise.all([
      getLandPlots(supabase, ctx.userId),
      getHarvestRecords(supabase, ctx.userId),
    ]);

    const { data: monitoringLogs } = await supabase
      .from('crop_monitoring_logs')
      .select('log_type, logged_at')
      .eq('farmer_id', ctx.userId)
      .order('logged_at', { ascending: false })
      .limit(5);

    const input: DailyInsightInput = {
      landPlots: landPlots.map((p) => ({
        name: p.name,
        commodity: p.commodity,
        province: p.province,
        status: p.status,
      })),
      recentHarvests: harvestRecords.slice(0, 5).map((h) => ({
        commodity: h.commodity,
        outcome: h.outcome,
        seasonEnd: h.season_end,
      })),
      recentMonitoringLogs: (monitoringLogs || []).map((m) => ({
        logType: m.log_type as string,
        loggedAt: m.logged_at as string,
      })),
    };

    const systemPrompt = getSystemPrompt('id');
    const userPrompt = buildDailyInsightPrompt(input);

    let responseText: string;
    try {
      responseText = await generateContent(systemPrompt, userPrompt);
    } catch (aiError: unknown) {
      if (category) {
        await decrementRateLimit(ctx.userId, category);
      }
      console.error('Daily insight AI service error:', aiError);
      return NextResponse.json({ success: false, error: 'Gagal membuat insight harian' }, { status: 500 });
    }

    const parsed = parseAIResponse<DailyInsightResult>(responseText);
    const resultData = parsed || { tip: responseText, focusArea: 'general', reasoning: '' };

    const { error: insertError } = await supabase
      .from('daily_insights')
      .insert({ user_id: ctx.userId, insight_date: today, content: resultData });

    if (insertError) {
      console.error('Failed to save daily insight:', insertError);
    }

    return NextResponse.json({ success: true, data: resultData, cached: false });
  } catch (error) {
    console.error('Daily insight error:', error);
    return NextResponse.json({ success: false, error: 'Gagal membuat insight harian' }, { status: 500 });
  }
}
