import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { InvalidUploadError, uploadVerificationDocument } from '@/lib/storage';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'finance' && ctx.userRole !== 'government') {
    return createForbiddenResponse('Only finance/government accounts submit verification documents');
  }

  try {
    const supabase = createAdminClient();

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', ctx.userId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!profile || profile.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Only accounts pending verification can submit a document' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ success: false, error: 'A document file is required' }, { status: 400 });
    }

    let path: string;
    try {
      path = await uploadVerificationDocument(supabase, ctx.userId, file);
    } catch (uploadError) {
      if (uploadError instanceof InvalidUploadError) {
        return NextResponse.json({ success: false, error: uploadError.message }, { status: 400 });
      }
      throw uploadError;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ verification_document_path: path })
      .eq('id', ctx.userId);
    if (updateError) throw updateError;

    return NextResponse.json({ success: true, data: { verificationDocumentPath: path } });
  } catch (error) {
    console.error('Verification document upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload verification document' },
      { status: 500 }
    );
  }
}
