# Implementation Plan: Performance and Role Optimization

## Overview

This plan implements role-based access control (RBAC), rate limiting, memory leak prevention, database schema completion, session caching, data fetching optimization, dashboard customization, query performance improvements, and error handling for the Serenagri AI platform. Tasks are ordered to build foundational infrastructure first (types, config, database), then middleware and server-side logic, followed by client-side components, and finally integration wiring.

## Tasks

- [ ] 1. Database schema and migration
  - [x] 1.1 Create database migration for new tables (transactions, matching_analyses, weather_analyses, rate_limits)
    - Create `supabase/migrations/003_performance_role_optimization.sql`
    - Define `transactions` table with all columns, constraints, foreign keys, and status check constraint
    - Define `matching_analyses` table with columns and foreign keys
    - Define `weather_analyses` table with columns and foreign keys
    - Define `rate_limits` table with columns and foreign keys
    - Add composite indexes: `(buyer_id, created_at DESC)` and `(farmer_id, created_at DESC)` on transactions, `(user_id, created_at DESC)` on matching_analyses and weather_analyses, `(user_id, endpoint, window_start)` on rate_limits
    - Attach `update_updated_at` trigger to transactions table
    - Enable RLS on all new tables
    - Define RLS policies for transactions (SELECT/INSERT/UPDATE based on buyer_id/farmer_id)
    - Define RLS policies for matching_analyses and weather_analyses (SELECT/INSERT based on user_id)
    - Define RLS policies for rate_limits (no access for authenticated, service_role only)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

- [x] 2. RBAC configuration and types
  - [x] 2.1 Create the RBAC permission configuration module (`src/lib/rbac.ts`)
    - Define `RolePermissions` interface with `pages`, `apiRoutes`, `metricCards`, `quickActions` arrays
    - Define `ROLE_PERMISSIONS` record mapping each of the 6 roles to their exact permitted pages, API routes, metric cards, and quick actions as specified in requirements
    - Define `DEFAULT_PERMISSIONS` for unknown/missing roles (Chat and Weather only)
    - Implement `getPermissions(role)` function
    - Implement `isPagePermitted(role, pathname)` function
    - Implement `isApiRoutePermitted(role, pathname)` function
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.9, 2.7, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 2.2 Write property test for role-permission mapping completeness
    - **Property 1: Role-permission mapping completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.7, 8.1, 8.2, 8.3, 8.4**

  - [ ]* 2.3 Write property test for unauthorized access denial
    - **Property 2: Unauthorized access denial**
    - **Validates: Requirements 1.7, 2.1, 2.2, 2.3, 2.4**

  - [ ]* 2.4 Write property test for fallback permissions
    - **Property 3: Fallback permissions for invalid roles**
    - **Validates: Requirements 1.9, 2.8**

  - [ ]* 2.5 Write property test for quick actions subset invariant
    - **Property 9: Quick actions subset invariant**
    - **Validates: Requirements 8.5**

- [x] 3. Supabase client singleton and memory leak prevention
  - [x] 3.1 Refactor Supabase browser client to singleton pattern (`src/lib/supabase/client.ts`)
    - Implement module-level singleton variable
    - Ensure `createClient()` returns the same instance on every call
    - _Requirements: 4.1, 4.4_

  - [ ]* 3.2 Write property test for Supabase client singleton identity
    - **Property 7: Supabase client singleton identity**
    - **Validates: Requirements 4.1**

  - [x] 3.3 Add cleanup handlers to AuthContext (`src/contexts/AuthContext.tsx`)
    - Unsubscribe from auth state listener on sign-out event
    - Add AbortController for async operations
    - Prevent state updates after unmount using isMounted flag
    - _Requirements: 4.3, 4.6_

  - [x] 3.4 Add cleanup handlers to dashboard page components
    - Add AbortController to data-fetching useEffect hooks in dashboard pages
    - Cancel pending operations on unmount
    - Add isMounted checks before state updates
    - _Requirements: 4.2, 4.5, 4.6_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Server-side session caching and API helpers
  - [x] 5.1 Create API helper utilities (`src/lib/api-helpers.ts`)
    - Implement `getRequestContext(request)` to extract user ID and role from request headers (set by middleware)
    - Implement `createForbiddenResponse(message?)` returning 403 JSON response
    - Implement `createUnauthorizedResponse(message?)` returning 401 JSON response
    - Implement `createRateLimitResponse(retryAfter)` returning 429 JSON response with Retry-After header
    - _Requirements: 2.1, 2.5, 2.6, 6.1, 6.2, 6.6_

  - [x] 5.2 Enhance middleware with role-based access and session passing (`src/middleware.ts`)
    - Validate user session via `supabase.auth.getUser()` with 5-second timeout
    - Fetch user profile to get role from database on every request
    - For dashboard pages: check role permission using `isPagePermitted`, redirect to `/dashboard` if unauthorized
    - For API routes: attach `x-user-id` and `x-user-role` headers to forward request
    - Return 401 for unauthenticated API requests
    - Return 401 if auth check times out
    - _Requirements: 1.7, 1.8, 2.5, 2.6, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6. Rate limiter implementation
  - [x] 6.1 Create rate limiter module (`src/lib/rate-limiter.ts`)
    - Define `RateLimitConfig` interface and `RATE_LIMITS` configuration (10 AI analysis / 15min, 30 chat / 15min)
    - Implement `checkRateLimit(userId, endpoint, config)` that queries `rate_limits` table using service_role client
    - Implement `decrementRateLimit(userId, endpoint)` for 5xx error rollback
    - Calculate `Retry-After` header value based on window expiry
    - Skip rate limit check for unauthenticated requests (401)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 6.2 Write property test for rate limit enforcement
    - **Property 4: Rate limit enforcement**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 6.3 Write property test for Retry-After accuracy
    - **Property 5: Rate limit Retry-After accuracy**
    - **Validates: Requirements 3.3**

  - [ ]* 6.4 Write property test for rate limit decrement on server error
    - **Property 6: Rate limit decrement on server error**
    - **Validates: Requirements 3.5**

