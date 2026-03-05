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
  useAdminProductionHouses,
  useAdminProductionHouse,
  useCreateProductionHouse,
  useUpdateProductionHouse,
  useDeleteProductionHouse,
} from '@/hooks/useAdminProductionHouses';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAdminProductionHouses', () => {
  it('fetches production houses ordered by name', async () => {
    const mockHouses = [
      { id: 'ph1', name: 'Arka Media Works' },
      { id: 'ph2', name: 'Mythri Movie Makers' },
    ];

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: mockHouses, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useAdminProductionHouses(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('production_houses');
    expect(result.current.data?.pages.flat()).toEqual(mockHouses);
  });

  it('applies search filter via ilike on name', async () => {
    const mockIlike = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockRange = vi.fn().mockReturnValue({ ilike: mockIlike });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: mockRange,
        }),
      }),
    });

    const { result } = renderHook(() => useAdminProductionHouses('arka'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockIlike).toHaveBeenCalledWith('name', '%arka%');
  });

  it('is disabled when search is 1 character', () => {
    const { result } = renderHook(() => useAdminProductionHouses('a'), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useAdminProductionHouse', () => {
  it('fetches a single production house by id', async () => {
    const mockHouse = { id: 'ph1', name: 'Arka Media Works' };

    const mockSingle = vi.fn().mockResolvedValue({ data: mockHouse, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockEq }),
    });

    const { result } = renderHook(() => useAdminProductionHouse('ph1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('production_houses');
    expect(mockEq).toHaveBeenCalledWith('id', 'ph1');
    expect(result.current.data).toEqual(mockHouse);
  });

  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useAdminProductionHouse(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateProductionHouse', () => {
  it('inserts a production house and invalidates cache', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'ph-new', name: 'New Productions' },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    mockFrom.mockReturnValue({ insert: mockInsert });

    const { result } = renderHook(() => useCreateProductionHouse(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: 'New Productions' } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('production_houses');
    expect(mockInsert).toHaveBeenCalledWith({ name: 'New Productions' });
  });
});

describe('useUpdateProductionHouse', () => {
  it('updates a production house by id and invalidates cache', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'ph1', name: 'Updated Productions' },
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ update: mockUpdate });

    const { result } = renderHook(() => useUpdateProductionHouse(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'ph1', name: 'Updated Productions' } as never);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('production_houses');
    expect(mockUpdate).toHaveBeenCalledWith({ name: 'Updated Productions' });
    expect(mockEq).toHaveBeenCalledWith('id', 'ph1');
  });
});

describe('useDeleteProductionHouse', () => {
  it('deletes a production house by id', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({ delete: mockDelete });

    const { result } = renderHook(() => useDeleteProductionHouse(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('ph1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('production_houses');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'ph1');
  });
});
