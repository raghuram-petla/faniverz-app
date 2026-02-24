import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWatchlist,
  fetchWatchlistPaginated,
  addToWatchlist,
  removeFromWatchlist,
  markAsWatched,
  moveBackToWatchlist,
  isMovieWatchlisted,
} from './api';
import { WatchlistEntry } from '@/types';

const PAGE_SIZE = 10;

export function useWatchlist(userId: string) {
  const query = useQuery({
    queryKey: ['watchlist', userId],
    queryFn: () => fetchWatchlist(userId),
    enabled: !!userId,
    staleTime: 0,
  });

  const entries = query.data ?? [];
  const available = entries.filter(
    (e) =>
      e.status === 'watchlist' &&
      e.movie &&
      (e.movie.release_type === 'theatrical' || e.movie.release_type === 'ott'),
  );
  const upcoming = entries.filter(
    (e) => e.status === 'watchlist' && e.movie && e.movie.release_type === 'upcoming',
  );
  const watched = entries.filter((e) => e.status === 'watched');

  return { ...query, available, upcoming, watched };
}

export function useWatchlistPaginated(userId: string) {
  const query = useInfiniteQuery({
    queryKey: ['watchlist-paginated', userId],
    queryFn: ({ pageParam }) => fetchWatchlistPaginated(userId, pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < PAGE_SIZE ? undefined : lastPageParam + 1,
    enabled: !!userId,
    staleTime: 0,
  });

  const entries = query.data?.pages.flat() ?? [];
  const available = entries.filter(
    (e) =>
      e.status === 'watchlist' &&
      e.movie &&
      (e.movie.release_type === 'theatrical' || e.movie.release_type === 'ott'),
  );
  const upcoming = entries.filter(
    (e) => e.status === 'watchlist' && e.movie && e.movie.release_type === 'upcoming',
  );
  const watched = entries.filter((e) => e.status === 'watched');

  return { ...query, available, upcoming, watched };
}

export function useIsWatchlisted(userId: string, movieId: string) {
  return useQuery({
    queryKey: ['watchlist', 'check', userId, movieId],
    queryFn: () => isMovieWatchlisted(userId, movieId),
    enabled: !!userId && !!movieId,
    staleTime: 0,
  });
}

export function useWatchlistMutations() {
  const queryClient = useQueryClient();

  const invalidateAll = (userId: string) => {
    queryClient.invalidateQueries({ queryKey: ['watchlist', userId] });
    queryClient.invalidateQueries({ queryKey: ['watchlist-paginated', userId] });
    queryClient.invalidateQueries({ queryKey: ['watchlist', 'check'] });
  };

  const add = useMutation({
    mutationFn: ({ userId, movieId }: { userId: string; movieId: string }) =>
      addToWatchlist(userId, movieId),
    onSuccess: (_data, { userId }) => {
      invalidateAll(userId);
    },
  });

  const remove = useMutation({
    mutationFn: ({ userId, movieId }: { userId: string; movieId: string }) =>
      removeFromWatchlist(userId, movieId),
    onMutate: async ({ userId, movieId }) => {
      await queryClient.cancelQueries({ queryKey: ['watchlist', userId] });
      await queryClient.cancelQueries({ queryKey: ['watchlist-paginated', userId] });
      const prev = queryClient.getQueryData<WatchlistEntry[]>(['watchlist', userId]);
      queryClient.setQueryData<WatchlistEntry[]>(['watchlist', userId], (old) =>
        old?.filter((e) => e.movie_id !== movieId),
      );
      // Also optimistically update the paginated query
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryClient.setQueryData<any>(['watchlist-paginated', userId], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: WatchlistEntry[]) =>
            page.filter((e) => e.movie_id !== movieId),
          ),
        };
      });
      return { prev };
    },
    onError: (_err, { userId }, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['watchlist', userId], context.prev);
      }
    },
    onSettled: (_data, _err, { userId }) => {
      invalidateAll(userId);
    },
  });

  const markWatched = useMutation({
    mutationFn: ({ userId, movieId }: { userId: string; movieId: string }) =>
      markAsWatched(userId, movieId),
    onSuccess: (_data, { userId }) => {
      invalidateAll(userId);
    },
  });

  const moveBack = useMutation({
    mutationFn: ({ userId, movieId }: { userId: string; movieId: string }) =>
      moveBackToWatchlist(userId, movieId),
    onSuccess: (_data, { userId }) => {
      invalidateAll(userId);
    },
  });

  return { add, remove, markWatched, moveBack };
}
