import { renderHook, act } from '@testing-library/react-native';
import { QueryClient } from '@tanstack/react-query';
import { usePrefetchOnVisibility } from '../usePrefetchOnVisibility';
import type { SmartPaginationConfigWithPrefetch } from '@/constants/paginationConfig';

// Mock requestAnimationFrame to execute synchronously
global.requestAnimationFrame = (cb: FrameRequestCallback) => {
  cb(0);
  return 0;
};
global.cancelAnimationFrame = jest.fn();

const makeItem = (id: string, commentCount: number) => ({
  id,
  name: `Item ${id}`,
  comment_count: commentCount,
});

const makeViewToken = (item: { id: string; comment_count: number }, isViewable = true) => ({
  item,
  key: item.id,
  index: 0,
  isViewable,
});

describe('usePrefetchOnVisibility', () => {
  let queryClient: QueryClient;
  let prefetchSpy: jest.SpyInstance;

  const configWithPrefetch: SmartPaginationConfigWithPrefetch = {
    initialPageSize: 5,
    expandedPageSize: 15,
    prefetchItemsRemaining: 5,
    backgroundExpand: true,
    prefetchRelated: {
      countField: 'comment_count',
      countThreshold: 10,
    },
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    prefetchSpy = jest
      .spyOn(queryClient, 'prefetchInfiniteQuery')
      .mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns stable viewabilityConfig', () => {
    const queryKeyFactory = jest.fn((item: { id: string }) => ['comments', item.id] as const);
    const queryFn = jest.fn();

    const { result } = renderHook(() =>
      usePrefetchOnVisibility({
        config: configWithPrefetch,
        queryClient,
        queryKeyFactory,
        queryFn,
      }),
    );

    expect(result.current.viewabilityConfig).toEqual({
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 300,
    });
  });

  it('prefetches when item comment_count exceeds threshold', () => {
    const queryKeyFactory = jest.fn((item: { id: string }) => ['comments', item.id] as const);
    const queryFn = jest.fn().mockResolvedValue([]);

    const { result } = renderHook(() =>
      usePrefetchOnVisibility({
        config: configWithPrefetch,
        queryClient,
        queryKeyFactory,
        queryFn,
      }),
    );

    const item = makeItem('1', 20); // 20 > threshold of 10
    act(() => {
      result.current.onViewableItemsChanged({
        viewableItems: [makeViewToken(item)],
      });
    });

    expect(prefetchSpy).toHaveBeenCalledTimes(1);
    expect(queryKeyFactory).toHaveBeenCalledWith(item);
  });

  it('does NOT prefetch when comment_count is below threshold', () => {
    const queryKeyFactory = jest.fn((item: { id: string }) => ['comments', item.id] as const);
    const queryFn = jest.fn();

    const { result } = renderHook(() =>
      usePrefetchOnVisibility({
        config: configWithPrefetch,
        queryClient,
        queryKeyFactory,
        queryFn,
      }),
    );

    const item = makeItem('1', 5); // 5 < threshold of 10
    act(() => {
      result.current.onViewableItemsChanged({
        viewableItems: [makeViewToken(item)],
      });
    });

    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  it('deduplicates — does not prefetch same item twice', () => {
    const queryKeyFactory = jest.fn((item: { id: string }) => ['comments', item.id] as const);
    const queryFn = jest.fn().mockResolvedValue([]);

    const { result } = renderHook(() =>
      usePrefetchOnVisibility({
        config: configWithPrefetch,
        queryClient,
        queryKeyFactory,
        queryFn,
      }),
    );

    const item = makeItem('1', 20);
    act(() => {
      result.current.onViewableItemsChanged({ viewableItems: [makeViewToken(item)] });
    });
    act(() => {
      result.current.onViewableItemsChanged({ viewableItems: [makeViewToken(item)] });
    });

    expect(prefetchSpy).toHaveBeenCalledTimes(1);
  });

  it('prefetches all qualifying items without artificial cap', () => {
    const queryKeyFactory = jest.fn((item: { id: string }) => ['comments', item.id] as const);
    const queryFn = jest.fn().mockResolvedValue([]);

    const { result } = renderHook(() =>
      usePrefetchOnVisibility({
        config: configWithPrefetch,
        queryClient,
        queryKeyFactory,
        queryFn,
      }),
    );

    // Send 25 items in one batch — all should be prefetched (TanStack Query handles GC)
    const items = Array.from({ length: 25 }, (_, i) => makeViewToken(makeItem(String(i), 20)));
    act(() => {
      result.current.onViewableItemsChanged({ viewableItems: items });
    });

    expect(prefetchSpy).toHaveBeenCalledTimes(25);
  });

  it('does nothing when config has no prefetchRelated', () => {
    const configNoPrefetch: SmartPaginationConfigWithPrefetch = {
      initialPageSize: 5,
      expandedPageSize: 10,
      prefetchItemsRemaining: 5,
      backgroundExpand: true,
    };
    const queryKeyFactory = jest.fn();
    const queryFn = jest.fn();

    const { result } = renderHook(() =>
      usePrefetchOnVisibility({
        config: configNoPrefetch,
        queryClient,
        queryKeyFactory,
        queryFn,
      }),
    );

    act(() => {
      result.current.onViewableItemsChanged({
        viewableItems: [makeViewToken(makeItem('1', 20))],
      });
    });

    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  it('skips items without an id', () => {
    const queryKeyFactory = jest.fn((item: { id: string }) => ['comments', item.id] as const);
    const queryFn = jest.fn();

    const { result } = renderHook(() =>
      usePrefetchOnVisibility({
        config: configWithPrefetch,
        queryClient,
        queryKeyFactory,
        queryFn,
      }),
    );

    act(() => {
      result.current.onViewableItemsChanged({
        viewableItems: [{ item: { name: 'no-id' }, key: '0', index: 0, isViewable: true }],
      });
    });

    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  it('clears dedup set when config identity changes', () => {
    const queryKeyFactory = jest.fn((item: { id: string }) => ['comments', item.id] as const);
    const queryFn = jest.fn().mockResolvedValue([]);

    const configA: SmartPaginationConfigWithPrefetch = { ...configWithPrefetch };
    const configB: SmartPaginationConfigWithPrefetch = { ...configWithPrefetch };

    const { result, rerender } = renderHook(
      ({ cfg }: { cfg: SmartPaginationConfigWithPrefetch }) =>
        usePrefetchOnVisibility({
          config: cfg,
          queryClient,
          queryKeyFactory,
          queryFn,
        }),
      { initialProps: { cfg: configA } },
    );

    const item = makeItem('1', 20);

    // First visibility event — item gets prefetched and added to dedup set
    act(() => {
      result.current.onViewableItemsChanged({ viewableItems: [makeViewToken(item)] });
    });
    expect(prefetchSpy).toHaveBeenCalledTimes(1);

    // Config identity changes — dedup set should be cleared
    rerender({ cfg: configB });

    // Same item should be prefetched again since the dedup set was cleared
    act(() => {
      result.current.onViewableItemsChanged({ viewableItems: [makeViewToken(item)] });
    });
    expect(prefetchSpy).toHaveBeenCalledTimes(2);
  });

  it('cancels pending RAF on unmount to prevent stale prefetch calls', () => {
    const cancelSpy = jest.spyOn(global, 'cancelAnimationFrame');
    // Override requestAnimationFrame to return a non-zero ID so the cleanup runs
    const rafSpy = jest.spyOn(global, 'requestAnimationFrame').mockImplementation(() => {
      return 42; // Return a pending RAF ID without calling the callback
    });

    const queryKeyFactory = jest.fn((item: { id: string }) => ['comments', item.id] as const);
    const queryFn = jest.fn();

    const { result, unmount } = renderHook(() =>
      usePrefetchOnVisibility({
        config: configWithPrefetch,
        queryClient,
        queryKeyFactory,
        queryFn,
      }),
    );

    // Trigger a visibility change so rafRef.current gets set to 42
    act(() => {
      result.current.onViewableItemsChanged({
        viewableItems: [makeViewToken(makeItem('1', 20))],
      });
    });

    // Unmount should cancel the pending RAF
    unmount();
    expect(cancelSpy).toHaveBeenCalledWith(42);

    rafSpy.mockRestore();
  });
});
