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

  it('is disabled when enabled=false is passed (regression: avoid unnecessary query on invite page)', () => {
    // @regression: invite page previously fetched all PHs on load even when role wasn't PH admin
    const { result } = renderHook(() => useAdminProductionHouses('', undefined, false), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('is active when enabled=true is passed with empty search', async () => {
    const mockHouses = [{ id: 'ph1', name: 'Arka Media Works' }];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: mockHouses, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useAdminProductionHouses('', undefined, true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages.flat()).toEqual(mockHouses);
  });

  it('filters by origin_country when originCountry is provided', async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockRange = vi.fn().mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: mockRange,
        }),
      }),
    });

    const { result } = renderHook(() => useAdminProductionHouses('', undefined, true, 'IN'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockEq).toHaveBeenCalledWith('origin_country', 'IN');
  });

  it('filters by origin_country IS NULL when originCountry is NOT_SET', async () => {
    const mockIs = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockRange = vi.fn().mockReturnValue({ is: mockIs });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: mockRange,
        }),
      }),
    });

    const { result } = renderHook(() => useAdminProductionHouses('', undefined, true, 'NOT_SET'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockIs).toHaveBeenCalledWith('origin_country', null);
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
  it('sends POST to /api/admin-crud with production house data', async () => {
    const fetchSpy = mockCrudApi({ id: 'ph-new', name: 'New Productions' });

    const { result } = renderHook(() => useCreateProductionHouse(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ name: 'New Productions' } as never);
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

describe('useUpdateProductionHouse', () => {
  it('sends PATCH to /api/admin-crud with id and data', async () => {
    const fetchSpy = mockCrudApi({ id: 'ph1', name: 'Updated Productions' });

    const { result } = renderHook(() => useUpdateProductionHouse(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 'ph1', name: 'Updated Productions' } as never);
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

describe('useAdminProductionHouses - PH scope', () => {
  it('applies .in() filter when productionHouseIds are provided', async () => {
    const mockIn = vi
      .fn()
      .mockResolvedValue({ data: [{ id: 'ph1', name: 'Scoped PH' }], error: null });
    const mockRange = vi.fn().mockReturnValue({ in: mockIn });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: mockRange,
        }),
      }),
    });

    const { result } = renderHook(() => useAdminProductionHouses('', ['ph1', 'ph2']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockIn).toHaveBeenCalledWith('id', ['ph1', 'ph2']);
  });

  it('does not apply .in() filter when productionHouseIds is empty array', async () => {
    const mockRange = vi.fn().mockResolvedValue({ data: [], error: null });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: mockRange,
        }),
      }),
    });

    const { result } = renderHook(() => useAdminProductionHouses('', []), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // With empty array, hasPHScope is false so no .in() call — range resolves directly
    expect(result.current.data?.pages.flat()).toEqual([]);
  });

  it('throws on query error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
        }),
      }),
    });

    const { result } = renderHook(() => useAdminProductionHouses(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('combines search and PH scope and originCountry', async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockIlike = vi.fn().mockReturnValue({ eq: mockEq });
    const mockIn = vi.fn().mockReturnValue({ ilike: mockIlike });
    const mockRange = vi.fn().mockReturnValue({ in: mockIn });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: mockRange,
        }),
      }),
    });

    const { result } = renderHook(() => useAdminProductionHouses('arka', ['ph1'], true, 'IN'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockIn).toHaveBeenCalledWith('id', ['ph1']);
    expect(mockIlike).toHaveBeenCalledWith('name', '%arka%');
    expect(mockEq).toHaveBeenCalledWith('origin_country', 'IN');
  });
});

describe('useAdminProductionHouses - pagination', () => {
  it('returns next page param when page is full (50 items)', async () => {
    const fullPage = Array.from({ length: 50 }, (_, i) => ({ id: `ph-${i}`, name: `PH ${i}` }));
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: fullPage, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useAdminProductionHouses(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('returns no next page param when page has fewer than 50 items', async () => {
    const partialPage = [{ id: 'ph-1', name: 'PH 1' }];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: partialPage, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useAdminProductionHouses(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe('useDeleteProductionHouse', () => {
  it('sends DELETE to /api/admin-crud with id', async () => {
    const fetchSpy = mockCrudApi({ success: true });

    const { result } = renderHook(() => useDeleteProductionHouse(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('ph1');
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
