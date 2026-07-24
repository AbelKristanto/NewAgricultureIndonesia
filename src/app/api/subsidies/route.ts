import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSubsidy, getSubsidies } from '@/lib/db/subsidies';
import { CreateSubsidyInput } from '@/types/subsidies';
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
    return createForbiddenResponse('Only farmers can view subsidies');
  }

  try {
    const supabase = createAdminClient();
    const subsidies = await getSubsidies(supabase, ctx.userId);
    return NextResponse.json({ success: true, data: subsidies });
  } catch (error) {
    console.error('Subsidies fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch subsidies' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'farmer') {
    return createForbiddenResponse('Only farmers can create subsidies');
  }

  try {
    const body = await request.json() as Partial<CreateSubsidyInput>;
    if (!body.programName || !body.institutionName) {
      return NextResponse.json(
        { success: false, error: 'programName and institutionName are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const subsidy = await createSubsidy(supabase, ctx.userId, body as CreateSubsidyInput);
    return NextResponse.json({ success: true, data: subsidy }, { status: 201 });
  } catch (error) {
    console.error('Subsidy create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create subsidy' }, { status: 500 });
  }
}
