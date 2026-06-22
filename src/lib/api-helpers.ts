import { NextResponse } from 'next/server';
import { UserRole } from '@/types/auth';
import { isApiRoutePermitted, normalizeUserRole } from '@/lib/rbac';

export interface RequestContext {
  userId: string;
  userRole: UserRole;
}

/**
 * Extracts user ID and role from request headers set by middleware.
 * Returns null if either header is missing or the role is invalid.
 */
export function getRequestContext(request: Request): RequestContext | null {
  const userId = request.headers.get('x-user-id');
  const userRole = normalizeUserRole(request.headers.get('x-user-role'));

  if (!userId || !userRole) {
    return null;
  }

  return { userId, userRole };
}

/**
 * Creates a 403 Forbidden JSON response.
 */
export function createForbiddenResponse(message?: string): NextResponse {
  return NextResponse.json(
    { error: message || 'Insufficient permissions' },
    { status: 403 }
  );
}

/**
 * Creates a 401 Unauthorized JSON response.
 */
export function createUnauthorizedResponse(message?: string): NextResponse {
  return NextResponse.json(
    { error: message || 'Authentication required' },
    { status: 401 }
  );
}

/**
 * Creates a 429 Too Many Requests JSON response with Retry-After header.
 */
export function createRateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
      },
    }
  );
}

/**
 * Checks a request context against the same API route permissions used by middleware.
 */
export function isRequestPermittedForApi(ctx: RequestContext, pathname: string): boolean {
  return isApiRoutePermitted(ctx.userRole, pathname);
}
