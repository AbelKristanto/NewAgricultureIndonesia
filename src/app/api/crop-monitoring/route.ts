import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createCropLog, getCropLogs } from '@/lib/db/crop-monitoring';
import { getLandPlotById } from '@/lib/db/land-plots';
import { InvalidUploadError, getSignedCropPhotoUrl, uploadCropMonitoringPhoto } from '@/lib/storage';
import { CropLogType } from '@/types/crop-monitoring';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

const VALID_LOG_TYPES: CropLogType[] = ['watering', 'fertilizing', 'condition_note', 'other'];

export async function GET(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'farmer') {
    return createForbiddenResponse('Only farmers can view crop monitoring logs');
  }

  try {
    const { searchParams } = new URL(request.url);
    const landPlotId = searchParams.get('landPlotId');
    if (!landPlotId) {
      return NextResponse.json({ success: false, error: 'landPlotId is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const plot = await getLandPlotById(supabase, landPlotId);
    if (!plot) {
      return NextResponse.json({ success: false, error: 'Land plot not found' }, { status: 404 });
    }
    if (plot.farmer_id !== ctx.userId) {
      return createForbiddenResponse('You can only view logs for your own land plots');
    }

    const logs = await getCropLogs(supabase, landPlotId);
    const enriched = await Promise.all(
      logs.map(async (log) => {
        if (!log.photo_path) return log;
        const photo_url = await getSignedCropPhotoUrl(supabase, log.photo_path);
        return { ...log, photo_url };
      })
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Crop monitoring fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch crop monitoring logs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'farmer') {
    return createForbiddenResponse('Only farmers can add crop monitoring logs');
  }

  try {
    const formData = await request.formData();
    const landPlotId = formData.get('landPlotId');
    const logType = formData.get('logType');
    const notes = formData.get('notes');
    const file = formData.get('file');

    if (typeof landPlotId !== 'string' || !landPlotId) {
      return NextResponse.json({ success: false, error: 'landPlotId is required' }, { status: 400 });
    }
    if (typeof logType !== 'string' || !VALID_LOG_TYPES.includes(logType as CropLogType)) {
      return NextResponse.json({ success: false, error: 'A valid logType is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const plot = await getLandPlotById(supabase, landPlotId);
    if (!plot) {
      return NextResponse.json({ success: false, error: 'Land plot not found' }, { status: 404 });
    }
    if (plot.farmer_id !== ctx.userId) {
      return createForbiddenResponse('You can only log activity for your own land plots');
    }

    let photoPath: string | null = null;
    if (file instanceof File && file.size > 0) {
      try {
        photoPath = await uploadCropMonitoringPhoto(supabase, landPlotId, file);
      } catch (uploadError) {
        if (uploadError instanceof InvalidUploadError) {
          return NextResponse.json({ success: false, error: uploadError.message }, { status: 400 });
        }
        throw uploadError;
      }
    }

    const log = await createCropLog(
      supabase,
      ctx.userId,
      landPlotId,
      logType as CropLogType,
      typeof notes === 'string' && notes.trim() ? notes.trim() : null,
      photoPath
    );

    const photo_url = log.photo_path ? await getSignedCropPhotoUrl(supabase, log.photo_path) : null;

    return NextResponse.json({ success: true, data: { ...log, photo_url } }, { status: 201 });
  } catch (error) {
    console.error('Crop monitoring log create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to add crop monitoring log' }, { status: 500 });
  }
}
