import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();
const mockInvoke = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

import { useAdminSyncLogs, useTriggerSync } from '@/hooks/useAdminSync';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

/** Build a chainable mock — every method returns self, await resolves with data */
function buildChain(data: unknown[] = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const result = { data, error: null };

  const self = new Proxy(chain, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(result);
      }
      if (prop === 'catch') return () => self;
      if (!target[prop as string]) {
        target[prop as string] = vi.fn().mockReturnValue(self);
      }
      return target[prop as string];
    },
  });

  return { self, chain };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAdminSyncLogs', () => {
  it('queries sync_logs table and returns data', async () => {
    const logs = [
      { id: '1', function_name: 'import-movies', status: 'success', started_at: '2026-01-01' },
    ];
    const { self } = buildChain(logs);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminSyncLogs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('sync_logs');
    expect(result.current.data).toEqual(logs);
  });

  it('fetches with limit of 50', async () => {
    const { self, chain } = buildChain([]);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminSyncLogs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.limit).toHaveBeenCalledWith(50);
  });

  it('orders by started_at descending', async () => {
    const { self, chain } = buildChain([]);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminSyncLogs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(chain.order).toHaveBeenCalledWith('started_at', { ascending: false });
  });
});

describe('useTriggerSync', () => {
  it('calls supabase.functions.invoke with the function name', async () => {
    mockInvoke.mockResolvedValue({ error: null });

    // Need to also mock from for the query invalidation
    const { self } = buildChain([]);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useTriggerSync(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('sync-tmdb-movies');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockInvoke).toHaveBeenCalledWith('sync-tmdb-movies');
  });

  it('throws when invoke returns an error', async () => {
    mockInvoke.mockResolvedValue({ error: new Error('Function not found') });

    const { self } = buildChain([]);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useTriggerSync(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('bad-function');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('alerts on error with Error message', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockInvoke.mockResolvedValue({ error: new Error('Some error') });

    const { self } = buildChain([]);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useTriggerSync(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('bad-function');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalledWith('Some error');
    alertSpy.mockRestore();
  });

  it('alerts "Sync failed" on non-Error error', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockInvoke.mockResolvedValue({ error: 'string error' });

    const { self } = buildChain([]);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useTriggerSync(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('bad-function');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalledWith('Sync failed');
    alertSpy.mockRestore();
  });
});

describe('useAdminSyncLogs - error handling', () => {
  it('throws when supabase returns an error', async () => {
    const chain: Record<string, unknown> = {};
    const self = new Proxy(chain, {
      get(target, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void) =>
            resolve({ data: null, error: new Error('DB error') });
        }
        if (prop === 'catch') return () => self;
        if (!target[prop as string]) {
          target[prop as string] = vi.fn().mockReturnValue(self);
        }
        return target[prop as string];
      },
    });
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminSyncLogs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