- [x] 7. API route protection with RBAC and rate limiting
  - [x] 7.1 Refactor API route handlers to use middleware session and role checks
    - Update `/api/ai/farmer/route.ts` to use `getRequestContext()` and verify role is "farmer"
    - Update `/api/ai/buyer/route.ts` to use `getRequestContext()` and verify role is "buyer"
    - Update `/api/admin/simulation/route.ts` to use `getRequestContext()` and verify role is "government"
    - Update `/api/ai/chat/route.ts`, `/api/ai/matching/route.ts`, `/api/ai/policy/route.ts`, `/api/ai/weather/route.ts`, `/api/transactions/route.ts` to use `getRequestContext()` (all authenticated roles permitted)
    - Integrate rate limiter calls before AI service invocation
    - Decrement rate limit on 5xx AI service errors
    - Return 403 for unauthorized roles, 429 for rate limit exceeded
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.5_

  - [x] 7.2 Implement error sanitization in API responses
    - Create error sanitization utility that strips stack traces, file paths, internal service names, and env vars
    - Return localized Indonesian error messages for AI failures (`"Gagal menghasilkan analisis"`)
    - Return localized error for database failures (`"Gagal memuat data"`)
    - Log full error details server-side with `console.error`
    - _Requirements: 10.5, 10.6_

  - [ ]* 7.3 Write property test for error sanitization
    - **Property 13: Error sanitization in client responses**
    - **Validates: Requirements 10.5, 10.6**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Client-side RoleGuard and navigation filtering
  - [x] 9.1 Create RoleGuard component (`src/components/auth/RoleGuard.tsx`)
    - Read role from RoleContext
    - Check current pathname against permitted pages using `isPagePermitted`
    - Redirect to `/dashboard` if unauthorized (within 1 second)
    - Render children only if authorized
    - _Requirements: 1.7, 1.9_

  - [x] 9.2 Update Sidebar and navigation components to filter by role
    - Modify `src/components/layout/Sidebar.tsx` to filter navigation items based on role permissions
    - Modify `src/components/layout/MobileNav.tsx` to filter navigation items based on role permissions
    - Only display pages permitted for the user's role
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.9_

  - [x] 9.3 Integrate RoleGuard into dashboard layout
    - Wrap dashboard children with RoleGuard in `src/app/dashboard/layout.tsx`
    - _Requirements: 1.7_

- [x] 10. Dashboard cache and data fetching optimization
  - [x] 10.1 Create dashboard cache module (`src/lib/dashboard-cache.ts`)
    - Implement `DashboardCache` class with in-memory Map storage
    - Implement `get<T>(key)` with 60-second TTL check
    - Implement `set<T>(key, data)` with timestamp
    - Implement `invalidate(key)` and `clear()` methods
    - Export singleton cache instance
    - _Requirements: 7.2, 7.5_

  - [ ]* 10.2 Write property test for dashboard cache behavior
    - **Property 8: Dashboard cache behavior**
    - **Validates: Requirements 7.2, 7.5**

  - [x] 10.3 Create optimized dashboard data fetching hook (`src/hooks/useDashboardData.ts`)
    - Fetch metrics counts using `head: true` with `count: 'exact'` (no row payloads)
    - Use parallel queries (Promise.all) for all metrics in max 2 sequential round-trips
    - Integrate with DashboardCache for stale-while-revalidate pattern
    - Serve cached data on re-navigation within 60 seconds, trigger background refresh
    - Skip re-fetch on re-renders that don't affect user identity or route
    - If background refresh fails, keep showing cached data without error
    - _Requirements: 7.1, 7.2, 7.5, 7.6, 9.5_

  - [x] 10.4 Implement pagination utility for list queries (`src/lib/query-helpers.ts`)
    - Create `paginatedQuery` helper accepting `page`, `pageSize` (default 50, max 50)
    - Use explicit column lists instead of `select('*')`
    - Return `{ data, total, page, pageSize }` response format
    - Add 10-second query timeout handling
    - Return error response (not empty success) on query failure
    - _Requirements: 9.1, 9.2, 9.5, 9.6, 9.7_

  - [ ]* 10.5 Write property test for pagination limit enforcement
    - **Property 11: Pagination limit enforcement**
    - **Validates: Requirements 9.2**

  - [ ]* 10.6 Write property test for error response integrity on query failure
    - **Property 12: Error response integrity on query failure**
    - **Validates: Requirements 9.7**

