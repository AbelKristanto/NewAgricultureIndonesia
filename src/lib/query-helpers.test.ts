import { describe, it, expect, vi } from 'vitest';
import {
  paginatedQuery,
  countQuery,
  normalizePagination,
} from './query-helpers';

// ─── Mock Supabase Client ────────────────────────────────────────────────────

// Better mock that properly chains
function createChainMockClient(overrides?: {
  data?: unknown[];
  count?: number;
  error?: { message: string } | null;
  delay?: number;
}) {
  const { data = [], count = 0, error = null, delay = 0 } = overrides ?? {};

  const result = { data, count, error };

  const createChainable = (): Record<string, unknown> => {
    const resolveResult = () => {
      if (delay > 0) {
        return new Promise((resolve) => setTimeout(() => resolve(result), delay));
      }
      return Promise.resolve(result);
    };

    const chainable: Record<string, unknown> = {};

    const methods = ['select', 'range', 'eq', 'order'];
    for (const method of methods) {
      chainable[method] = vi.fn().mockReturnValue(chainable);
    }

    // Make it thenable
    const promise = resolveResult();
    chainable['then'] = (promise as Promise<unknown>).then.bind(promise);
    chainable['catch'] = (promise as Promise<unknown>).catch.bind(promise);
    chainable['finally'] = (promise as Promise<unknown>).finally.bind(promise);

    return chainable;
  };

  const queryChain = createChainable();
  const from = vi.fn().mockReturnValue(queryChain);

  return { from, _chain: queryChain } as unknown as Parameters<typeof paginatedQuery>[0] & { _chain: Record<string, unknown> };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('normalizePagination', () => {
  it('returns defaults when no params provided', () => {
    const result = normalizePagination({});
    expect(result).toEqual({ page: 1, pageSize: 50 });
  });

  it('clamps pageSize to max 50', () => {
    const result = normalizePagination({ page: 1, pageSize: 100 });
    expect(result.pageSize).toBe(50);
  });

  it('clamps pageSize to min 1', () => {
    const result = normalizePagination({ page: 1, pageSize: 0 });
    expect(result.pageSize).toBe(1);
  });

  it('clamps page to min 1', () => {
    const result = normalizePagination({ page: -5, pageSize: 20 });
    expect(result.page).toBe(1);
  });

  it('floors fractional values', () => {
    const result = normalizePagination({ page: 2.7, pageSize: 25.9 });
    expect(result).toEqual({ page: 2, pageSize: 25 });
  });

  it('accepts valid page and pageSize', () => {
    const result = normalizePagination({ page: 3, pageSize: 20 });
    expect(result).toEqual({ page: 3, pageSize: 20 });
  });
});

describe('paginatedQuery', () => {
  it('returns paginated data on success', async () => {
    const mockData = [{ id: '1', name: 'Test' }, { id: '2', name: 'Test2' }];
    const client = createChainMockClient({ data: mockData, count: 10 });

    const result = await paginatedQuery(client, {
      table: 'transactions',
      columns: 'id, name',
      page: 1,
      pageSize: 10,
    });

    expect(result).toEqual({
      success: true,
      data: mockData,
      total: 10,
      page: 1,
      pageSize: 10,
    });
  });

  it('clamps pageSize to 50 maximum', async () => {
    const client = createChainMockClient({ data: [], count: 0 });

    const result = await paginatedQuery(client, {
      table: 'transactions',
      columns: 'id',
      page: 1,
      pageSize: 200,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.pageSize).toBe(50);
    }
  });

  it('returns error response on query error', async () => {
    const client = createChainMockClient({ error: { message: 'DB error' } });

    const result = await paginatedQuery(client, {
      table: 'transactions',
      columns: 'id, name',
    });

    expect(result).toEqual({
      success: false,
      error: 'Gagal memuat data',
    });
  });

  it('returns error response on timeout', async () => {
    // Create a client that delays longer than the timeout
    const client = createChainMockClient({ data: [], count: 0, delay: 11_000 });

    const result = await paginatedQuery(client, {
      table: 'transactions',
      columns: 'id',
    });

    expect(result).toEqual({
      success: false,
      error: 'Gagal memuat data',
    });
  }, 15_000);

  it('returns empty data array (not null) when no rows match', async () => {
    const client = createChainMockClient({ data: [], count: 0 });

    const result = await paginatedQuery(client, {
      table: 'transactions',
      columns: 'id',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    }
  });

  it('defaults to page 1 and pageSize 50', async () => {
    const client = createChainMockClient({ data: [], count: 100 });

    const result = await paginatedQuery(client, {
      table: 'transactions',
      columns: 'id',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
    }
  });

  it('never returns empty success on failure — always returns error', async () => {
    const client = createChainMockClient({ error: { message: 'connection refused' } });

    const result = await paginatedQuery(client, {
      table: 'transactions',
      columns: 'id',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Gagal memuat data');
    }
  });
});

describe('countQuery', () => {
  it('returns total count on success', async () => {
    const client = createChainMockClient({ count: 42 });

    const result = await countQuery(client, 'transactions');

    expect(result).toEqual({
      success: true,
      total: 42,
    });
  });

  it('returns error response on query error', async () => {
    const client = createChainMockClient({ error: { message: 'DB error' } });

    const result = await countQuery(client, 'transactions');

    expect(result).toEqual({
      success: false,
      error: 'Gagal memuat data',
    });
  });

  it('returns error response on timeout', async () => {
    const client = createChainMockClient({ data: [], count: 0, delay: 11_000 });

    const result = await countQuery(client, 'transactions');

    expect(result).toEqual({
      success: false,
      error: 'Gagal memuat data',
    });
  }, 15_000);

  it('applies filters to count query', async () => {
    const client = createChainMockClient({ count: 5 });

    const result = await countQuery(client, 'transactions', { buyer_id: 'user-123' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.total).toBe(5);
    }
    // Verify eq was called with the filter
    expect((client as unknown as { _chain: Record<string, ReturnType<typeof vi.fn>> })._chain.eq).toHaveBeenCalledWith('buyer_id', 'user-123');
  });
});
