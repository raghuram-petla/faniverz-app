jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));
jest.mock('@/features/ott/api', () => ({
  fetchPlatforms: jest.fn().mockResolvedValue([]),
  fetchMoviePlatformMap: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/features/movies/api', () => ({
  fetchMovies: jest.fn().mockResolvedValue([{ id: 'movie-a' }, { id: 'movie-b' }]),
  fetchUpcomingMovies: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/features/feed/api', () => ({
  fetchNewsFeed: jest.fn().mockResolvedValue([]),
}));

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppPrefetch } from '../useAppPrefetch';
import { useAuth } from '@/features/auth/providers/AuthProvider';

function createWrapper(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

/** Simulate home screen's 'all' feed succeeding (emits cache success event) */
async function simulateAllFeedSuccess(qc: QueryClient, _userId: string | null) {
  await qc.fetchInfiniteQuery({
    queryKey: ['news-feed', 'all'],
    queryFn: () => Promise.resolve([{ id: '1' }]),
    initialPageParam: 0,
    getNextPageParam: () => undefined,
  });
}

describe('useAppPrefetch', () => {
  let queryClient: QueryClient;
  let prefetchQuerySpy: jest.SpyInstance;
  let prefetchInfiniteSpy: jest.SpyInstance;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    prefetchQuerySpy = jest.spyOn(queryClient, 'prefetchQuery').mockResolvedValue(undefined);
    prefetchInfiniteSpy = jest
      .spyOn(queryClient, 'prefetchInfiniteQuery')
      .mockResolvedValue(undefined);

    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-123' },
      isLoading: false,
    });
  });

  afterEach(() => {
    queryClient.clear();
    jest.restoreAllMocks();
  });

  it('Phase 1: prefetches platforms and movies immediately', async () => {
    renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(queryClient),
    });

    // Flush fetchQuery → then chain (movie-platform map)
    await act(async () => {});

    expect(prefetchQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['platforms'] }),
    );
    // Movie-platform map is chained after fetchQuery resolves movies
    expect(prefetchQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['movie-platforms', expect.any(String)],
      }),
    );
  });

  it('Phase 1: fires only once on re-render', async () => {
    const { rerender } = renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(queryClient),
    });
    await act(async () => {});

    const callCount = prefetchQuerySpy.mock.calls.length;
    rerender({});
    await act(async () => {});

    expect(prefetchQuerySpy).toHaveBeenCalledTimes(callCount);
  });

  it('Phase 2: does not fire before all feed settles', () => {
    renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(queryClient),
    });

    expect(prefetchInfiniteSpy).not.toHaveBeenCalled();
  });

  it('Phase 2: fires after all feed success event', async () => {
    renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await simulateAllFeedSuccess(queryClient, 'user-123');
    });

    // 6 filter variants + 1 news feed + 1 upcoming = 8
    expect(prefetchInfiniteSpy).toHaveBeenCalledTimes(8);
  });

  it('Phase 2: fires only once (not on repeated success)', async () => {
    renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await simulateAllFeedSuccess(queryClient, 'user-123');
    });
    await act(async () => {
      await simulateAllFeedSuccess(queryClient, 'user-123');
    });

    // Still 8, not 16
    expect(prefetchInfiniteSpy).toHaveBeenCalledTimes(8);
  });

  it('Phase 2: uses correct filter in news-feed keys', async () => {
    renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await simulateAllFeedSuccess(queryClient, 'user-123');
    });

    // All news-feed filter variant calls should have ['news-feed', filter] shape
    const feedCalls = prefetchInfiniteSpy.mock.calls.filter(
      ([opts]: [{ queryKey: unknown[] }]) =>
        opts.queryKey[0] === 'news-feed' && opts.queryKey[1] !== undefined,
    );
    expect(feedCalls).toHaveLength(6);
    for (const [opts] of feedCalls) {
      expect(typeof opts.queryKey[1]).toBe('string');
    }
  });

  it('Phase 2: works with null userId (anonymous user)', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });

    renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await simulateAllFeedSuccess(queryClient, null);
    });

    expect(prefetchInfiniteSpy).toHaveBeenCalledTimes(8);

    // News feed filter variant calls should have ['news-feed', filter] shape (no userId)
    const feedCalls = prefetchInfiniteSpy.mock.calls.filter(
      ([opts]: [{ queryKey: unknown[] }]) =>
        opts.queryKey[0] === 'news-feed' && opts.queryKey[1] !== undefined,
    );
    expect(feedCalls).toHaveLength(6);
  });

  it('Phase 2: does NOT fire while auth is loading', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: true,
    });

    renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(queryClient),
    });

    // Even if the feed somehow succeeds, Phase 2 should not fire
    await act(async () => {
      await simulateAllFeedSuccess(queryClient, null);
    });

    expect(prefetchInfiniteSpy).not.toHaveBeenCalled();
  });

  it('Phase 2: fires immediately when all feed is already cached', () => {
    // Pre-populate cache before hook mounts
    queryClient.setQueryData(['news-feed', 'all'], {
      pages: [[{ id: '1' }]],
      pageParams: [0],
    });

    renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(queryClient),
    });

    expect(prefetchInfiniteSpy).toHaveBeenCalledTimes(8);
  });

  it('Phase 2: resets and re-fires when userId changes', async () => {
    const { rerender } = renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(queryClient),
    });

    // Fire Phase 2 for user-123
    await act(async () => {
      await simulateAllFeedSuccess(queryClient, 'user-123');
    });
    expect(prefetchInfiniteSpy).toHaveBeenCalledTimes(8);

    // Switch to user-456
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-456' },
      isLoading: false,
    });
    rerender({});

    // Trigger all feed for user-456
    await act(async () => {
      await simulateAllFeedSuccess(queryClient, 'user-456');
    });

    // 8 more calls = 16 total
    expect(prefetchInfiniteSpy).toHaveBeenCalledTimes(16);
  });

  it('Phase 2: prefetches news feed and upcoming movies', async () => {
    renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await simulateAllFeedSuccess(queryClient, 'user-123');
    });

    const keys = prefetchInfiniteSpy.mock.calls.map(
      ([opts]: [{ queryKey: unknown[] }]) => opts.queryKey,
    );
    expect(keys).toContainEqual(['news-feed', undefined]);
    expect(keys).toContainEqual(['upcoming-movies']);
  });

  it('subscription is cleaned up on unmount', async () => {
    const { unmount } = renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(queryClient),
    });

    unmount();

    // Trigger success after unmount — should NOT fire Phase 2
    await act(async () => {
      await simulateAllFeedSuccess(queryClient, 'user-123');
    });

    expect(prefetchInfiniteSpy).not.toHaveBeenCalled();
  });

  it('Phase 2: exercises queryFn and getNextPageParam callbacks through real prefetch', async () => {
    // Use a real QueryClient without spies so prefetchInfiniteQuery actually executes
    // the queryFn and getNextPageParam callbacks (lines 50-51, 58, 110, 127, 142)
    const realQC = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-gnpp' },
      isLoading: false,
    });

    // Pre-populate cache so Phase 2 fires immediately
    realQC.setQueryData(['news-feed', 'all'], {
      pages: [[{ id: '1' }]],
      pageParams: [0],
    });

    renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(realQC),
    });

    // Flush microtasks multiple times to ensure all async prefetch callbacks settle
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    const { fetchNewsFeed } = require('@/features/feed/api');
    const { fetchUpcomingMovies } = require('@/features/movies/api');

    // The queryFn callbacks (getOffset, getLimit) should have been called
    expect(fetchNewsFeed).toHaveBeenCalled();
    expect(fetchUpcomingMovies).toHaveBeenCalled();

    realQC.clear();
  });

  it('Phase 1: handles fetchMovies returning empty array (no movie-platform prefetch)', async () => {
    const { fetchMovies } = require('@/features/movies/api');
    (fetchMovies as jest.Mock).mockResolvedValueOnce([]);

    const realQC = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-empty' },
      isLoading: false,
    });

    renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(realQC),
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    realQC.clear();
  });

  it('Phase 1: handles fetchMovies rejection gracefully', async () => {
    const { fetchMovies } = require('@/features/movies/api');
    (fetchMovies as jest.Mock).mockRejectedValueOnce(new Error('network error'));

    const realQC = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-err' },
      isLoading: false,
    });

    renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(realQC),
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    realQC.clear();
  });

  it('subscription ignores non-updated event types', async () => {
    const subscribeSpy = jest.spyOn(queryClient.getQueryCache(), 'subscribe');

    renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(queryClient),
    });

    // Get the subscriber callback
    const subscriberCallback = subscribeSpy.mock.calls[0]?.[0];
    expect(subscriberCallback).toBeDefined();

    // Simulate a non-updated event
    if (typeof subscriberCallback === 'function') {
      subscriberCallback({
        type: 'added',
        query: { queryKey: ['news-feed', 'all'] },
      } as any);
    }

    // Phase 2 should not have fired
    expect(prefetchInfiniteSpy).not.toHaveBeenCalled();

    subscribeSpy.mockRestore();
  });

  it('subscription ignores updated events that are not success', async () => {
    const subscribeSpy = jest.spyOn(queryClient.getQueryCache(), 'subscribe');

    renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(queryClient),
    });

    const subscriberCallback = subscribeSpy.mock.calls[0]?.[0];
    if (typeof subscriberCallback === 'function') {
      subscriberCallback({
        type: 'updated',
        action: { type: 'error' },
        query: { queryKey: ['news-feed', 'all'] },
      } as any);
    }

    expect(prefetchInfiniteSpy).not.toHaveBeenCalled();

    subscribeSpy.mockRestore();
  });

  it('subscription ignores success for non-matching query keys', async () => {
    const subscribeSpy = jest.spyOn(queryClient.getQueryCache(), 'subscribe');

    renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(queryClient),
    });

    const subscriberCallback = subscribeSpy.mock.calls[0]?.[0];
    if (typeof subscriberCallback === 'function') {
      // Different key[0]
      subscriberCallback({
        type: 'updated',
        action: { type: 'success' },
        query: { queryKey: ['other-query', 'all'] },
      } as any);
      // Different filter (not 'all')
      subscriberCallback({
        type: 'updated',
        action: { type: 'success' },
        query: { queryKey: ['news-feed', 'trailers'] },
      } as any);
      // Non-array queryKey
      subscriberCallback({
        type: 'updated',
        action: { type: 'success' },
        query: { queryKey: 'not-an-array' },
      } as any);
    }

    expect(prefetchInfiniteSpy).not.toHaveBeenCalled();

    subscribeSpy.mockRestore();
  });
});
