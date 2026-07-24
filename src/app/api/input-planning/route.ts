import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createInputPlan, getInputPlans } from '@/lib/db/input-planning';
import { CreateInputPlanInput } from '@/types/input-planning';
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
    return createForbiddenResponse('Only farmers can view input plans');
  }

  try {
    const supabase = createAdminClient();
    const plans = await getInputPlans(supabase, ctx.userId);
    return NextResponse.json({ success: true, data: plans });
  } catch (error) {
    console.error('Input plans fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch input plans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'farmer') {
    return createForbiddenResponse('Only farmers can create input plans');
  }

  try {
    const body = await request.json() as Partial<CreateInputPlanInput>;
    if (!body.itemName || body.quantity == null || !body.unit) {
      return NextResponse.json(
        { success: false, error: 'itemName, quantity, and unit are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const plan = await createInputPlan(supabase, ctx.userId, body as CreateInputPlanInput);
    return NextResponse.json({ success: true, data: plan }, { status: 201 });
  } catch (error) {
    console.error('Input plan create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create input plan' }, { status: 500 });
  }
}
