import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getContractById, isContractTransitionAllowed, updateContractStatus } from '@/lib/db/contracts';
import { createNotification } from '@/lib/db/notifications';
import { buildContractNotification } from '@/lib/notification-copy';
import { ContractStatus } from '@/types/contract';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const contract = await getContractById(supabase, id);
    if (!contract) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (contract.farmer_id !== ctx.userId && contract.buyer_id !== ctx.userId) {
      return createForbiddenResponse('You are not a party to this contract');
    }

    return NextResponse.json({ success: true, data: contract });
  } catch (error) {
    console.error('Contract fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch contract' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  try {
    const { id } = await params;
    const body = await request.json() as { status?: ContractStatus };
    if (!body.status) {
      return NextResponse.json({ success: false, error: 'status is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const contract = await getContractById(supabase, id);
    if (!contract) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (contract.farmer_id !== ctx.userId && contract.buyer_id !== ctx.userId) {
      return createForbiddenResponse('You are not a party to this contract');
    }
    if (!isContractTransitionAllowed(contract.status, body.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot transition from ${contract.status} to ${body.status}` },
        { status: 400 }
      );
    }

    const updated = await updateContractStatus(supabase, id, body.status);

    const otherPartyId = contract.farmer_id === ctx.userId ? contract.buyer_id : contract.farmer_id;
    const copy = buildContractNotification('status_updated', contract.commodity, body.status);
    await createNotification(supabase, {
      userId: otherPartyId,
      type: copy.type,
      title: copy.title,
      body: copy.body,
      link: '/dashboard/contracts',
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Contract update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update contract' }, { status: 500 });
  }
}
