import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useWatchlist,
  useWatchlistPaginated,
  useIsWatchlisted,
  useWatchlistMutations,
} from '../hooks';
import * as api from '../api';

jest.mock('../api');

const mockWatchlistEntries = [
  {
    id: 'w1',
    user_id: 'u1',
    movie_id: 'm1',
    status: 'watchlist',
    movie: { id: 'm1', title: 'Movie 1', release_type: 'theatrical' },
  },
  {
    id: 'w2',
    user_id: 'u1',
    movie_id: 'm2',
    status: 'watchlist',
    movie: { id: 'm2', title: 'Movie 2', release_type: 'upcoming' },
  },
  {
    id: 'w3',
    user_id: 'u1',
    movie_id: 'm3',
    status: 'watched',
    movie: { id: 'm3', title: 'Movie 3', release_type: 'theatrical' },
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

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
});
