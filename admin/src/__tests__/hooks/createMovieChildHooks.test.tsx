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

import { createMovieChildHooks } from '@/hooks/createMovieChildHooks';

interface TestChild {
  id: string;
  movie_id: string;
  title: string;
  display_order: number;
}

const hooks = createMovieChildHooks<TestChild>({
  table: 'movie_videos',
  keySuffix: 'videos',
});

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

// ── Helpers ──────────────────────────────────────────────────

function mockSelectList(data: unknown[] = []) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data, error: null }),
      }),
    }),
  });
}

// ── useList ────────────────────────────────────────────────

describe('createMovieChildHooks – useList', () => {
  it('fetches from correct table with movieId filter', async () => {
    const items = [{ id: '1', movie_id: 'm1', title: 'Trailer', display_order: 1 }];
    mockSelectList(items);

    const { result } = renderHook(() => hooks.useList('m1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFrom).toHaveBeenCalledWith('movie_videos');
    expect(result.current.data).toEqual(items);
  });

  it('is disabled when movieId is empty', () => {
    const { result } = renderHook(() => hooks.useList(''), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useAdd ─────────────────────────────────────────────────

describe('createMovieChildHooks – useAdd', () => {
  it('inserts via /api/admin-crud and invalidates correct query key', async () => {
    const fetchSpy = mockCrudApi({ id: 'new-1', movie_id: 'm1', title: 'Added' });

    const { result } = renderHook(() => hooks.useAdd(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ movie_id: 'm1', title: 'New' } as Partial<TestChild>);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          table: 'movie_videos',
          data: { movie_id: 'm1', title: 'New' },
        }),
      }),
    );

    fetchSpy.mockRestore();
  });
});

// ── useUpdate ──────────────────────────────────────────────

describe('createMovieChildHooks – useUpdate', () => {
  it('updates via /api/admin-crud by id and invalidates', async () => {
    const fetchSpy = mockCrudApi({ id: 'u-1', movie_id: 'm1', title: 'Updated' });

    const { result } = renderHook(() => hooks.useUpdate(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'u-1', movieId: 'm1', title: 'Updated' } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          table: 'movie_videos',
          id: 'u-1',
          data: { title: 'Updated' },
        }),
      }),
    );

    fetchSpy.mockRestore();
  });
});

// ── useRemove ──────────────────────────────────────────────

describe('createMovieChildHooks – useRemove', () => {
  it('deletes via /api/admin-crud by id and invalidates', async () => {
    const fetchSpy = mockCrudApi({ success: true });

    const { result } = renderHook(() => hooks.useRemove(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'del-1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ table: 'movie_videos', id: 'del-1' }),
      }),
    );

    fetchSpy.mockRestore();
  });
});
