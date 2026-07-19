import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resendSignupConfirmation } from '@/lib/db/admin';
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
  if (ctx.userRole !== 'admin') {
    return createForbiddenResponse('Only admins can resend confirmation emails');
  }

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase.auth.admin.getUserById(id);
    if (error || !data.user) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }
    if (data.user.email_confirmed_at) {
      return NextResponse.json(
        { success: false, error: 'This account has already confirmed its email' },
        { status: 400 }
      );
    }
    if (!data.user.email) {
      return NextResponse.json({ success: false, error: 'Account has no email on file' }, { status: 400 });
    }

    const origin = new URL(request.url).origin;
    await resendSignupConfirmation(supabase, data.user.email, `${origin}/auth/callback`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend confirmation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resend confirmation email' },
      { status: 500 }
    );
  }
}