- [x] 11. Role-based dashboard customization
  - [x] 11.1 Refactor dashboard page with role-based metrics and quick actions (`src/app/dashboard/page.tsx`)
    - Use `getPermissions(role).metricCards` to determine which metric cards to display
    - Use `getPermissions(role).quickActions` to determine which quick action links to show
    - Farmer: 3 metric cards (farmer analyses, chat conversations, weather analyses)
    - Buyer: 4 metric cards (buyer analyses, transactions, matching analyses, chat conversations)
    - Government: 4 metric cards (total policy, total farmer, total buyer, total transactions across all users)
    - Supplier/Logistics/Finance: 2 metric cards (chat conversations, farmer analyses)
    - Display max 5 recent activity items sorted by created_at desc, filtered by role access
    - Show skeleton loading placeholders while data loads
    - Show metrics as 0 and empty activity on fetch failure with retry button
    - Replace all skeletons with content in a single render cycle
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 7.3, 7.4, 7.7_

  - [ ]* 11.2 Write property test for activity items filtering and ordering
    - **Property 10: Activity items filtering and ordering**
    - **Validates: Requirements 8.6**

- [x] 12. Error boundary and connection monitoring
  - [x] 12.1 Create ErrorBoundary component (`src/components/error/ErrorBoundary.tsx`)
    - Implement React class component error boundary
    - Display localized Indonesian error description on catch
    - Provide reload button that re-renders only the failed component
    - Do not unmount or affect other components on the page
    - _Requirements: 10.1, 10.2_

  - [x] 12.2 Create ConnectionBanner component (`src/components/error/ConnectionBanner.tsx`)
    - Monitor Supabase connectivity status
    - Display connection error banner across all dashboard pages when disconnected
    - Retry connection every 30 seconds, max 5 attempts
    - After max retries, show persistent banner with manual reload instruction
    - Auto-dismiss banner within 5 seconds of successful reconnection
    - _Requirements: 10.3, 10.4, 10.7_

  - [x] 12.3 Integrate ErrorBoundary and ConnectionBanner into dashboard layout
    - Wrap dashboard page content with ErrorBoundary in layout
    - Add ConnectionBanner to dashboard layout (visible across all pages)
    - _Requirements: 10.1, 10.3_

- [x] 13. Final integration and wiring
  - [x] 13.1 Wire all components together in dashboard layout and app providers
    - Ensure RoleGuard, ErrorBoundary, ConnectionBanner are properly composed in `src/app/dashboard/layout.tsx`
    - Verify Supabase singleton is used consistently (no `createClient()` in useEffect or event handlers)
    - Ensure all dashboard page components use AbortController for cleanup
    - Verify middleware passes session context to all API routes
    - _Requirements: 4.1, 4.4, 6.1, 6.2_

  - [ ]* 13.2 Write integration tests for full auth and RBAC flow
    - Test middleware → route handler session passing
    - Test role-based page redirect
    - Test role-based API route denial (403)
    - Test rate limit enforcement end-to-end
    - _Requirements: 1.7, 2.1, 2.2, 2.3, 3.1, 3.3_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- The project uses Next.js 16, React 19, Supabase, and TypeScript — all code should follow existing patterns
- Database migration should be run via the Supabase SQL editor or the existing `npm run setup` script pattern
- The `fast-check` library needs to be installed as a dev dependency for property-based tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "2.4", "2.5", "3.2", "3.3", "3.4", "5.1"] },
    { "id": 2, "tasks": ["5.2", "6.1", "10.1"] },
    { "id": 3, "tasks": ["6.2", "6.3", "6.4", "10.2", "9.1", "9.2"] },
    { "id": 4, "tasks": ["7.1", "7.2", "9.3", "10.3", "10.4"] },
    { "id": 5, "tasks": ["7.3", "10.5", "10.6", "11.1"] },
    { "id": 6, "tasks": ["11.2", "12.1", "12.2"] },
    { "id": 7, "tasks": ["12.3", "13.1"] },
    { "id": 8, "tasks": ["13.2"] }
  ]
}
```
