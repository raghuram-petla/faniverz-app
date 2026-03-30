jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));
jest.mock('@/features/ott/api', () => ({
  fetchPlatforms: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/features/movies/api', () => ({
  fetchMovies: jest.fn().mockResolvedValue([]),
  fetchUpcomingMovies: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/features/feed/api', () => ({
  fetchPersonalizedFeed: jest.fn().mockResolvedValue([]),
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
async function simulateAllFeedSuccess(qc: QueryClient, userId: string | null) {
  await qc.fetchInfiniteQuery({
    queryKey: ['personalized-feed', 'all', userId],
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

  it('Phase 1: prefetches platforms and movies immediately', () => {
    renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(queryClient),
    });

    expect(prefetchQuerySpy).toHaveBeenCalledTimes(2);
    expect(prefetchQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['platforms'] }),
    );
    expect(prefetchQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['movies', undefined] }),
    );
  });

  it('Phase 1: fires only once on re-render', () => {
    const { rerender } = renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(queryClient),
    });
    rerender({});

    // Still 2, not 4
    expect(prefetchQuerySpy).toHaveBeenCalledTimes(2);
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

  it('Phase 2: uses correct userId in personalized feed keys', async () => {
    renderHook(() => useAppPrefetch(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await simulateAllFeedSuccess(queryClient, 'user-123');
    });

    // All personalized-feed calls should include userId
    const personalizedCalls = prefetchInfiniteSpy.mock.calls.filter(
      ([opts]: [{ queryKey: unknown[] }]) => opts.queryKey[0] === 'personalized-feed',
    );
    expect(personalizedCalls).toHaveLength(6);
    for (const [opts] of personalizedCalls) {
      expect(opts.queryKey[2]).toBe('user-123');
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

    const personalizedCalls = prefetchInfiniteSpy.mock.calls.filter(
      ([opts]: [{ queryKey: unknown[] }]) => opts.queryKey[0] === 'personalized-feed',
    );
    for (const [opts] of personalizedCalls) {
      expect(opts.queryKey[2]).toBeNull();
    }
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
    queryClient.setQueryData(['personalized-feed', 'all', 'user-123'], {
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
});
