import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDefaultDashboardPage, normalizeUserRole } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=confirmation_failed', request.url));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL('/login?error=confirmation_failed', request.url));
  }

  const user = data.user;
  const role = normalizeUserRole(user.user_metadata?.role) ?? 'farmer';

  // Guarantee the profile row exists regardless of whether the
  // handle_new_user DB trigger is active — see migration 010. Insert
  // only if missing: a blind upsert here would reset an
  // already-verified account's status back to 'pending' on every
  // repeat visit to an old confirmation link.
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .maybeSingle();

  let status = existingProfile?.status;

  if (!existingProfile) {
    const needsVerification = role === 'finance' || role === 'government';
    status = needsVerification ? 'pending' : 'approved';

    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
      role,
      status,
      institution_name: user.user_metadata?.institution_name ?? null,
    });

    if (insertError) {
      console.error('Failed to create profile after email confirmation:', insertError);
    }
  }

  const destination = status === 'pending' || status === 'rejected'
    ? '/pending-verification'
    : getDefaultDashboardPage(role);

  return NextResponse.redirect(new URL(destination, request.url));
}
