import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getDefaultDashboardPage, isApiRoutePermitted, isPagePermitted, normalizeUserRole } from '@/lib/rbac';
import type { UserRole } from '@/types/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware entirely for non-protected routes
  const isDashboard = pathname.startsWith('/dashboard');
  const isApi = pathname.startsWith('/api');
  const isLogin = pathname === '/login';

  if (!isDashboard && !isApi && !isLogin) {
    return NextResponse.next();
  }

  // Create Supabase server client with cookie handling
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

  // Get user session — wrapped in try/catch for resilience
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error) {
      user = data.user;
    }
  } catch {
    // Auth check failed — treat as unauthenticated
  }

  // Unauthenticated users
  if (!user) {
    if (isLogin) {
      return supabaseResponse;
    }
    if (isApi) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Resolve role from auth metadata first, then prefer profile value when available.
  let role: UserRole | null = normalizeUserRole(user.user_metadata?.role);
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    role = normalizeUserRole(profile?.role) ?? role;
  } catch {
    // Profile query failed — continue with metadata role if available
  }

  if (isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = getDefaultDashboardPage(role);
    return NextResponse.redirect(url);
  }

  // Dashboard page access control
  if (isDashboard) {
    if (pathname !== '/dashboard' && !isPagePermitted(role, pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = getDefaultDashboardPage(role);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // API routes — attach user context headers
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

    // Preserve auth cookies
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
  ],
};
