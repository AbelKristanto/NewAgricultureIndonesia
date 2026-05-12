# Requirements Document

## Introduction

This document defines requirements for optimizing the Serenagri AI agricultural platform's performance, preventing memory leaks, and implementing proper role-based access control (RBAC). The platform currently has 6 user roles (farmer, buyer, supplier, logistics, finance, government) but lacks differentiated access control — all authenticated users can access all features. Additionally, client-side components create multiple Supabase client instances, API routes lack rate limiting, and the database schema is missing tables referenced in code (transactions, matching_analyses, weather_analyses).

## Glossary

- **Platform**: The Serenagri AI Next.js web application
- **Role_Guard**: A middleware or component that restricts access to pages and API routes based on user role
- **Rate_Limiter**: A server-side mechanism that limits the number of API requests per user within a time window
- **Supabase_Client**: The browser-side Supabase client instance used for database queries
- **API_Route**: A Next.js server-side route handler under `/api/`
- **Dashboard_Page**: A client-rendered page under `/dashboard/`
- **RLS_Policy**: A Supabase Row Level Security policy that restricts database access at the row level
- **Session_Cache**: A mechanism to cache authenticated user session data to avoid redundant auth checks
- **Admin_User**: A user with the "government" role who has access to simulation/admin features
- **Cleanup_Handler**: A function that properly disposes of subscriptions, listeners, and timers when a component unmounts

## Requirements

### Requirement 1: Role-Based Page Access Control

**User Story:** As a platform administrator, I want each user role to only access pages relevant to their role, so that the interface is focused and users cannot access unauthorized features.

#### Acceptance Criteria

1. WHEN a user with role "farmer" navigates to the Dashboard, THE Role_Guard SHALL display only the Farmer Analysis, Chat, Weather, and Matching pages in the navigation
2. WHEN a user with role "buyer" navigates to the Dashboard, THE Role_Guard SHALL display only the Buyer Sourcing, Chat, Matching, Transactions, and Weather pages in the navigation
3. WHEN a user with role "government" navigates to the Dashboard, THE Role_Guard SHALL display the Farmer Analysis, Buyer Sourcing, Policy Analysis, Chat, Matching, Weather, Transactions, and Simulation pages in the navigation
4. WHEN a user with role "supplier" navigates to the Dashboard, THE Role_Guard SHALL display only the Matching, Transactions, Chat, and Weather pages in the navigation
5. WHEN a user with role "logistics" navigates to the Dashboard, THE Role_Guard SHALL display only the Matching, Transactions, Chat, and Weather pages in the navigation
6. WHEN a user with role "finance" navigates to the Dashboard, THE Role_Guard SHALL display only the Policy Analysis, Transactions, Chat, and Weather pages in the navigation
7. WHEN an authenticated user attempts to access a page URL not permitted for their role via direct navigation or URL entry, THE Role_Guard SHALL redirect the user to the /dashboard path within 1 second without displaying the unauthorized page content
8. THE Role_Guard SHALL read the user role from the authenticated Supabase session without additional database queries
9. IF the authenticated session contains no role or an unrecognized role value, THEN THE Role_Guard SHALL redirect the user to the /dashboard path and display only the Chat and Weather pages in the navigation

### Requirement 2: Role-Based API Route Protection

**User Story:** As a platform administrator, I want API routes to enforce role-based access, so that users cannot invoke backend features outside their permitted scope.

#### Acceptance Criteria

1. WHEN a user with role "farmer" calls the `/api/ai/buyer` endpoint, THE API_Route SHALL return a 403 Forbidden response with a JSON body containing an error field indicating insufficient permissions
2. WHEN a user with role "buyer" calls the `/api/ai/farmer` endpoint, THE API_Route SHALL return a 403 Forbidden response with a JSON body containing an error field indicating insufficient permissions
3. WHEN any authenticated user calls the `/api/admin/simulation` endpoint without the "government" role, THE API_Route SHALL return a 403 Forbidden response with a JSON body containing an error field indicating insufficient permissions
4. WHEN a user calls an API endpoint permitted for their role, THE API_Route SHALL forward the request to the route handler and return a 2xx response upon successful processing
5. THE API_Route SHALL retrieve the user role from the user's profile record on the server side on every request, and IF the user's role cannot be determined due to a missing or invalid profile record, THEN THE API_Route SHALL return a 403 Forbidden response
6. WHEN an unauthenticated user calls any protected API endpoint, THE API_Route SHALL return a 401 Unauthorized response with a JSON body containing an error field indicating authentication is required
7. THE API_Route SHALL enforce the following role-to-route access mapping: `/api/ai/farmer` is permitted only for the "farmer" role; `/api/ai/buyer` is permitted only for the "buyer" role; `/api/admin/simulation` is permitted only for the "government" role; `/api/ai/chat`, `/api/ai/matching`, `/api/ai/policy`, `/api/ai/weather`, and `/api/transactions` are permitted for all authenticated roles (farmer, buyer, supplier, logistics, finance, government)
8. WHEN a user calls any API endpoint not listed in the role-to-route access mapping, THE API_Route SHALL deny access by returning a 403 Forbidden response

