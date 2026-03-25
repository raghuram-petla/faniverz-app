import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/hooks/createCrudHooks', () => {
  return {
    createCrudHooks: vi.fn((config: { enabledFn?: (s: string) => boolean }) => {
      if (config.enabledFn) {
        (globalThis as Record<string, unknown>).__phEnabledFn = config.enabledFn;
      }
      return {
        useSingle: vi.fn(),
        useCreate: vi.fn(),
        useUpdate: vi.fn(),
        useDelete: vi.fn(),
      };
    }),
  };
});

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import {
  useAdminProductionHouses,
  useAdminProductionHouse,
  useCreateProductionHouse,
  useUpdateProductionHouse,
  useDeleteProductionHouse,
} from '@/hooks/useAdminProductionHouses';
import { supabase } from '@/lib/supabase-browser';

const mockFrom = vi.mocked(supabase.from);

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

function buildResolvingChain(
  resolveWith: { data: unknown; error: unknown } = { data: [], error: null },
) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  };
  chain.then = (resolve: (value: unknown) => void, reject: (reason: unknown) => void) =>
    Promise.resolve(resolveWith).then(resolve, reject);
  return chain;
}

describe('useAdminProductionHouses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries production_houses table with default parameters', async () => {
    const chain = buildResolvingChain({ data: [{ id: 'ph1', name: 'Studio A' }], error: null });
    mockFrom.mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminProductionHouses(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockFrom).toHaveBeenCalledWith('production_houses');
  });

  it('applies search filter when search >= 2 chars', async () => {
    const chain = buildResolvingChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminProductionHouses('st'), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(chain.ilike).toHaveBeenCalledWith('name', '%st%');
  });

  it('is disabled when search is 1 character', () => {
    const chain = buildResolvingChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminProductionHouses('s'), { wrapper: Wrapper });

    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('scopes to PH IDs when productionHouseIds is provided', async () => {
    const chain = buildResolvingChain({ data: [{ id: 'ph1' }], error: null });
    mockFrom.mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminProductionHouses('', ['ph-1', 'ph-2']), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(chain.in).toHaveBeenCalledWith('id', ['ph-1', 'ph-2']);
  });

  it('is disabled when enabled=false', () => {
    const chain = buildResolvingChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminProductionHouses('', undefined, false), {
      wrapper: Wrapper,
    });

    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('filters by originCountry=NOT_SET using is(null)', async () => {
    const chain = buildResolvingChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminProductionHouses('', undefined, true, 'NOT_SET'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(chain.is).toHaveBeenCalledWith('origin_country', null);
  });

  it('filters by exact originCountry', async () => {
    const chain = buildResolvingChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminProductionHouses('', undefined, true, 'IN'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(chain.eq).toHaveBeenCalledWith('origin_country', 'IN');
  });

  it('throws error when query fails', async () => {
    const chain = buildResolvingChain({ data: null, error: new Error('DB error') });
    mockFrom.mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminProductionHouses(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('has next page when full page returned', async () => {
    const fullPage = Array.from({ length: 50 }, (_, i) => ({ id: String(i), name: `PH ${i}` }));
    const chain = buildResolvingChain({ data: fullPage, error: null });
    mockFrom.mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminProductionHouses(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.hasNextPage).toBe(true);
  });

  it('has no next page when partial page returned', async () => {
    const chain = buildResolvingChain({ data: [{ id: '1', name: 'PH 1' }], error: null });
    mockFrom.mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminProductionHouses(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe('createCrudHooks enabledFn', () => {
  it('returns true for empty string and strings >= 2 chars, false for 1 char', () => {
    const enabledFn = (globalThis as Record<string, unknown>).__phEnabledFn as (
      s: string,
    ) => boolean;
    expect(enabledFn).toBeDefined();
    expect(enabledFn('')).toBe(true);
    expect(enabledFn('ab')).toBe(true);
    expect(enabledFn('abc')).toBe(true);
    expect(enabledFn('a')).toBe(false);
  });
});

describe('CRUD hook re-exports', () => {
  it('exports useAdminProductionHouse', () => {
    expect(useAdminProductionHouse).toBeDefined();
  });

  it('exports useCreateProductionHouse', () => {
    expect(useCreateProductionHouse).toBeDefined();
  });

  it('exports useUpdateProductionHouse', () => {
    expect(useUpdateProductionHouse).toBeDefined();
  });

  it('exports useDeleteProductionHouse', () => {
    expect(useDeleteProductionHouse).toBeDefined();
  });
});
