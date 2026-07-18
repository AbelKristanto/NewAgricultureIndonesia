import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAccount, getAllProfilesWithEmail } from '@/lib/db/admin';
import { VALID_USER_ROLES } from '@/lib/rbac';
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
  if (ctx.userRole !== 'admin') {
    return createForbiddenResponse('Only admins can view accounts');
  }

  try {
    const supabase = createAdminClient();
    const accounts = await getAllProfilesWithEmail(supabase);
    return NextResponse.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Admin accounts fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }
  if (ctx.userRole !== 'admin') {
    return createForbiddenResponse('Only admins can create accounts');
  }

  try {
    const body = await request.json() as {
      email?: string;
      password?: string;
      username?: string;
      role?: string;
      institutionName?: string;
    };

    if (!body.email || !body.password || !body.username || !body.role) {
      return NextResponse.json(
        { success: false, error: 'email, password, username, and role are required' },
        { status: 400 }
      );
    }
    if (!(VALID_USER_ROLES as string[]).includes(body.role)) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }
    if (body.password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const user = await createAccount(supabase, {
      email: body.email,
      password: body.password,
      username: body.username,
      role: body.role,
      institutionName: body.institutionName,
    });
    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    console.error('Admin account create error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create account';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
