import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// vi.mock is hoisted — cannot reference variables defined in the module scope.
// Use a module-level object that is mutated by tests instead.
const mockSupabaseFromHolder = { fn: vi.fn() };
const mockCrudFetch = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFromHolder.fn(...args),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('@/lib/admin-crud-client', () => ({
  crudFetch: (...args: unknown[]) => mockCrudFetch(...args),
}));

vi.mock('@/hooks/createCrudHooks', () => ({
  createCrudHooks: vi.fn(() => ({
    useCreate: vi.fn(),
    useUpdate: vi.fn(),
    useDelete: vi.fn(),
  })),
}));

import {
  useAdminFeed,
  useAdminFeedItem,
  useTogglePinFeed,
  useToggleFeatureFeed,
  useReorderFeed,
} from '@/hooks/useAdminFeed';

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapper(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

function buildSelectChain(resolveData: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'order', 'limit', 'eq'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // The terminal await resolves from the chain itself
  Object.assign(chain, resolveData);
  return chain;
}

describe('useAdminFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  describe('useAdminFeed hook', () => {
    it('returns feed items on success', async () => {
      const items = [{ id: '1', feed_type: 'news', is_pinned: false }];
      const chain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: items, error: null }),
        eq: vi.fn().mockReturnThis(),
      };
      mockSupabaseFromHolder.fn.mockReturnValue(chain);

      const qc = makeQueryClient();
      const { result } = renderHook(() => useAdminFeed(), { wrapper: wrapper(qc) });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(items);
    });

    it('applies eq filter when feed type filter is provided', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockSupabaseFromHolder.fn.mockReturnValue(chain);

      const qc = makeQueryClient();
      const { result } = renderHook(() => useAdminFeed('news'), { wrapper: wrapper(qc) });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(chain.eq).toHaveBeenCalledWith('feed_type', 'news');
    });

    it('throws on supabase error', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
        eq: vi.fn().mockReturnThis(),
      };
      mockSupabaseFromHolder.fn.mockReturnValue(chain);

      const qc = makeQueryClient();
      const { result } = renderHook(() => useAdminFeed(), { wrapper: wrapper(qc) });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('returns empty array when data is null', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: null, error: null }),
        eq: vi.fn().mockReturnThis(),
      };
      mockSupabaseFromHolder.fn.mockReturnValue(chain);

      const qc = makeQueryClient();
      const { result } = renderHook(() => useAdminFeed(), { wrapper: wrapper(qc) });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });
  });

  describe('useAdminFeedItem hook', () => {
    it('returns item on success', async () => {
      const item = { id: 'abc', feed_type: 'movie_update' };
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: item, error: null }),
      };
      mockSupabaseFromHolder.fn.mockReturnValue(chain);

      const qc = makeQueryClient();
      const { result } = renderHook(() => useAdminFeedItem('abc'), { wrapper: wrapper(qc) });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(item);
    });

    it('is disabled when id is empty string', async () => {
      const qc = makeQueryClient();
      const { result } = renderHook(() => useAdminFeedItem(''), { wrapper: wrapper(qc) });

      // enabled: !!id → false for empty string
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('throws on supabase error', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
      };
      mockSupabaseFromHolder.fn.mockReturnValue(chain);

      const qc = makeQueryClient();
      const { result } = renderHook(() => useAdminFeedItem('abc'), { wrapper: wrapper(qc) });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useTogglePinFeed', () => {
    it('calls crudFetch with correct arguments', async () => {
      mockCrudFetch.mockResolvedValue({});

      const qc = makeQueryClient();
      const { result } = renderHook(() => useTogglePinFeed(), { wrapper: wrapper(qc) });

      await act(async () => {
        await result.current.mutateAsync({ id: 'feed-1', is_pinned: true });
      });

      expect(mockCrudFetch).toHaveBeenCalledWith('PATCH', {
        table: 'news_feed',
        id: 'feed-1',
        data: { is_pinned: true },
      });
    });

    it('calls window.alert on error', async () => {
      mockCrudFetch.mockRejectedValue(new Error('Pin failed'));

      const qc = makeQueryClient();
      const { result } = renderHook(() => useTogglePinFeed(), { wrapper: wrapper(qc) });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: 'feed-1', is_pinned: true });
        } catch {
          // expected
        }
      });

      expect(window.alert).toHaveBeenCalledWith('Pin failed');
    });

    it('calls window.alert with fallback message when error has no message', async () => {
      mockCrudFetch.mockRejectedValue(new Error(''));

      const qc = makeQueryClient();
      const { result } = renderHook(() => useTogglePinFeed(), { wrapper: wrapper(qc) });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: 'feed-1', is_pinned: false });
        } catch {
          // expected
        }
      });

      expect(window.alert).toHaveBeenCalledWith('Operation failed');
    });
  });

  describe('useToggleFeatureFeed', () => {
    it('calls crudFetch with is_featured flag', async () => {
      mockCrudFetch.mockResolvedValue({});

      const qc = makeQueryClient();
      const { result } = renderHook(() => useToggleFeatureFeed(), { wrapper: wrapper(qc) });

      await act(async () => {
        await result.current.mutateAsync({ id: 'feed-2', is_featured: false });
      });

      expect(mockCrudFetch).toHaveBeenCalledWith('PATCH', {
        table: 'news_feed',
        id: 'feed-2',
        data: { is_featured: false },
      });
    });

    it('calls window.alert on error', async () => {
      mockCrudFetch.mockRejectedValue(new Error('Feature failed'));

      const qc = makeQueryClient();
      const { result } = renderHook(() => useToggleFeatureFeed(), { wrapper: wrapper(qc) });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: 'feed-2', is_featured: true });
        } catch {
          // expected
        }
      });

      expect(window.alert).toHaveBeenCalledWith('Feature failed');
    });
  });

  describe('useReorderFeed', () => {
    it('calls crudFetch for each item in parallel', async () => {
      mockCrudFetch.mockResolvedValue({});

      const qc = makeQueryClient();
      const { result } = renderHook(() => useReorderFeed(), { wrapper: wrapper(qc) });

      const items = [
        { id: 'a', display_order: 0 },
        { id: 'b', display_order: 1 },
        { id: 'c', display_order: 2 },
      ];

      await act(async () => {
        await result.current.mutateAsync(items);
      });

      expect(mockCrudFetch).toHaveBeenCalledTimes(3);
      expect(mockCrudFetch).toHaveBeenCalledWith('PATCH', {
        table: 'news_feed',
        id: 'a',
        data: { display_order: 0 },
      });
      expect(mockCrudFetch).toHaveBeenCalledWith('PATCH', {
        table: 'news_feed',
        id: 'c',
        data: { display_order: 2 },
      });
    });

    it('calls window.alert on error', async () => {
      mockCrudFetch.mockRejectedValue(new Error('Reorder failed'));

      const qc = makeQueryClient();
      const { result } = renderHook(() => useReorderFeed(), { wrapper: wrapper(qc) });

      await act(async () => {
        try {
          await result.current.mutateAsync([{ id: 'x', display_order: 0 }]);
        } catch {
          // expected
        }
      });

      expect(window.alert).toHaveBeenCalledWith('Reorder failed');
    });
  });
});
