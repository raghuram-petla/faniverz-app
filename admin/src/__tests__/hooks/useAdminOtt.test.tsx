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
  useMoviePlatforms,
  useAddMoviePlatform,
  useRemoveMoviePlatform,
} from '@/hooks/useAdminOtt';

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

// ── useMoviePlatforms ──

describe('useMoviePlatforms', () => {
  it('fetches platforms for a movie with platform join', async () => {
    const platforms = [
      { platform_id: 'p1', movie_id: 'm1', platform: { id: 'p1', name: 'Netflix' } },
    ];

    const mockEq = vi.fn().mockResolvedValue({ data: platforms, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockEq }),
    });

    const { result } = renderHook(() => useMoviePlatforms('m1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFrom).toHaveBeenCalledWith('movie_platforms');
    expect(mockEq).toHaveBeenCalledWith('movie_id', 'm1');
    expect(result.current.data).toEqual(platforms);
  });

  it('is disabled when movieId is empty', () => {
    const { result } = renderHook(() => useMoviePlatforms(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('throws on query error', async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockEq }),
    });

    const { result } = renderHook(() => useMoviePlatforms('m1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ── useAddMoviePlatform ──

describe('useAddMoviePlatform', () => {
  it('inserts a movie platform via /api/admin-crud', async () => {
    const fetchSpy = mockCrudApi({
      movie_id: 'm1',
      platform_id: 'p1',
      available_from: '2026-01-01',
    });

    const { result } = renderHook(() => useAddMoviePlatform(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        movie_id: 'm1',
        platform_id: 'p1',
        available_from: '2026-01-01',
        streaming_url: null,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          table: 'movie_platforms',
          data: {
            movie_id: 'm1',
            platform_id: 'p1',
            available_from: '2026-01-01',
            streaming_url: null,
          },
        }),
      }),
    );
    fetchSpy.mockRestore();
  });

  it('shows alert on error', async () => {
    const fetchSpy = mockCrudApi(null, 500);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useAddMoviePlatform(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        movie_id: 'm1',
        platform_id: 'p1',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
    alertSpy.mockRestore();
  });
});

// ── useRemoveMoviePlatform ──

describe('useRemoveMoviePlatform', () => {
  it('deletes a movie platform via /api/admin-crud with composite filters', async () => {
    const fetchSpy = mockCrudApi({ success: true });

    const { result } = renderHook(() => useRemoveMoviePlatform(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ movieId: 'm1', platformId: 'p1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({
          table: 'movie_platforms',
          filters: { movie_id: 'm1', platform_id: 'p1' },
        }),
      }),
    );
    fetchSpy.mockRestore();
  });

  it('shows alert on error', async () => {
    const fetchSpy = mockCrudApi(null, 500);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useRemoveMoviePlatform(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ movieId: 'm1', platformId: 'p1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
