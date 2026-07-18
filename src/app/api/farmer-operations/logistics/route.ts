import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogisticsPlan, getLogisticsPlanByTransactionId } from '@/lib/db/farmer-operations';
import { enrichCheckpointsWithSignedUrls } from '@/lib/storage';
import { getTransactionById } from '@/lib/db/transactions';
import { canAccessTransaction, canManageLogisticsForTransaction } from '@/lib/transaction-negotiation';
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

  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get('transactionId');
  if (!transactionId) {
    return NextResponse.json({ success: false, error: 'transactionId is required' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const transaction = await getTransactionById(supabase, transactionId);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    if (!canAccessTransaction(transaction, ctx.userId)) {
      return createForbiddenResponse('You are not a party to this transaction');
    }

    const plan = await getLogisticsPlanByTransactionId(supabase, transactionId);
    if (plan) {
      plan.checkpoints = await enrichCheckpointsWithSignedUrls(supabase, plan.checkpoints);
    }
    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    console.error('Logistics plan fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logistics plan' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  try {
    const body = await request.json() as {
      transactionId?: string;
      providerName?: string;
      pickupAddress?: string;
      pickupLat?: number;
      pickupLng?: number;
      destinationAddress?: string;
      destinationLat?: number;
      destinationLng?: number;
      pickupTime?: string | null;
      notes?: string | null;
    };

    if (
      !body.transactionId || !body.providerName ||
      !body.pickupAddress || body.pickupLat === undefined || body.pickupLng === undefined ||
      !body.destinationAddress || body.destinationLat === undefined || body.destinationLng === undefined
    ) {
      return NextResponse.json(
        { success: false, error: 'transactionId, providerName, pickup and destination address/coordinates are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const transaction = await getTransactionById(supabase, body.transactionId);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    if (!canManageLogisticsForTransaction(transaction, ctx.userId, ctx.userRole)) {
      return createForbiddenResponse('Only the buyer (or an assigned logistics participant) can create a logistics plan');
    }
    if (!transaction.farmer_id) {
      return NextResponse.json(
        { success: false, error: 'Transaction has no assigned farmer yet' },
        { status: 400 }
      );
    }

    const existing = await getLogisticsPlanByTransactionId(supabase, body.transactionId);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A logistics plan already exists for this transaction' },
        { status: 409 }
      );
    }

    const plan = await createLogisticsPlan(supabase, {
      farmerId: transaction.farmer_id,
      transactionId: transaction.id,
      providerName: body.providerName,
      commodity: transaction.commodity,
      volume: transaction.volume,
      volumeUnit: transaction.volume_unit,
      pickupAddress: body.pickupAddress,
      pickupLat: body.pickupLat,
      pickupLng: body.pickupLng,
      destinationAddress: body.destinationAddress,
      destinationLat: body.destinationLat,
      destinationLng: body.destinationLng,
      pickupTime: body.pickupTime,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data: plan }, { status: 201 });
  } catch (error) {
    console.error('Logistics plan create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create logistics plan' },
      { status: 500 }
    );
  }
}
