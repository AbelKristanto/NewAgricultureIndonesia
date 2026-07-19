import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateContentWithImage, parseAIResponse } from '@/lib/gemini';
import { getSystemPrompt } from '@/lib/prompts/system-prompt';
import { buildPlantScanPrompt } from '@/lib/prompts/plant-scan-prompt';
import { createPlantScan, getPlantScans } from '@/lib/db/plant-scans';
import { getLandPlotById } from '@/lib/db/land-plots';
import { InvalidUploadError, getSignedPlantScanPhotoUrl, uploadPlantScanPhoto } from '@/lib/storage';
import { PlantScanResult } from '@/types/plant-scan';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  createRateLimitResponse,
  getRequestContext,
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
  if (ctx.userRole !== 'farmer') {
    return createForbiddenResponse('Only farmers can view plant scans');
  }

  try {
    const supabase = createAdminClient();
    const scans = await getPlantScans(supabase, ctx.userId);
    const enriched = await Promise.all(
      scans.map(async (scan) => ({
        ...scan,
        photo_url: await getSignedPlantScanPhotoUrl(supabase, scan.photo_path),
      }))
    );
    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Plant scans fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch plant scans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'farmer') {
    return createForbiddenResponse('Only farmers can scan plants');
  }

  const category = getEndpointCategory('/api/plant-scans');
  if (category) {
    const config = RATE_LIMITS[category];
    const rateLimitResult = await checkRateLimit(ctx.userId, category, config);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfterSeconds ?? 60);
    }
  }

  try {
    const formData = await request.formData();
    const landPlotId = formData.get('landPlotId');
    const lang = formData.get('lang');
    const file = formData.get('file');

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ success: false, error: 'A photo file is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    let landPlotIdValue: string | null = null;
    let commodity: string | undefined;
    if (typeof landPlotId === 'string' && landPlotId) {
      const plot = await getLandPlotById(supabase, landPlotId);
      if (!plot) {
        return NextResponse.json({ success: false, error: 'Land plot not found' }, { status: 404 });
      }
      if (plot.farmer_id !== ctx.userId) {
        return createForbiddenResponse('You can only scan for your own land plots');
      }
      landPlotIdValue = plot.id;
      commodity = plot.commodity || undefined;
    }

    let uploaded;
    try {
      uploaded = await uploadPlantScanPhoto(supabase, ctx.userId, file);
    } catch (uploadError) {
      if (uploadError instanceof InvalidUploadError) {
        return NextResponse.json({ success: false, error: uploadError.message }, { status: 400 });
      }
      throw uploadError;
    }

    const resolvedLang: 'en' | 'id' = lang === 'en' ? 'en' : 'id';
    const systemPrompt = getSystemPrompt(resolvedLang);
    const userPrompt = buildPlantScanPrompt(commodity);

    let responseText: string;
    try {
      responseText = await generateContentWithImage(systemPrompt, userPrompt, uploaded.base64, uploaded.mimeType);
    } catch (aiError: unknown) {
      if (category) {
        await decrementRateLimit(ctx.userId, category);
      }
      console.error('Plant scan AI service error:', aiError);
      return NextResponse.json({ success: false, error: 'Gagal menganalisis foto' }, { status: 500 });
    }

    const parsed = parseAIResponse<PlantScanResult>(responseText);
    const resultData = parsed || { rawText: responseText };

    const scan = await createPlantScan(supabase, ctx.userId, landPlotIdValue, uploaded.path, resultData);
    const photo_url = await getSignedPlantScanPhotoUrl(supabase, scan.photo_path);

    return NextResponse.json({ success: true, data: { ...scan, photo_url } }, { status: 201 });
  } catch (error) {
    console.error('Plant scan create error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menganalisis foto' }, { status: 500 });
  }
}
