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

import {
  useMovieCast,
  useAddCast,
  useRemoveCast,
  useUpdateCastOrder,
  useAdminActors,
  useAdminActor,
  useCreateActor,
  useUpdateActor,
  useDeleteActor,
} from '@/hooks/useAdminCast';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function mockCrudApi(responseData: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => (status >= 200 && status < 300 ? responseData : { error: 'fail' }),
  } as Response);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
  });
});

// ── Actor CRUD hooks (via createCrudHooks) ──

describe('useAdminActors', () => {
  it('exports a paginated list hook', () => {
    const mockRange = vi.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: mockRange,
        }),
      }),
    });

    const { result } = renderHook(() => useAdminActors(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
  });

  it('is disabled for 1-char search (enabledFn)', () => {
    const { result } = renderHook(() => useAdminActors('a'), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('is enabled for empty search', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useAdminActors(''), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('is enabled for 2+ char search', async () => {
    const mockIlike = vi.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockReturnValue({ ilike: mockIlike }),
        }),
      }),
    });

    const { result } = renderHook(() => useAdminActors('ab'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe('useAdminActor', () => {
  it('fetches a single actor by id', async () => {
    const actor = { id: 'a1', name: 'Test Actor' };
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: actor, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useAdminActor('a1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(actor);
  });

  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useAdminActor(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateActor', () => {
  it('sends POST to create an actor', async () => {
    const fetchSpy = mockCrudApi({ id: 'new-a', name: 'New Actor' });

    const { result } = renderHook(() => useCreateActor(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: 'New Actor' } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ table: 'actors', data: { name: 'New Actor' } }),
      }),
    );
    fetchSpy.mockRestore();
  });
});

describe('useUpdateActor', () => {
  it('sends PATCH to update an actor', async () => {
    const fetchSpy = mockCrudApi({ id: 'a1', name: 'Updated' });

    const { result } = renderHook(() => useUpdateActor(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'a1', name: 'Updated' } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ table: 'actors', id: 'a1', data: { name: 'Updated' } }),
      }),
    );
    fetchSpy.mockRestore();
  });
});

describe('useDeleteActor', () => {
  it('sends DELETE for an actor', async () => {
    const fetchSpy = mockCrudApi({ success: true });

    const { result } = renderHook(() => useDeleteActor(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('a1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ table: 'actors', id: 'a1' }),
      }),
    );
    fetchSpy.mockRestore();
  });
});

// ── Movie-specific cast hooks ──

