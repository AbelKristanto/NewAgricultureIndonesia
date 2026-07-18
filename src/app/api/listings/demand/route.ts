import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createDemandListing,
  getActiveDemandListings,
  getMyDemandListings,
} from '@/lib/db/listings';
import { CreateDemandListingInput } from '@/types/listings';
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
      const listings = await getActiveDemandListings(supabase);
      return NextResponse.json({ success: true, data: listings });
    }

    if (ctx.userRole !== 'buyer') {
      return createForbiddenResponse('Only buyers have their own demand listings');
    }

    const listings = await getMyDemandListings(supabase, ctx.userId);
    return NextResponse.json({ success: true, data: listings });
  } catch (error) {
    console.error('Demand listings fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch demand listings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  if (ctx.userRole !== 'buyer') {
    return createForbiddenResponse('Only buyers can create demand listings');
  }

  try {
    const supabase = createAdminClient();
    const body: CreateDemandListingInput = await request.json();

    if (!body.commodity || !body.volume || !body.deliveryProvince) {
      return NextResponse.json(
        { success: false, error: 'commodity, volume, and deliveryProvince are required' },
        { status: 400 }
      );
    }

    const listing = await createDemandListing(supabase, ctx.userId, body);
    return NextResponse.json({ success: true, data: listing }, { status: 201 });
  } catch (error) {
    console.error('Demand listing create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create demand listing' },
      { status: 500 }
    );
  }
}
