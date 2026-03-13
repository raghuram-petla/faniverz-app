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
  useAdminPlatforms,
  useCreatePlatform,
  useUpdatePlatform,
  useDeletePlatform,
} from '@/hooks/useAdminPlatforms';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
  });
});

function mockCrudApi(responseData: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => (status >= 200 && status < 300 ? responseData : { error: 'fail' }),
  } as Response);
}

describe('useAdminPlatforms', () => {
  it('fetches platforms ordered by display_order', async () => {
    const mockPlatforms = [
      { id: 'aha', name: 'aha', logo: 'A', logo_url: null, color: '#ff0', display_order: 1 },
      {
        id: 'netflix',
        name: 'Netflix',
        logo: 'N',
        logo_url: null,
        color: '#e50914',
        display_order: 2,
      },
    ];

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: mockPlatforms, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useAdminPlatforms(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('platforms');
    expect(result.current.data).toEqual(mockPlatforms);
  });

  it('throws on supabase error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }),
      }),
    });

    const { result } = renderHook(() => useAdminPlatforms(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useCreatePlatform', () => {
  it('sends POST to /api/admin-crud with platform data', async () => {
    const fetchSpy = mockCrudApi({
      id: 'new',
      name: 'New Platform',
      logo: 'N',
      logo_url: null,
      color: '#333',
      display_order: 0,
    });

    const { result } = renderHook(() => useCreatePlatform(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: 'New Platform', logo: 'N', color: '#333', display_order: 0 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    fetchSpy.mockRestore();
  });
});

describe('useUpdatePlatform', () => {
  it('sends PATCH to /api/admin-crud with platform id and data', async () => {
    const fetchSpy = mockCrudApi({ id: 'netflix', name: 'Netflix Updated' });

    const { result } = renderHook(() => useUpdatePlatform(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'netflix', name: 'Netflix Updated' } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'PATCH',
      }),
    );
    fetchSpy.mockRestore();
  });
});

describe('useDeletePlatform', () => {
  it('sends DELETE to /api/admin-crud with platform id', async () => {
    const fetchSpy = mockCrudApi({ success: true });

    const { result } = renderHook(() => useDeletePlatform(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('netflix');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({
        method: 'DELETE',
      }),
    );
    fetchSpy.mockRestore();
  });
});
