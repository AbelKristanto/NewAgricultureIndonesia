import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createTransaction, getUserTransactions } from '@/lib/db/transactions';
import { getSupplyListingById, getDemandListingById, markListingsMatched } from '@/lib/db/listings';
import { createNotification } from '@/lib/db/notifications';
import { buildMatchNotification } from '@/lib/notification-copy';
import { COMMODITIES } from '@/lib/constants';
import { CreateTransactionInput } from '@/types/transaction';
import {
  appendNegotiationEntry,
  calculateTransactionTotalValue,
  createNegotiationEntry,
} from '@/lib/transaction-negotiation';
import {
  getRequestContext,
  createForbiddenResponse,
  createUnauthorizedResponse,
} from '@/lib/api-helpers';

export async function GET(request: Request) {
  // Extract user context from middleware headers
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  try {
    const supabase = createAdminClient();
    const transactions = await getUserTransactions(supabase, ctx.userId);
    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Extract user context from middleware headers
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  if (ctx.userRole !== 'buyer') {
    return createForbiddenResponse('Only buyers can create transactions');
  }

  try {
    const supabase = createAdminClient();
    const body: CreateTransactionInput & {
      supplyListingId?: string;
      demandListingId?: string;
    } = await request.json();

    let farmerId = body.farmerId;
    let matchedSupplyListing: Awaited<ReturnType<typeof getSupplyListingById>> = null;

    if (!farmerId && !body.supplyListingId && !body.demandListingId) {
      return NextResponse.json(
        { success: false, error: 'farmerId is required so the farmer can see and respond to this transaction' },
        { status: 400 }
      );
    }

    if (body.supplyListingId || body.demandListingId) {
      if (!body.supplyListingId || !body.demandListingId) {
        return NextResponse.json(
          { success: false, error: 'Both supplyListingId and demandListingId are required to link a match' },
          { status: 400 }
        );
      }

      const [supplyListing, demandListing] = await Promise.all([
        getSupplyListingById(supabase, body.supplyListingId),
        getDemandListingById(supabase, body.demandListingId),
      ]);

      if (!supplyListing || !demandListing) {
        return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 });
      }
      if (demandListing.buyer_id !== ctx.userId) {
        return createForbiddenResponse('Only the owner of the demand listing can create this transaction');
      }
      if (supplyListing.status !== 'active' || demandListing.status !== 'active') {
        return NextResponse.json(
          { success: false, error: 'One of the listings is no longer active' },
          { status: 409 }
        );
      }

      farmerId = supplyListing.farmer_id;
      matchedSupplyListing = supplyListing;
    }

    const transaction = await createTransaction(supabase, ctx.userId, {
      commodity: body.commodity,
      volume: body.volume,
      volume_unit: body.volumeUnit,
      price_per_unit: body.pricePerUnit,
      total_value: calculateTransactionTotalValue(body.volume, body.pricePerUnit),
      delivery_province: body.deliveryProvince,
      delivery_city: body.deliveryCity,
      start_date: body.startDate,
      end_date: body.endDate,
      farmer_id: farmerId,
      terms: appendNegotiationEntry(
        body.terms ?? null,
        createNegotiationEntry({
          actorId: ctx.userId,
          actorParty: 'buyer',
          action: 'offer_created',
          status: 'draft',
          pricePerUnit: body.pricePerUnit ?? null,
          startDate: body.startDate ?? null,
          endDate: body.endDate ?? null,
          note: body.note,
        })
      ),
    });

    if (body.supplyListingId && body.demandListingId) {
      await markListingsMatched(supabase, body.supplyListingId, body.demandListingId, transaction.id);

      if (matchedSupplyListing) {
        try {
          const commodityLabel = COMMODITIES.find((c) => c.value === transaction.commodity)?.labelId || transaction.commodity;
          const copy = buildMatchNotification(commodityLabel);
          await createNotification(supabase, {
            userId: matchedSupplyListing.farmer_id,
            type: copy.type,
            title: copy.title,
            body: copy.body,
            link: '/dashboard/matching',
            relatedTransactionId: transaction.id,
          });
        } catch (notificationError) {
          console.error('Failed to create match notification:', notificationError);
        }
      }
    }

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error) {
    console.error('Transaction create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
