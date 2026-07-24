import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildAppendedCheckpoints, updateLogisticsPlan } from '@/lib/db/farmer-operations';
import { getTransactionById } from '@/lib/db/transactions';
import { canUpdateLogisticsForTransaction } from '@/lib/transaction-negotiation';
import { InvalidUploadError, enrichCheckpointsWithSignedUrls, uploadLogisticsPhoto } from '@/lib/storage';
import { isWithinIndonesia } from '@/lib/geo';
import { FarmerLogisticsPlan } from '@/types/farmer-operations';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

export async function POST(
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

    const { data: existing, error: fetchError } = await supabase
      .from('farmer_logistics_plans')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const plan = existing as FarmerLogisticsPlan;

    if (!plan.transaction_id) {
      return createForbiddenResponse('This logistics plan is not linked to a transaction');
    }
    const transaction = await getTransactionById(supabase, plan.transaction_id);
    if (!transaction || !canUpdateLogisticsForTransaction(transaction, ctx.userId, ctx.userRole)) {
      return createForbiddenResponse('Only an assigned logistics participant can update this plan');
    }

    const formData = await request.formData();
    const label = formData.get('label');
    const lat = formData.get('lat');
    const lng = formData.get('lng');
    const file = formData.get('file');

    if (typeof label !== 'string' || !label.trim() || typeof lat !== 'string' || typeof lng !== 'string') {
      return NextResponse.json({ success: false, error: 'label, lat, and lng are required' }, { status: 400 });
    }
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      return NextResponse.json({ success: false, error: 'lat and lng must be numbers' }, { status: 400 });
    }
    if (!isWithinIndonesia(latNum, lngNum)) {
      return NextResponse.json({ success: false, error: 'Checkpoint coordinates must be within Indonesia' }, { status: 400 });
    }

    let photoPath: string | null = null;
    if (file instanceof File && file.size > 0) {
      try {
        photoPath = await uploadLogisticsPhoto(supabase, plan.id, file);
      } catch (uploadError) {
        if (uploadError instanceof InvalidUploadError) {
          return NextResponse.json({ success: false, error: uploadError.message }, { status: 400 });
        }
        throw uploadError;
      }
    }

    const nextCheckpoints = buildAppendedCheckpoints(plan.checkpoints, {
      label: label.trim(),
      lat: latNum,
      lng: lngNum,
      photoPath,
    });

    const updated = await updateLogisticsPlan(supabase, id, { checkpoints: nextCheckpoints });
    updated.checkpoints = await enrichCheckpointsWithSignedUrls(supabase, updated.checkpoints);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Logistics checkpoint create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add checkpoint' },
      { status: 500 }
    );
  }
}
