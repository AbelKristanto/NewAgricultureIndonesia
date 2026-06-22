import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTransactionById, updateTransaction } from '@/lib/db/transactions';
import { TransactionStatus } from '@/types/transaction';
import {
  appendNegotiationEntry,
  calculateTransactionTotalValue,
  canRespondToLatestOffer,
  createNegotiationEntry,
  getTransactionParty,
  isStatusTransitionAllowed,
} from '@/lib/transaction-negotiation';
import {
  getRequestContext,
  createUnauthorizedResponse,
} from '@/lib/api-helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Extract user context from middleware headers
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  // All authenticated roles permitted — no role check needed

  try {
    const supabase = await createClient();
    const { id } = await params;
    const transaction = await getTransactionById(supabase, id);

    if (!transaction) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Ensure the user is a party to this transaction
    if (transaction.buyer_id !== ctx.userId && transaction.farmer_id !== ctx.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Transaction fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transaction' },
      { status: 500 }
    );
  }
}

function normalizeOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Extract user context from middleware headers
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  // All authenticated roles permitted — no role check needed

  try {
    const supabase = await createClient();
    const { id } = await params;

    // Verify the user is a party to this transaction before allowing update
    const existing = await getTransactionById(supabase, id);
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (existing.buyer_id !== ctx.userId && existing.farmer_id !== ctx.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const actorParty = getTransactionParty(existing, ctx.userId);
    if (!actorParty) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json() as {
      intent?: 'submit_proposal' | 'counter_offer' | 'accept_offer' | 'reject_offer';
      status?: TransactionStatus;
      farmer_id?: string | null;
      price_per_unit?: number | null;
      pricePerUnit?: number | null;
      total_value?: number | null;
      terms?: Record<string, unknown>;
      start_date?: string | null;
      startDate?: string | null;
      end_date?: string | null;
      endDate?: string | null;
      note?: string | null;
    };

    const allowedFields: Record<string, unknown> = {};
    const nextPrice =
      body.pricePerUnit !== undefined
        ? body.pricePerUnit
        : body.price_per_unit !== undefined
          ? body.price_per_unit
          : existing.price_per_unit;
    const nextStartDate =
      normalizeOptionalString(body.startDate ?? body.start_date) ?? existing.start_date;
    const nextEndDate =
      normalizeOptionalString(body.endDate ?? body.end_date) ?? existing.end_date;
    const note = normalizeOptionalString(body.note) ?? null;

    if (body.intent === 'submit_proposal') {
      if (existing.buyer_id !== ctx.userId) {
        return NextResponse.json({ error: 'Only the buyer can submit a proposal' }, { status: 403 });
      }
      if (existing.status !== 'draft') {
        return NextResponse.json({ error: 'Only draft transactions can be proposed' }, { status: 400 });
      }

      allowedFields.status = 'proposed';
      allowedFields.terms = appendNegotiationEntry(
        existing.terms,
        createNegotiationEntry({
          actorId: ctx.userId,
          actorParty,
          action: 'proposal_submitted',
          status: 'proposed',
          pricePerUnit: existing.price_per_unit,
          startDate: existing.start_date,
          endDate: existing.end_date,
          note,
        })
      );
    } else if (body.intent === 'counter_offer') {
      if (!['proposed', 'accepted'].includes(existing.status)) {
        return NextResponse.json({ error: 'Counter-offers are only available on active offers' }, { status: 400 });
      }
      if (!canRespondToLatestOffer(existing.terms, ctx.userId)) {
        return NextResponse.json({ error: 'Wait for the other party to respond first' }, { status: 400 });
      }

      const hasChanges =
        nextPrice !== existing.price_per_unit ||
        nextStartDate !== existing.start_date ||
        nextEndDate !== existing.end_date ||
        note !== null;

      if (!hasChanges) {
        return NextResponse.json({ error: 'Please update the offer or add a note before sending a counter-offer' }, { status: 400 });
      }

      allowedFields.status = 'proposed';
      allowedFields.price_per_unit = nextPrice;
      allowedFields.start_date = nextStartDate;
      allowedFields.end_date = nextEndDate;
      allowedFields.total_value = calculateTransactionTotalValue(existing.volume, nextPrice ?? null);
      allowedFields.terms = appendNegotiationEntry(
        existing.terms,
        createNegotiationEntry({
          actorId: ctx.userId,
          actorParty,
          action: 'counter_offer',
          status: 'proposed',
          pricePerUnit: nextPrice ?? null,
          startDate: nextStartDate,
          endDate: nextEndDate,
          note,
        })
      );
    } else if (body.intent === 'accept_offer') {
      if (existing.status !== 'proposed') {
        return NextResponse.json({ error: 'Only proposed offers can be accepted' }, { status: 400 });
      }
      if (!canRespondToLatestOffer(existing.terms, ctx.userId)) {
        return NextResponse.json({ error: 'You cannot accept your own latest offer' }, { status: 400 });
      }

      allowedFields.status = 'accepted';
      allowedFields.terms = appendNegotiationEntry(
        existing.terms,
        createNegotiationEntry({
          actorId: ctx.userId,
          actorParty,
          action: 'accepted',
          status: 'accepted',
          pricePerUnit: existing.price_per_unit,
          startDate: existing.start_date,
          endDate: existing.end_date,
          note,
        })
      );
    } else if (body.intent === 'reject_offer') {
      if (existing.status !== 'proposed') {
        return NextResponse.json({ error: 'Only proposed offers can be rejected' }, { status: 400 });
      }
      if (!canRespondToLatestOffer(existing.terms, ctx.userId)) {
        return NextResponse.json({ error: 'You cannot reject your own latest offer' }, { status: 400 });
      }

      allowedFields.status = 'cancelled';
      allowedFields.terms = appendNegotiationEntry(
        existing.terms,
        createNegotiationEntry({
          actorId: ctx.userId,
          actorParty,
          action: 'rejected',
          status: 'cancelled',
          pricePerUnit: existing.price_per_unit,
          startDate: existing.start_date,
          endDate: existing.end_date,
          note,
        })
      );
    } else if (body.status) {
      if (!isStatusTransitionAllowed(existing.status, body.status)) {
        return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
      }

      allowedFields.status = body.status;

      if (body.farmer_id !== undefined) {
        allowedFields.farmer_id = body.farmer_id;
      }

      if (body.status === 'proposed' && existing.buyer_id !== ctx.userId) {
        return NextResponse.json({ error: 'Only the buyer can submit a proposal' }, { status: 403 });
      }

      allowedFields.terms = appendNegotiationEntry(
        existing.terms,
        createNegotiationEntry({
          actorId: ctx.userId,
          actorParty,
          action: body.status === 'proposed' ? 'proposal_submitted' : 'status_updated',
          status: body.status,
          pricePerUnit: existing.price_per_unit,
          startDate: existing.start_date,
          endDate: existing.end_date,
          note,
        })
      );
    }

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await updateTransaction(supabase, id, allowedFields);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Transaction update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}
