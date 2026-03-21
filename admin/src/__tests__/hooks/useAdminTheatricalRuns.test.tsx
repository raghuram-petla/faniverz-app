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
  useMovieTheatricalRuns,
  useAddTheatricalRun,
  useUpdateTheatricalRun,
  useRemoveTheatricalRun,
} from '@/hooks/useAdminTheatricalRuns';

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

// ── useMovieTheatricalRuns ──

describe('useMovieTheatricalRuns', () => {
  it('fetches theatrical runs for a movie sorted by release_date ascending', async () => {
    const runs = [
      { id: 'r1', movie_id: 'm1', release_date: '2026-01-01' },
      { id: 'r2', movie_id: 'm1', release_date: '2026-06-15' },
    ];

    const mockOrder = vi.fn().mockResolvedValue({ data: runs, error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockEq }),
    });

    const { result } = renderHook(() => useMovieTheatricalRuns('m1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFrom).toHaveBeenCalledWith('movie_theatrical_runs');
    expect(mockEq).toHaveBeenCalledWith('movie_id', 'm1');
    expect(mockOrder).toHaveBeenCalledWith('release_date', { ascending: true });
    expect(result.current.data).toEqual(runs);
  });

  it('is disabled when movieId is empty', () => {
    const { result } = renderHook(() => useMovieTheatricalRuns(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ── useAddTheatricalRun ──

describe('useAddTheatricalRun', () => {
  it('inserts a theatrical run via /api/admin-crud', async () => {
    const fetchSpy = mockCrudApi({
      id: 'r-new',
      movie_id: 'm1',
      release_date: '2026-03-01',
    });

    const { result } = renderHook(() => useAddTheatricalRun(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        movie_id: 'm1',
        release_date: '2026-03-01',
        label: 'Re-release',
      } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          table: 'movie_theatrical_runs',
          data: {
            movie_id: 'm1',
            release_date: '2026-03-01',
            label: 'Re-release',
          },
        }),
      }),
    );
    fetchSpy.mockRestore();
  });

  it('shows alert on error', async () => {
    const fetchSpy = mockCrudApi(null, 500);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useAddTheatricalRun(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ movie_id: 'm1', release_date: '2026-03-01' } as never);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
    alertSpy.mockRestore();
  });
});

// ── useUpdateTheatricalRun ──

describe('useUpdateTheatricalRun', () => {
  it('updates a theatrical run via /api/admin-crud', async () => {
    const fetchSpy = mockCrudApi({
      id: 'r1',
      movie_id: 'm1',
      end_date: '2026-04-01',
    });

    const { result } = renderHook(() => useUpdateTheatricalRun(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        id: 'r1',
        movieId: 'm1',
        end_date: '2026-04-01',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          table: 'movie_theatrical_runs',
          id: 'r1',
          data: { end_date: '2026-04-01' },
        }),
      }),
    );
    fetchSpy.mockRestore();
  });
});

// ── useRemoveTheatricalRun ──

describe('useRemoveTheatricalRun', () => {
  it('deletes a theatrical run via /api/admin-crud', async () => {
    const fetchSpy = mockCrudApi({ success: true });

    const { result } = renderHook(() => useRemoveTheatricalRun(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'r1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ table: 'movie_theatrical_runs', id: 'r1' }),
      }),
    );
    fetchSpy.mockRestore();
  });

  it('shows alert on error', async () => {
    const fetchSpy = mockCrudApi(null, 500);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useRemoveTheatricalRun(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'r1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