### Requirement 3: API Rate Limiting

**User Story:** As a platform administrator, I want to limit the number of AI analysis requests per user, so that the system remains responsive and costs are controlled.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL allow a maximum of 10 AI analysis requests per authenticated user per 15-minute sliding window, where AI analysis requests are requests to the buyer, farmer, matching, policy, and weather AI endpoints
2. THE Rate_Limiter SHALL allow a maximum of 30 chat messages per authenticated user per 15-minute sliding window
3. WHEN an authenticated user submits a request that would exceed the rate limit, THE Rate_Limiter SHALL reject the request before invoking the AI service and return a 429 Too Many Requests response with a `Retry-After` header indicating the number of seconds until the oldest request in the window expires
4. THE Rate_Limiter SHALL track request counts per user using a Supabase table where each record expires automatically after 15 minutes from creation
5. THE Rate_Limiter SHALL increment the request count before processing and decrement it if the AI service returns a 5xx error, so that client errors (4xx) other than 401 and 429 are counted toward the limit but server failures are not
6. IF the user is not authenticated (401 response), THEN THE Rate_Limiter SHALL not evaluate or increment the rate limit counter for that request

### Requirement 4: Client-Side Memory Leak Prevention

**User Story:** As a developer, I want client components to properly manage resources, so that the application does not accumulate memory usage over time.

#### Acceptance Criteria

1. THE Platform SHALL create exactly one Supabase_Client instance per browser tab and share it across all components via a module-level singleton or a React ref initialized once at the provider level
2. WHEN a Dashboard_Page component unmounts, THE Cleanup_Handler SHALL cancel all pending data-fetching operations (including Supabase SDK queries and any direct fetch calls) by signaling an AbortController that was created on mount
3. WHEN the AuthContext detects a sign-out event, THE Cleanup_Handler SHALL unsubscribe from all active Supabase auth state listeners registered by the AuthContext before clearing user state
4. THE Platform SHALL not create new Supabase_Client instances inside useEffect hooks or event handlers; all client references SHALL use the singleton instance via import or ref
5. WHEN the Chat page component unmounts during an active stream, THE Cleanup_Handler SHALL call cancel on the streaming ReadableStreamDefaultReader, causing the underlying fetch connection to close, and SHALL not update component state after unmount
6. WHEN any component unmounts while an asynchronous operation is in progress, THE Cleanup_Handler SHALL prevent React state updates on the unmounted component by checking an isMounted flag or using the AbortController signal

### Requirement 5: Database Schema Completion

**User Story:** As a developer, I want all database tables referenced in the application code to exist with proper schema, so that all features function correctly.

#### Acceptance Criteria

