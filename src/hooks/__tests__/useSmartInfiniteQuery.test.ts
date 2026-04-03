import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSmartInfiniteQuery } from '../useSmartInfiniteQuery';
import type { SmartPaginationConfig } from '@/constants/paginationConfig';

// @sync Mock the cache-restored signal. Tests that need it call setMockCacheRestored(true).
let mockCacheRestoredValue = false;
jest.mock('@/lib/queryClient', () => ({
  wasCacheRestored: () => mockCacheRestoredValue,
}));
function setMockCacheRestored(value: boolean) {
  mockCacheRestoredValue = value;
}

const makeItem = (id: string) => ({ id, name: `Item ${id}` });

const makeItems = (count: number, startId = 1) =>
  Array.from({ length: count }, (_, i) => makeItem(String(startId + i)));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

const defaultConfig: SmartPaginationConfig = {
  initialPageSize: 5,
  expandedPageSize: 10,
  prefetchItemsRemaining: 5,
  backgroundExpand: true,
};

describe('useSmartInfiniteQuery', () => {
  beforeEach(() => {
    setMockCacheRestored(false);
  });

  it('fetches initial page with initialPageSize', async () => {
    const queryFn = jest.fn().mockResolvedValue(makeItems(5));
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test'],
          queryFn,
          config: defaultConfig,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(queryFn).toHaveBeenCalledWith(0, 5);
    expect(result.current.allItems).toHaveLength(5);
  });

  it('background-expands to page 2 after page 1 settles', async () => {
    const queryFn = jest
      .fn()
      .mockResolvedValueOnce(makeItems(5))
      .mockResolvedValueOnce(makeItems(10, 6));

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-bg'],
          queryFn,
          config: defaultConfig,
        }),
      { wrapper },
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
    expect(queryFn).toHaveBeenCalledWith(0, 5);
    expect(queryFn).toHaveBeenCalledWith(5, 10);
    expect(result.current.allItems).toHaveLength(15);
  });

  it('does not background-expand when backgroundExpand is false', async () => {
    const queryFn = jest.fn().mockResolvedValue(makeItems(5));
    const config: SmartPaginationConfig = { ...defaultConfig, backgroundExpand: false };

    const { wrapper } = createWrapper();
    renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-no-bg'],
          queryFn,
          config,
        }),
      { wrapper },
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 100));
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('detects end of data when page returns fewer items than expected', async () => {
    const queryFn = jest.fn().mockResolvedValueOnce(makeItems(3));

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-eof'],
          queryFn,
          config: defaultConfig,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.allItems).toHaveLength(3);
  });

  it('deduplicates items by id across pages', async () => {
    const page0 = [makeItem('1'), makeItem('2'), makeItem('3'), makeItem('4'), makeItem('5')];
    const page1 = [makeItem('5'), makeItem('6'), makeItem('7')];

    const queryFn = jest.fn().mockResolvedValueOnce(page0).mockResolvedValueOnce(page1);

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-dedup'],
          queryFn,
          config: defaultConfig,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.allItems.length).toBe(7));
    const ids = result.current.allItems.map((i) => i.id);
    expect(new Set(ids).size).toBe(7);
  });

  it('returns empty allItems when no data', async () => {
    const queryFn = jest.fn().mockResolvedValue([]);
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-empty'],
          queryFn,
          config: defaultConfig,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.allItems).toHaveLength(0);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('respects enabled flag', async () => {
    const queryFn = jest.fn().mockResolvedValue(makeItems(5));
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-disabled'],
          queryFn,
          config: defaultConfig,
          enabled: false,
        }),
      { wrapper },
    );

    await new Promise((r) => setTimeout(r, 100));
    expect(queryFn).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.allItems).toHaveLength(0);
  });

  it('handles query error', async () => {
    const queryFn = jest.fn().mockRejectedValue(new Error('Network error'));
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-error'],
          queryFn,
          config: defaultConfig,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });

  it('skips setIsBackgroundExpanding(false) when component unmounts during background expansion', async () => {
    let resolvePage1: (value: ReturnType<typeof makeItems>) => void;
    const page1Promise = new Promise<ReturnType<typeof makeItems>>((resolve) => {
      resolvePage1 = resolve;
    });

    const queryFn = jest.fn().mockResolvedValueOnce(makeItems(5)).mockReturnValueOnce(page1Promise);

    const { wrapper } = createWrapper();
    const { result, unmount } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-cancel-bg'],
          queryFn,
          config: defaultConfig,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isBackgroundExpanding).toBe(true));
    unmount();

    act(() => {
      resolvePage1!(makeItems(10, 6));
    });
    // No assertion needed — test passes if no "state update on unmounted component" error
  });

  it('keeps previous data visible when query key changes and keepPreviousData is true', async () => {
    const page0NewKey = makeItems(3, 100);
    const queryFn = jest
      .fn()
      .mockResolvedValueOnce(makeItems(5))
      .mockResolvedValueOnce(makeItems(10, 6))
      .mockResolvedValueOnce(page0NewKey);

    let keyValue = 'key-a';
    const { wrapper } = createWrapper();
    const { result, rerender } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-keep', keyValue],
          queryFn,
          config: defaultConfig,
          keepPreviousData: true,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.allItems).toHaveLength(15));

    keyValue = 'key-b';
    rerender({});

    expect(result.current.isLoading).toBe(false);
    expect(result.current.allItems.length).toBeGreaterThan(0);

    await waitFor(() => expect(result.current.allItems[0].id).toBe('100'));
    expect(result.current.allItems).toHaveLength(3);
  });

  it('phased refetch: resolves after page 0, then refreshes remaining pages in background', async () => {
    const queryFn = jest
      .fn()
      .mockResolvedValueOnce(makeItems(5))
      .mockResolvedValueOnce(makeItems(10, 6))
      .mockResolvedValueOnce(makeItems(5, 100)) // page 0 phased refetch
      .mockResolvedValueOnce(makeItems(10, 200)); // page 1 background refresh

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-phased-refetch'],
          queryFn,
          config: defaultConfig,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.allItems).toHaveLength(15));
    expect(queryFn).toHaveBeenCalledTimes(2);

    await act(async () => {
      await result.current.refetch();
    });

    // Phase 1 completed — page 0 is now fresh
    expect(result.current.allItems[0].id).toBe('100');
    expect(result.current.isRefreshingFirstPage).toBe(false);

    // Phase 2 runs in background
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(4));
    await waitFor(() => {
      const ids = result.current.allItems.map((i) => i.id);
      expect(ids).toContain('200');
    });
  });

  it('isRefreshingFirstPage is true during page 0 fetch and false after', async () => {
    let resolvePage0Refetch: (value: ReturnType<typeof makeItems>) => void;
    const page0RefetchPromise = new Promise<ReturnType<typeof makeItems>>((resolve) => {
      resolvePage0Refetch = resolve;
    });

    const queryFn = jest
      .fn()
      .mockResolvedValueOnce(makeItems(3)) // page 0 initial (short, no bg expand)
      .mockReturnValueOnce(page0RefetchPromise); // page 0 refetch — held pending

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-refreshing-flag'],
          queryFn,
          config: { ...defaultConfig, backgroundExpand: false },
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isRefreshingFirstPage).toBe(false);

    let refetchPromise: Promise<unknown>;
    act(() => {
      refetchPromise = result.current.refetch();
    });

    await waitFor(() => expect(result.current.isRefreshingFirstPage).toBe(true));

    await act(async () => {
      resolvePage0Refetch!(makeItems(3, 10));
      await refetchPromise!;
    });

    expect(result.current.isRefreshingFirstPage).toBe(false);
  });

  it('auto-triggers phased refetch when cache-restored data is detected', async () => {
    // Simulate cache restore: pre-populate cache and set the cacheRestored flag
    const queryFn = jest.fn().mockResolvedValueOnce(makeItems(3, 10)); // page 0 phased refetch

    const { queryClient, wrapper } = createWrapper();
    const queryKey = ['test-cache-restore'];

    // Pre-populate the infinite query cache (simulates restored persisted cache)
    queryClient.setQueryData(queryKey, {
      pages: [makeItems(3)],
      pageParams: [0],
    });
    // Set the cache-restored signal
    setMockCacheRestored(true);

    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey,
          queryFn,
          config: { ...defaultConfig, backgroundExpand: false },
          staleTime: 60_000,
        }),
      { wrapper },
    );

    // Hook mounts with cached data
    expect(result.current.allItems[0].id).toBe('1');

    // The cache-restore effect triggers phased refetch
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.allItems[0].id).toBe('10'));
  });

  it('does NOT auto-trigger phased refetch when cache was not restored', async () => {
    const queryFn = jest.fn().mockResolvedValueOnce(makeItems(3));

    setMockCacheRestored(false);
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-no-cache-restore'],
          queryFn,
          config: { ...defaultConfig, backgroundExpand: false },
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Only the initial TanStack fetch — no extra phased refetch
    expect(queryFn).toHaveBeenCalledTimes(1);
    await new Promise((r) => setTimeout(r, 100));
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('background phase silently ignores errors without crashing', async () => {
    const queryFn = jest
      .fn()
      .mockResolvedValueOnce(makeItems(5))
      .mockResolvedValueOnce(makeItems(10, 6))
      .mockResolvedValueOnce(makeItems(5, 100)) // page 0 phased refetch
      .mockRejectedValueOnce(new Error('Network error')); // page 1 background — fails

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useSmartInfiniteQuery({
          queryKey: ['test-bg-error'],
          queryFn,
          config: defaultConfig,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.allItems).toHaveLength(15));

    await act(async () => {
      await result.current.refetch();
    });

    // Phase 1 completed
    expect(result.current.allItems[0].id).toBe('100');

    // Phase 2 attempts and fails silently
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(4));
    expect(result.current.allItems).toHaveLength(15);
  });
});