describe('useMovieCast', () => {
  it('fetches cast and crew sorted correctly', async () => {
    const mockData = [
      { id: 'c2', credit_type: 'cast', display_order: 1, role_order: null },
      { id: 'c1', credit_type: 'cast', display_order: 0, role_order: null },
      { id: 'w2', credit_type: 'crew', display_order: 0, role_order: 2 },
      { id: 'w1', credit_type: 'crew', display_order: 0, role_order: 1 },
    ];

    const mockEq = vi.fn().mockResolvedValue({ data: mockData, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockEq }),
    });

    const { result } = renderHook(() => useMovieCast('m1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('movie_cast');
    expect(result.current.data).toEqual([
      { id: 'c1', credit_type: 'cast', display_order: 0, role_order: null },
      { id: 'c2', credit_type: 'cast', display_order: 1, role_order: null },
      { id: 'w1', credit_type: 'crew', display_order: 0, role_order: 1 },
      { id: 'w2', credit_type: 'crew', display_order: 0, role_order: 2 },
    ]);
  });

  it('puts cast before crew', async () => {
    const mockData = [
      { id: 'w1', credit_type: 'crew', display_order: 0, role_order: 0 },
      { id: 'c1', credit_type: 'cast', display_order: 0, role_order: null },
    ];

    const mockEq = vi.fn().mockResolvedValue({ data: mockData, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockEq }),
    });

    const { result } = renderHook(() => useMovieCast('m1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].credit_type).toBe('cast');
    expect(result.current.data![1].credit_type).toBe('crew');
  });

  it('handles both crew members having null role_order', async () => {
    const mockData = [
      { id: 'w1', credit_type: 'crew', display_order: 0, role_order: null },
      { id: 'w2', credit_type: 'crew', display_order: 0, role_order: null },
    ];

    const mockEq = vi.fn().mockResolvedValue({ data: mockData, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockEq }),
    });

    const { result } = renderHook(() => useMovieCast('m1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Both should be present, order doesn't matter since both are null (99)
    expect(result.current.data).toHaveLength(2);
  });

  it('defaults null role_order to 99 for crew sorting', async () => {
    const mockData = [
      { id: 'w1', credit_type: 'crew', display_order: 0, role_order: null },
      { id: 'w2', credit_type: 'crew', display_order: 0, role_order: 1 },
    ];

    const mockEq = vi.fn().mockResolvedValue({ data: mockData, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockEq }),
    });

    const { result } = renderHook(() => useMovieCast('m1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].id).toBe('w2');
    expect(result.current.data![1].id).toBe('w1');
  });

  it('is disabled when movieId is empty', () => {
    const { result } = renderHook(() => useMovieCast(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('returns empty array when data is null', async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockEq }),
    });

    const { result } = renderHook(() => useMovieCast('m1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe('useAddCast', () => {
  it('inserts cast via /api/admin-crud', async () => {
    const fetchSpy = mockCrudApi({ id: 'mc1', movie_id: 'm1', actor_id: 'a1' });

    const { result } = renderHook(() => useAddCast(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        movie_id: 'm1',
        actor_id: 'a1',
        credit_type: 'cast',
        display_order: 0,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          table: 'movie_cast',
          data: {
            movie_id: 'm1',
            actor_id: 'a1',
            credit_type: 'cast',
            display_order: 0,
          },
        }),
      }),
    );
    fetchSpy.mockRestore();
  });

  it('shows alert on error', async () => {
    const fetchSpy = mockCrudApi(null, 500);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useAddCast(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ movie_id: 'm1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
    alertSpy.mockRestore();
  });
});

describe('useRemoveCast', () => {
  it('deletes cast via /api/admin-crud', async () => {
    const fetchSpy = mockCrudApi({ success: true });

    const { result } = renderHook(() => useRemoveCast(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'mc1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ table: 'movie_cast', id: 'mc1' }),
      }),
    );
    fetchSpy.mockRestore();
  });
});

describe('useRemoveCast - error handling', () => {
  it('shows alert on error', async () => {
    const fetchSpy = mockCrudApi(null, 500);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useRemoveCast(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'mc1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
    alertSpy.mockRestore();
  });
});

describe('useMovieCast - error handling', () => {
  it('throws on supabase error', async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: new Error('Query failed') });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockEq }),
    });

    const { result } = renderHook(() => useMovieCast('m1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useAddCast - empty error message fallback', () => {
  it('shows "Operation failed" when error.message is empty', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error(''));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useAddCast(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ movie_id: 'm1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalledWith('Operation failed');
    fetchSpy.mockRestore();
    alertSpy.mockRestore();
  });
});

describe('useRemoveCast - empty error message fallback', () => {
  it('shows "Operation failed" when error.message is empty', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error(''));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useRemoveCast(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'mc1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalledWith('Operation failed');
    fetchSpy.mockRestore();
    alertSpy.mockRestore();
  });
});

describe('useUpdateCastOrder', () => {
  it('updates display_order for multiple cast items in parallel', async () => {
    const fetchSpy = mockCrudApi({ success: true });

    const { result } = renderHook(() => useUpdateCastOrder(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        movieId: 'm1',
        items: [
          { id: 'c1', display_order: 0 },
          { id: 'c2', display_order: 1 },
        ],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Two PATCH calls, one per item
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          table: 'movie_cast',
          id: 'c1',
          data: { display_order: 0 },
        }),
      }),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          table: 'movie_cast',
          id: 'c2',
          data: { display_order: 1 },
        }),
      }),
    );
    fetchSpy.mockRestore();
  });

  it('shows alert on error', async () => {
    const fetchSpy = mockCrudApi(null, 500);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useUpdateCastOrder(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        movieId: 'm1',
        items: [{ id: 'c1', display_order: 0 }],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('shows "Operation failed" when error.message is empty', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error(''));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useUpdateCastOrder(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        movieId: 'm1',
        items: [{ id: 'c1', display_order: 0 }],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalledWith('Operation failed');
    fetchSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
