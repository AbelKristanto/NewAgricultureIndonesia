import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteDemandListing, getDemandListingById, updateDemandListing } from '@/lib/db/listings';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  try {
    const supabase = createAdminClient();
    const { id } = await params;
    const existing = await getDemandListingById(supabase, id);

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (existing.buyer_id !== ctx.userId) {
      return createForbiddenResponse('Only the owner can update this listing');
    }

    const body = await request.json() as {
      status?: 'active' | 'matched' | 'closed';
      volume?: number;
      priceExpectation?: number | null;
      notes?: string | null;
    };

    const updates: Record<string, unknown> = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.volume !== undefined) updates.volume = body.volume;
    if (body.priceExpectation !== undefined) updates.price_expectation = body.priceExpectation;
    if (body.notes !== undefined) updates.notes = body.notes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await updateDemandListing(supabase, id, updates);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Demand listing update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update demand listing' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  try {
    const supabase = createAdminClient();
    const { id } = await params;
    const existing = await getDemandListingById(supabase, id);

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (existing.buyer_id !== ctx.userId) {
      return createForbiddenResponse('Only the owner can delete this listing');
    }

    await deleteDemandListing(supabase, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Demand listing delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete demand listing' },
      { status: 500 }
    );
  }
}
