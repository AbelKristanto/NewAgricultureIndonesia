import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createContract, getContracts } from '@/lib/db/contracts';
import { createNotification } from '@/lib/db/notifications';
import { buildContractNotification } from '@/lib/notification-copy';
import { CreateContractInput } from '@/types/contract';
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
  if (ctx.userRole !== 'farmer' && ctx.userRole !== 'buyer') {
    return createForbiddenResponse('Only farmers and buyers can view contracts');
  }

  try {
    const supabase = createAdminClient();
    const contracts = await getContracts(supabase, ctx.userId, ctx.userRole);
    return NextResponse.json({ success: true, data: contracts });
  } catch (error) {
    console.error('Contracts fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch contracts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'farmer' && ctx.userRole !== 'buyer') {
    return createForbiddenResponse('Only farmers and buyers can create contracts');
  }

  try {
    const body = await request.json() as Partial<CreateContractInput>;
    if (!body.counterpartyId || !body.commodity || !body.agreedVolume) {
      return NextResponse.json(
        { success: false, error: 'counterpartyId, commodity, and agreedVolume are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const contract = await createContract(supabase, ctx.userId, ctx.userRole, body as CreateContractInput);

    const copy = buildContractNotification('proposed', contract.commodity);
    await createNotification(supabase, {
      userId: body.counterpartyId,
      type: copy.type,
      title: copy.title,
      body: copy.body,
      link: '/dashboard/contracts',
    });

    return NextResponse.json({ success: true, data: contract }, { status: 201 });
  } catch (error) {
    console.error('Contract create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create contract' }, { status: 500 });
  }
}
