import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isPagePermitted } from '@/lib/rbac';
import type { UserRole } from '@/types/auth';

const AUTH_TIMEOUT_MS = 5000;

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { pathname } = request.nextUrl;
  const isDashboard = pathname.startsWith('/dashboard');
  const isApi = pathname.startsWith('/api');
  const isLogin = pathname === '/login';

  // Only enforce auth/role for dashboard, API, and login routes
  if (!isDashboard && !isApi && !isLogin) {
    // For non-protected routes, still refresh session but don't block
    try {
      await supabase.auth.getUser();
    } catch {
      // Ignore errors on non-protected routes
    }
    return supabaseResponse;
  }

  // Validate user session with 5-second timeout
  let user = null;
  try {
    const authResult = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), AUTH_TIMEOUT_MS)
      ),
    ]);
    user = authResult.data.user;
  } catch {
    // Auth check timed out or failed
    if (isApi) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    if (isLogin) {
      // Can't verify auth — just show login page
      return supabaseResponse;
    }
    // For dashboard pages, redirect to login on timeout
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Login page: redirect authenticated users to dashboard, show page for unauthenticated
  if (isLogin) {
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Handle unauthenticated users
  if (!user) {
    if (isApi) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    // Redirect unauthenticated users away from dashboard
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Fetch user profile to get role from database
  // Wrapped in try/catch so login still works even if profiles table is unreachable
  let role: UserRole | null = null;
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[Middleware] Profile query error:', profileError.message);
    } else {
      role = profile?.role ?? null;
    }
  } catch (err) {
    console.error('[Middleware] Profile query exception:', err);
    // Continue with null role — user can still access /dashboard with default permissions
  }

  // For dashboard pages: check role permission
  if (isDashboard) {
    // The main /dashboard page is always accessible to authenticated users
    if (pathname !== '/dashboard' && !isPagePermitted(role, pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // For API routes: attach x-user-id and x-user-role headers
  if (isApi) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.id);
    requestHeaders.set('x-user-role', role || '');

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Copy cookies from supabaseResponse to the new response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });

    return response;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
