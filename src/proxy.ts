import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getDefaultDashboardPage, isApiRoutePermitted, isPagePermitted, normalizeUserRole } from '@/lib/rbac';
import type { UserRole } from '@/types/auth';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isDashboard = pathname.startsWith('/dashboard');
  const isApi = pathname.startsWith('/api');
  const isLogin = pathname === '/login';
  const isSignup = pathname === '/signup';
  const isPendingVerificationPage = pathname === '/pending-verification';
  const isVerificationUploadRoute = pathname === '/api/account/verification-document';
  const isAdminLogin = pathname === '/admin/login';
  const isAdminArea = pathname.startsWith('/admin') && !isAdminLogin;
  const isPaymentWebhook = pathname === '/api/payments/webhook';

  if (!isDashboard && !isApi && !isLogin && !isSignup && !isPendingVerificationPage && !isAdminArea && !isAdminLogin) {
    return NextResponse.next();
  }

  // Midtrans server-to-server callback — never carries a session; its only
  // security boundary is the signature check inside the route itself.
  if (isPaymentWebhook) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error) {
      user = data.user;
    }
  } catch {
    // Auth check failed; treat as unauthenticated.
  }

  if (!user) {
    if (isLogin || isSignup || isAdminLogin) {
      return supabaseResponse;
    }
    if (isApi) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = isAdminArea ? '/admin/login' : '/login';
    return NextResponse.redirect(url);
  }

  let role: UserRole | null = normalizeUserRole(user.user_metadata?.role);
  let status: string | null = null;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();
    role = normalizeUserRole(profile?.role) ?? role;
    status = profile?.status ?? null;
  } catch {
    // Profile query failed; continue with metadata role if available.
  }

  const needsVerification = role === 'finance' || role === 'government';
  const isBlockedByVerification = needsVerification && status !== 'approved';

  if (isPendingVerificationPage) {
    if (!isBlockedByVerification) {
      const url = request.nextUrl.clone();
      url.pathname = getDefaultDashboardPage(role);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (isBlockedByVerification && !isVerificationUploadRoute && !isLogin && !isSignup && !isAdminLogin && !isAdminArea) {
    if (isApi) {
      return NextResponse.json(
        { error: 'Account pending verification' },
        { status: 403 }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = '/pending-verification';
    return NextResponse.redirect(url);
  }

  if (isLogin || isSignup) {
    const url = request.nextUrl.clone();
    url.pathname = isBlockedByVerification ? '/pending-verification' : getDefaultDashboardPage(role);
    return NextResponse.redirect(url);
  }

  if (isAdminLogin) {
    if (role === 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (isDashboard) {
    if (pathname !== '/dashboard' && !isPagePermitted(role, pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = getDefaultDashboardPage(role);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (isAdminArea) {
    if (role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = getDefaultDashboardPage(role);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (isApi) {
    if (!isApiRoutePermitted(role, pathname)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.id);
    if (role) {
      requestHeaders.set('x-user-role', role);
    }

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });

    return response;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
    '/login',
    '/signup',
    '/pending-verification',
    '/admin/:path*',
  ],
};
