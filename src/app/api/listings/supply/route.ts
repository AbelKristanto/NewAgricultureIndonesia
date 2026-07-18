import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createSupplyListing,
  getActiveSupplyListings,
  getMySupplyListings,
} from '@/lib/db/listings';
import { CreateSupplyListingInput } from '@/types/listings';
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

  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');

    if (scope === 'active') {
      const listings = await getActiveSupplyListings(supabase);
      return NextResponse.json({ success: true, data: listings });
    }

    if (ctx.userRole !== 'farmer') {
      return createForbiddenResponse('Only farmers have their own supply listings');
    }

    const listings = await getMySupplyListings(supabase, ctx.userId);
    return NextResponse.json({ success: true, data: listings });
  } catch (error) {
    console.error('Supply listings fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch supply listings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  if (ctx.userRole !== 'farmer') {
    return createForbiddenResponse('Only farmers can create supply listings');
  }

  try {
    const supabase = createAdminClient();
    const body: CreateSupplyListingInput = await request.json();

    if (!body.commodity || !body.volume || !body.regionProvince) {
      return NextResponse.json(
        { success: false, error: 'commodity, volume, and regionProvince are required' },
        { status: 400 }
      );
    }

    const listing = await createSupplyListing(supabase, ctx.userId, body);
    return NextResponse.json({ success: true, data: listing }, { status: 201 });
  } catch (error) {
    console.error('Supply listing create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create supply listing' },
      { status: 500 }
    );
  }
}
