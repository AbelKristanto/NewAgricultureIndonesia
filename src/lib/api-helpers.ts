import { NextResponse } from 'next/server';
import { UserRole } from '@/types/auth';

export interface RequestContext {
  userId: string;
  userRole: UserRole;
}

const VALID_ROLES: UserRole[] = ['farmer', 'buyer', 'supplier', 'logistics', 'finance', 'government'];

/**
 * Extracts user ID and role from request headers set by middleware.
 * Returns null if either header is missing or the role is invalid.
 */
export function getRequestContext(request: Request): RequestContext | null {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');

  if (!userId || !userRole) {
    return null;
  }

  if (!VALID_ROLES.includes(userRole as UserRole)) {
    return null;
  }

  return { userId, userRole: userRole as UserRole };
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
