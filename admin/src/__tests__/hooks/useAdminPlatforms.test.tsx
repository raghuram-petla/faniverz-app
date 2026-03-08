import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
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
  it('inserts a platform and invalidates cache', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'new',
        name: 'New Platform',
        logo: 'N',
        logo_url: null,
        color: '#333',
        display_order: 0,
      },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    mockFrom.mockReturnValue({ insert: mockInsert });

    const { result } = renderHook(() => useCreatePlatform(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: 'New Platform', logo: 'N', color: '#333', display_order: 0 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('platforms');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Platform' }));
  });
});

describe('useUpdatePlatform', () => {
  it('updates a platform by id and invalidates cache', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'netflix', name: 'Netflix Updated' },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ update: mockUpdate });

    const { result } = renderHook(() => useUpdatePlatform(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'netflix', name: 'Netflix Updated' } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('platforms');
    expect(mockUpdate).toHaveBeenCalledWith({ name: 'Netflix Updated' });
    expect(mockEq).toHaveBeenCalledWith('id', 'netflix');
  });
});

describe('useDeletePlatform', () => {
  it('deletes a platform by id', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useDeletePlatform(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('netflix');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('platforms');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'netflix');
  });
});
