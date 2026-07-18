import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createFinancingOpportunity,
  getFinanceableTransactions,
  getMyFinancingOffers,
} from '@/lib/db/farmer-operations';
import { getTransactionById } from '@/lib/db/transactions';
import { createNotification } from '@/lib/db/notifications';
import { buildFinancingNotification } from '@/lib/notification-copy';
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
  if (ctx.userRole !== 'finance') {
    return createForbiddenResponse('Only finance institutions can browse financing opportunities');
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope');

  try {
    const supabase = createAdminClient();

    if (scope === 'mine') {
      const offers = await getMyFinancingOffers(supabase, ctx.userId);
      return NextResponse.json({ success: true, data: offers });
    }

    if (scope === 'browse') {
      const transactions = await getFinanceableTransactions(supabase);
      return NextResponse.json({ success: true, data: transactions });
    }

    return NextResponse.json({ success: false, error: 'scope must be "browse" or "mine"' }, { status: 400 });
  } catch (error) {
    console.error('Financing fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch financing data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'finance') {
    return createForbiddenResponse('Only finance institutions can create financing offers');
  }

  try {
    const body = await request.json() as {
      transactionId?: string;
      institutionName?: string;
      productName?: string;
      amountMin?: number;
      amountMax?: number;
      interestRate?: string | null;
      tenorMonths?: number | null;
      requirements?: string[];
      contact?: Record<string, string> | null;
      notes?: string | null;
    };

    if (
      !body.transactionId || !body.institutionName || !body.productName ||
      body.amountMin === undefined || body.amountMax === undefined
    ) {
      return NextResponse.json(
        { success: false, error: 'transactionId, institutionName, productName, amountMin, and amountMax are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const transaction = await getTransactionById(supabase, body.transactionId);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    if (!['accepted', 'in_progress', 'completed'].includes(transaction.status)) {
      return NextResponse.json(
        { success: false, error: 'Only accepted, in-progress, or completed transactions can be financed' },
        { status: 400 }
      );
    }
    if (!transaction.farmer_id) {
      return NextResponse.json(
        { success: false, error: 'Transaction has no assigned farmer yet' },
        { status: 400 }
      );
    }

    const offer = await createFinancingOpportunity(supabase, {
      farmerId: transaction.farmer_id,
      transactionId: transaction.id,
      createdBy: ctx.userId,
      institutionName: body.institutionName,
      productName: body.productName,
      amountMin: body.amountMin,
      amountMax: body.amountMax,
      interestRate: body.interestRate,
      tenorMonths: body.tenorMonths,
      requirements: body.requirements,
      contact: body.contact,
      notes: body.notes,
    });

    try {
      const copy = buildFinancingNotification('offer_created', body.institutionName, body.productName);
      await createNotification(supabase, {
        userId: transaction.farmer_id,
        type: copy.type,
        title: copy.title,
        body: copy.body,
        link: '/dashboard/farmer-operations',
        relatedTransactionId: transaction.id,
      });
    } catch (notificationError) {
      console.error('Failed to create financing offer notification:', notificationError);
    }

    return NextResponse.json({ success: true, data: offer }, { status: 201 });
  } catch (error) {
    console.error('Financing offer create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create financing offer' },
      { status: 500 }
    );
  }
}