1. THE Platform SHALL include a `transactions` table with columns: id (uuid PK, default gen_random_uuid()), buyer_id (uuid FK references profiles(id) on delete cascade), farmer_id (uuid FK references profiles(id) on delete set null, nullable), commodity (text not null), volume (numeric not null), volume_unit (text not null), price_per_unit (numeric nullable), total_value (numeric nullable), delivery_province (text not null), delivery_city (text nullable), start_date (date nullable), end_date (date nullable), status (text not null default 'draft', check constraint limiting values to 'draft', 'proposed', 'accepted', 'in_progress', 'completed', 'cancelled'), terms (jsonb nullable), created_at (timestamptz not null default now()), updated_at (timestamptz not null default now())
2. THE Platform SHALL include a `matching_analyses` table with columns: id (uuid PK, default gen_random_uuid()), user_id (uuid FK references profiles(id) on delete cascade, not null), input (jsonb not null), result (jsonb nullable), created_at (timestamptz not null default now())
3. THE Platform SHALL include a `weather_analyses` table with columns: id (uuid PK, default gen_random_uuid()), user_id (uuid FK references profiles(id) on delete cascade, not null), input (jsonb not null), result (jsonb nullable), created_at (timestamptz not null default now())
4. THE Platform SHALL include a `rate_limits` table with columns: id (uuid PK, default gen_random_uuid()), user_id (uuid FK references profiles(id) on delete cascade, not null), endpoint (text not null), request_count (integer not null default 0), window_start (timestamptz not null), created_at (timestamptz not null default now())
5. THE Platform SHALL define RLS policies on the `transactions` table allowing users to SELECT rows where they are the buyer_id or farmer_id, INSERT rows where they are the buyer_id, and UPDATE rows where they are the buyer_id or farmer_id
6. THE Platform SHALL define RLS policies on `matching_analyses` and `weather_analyses` tables allowing users to SELECT rows where auth.uid() equals user_id, and INSERT rows with a check that auth.uid() equals user_id
7. THE Platform SHALL define RLS policies on the `rate_limits` table that grant no access to authenticated users and allow only the service_role to SELECT, INSERT, and UPDATE rows
8. THE Platform SHALL include composite indexes on the `transactions` table for (buyer_id, created_at desc) and (farmer_id, created_at desc), on the `matching_analyses` table for (user_id, created_at desc), on the `weather_analyses` table for (user_id, created_at desc), and on the `rate_limits` table for (user_id, endpoint, window_start)
9. THE Platform SHALL attach the existing `update_updated_at` trigger to the `transactions` table so that the updated_at column is automatically set to now() before each row update

### Requirement 6: Server-Side Session Caching

**User Story:** As a developer, I want to reduce redundant authentication checks on API routes, so that response times are minimized.

#### Acceptance Criteria

1. WHEN an authenticated request reaches a protected API route, THE Platform SHALL validate the user session at most once per HTTP request lifecycle by performing the Supabase auth check in middleware and reusing the result in the route handler
2. WHEN the middleware validates a user session, THE Session_Cache SHALL pass the validated user object (including user ID, email, and user metadata) to downstream API route handlers without re-querying Supabase auth
3. THE Session_Cache SHALL store session data only in a request-scoped mechanism that is not accessible to other concurrent requests and is released when the response is sent
4. IF the session validation fails due to a missing, expired, or invalid token, THEN THE Platform SHALL return a 401 response without executing the route handler logic
5. IF the middleware cannot reach Supabase auth within 5 seconds, THEN THE Platform SHALL return a 401 response without executing the route handler logic
6. WHEN a route handler retrieves cached session data, THE Session_Cache SHALL return the user object within 1 millisecond without performing any network call

### Requirement 7: Client-Side Data Fetching Optimization

**User Story:** As a user, I want dashboard pages to load quickly without redundant network requests, so that the application feels responsive.

#### Acceptance Criteria

1. WHEN the main Dashboard page loads, THE Platform SHALL fetch metrics counts and recent activity items using parallel queries, completing all data retrieval in a maximum of 2 sequential network round-trips to Supabase
2. WHEN a user navigates away from and back to a Dashboard_Page within 60 seconds, THE Platform SHALL serve previously fetched data from an in-memory cache and trigger a background refresh without blocking the UI
3. WHEN a Dashboard_Page begins loading data, THE Platform SHALL render placeholder skeleton elements (animated content placeholders matching the layout of metrics cards and activity list) within 100 milliseconds of the component mounting
4. IF an API request to Supabase fails during dashboard data fetching, THEN THE Platform SHALL display an inline error message indicating which data failed to load and render a retry button that re-triggers the failed request when clicked
5. IF a background cache refresh triggered by criterion 2 fails, THEN THE Platform SHALL continue displaying the previously cached data and not show an error to the user
6. THE Platform SHALL not re-fetch dashboard data when the component re-renders due to state changes that do not affect the user identity or the active dashboard route
7. WHEN dashboard data is successfully fetched, THE Platform SHALL replace all skeleton placeholders with the actual content within a single render cycle, with no intermediate empty state visible to the user

### Requirement 8: Role-Based Dashboard Customization

**User Story:** As a user, I want my dashboard to show metrics and quick actions relevant to my role, so that I can quickly access the features I need.

#### Acceptance Criteria

