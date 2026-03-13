import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();
const mockGetSession = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getSession: () => mockGetSession() },
  },
}));

import { createCrudHooks } from '@/hooks/createCrudHooks';

interface TestEntity {
  id: string;
  name: string;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const paginatedCrud = createCrudHooks<TestEntity>({
  table: 'test_items',
  queryKeyBase: 'items',
  singleKeyBase: 'item',
  orderBy: 'name',
  orderAscending: true,
  searchField: 'name',
  pageSize: 20,
});

const simpleCrud = createCrudHooks<TestEntity>({
  table: 'simple_items',
  queryKeyBase: 'simple',
  orderBy: 'name',
  paginated: false,
});

beforeEach(() => {
  vi.clearAllMocks();
  // Default: authenticated session
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
  });
});

// ── Read Helpers ──────────────────────────────────────────────

function mockPaginatedSelect(data: unknown[] = []) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        range: vi.fn().mockResolvedValue({ data, error: null }),
      }),
    }),
  });
}

function mockPaginatedSelectWithIlike(data: unknown[] = []) {
  const mockIlike = vi.fn().mockResolvedValue({ data, error: null });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        range: vi.fn().mockReturnValue({ ilike: mockIlike }),
      }),
    }),
  });
  return { mockIlike };
}

function mockSimpleSelect(data: unknown[] = []) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data, error: null }),
      }),
    }),
  });
}

function mockSingleSelect(data: unknown = null, error: unknown = null) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  });
}

// ── Write Helper: mock global.fetch for /api/admin-crud ──────

function mockCrudApi(responseData: unknown, status = 200) {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => (status >= 200 && status < 300 ? responseData : { error: 'fail' }),
  } as Response);
  return fetchSpy;
}

// ── Paginated List ───────────────────────────────────────────

describe('createCrudHooks – paginated list', () => {
  it('fetches paginated data from the correct table', async () => {
    const items = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
    ];
    mockPaginatedSelect(items);

    const { result } = renderHook(() => paginatedCrud.usePaginatedList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFrom).toHaveBeenCalledWith('test_items');
    expect(result.current.data?.pages.flat()).toEqual(items);
  });

  it('applies search filter via ilike', async () => {
    const { mockIlike } = mockPaginatedSelectWithIlike();

    const { result } = renderHook(() => paginatedCrud.usePaginatedList('foo'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockIlike).toHaveBeenCalledWith('name', '%foo%');
  });

  it('returns next page param when page is full', async () => {
    const fullPage = Array.from({ length: 20 }, (_, i) => ({ id: String(i), name: `Item ${i}` }));
    mockPaginatedSelect(fullPage);

    const { result } = renderHook(() => paginatedCrud.usePaginatedList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('returns no next page param when page is partial', async () => {
    mockPaginatedSelect([{ id: '1', name: 'A' }]);

    const { result } = renderHook(() => paginatedCrud.usePaginatedList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });
});

// ── Simple List ──────────────────────────────────────────────

describe('createCrudHooks – simple list', () => {
  it('fetches all items without pagination', async () => {
    const items = [{ id: '1', name: 'X' }];
    mockSimpleSelect(items);

    const { result } = renderHook(() => simpleCrud.useSimpleList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFrom).toHaveBeenCalledWith('simple_items');
    expect(result.current.data).toEqual(items);
  });
});

// ── Single ───────────────────────────────────────────────────

describe('createCrudHooks – useSingle', () => {
  it('fetches a single item by id', async () => {
    const item = { id: 'abc', name: 'Test' };
    mockSingleSelect(item);

    const { result } = renderHook(() => paginatedCrud.useSingle('abc'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(item);
  });

  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => paginatedCrud.useSingle(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── Create ───────────────────────────────────────────────────

describe('createCrudHooks – useCreate', () => {
  it('sends POST to /api/admin-crud with table and data', async () => {
    const fetchSpy = mockCrudApi({ id: 'new-1', name: 'Created' });

    const { result } = renderHook(() => paginatedCrud.useCreate(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: 'Created' } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith('/api/admin-crud', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ table: 'test_items', data: { name: 'Created' } }),
    });
    fetchSpy.mockRestore();
  });

  it('throws on API error', async () => {
    const fetchSpy = mockCrudApi(null, 500);

    const { result } = renderHook(() => paginatedCrud.useCreate(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: 'Bad' } as never);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    fetchSpy.mockRestore();
  });
});

// ── Update ───────────────────────────────────────────────────

describe('createCrudHooks – useUpdate', () => {
  it('sends PATCH to /api/admin-crud with table, id, and data', async () => {
    const fetchSpy = mockCrudApi({ id: 'u-1', name: 'Updated' });

    const { result } = renderHook(() => paginatedCrud.useUpdate(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'u-1', name: 'Updated' } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith('/api/admin-crud', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ table: 'test_items', id: 'u-1', data: { name: 'Updated' } }),
    });
    fetchSpy.mockRestore();
  });
});

// ── Delete ───────────────────────────────────────────────────

describe('createCrudHooks – useDelete', () => {
  it('sends DELETE to /api/admin-crud with table and id', async () => {
    const fetchSpy = mockCrudApi({ success: true });

    const { result } = renderHook(() => paginatedCrud.useDelete(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('del-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith('/api/admin-crud', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ table: 'test_items', id: 'del-1' }),
    });
    fetchSpy.mockRestore();
  });
});

// ── enabledFn ────────────────────────────────────────────────

describe('createCrudHooks – enabledFn', () => {
  it('respects custom enabledFn for list queries', () => {
    const crud = createCrudHooks<TestEntity>({
      table: 'gated',
      queryKeyBase: 'gated',
      orderBy: 'name',
      searchField: 'name',
      enabledFn: (s) => s.length >= 3,
    });

    const { result } = renderHook(() => crud.usePaginatedList('ab'), {
      wrapper: createWrapper(),
    });

    // Should be idle because enabledFn returns false for 'ab' (length 2)
    expect(result.current.fetchStatus).toBe('idle');
  });
});
