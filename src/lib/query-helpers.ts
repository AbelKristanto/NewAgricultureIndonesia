/**
 * Query helper utilities for optimized Supabase list queries.
 * Provides paginated queries with explicit column selection,
 * timeout handling, and proper error responses.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  success: true;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QueryErrorResult {
  success: false;
  error: string;
}

export type PaginatedQueryResponse<T> = PaginatedResult<T> | QueryErrorResult;

export interface CountResult {
  success: true;
  total: number;
}

export type CountQueryResponse = CountResult | QueryErrorResult;

export interface PaginatedQueryOptions {
  table: string;
  columns: string;
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 50;
const QUERY_TIMEOUT_MS = 10_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Clamps pageSize to a maximum of 50 and ensures page is at least 1.
 */
export function normalizePagination(params: PaginationParams): { page: number; pageSize: number } {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(params.pageSize ?? DEFAULT_PAGE_SIZE)));
  return { page, pageSize };
}

/**
 * Wraps a promise with a timeout. Rejects with a timeout error if the
 * promise does not resolve within the specified duration.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Query timeout'));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ─── Main Query Functions ────────────────────────────────────────────────────

/**
 * Executes a paginated query against a Supabase table with explicit column
 * selection, offset-based pagination, and a 10-second timeout.
 *
 * Returns a structured response with data, total count, page, and pageSize.
 * On failure or timeout, returns an error response — never an empty success.
 */
export async function paginatedQuery<T = Record<string, unknown>>(
  client: SupabaseClient,
  options: PaginatedQueryOptions
): Promise<PaginatedQueryResponse<T>> {
  const { table, columns, filters, orderBy } = options;
  const { page, pageSize } = normalizePagination({
    page: options.page,
    pageSize: options.pageSize,
  });

  const offset = (page - 1) * pageSize;

  try {
    let query = client
      .from(table)
      .select(columns, { count: 'exact' })
      .range(offset, offset + pageSize - 1);

    // Apply filters
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
    }

    const result = await withTimeout(
      Promise.resolve(query) as Promise<{ data: unknown[] | null; error: unknown; count: number | null }>,
      QUERY_TIMEOUT_MS
    );

    if (result.error) {
      console.error('Paginated query error:', result.error);
      return { success: false, error: 'Gagal memuat data' };
    }

    return {
      success: true,
      data: (result.data ?? []) as T[],
      total: result.count ?? 0,
      page,
      pageSize,
    };
  } catch (err) {
    console.error('Paginated query failure:', err);
    return { success: false, error: 'Gagal memuat data' };
  }
}

/**
 * Executes a count-only query using `head: true` with `count: 'exact'`
 * to avoid transferring row payloads. Useful when only the total count
 * is needed (e.g., for metric cards on the dashboard).
 */
export async function countQuery(
  client: SupabaseClient,
  table: string,
  filters?: Record<string, unknown>
): Promise<CountQueryResponse> {
  try {
    let query = client
      .from(table)
      .select('*', { count: 'exact', head: true });

    // Apply filters
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    const result = await withTimeout(
      Promise.resolve(query) as Promise<{ data: unknown[] | null; error: unknown; count: number | null }>,
      QUERY_TIMEOUT_MS
    );

    if (result.error) {
      console.error('Count query error:', result.error);
      return { success: false, error: 'Gagal memuat data' };
    }

    return {
      success: true,
      total: result.count ?? 0,
    };
  } catch (err) {
    console.error('Count query failure:', err);
    return { success: false, error: 'Gagal memuat data' };
  }
}
