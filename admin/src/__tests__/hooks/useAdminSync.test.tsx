import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

const mockFrom = vi.fn();
vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { useAdminSyncLogs } from '@/hooks/useAdminSync';

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
