import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createHarvestRecord, getHarvestRecords } from '@/lib/db/harvest-records';
import { getLandPlotById } from '@/lib/db/land-plots';
import { CreateHarvestRecordInput } from '@/types/harvest-records';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

export async function GET(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'farmer') {
    return createForbiddenResponse('Only farmers can view production history');
  }

  try {
    const supabase = createAdminClient();
    const records = await getHarvestRecords(supabase, ctx.userId);
    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error('Harvest records fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch production history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'farmer') {
    return createForbiddenResponse('Only farmers can add harvest records');
  }

  try {
    const body = await request.json() as Partial<CreateHarvestRecordInput>;
    if (!body.landPlotId || !body.commodity) {
      return NextResponse.json({ success: false, error: 'landPlotId and commodity are required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const plot = await getLandPlotById(supabase, body.landPlotId);
    if (!plot) {
      return NextResponse.json({ success: false, error: 'Land plot not found' }, { status: 404 });
    }
    if (plot.farmer_id !== ctx.userId) {
      return createForbiddenResponse('You can only add harvest records for your own land plots');
    }

    const record = await createHarvestRecord(supabase, ctx.userId, body as CreateHarvestRecordInput);
    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error('Harvest record create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to add harvest record' }, { status: 500 });
  }
}
