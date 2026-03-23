import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createWrapper } from '@/__tests__/helpers/createWrapper';
import {
  useWatchlist,
  useWatchlistPaginated,
  useIsWatchlisted,
  useWatchlistMutations,
  useWatchlistSet,
} from '../hooks';
import * as api from '../api';

jest.mock('../api');

jest.mock('@/i18n', () => ({ t: (key: string) => key }));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

const mockWatchlistEntries = [
  {
    id: 'w1',
    user_id: 'u1',
    movie_id: 'm1',
    status: 'watchlist',
    movie: { id: 'm1', title: 'Movie 1', in_theaters: true, premiere_date: null },
  },
  {
    id: 'w2',
    user_id: 'u1',
    movie_id: 'm2',
    status: 'watchlist',
    movie: {
      id: 'm2',
      title: 'Movie 2',
      in_theaters: false,
      premiere_date: null,
      release_date: '2099-01-01',
    },
  },
  {
    id: 'w3',
    user_id: 'u1',
    movie_id: 'm3',
    status: 'watched',
    movie: { id: 'm3', title: 'Movie 3', in_theaters: true, premiere_date: null },
  },
];

describe('useWatchlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches watchlist for a user', async () => {
    (api.fetchWatchlist as jest.Mock).mockResolvedValue(mockWatchlistEntries);

    const { result } = renderHook(() => useWatchlist('u1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fetchWatchlist).toHaveBeenCalledWith('u1');
  });

  it('separates entries into available, upcoming, and watched', async () => {
    (api.fetchWatchlist as jest.Mock).mockResolvedValue(mockWatchlistEntries);

    const { result } = renderHook(() => useWatchlist('u1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.available).toHaveLength(1);
    expect(result.current.available[0].movie_id).toBe('m1');
    expect(result.current.upcoming).toHaveLength(1);
    expect(result.current.upcoming[0].movie_id).toBe('m2');
    expect(result.current.watched).toHaveLength(1);
    expect(result.current.watched[0].movie_id).toBe('m3');
  });

  it('does not fetch when userId is empty', async () => {
    (api.fetchWatchlist as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useWatchlist(''), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(api.fetchWatchlist).not.toHaveBeenCalled();
  });
});

describe('useWatchlistPaginated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches paginated watchlist for a user', async () => {
    (api.fetchWatchlistPaginated as jest.Mock).mockResolvedValue(mockWatchlistEntries);

    const { result } = renderHook(() => useWatchlistPaginated('u1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fetchWatchlistPaginated).toHaveBeenCalledWith('u1', 0, 10);
  });

  it('separates entries into available, upcoming, and watched', async () => {
    (api.fetchWatchlistPaginated as jest.Mock).mockResolvedValue(mockWatchlistEntries);

    const { result } = renderHook(() => useWatchlistPaginated('u1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.available).toHaveLength(1);
    expect(result.current.available[0].movie_id).toBe('m1');
    expect(result.current.upcoming).toHaveLength(1);
    expect(result.current.upcoming[0].movie_id).toBe('m2');
    expect(result.current.watched).toHaveLength(1);
    expect(result.current.watched[0].movie_id).toBe('m3');
  });

  it('does not fetch when userId is empty', async () => {
    (api.fetchWatchlistPaginated as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useWatchlistPaginated(''), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(api.fetchWatchlistPaginated).not.toHaveBeenCalled();
  });

  it('returns hasNextPage false when fewer items than page size', async () => {
    // Only 3 items, less than PAGE_SIZE (10)
    (api.fetchWatchlistPaginated as jest.Mock).mockResolvedValue(mockWatchlistEntries);

    const { result } = renderHook(() => useWatchlistPaginated('u1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('returns hasNextPage true when full page size returned', async () => {
    // 10 items — exactly PAGE_SIZE, so there may be more
    const fullPage = Array.from({ length: 10 }, (_, i) => ({
      id: `w${i}`,
      user_id: 'u1',
      movie_id: `m${i}`,
      status: 'watchlist' as const,
      movie: { id: `m${i}`, title: `Movie ${i}`, in_theaters: false, premiere_date: null },
    }));
    (api.fetchWatchlistPaginated as jest.Mock).mockResolvedValue(fullPage);

    const { result } = renderHook(() => useWatchlistPaginated('u1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });
});

describe('useIsWatchlisted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checks if a movie is watchlisted', async () => {
    const entry = { id: 'w1', movie_id: 'm1', status: 'watchlist' };
    (api.isMovieWatchlisted as jest.Mock).mockResolvedValue(entry);

    const { result } = renderHook(() => useIsWatchlisted('u1', 'm1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(entry);
  });

  it('does not fetch when userId is empty', async () => {
    const { result } = renderHook(() => useIsWatchlisted('', 'm1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
  });

  it('does not fetch when movieId is empty', async () => {
    const { result } = renderHook(() => useIsWatchlisted('u1', ''), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
  });
});

describe('useWatchlistMutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes add, remove, markWatched, moveBack mutations', () => {
    const { result } = renderHook(() => useWatchlistMutations(), {
      wrapper: createWrapper(),
    });

    expect(result.current.add).toBeDefined();
    expect(result.current.remove).toBeDefined();
    expect(result.current.markWatched).toBeDefined();
    expect(result.current.moveBack).toBeDefined();
  });

  it('add mutation calls addToWatchlist', async () => {
    (api.addToWatchlist as jest.Mock).mockResolvedValue({ id: 'w1' });

    const { result } = renderHook(() => useWatchlistMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.add.mutate({ userId: 'u1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.add.isSuccess).toBe(true));
    expect(api.addToWatchlist).toHaveBeenCalledWith('u1', 'm1');
  });

  it('remove mutation calls removeFromWatchlist', async () => {
    (api.removeFromWatchlist as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useWatchlistMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.remove.mutate({ userId: 'u1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.remove.isSuccess).toBe(true));
    expect(api.removeFromWatchlist).toHaveBeenCalledWith('u1', 'm1');
  });

  it('markWatched mutation calls markAsWatched', async () => {
    (api.markAsWatched as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useWatchlistMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.markWatched.mutate({ userId: 'u1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.markWatched.isSuccess).toBe(true));
    expect(api.markAsWatched).toHaveBeenCalledWith('u1', 'm1');
  });

  it('remove mutation rolls back on error', async () => {
    (api.fetchWatchlist as jest.Mock).mockResolvedValue(mockWatchlistEntries);
    (api.removeFromWatchlist as jest.Mock).mockRejectedValue(new Error('Remove failed'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useWatchlistMutations(), { wrapper });

    await act(async () => {
      result.current.remove.mutate({ userId: 'u1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.remove.isError).toBe(true));
  });

  it('moveBack mutation calls moveBackToWatchlist', async () => {
    (api.moveBackToWatchlist as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useWatchlistMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.moveBack.mutate({ userId: 'u1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.moveBack.isSuccess).toBe(true));
    expect(api.moveBackToWatchlist).toHaveBeenCalledWith('u1', 'm1');
  });

  it('add mutation shows alert on error', async () => {
    const { Alert } = require('react-native');
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (api.addToWatchlist as jest.Mock).mockRejectedValue(new Error('Add failed'));

    const { result } = renderHook(() => useWatchlistMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.add.mutate({ userId: 'u1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.add.isError).toBe(true));
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('markWatched mutation shows alert on error', async () => {
    const { Alert } = require('react-native');
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (api.markAsWatched as jest.Mock).mockRejectedValue(new Error('Mark failed'));

    const { result } = renderHook(() => useWatchlistMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.markWatched.mutate({ userId: 'u1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.markWatched.isError).toBe(true));
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('moveBack mutation shows alert on error', async () => {
    const { Alert } = require('react-native');
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (api.moveBackToWatchlist as jest.Mock).mockRejectedValue(new Error('MoveBack failed'));

    const { result } = renderHook(() => useWatchlistMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.moveBack.mutate({ userId: 'u1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.moveBack.isError).toBe(true));
    expect(Alert.alert).toHaveBeenCalled();
  });

  it('remove mutation rolls back paginated cache on error', async () => {
    (api.removeFromWatchlist as jest.Mock).mockRejectedValue(new Error('Remove failed'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useWatchlistMutations(), { wrapper });

    await act(async () => {
      result.current.remove.mutate({ userId: 'u1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.remove.isError).toBe(true));
  });

  it('add mutation rolls back optimistic update on error when context.prev is defined', async () => {
    (api.addToWatchlist as jest.Mock).mockRejectedValue(new Error('Add failed'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useWatchlistMutations(), { wrapper });

    await act(async () => {
      result.current.add.mutate({ userId: 'u1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.add.isError).toBe(true));
  });

  it('add mutation restores optimistic check cache from context.prev on error', async () => {
    const { Alert } = require('react-native');
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (api.addToWatchlist as jest.Mock).mockRejectedValue(new Error('Add failed'));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    // Pre-seed the check cache so context.prev is defined
    const existingEntry = { id: 'prev-w1', movie_id: 'm1', status: 'watchlist' };
    queryClient.setQueryData(['watchlist', 'check', 'u1', 'm1'], existingEntry);

    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    }

    const { result } = renderHook(() => useWatchlistMutations(), { wrapper: Wrapper });

    await act(async () => {
      result.current.add.mutate({ userId: 'u1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.add.isError).toBe(true));
    // context.prev should be restored
    const restored = queryClient.getQueryData(['watchlist', 'check', 'u1', 'm1']);
    expect(restored).toEqual(existingEntry);
  });

  it('remove mutation rolls back watchlist and paginated cache on error when data is pre-seeded', async () => {
    const { Alert } = require('react-native');
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (api.removeFromWatchlist as jest.Mock).mockRejectedValue(new Error('Remove failed'));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    // Pre-seed watchlist cache so rollback has data to restore
    queryClient.setQueryData(['watchlist', 'u1'], mockWatchlistEntries);
    queryClient.setQueryData(['watchlist-paginated', 'u1'], {
      pages: [mockWatchlistEntries],
      pageParams: [0],
    });
    const checkEntry = { id: 'w1', movie_id: 'm1', status: 'watchlist' };
    queryClient.setQueryData(['watchlist', 'check', 'u1', 'm1'], checkEntry);

    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    }

    const { result } = renderHook(() => useWatchlistMutations(), { wrapper: Wrapper });

    await act(async () => {
      result.current.remove.mutate({ userId: 'u1', movieId: 'm1' });
    });

    await waitFor(() => expect(result.current.remove.isError).toBe(true));
    expect(Alert.alert).toHaveBeenCalled();
    // Cache should be restored
    const restoredData = queryClient.getQueryData<typeof mockWatchlistEntries>(['watchlist', 'u1']);
    expect(restoredData).toEqual(mockWatchlistEntries);
    // Check cache should be restored from prevCheck
    const restoredCheck = queryClient.getQueryData(['watchlist', 'check', 'u1', 'm1']);
    expect(restoredCheck).toEqual(checkEntry);
  });
});

describe('useWatchlistSet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns set of movie IDs with watchlist status', async () => {
    (api.fetchWatchlist as jest.Mock).mockResolvedValue(mockWatchlistEntries);

    const { result } = renderHook(() => useWatchlistSet(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.watchlistSet.has('m1')).toBe(true);
    expect(result.current.watchlistSet.has('m2')).toBe(true);
  });

  it('excludes entries with watched status', async () => {
    (api.fetchWatchlist as jest.Mock).mockResolvedValue(mockWatchlistEntries);

    const { result } = renderHook(() => useWatchlistSet(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.watchlistSet.has('m3')).toBe(false);
  });

  it('returns empty set when no data', () => {
    (api.fetchWatchlist as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useWatchlistSet(), { wrapper: createWrapper() });

    expect(result.current.watchlistSet.size).toBe(0);
  });
});
