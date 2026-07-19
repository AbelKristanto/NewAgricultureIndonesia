import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAssessment, getLeaderboard, getOwnAssessments } from '@/lib/db/sustainability';
import { CreateAssessmentInput, PesticideUsage, WasteManagement } from '@/types/sustainability';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

const VALID_PESTICIDE: PesticideUsage[] = ['none', 'low', 'moderate', 'high'];
const VALID_WASTE: WasteManagement[] = ['none', 'basic', 'advanced'];

export async function GET(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const supabase = createAdminClient();

    if (searchParams.get('mine') === '1') {
      if (ctx.userRole !== 'farmer') {
        return createForbiddenResponse('Only farmers have their own assessment history');
      }
      const assessments = await getOwnAssessments(supabase, ctx.userId);
      return NextResponse.json({ success: true, data: assessments });
    }

    const leaderboard = await getLeaderboard(supabase);
    return NextResponse.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('Sustainability fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch sustainability data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'farmer') {
    return createForbiddenResponse('Only farmers can submit sustainability assessments');
  }

  try {
    const body = await request.json() as Partial<CreateAssessmentInput>;
    if (!body.pesticideUsage || !VALID_PESTICIDE.includes(body.pesticideUsage)) {
      return NextResponse.json({ success: false, error: 'A valid pesticideUsage is required' }, { status: 400 });
    }
    if (!body.wasteManagement || !VALID_WASTE.includes(body.wasteManagement)) {
      return NextResponse.json({ success: false, error: 'A valid wasteManagement is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const assessment = await createAssessment(supabase, ctx.userId, {
      landPlotId: body.landPlotId,
      waterConservation: Boolean(body.waterConservation),
      pesticideUsage: body.pesticideUsage,
      organicCertified: Boolean(body.organicCertified),
      cropRotation: Boolean(body.cropRotation),
      wasteManagement: body.wasteManagement,
    });

    return NextResponse.json({ success: true, data: assessment }, { status: 201 });
  } catch (error) {
    console.error('Sustainability assessment create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save assessment' }, { status: 500 });
  }
}