1. WHEN a user with role "farmer" views the main dashboard, THE Platform SHALL display exactly 3 metric cards showing: the user's farmer analyses count, the user's chat conversations count, and the user's weather analyses count
2. WHEN a user with role "buyer" views the main dashboard, THE Platform SHALL display exactly 4 metric cards showing: the user's buyer analyses count, the user's transactions count, the user's matching analyses count, and the user's chat conversations count
3. WHEN a user with role "government" views the main dashboard, THE Platform SHALL display exactly 4 metric cards showing: total policy analyses count across all users, total farmer analyses count across all users, total buyer analyses count across all users, and total transactions count across all users
4. WHEN a user with role "supplier", "logistics", or "finance" views the main dashboard, THE Platform SHALL display metric cards showing: the user's chat conversations count and the user's farmer analyses count
5. THE Platform SHALL display quick action links only for pages the user has access to based on the following role-to-page mapping: "farmer" may access farmer, weather, chat, and transactions pages; "buyer" may access buyer, matching, chat, and transactions pages; "government" may access policy, farmer, buyer, and chat pages; "supplier" may access farmer, chat, and transactions pages; "logistics" may access chat and transactions pages; "finance" may access buyer, chat, and transactions pages
6. THE Platform SHALL display a maximum of 5 recent activity items, sorted by creation date descending, drawn only from features the user has access to per the role-to-page mapping defined in criterion 5
7. WHILE the dashboard is loading metric counts and recent activity, THE Platform SHALL display a loading indicator in place of each metric value and in the recent activity section
8. IF the dashboard data fetch fails, THEN THE Platform SHALL display the metric values as 0 and show an empty state in the recent activity section

### Requirement 9: Database Query Performance Optimization

**User Story:** As a developer, I want database queries to be efficient, so that page load times remain under acceptable thresholds.

#### Acceptance Criteria

1. WHEN a list query is executed against any table (transactions, matching_analyses, weather_analyses, farmer_analyses, buyer_analyses, policy_analyses, chat_conversations), THE Platform SHALL use `select` with an explicit column list specifying only the columns consumed by the calling code, instead of `select('*')`, except when the query requires all columns of the table
2. THE Platform SHALL limit all list queries to a maximum of 50 rows per request and SHALL accept `page` and `pageSize` parameters (where `pageSize` defaults to 50 and maximum is 50) to support offset-based pagination, returning the total count alongside the result set
3. THE Platform SHALL include composite indexes on (user_id, created_at DESC) for the tables: farmer_analyses, buyer_analyses, policy_analyses, matching_analyses, and weather_analyses
4. WHEN the transactions list is queried, THE Platform SHALL use the existing indexes on (buyer_id, created_at DESC) and (farmer_id, created_at DESC) by filtering on the appropriate user ID column and ordering by created_at descending
5. WHEN only a record count is needed without row data, THE Platform SHALL use `head: true` with `count: 'exact'` to avoid transferring row payloads
6. WHEN a list query is executed, THE Platform SHALL return results within 500 milliseconds measured from the server-side query initiation to response serialization, excluding network latency to the client
7. IF a database query fails or times out (exceeding 10 seconds), THEN THE Platform SHALL return an error response indicating the query failure and SHALL NOT return a partial or empty result set as if it were successful

### Requirement 10: Error Boundary and Graceful Degradation

**User Story:** As a user, I want the application to handle errors gracefully without crashing the entire page, so that I can continue using other features.

#### Acceptance Criteria

1. WHEN a Dashboard_Page component throws a runtime error, THE Platform SHALL catch the error within that page's error boundary and display an inline error state containing a localized error description in Indonesian and a reload button that re-renders only the failed component
2. WHEN an AI analysis API call fails, THE Platform SHALL display a localized error notification within the component that initiated the request, without unmounting or affecting other rendered components on the same page
3. WHEN the Supabase connection is unavailable, THE Platform SHALL display a connection error banner visible across all dashboard pages and retry the connection automatically every 30 seconds for a maximum of 5 attempts
4. IF the Supabase connection remains unavailable after the maximum retry attempts, THEN THE Platform SHALL stop retrying and display a persistent error banner instructing the user to check their network and manually reload the page
5. IF the Gemini AI service returns an error, THEN THE Platform SHALL log the error details server-side and return a localized Indonesian-language error message to the client that does not contain stack traces, internal service names, or exception details
6. WHILE in production mode, THE Platform SHALL replace all unhandled error responses with a generic localized error message and exclude stack traces, file paths, internal service identifiers, and environment variables from any client-facing response
7. WHEN the Supabase connection is restored after displaying the connection error banner, THE Platform SHALL automatically dismiss the error banner within 5 seconds of successful reconnection
