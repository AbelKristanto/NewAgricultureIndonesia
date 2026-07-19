import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLandPlot, getLandPlots } from '@/lib/db/land-plots';
import { CreateLandPlotInput } from '@/types/land-plots';
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
    return createForbiddenResponse('Only farmers can view land plots');
  }

  try {
    const supabase = createAdminClient();
    const plots = await getLandPlots(supabase, ctx.userId);
    return NextResponse.json({ success: true, data: plots });
  } catch (error) {
    console.error('Land plots fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch land plots' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'farmer') {
    return createForbiddenResponse('Only farmers can create land plots');
  }

  try {
    const body = await request.json() as Partial<CreateLandPlotInput>;
    if (!body.name || !body.province || !body.areaValue || !body.areaUnit) {
      return NextResponse.json(
        { success: false, error: 'name, province, areaValue, and areaUnit are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const plot = await createLandPlot(supabase, ctx.userId, body as CreateLandPlotInput);
    return NextResponse.json({ success: true, data: plot }, { status: 201 });
  } catch (error) {
    console.error('Land plot create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create land plot' }, { status: 500 });
  }
}
