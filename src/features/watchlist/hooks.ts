import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  markAsWatched,
  moveBackToWatchlist,
  isMovieWatchlisted,
} from './api';
import { WatchlistEntry } from '@/types';

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

  const add = useMutation({
    mutationFn: ({ userId, movieId }: { userId: string; movieId: string }) =>
      addToWatchlist(userId, movieId),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', userId] });
      queryClient.invalidateQueries({ queryKey: ['watchlist', 'check'] });
    },
  });

  const remove = useMutation({
    mutationFn: ({ userId, movieId }: { userId: string; movieId: string }) =>
      removeFromWatchlist(userId, movieId),
    onMutate: async ({ userId, movieId }) => {
      await queryClient.cancelQueries({ queryKey: ['watchlist', userId] });
      const prev = queryClient.getQueryData<WatchlistEntry[]>(['watchlist', userId]);
      queryClient.setQueryData<WatchlistEntry[]>(['watchlist', userId], (old) =>
        old?.filter((e) => e.movie_id !== movieId),
      );
      return { prev };
    },
    onError: (_err, { userId }, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['watchlist', userId], context.prev);
      }
    },
    onSettled: (_data, _err, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', userId] });
      queryClient.invalidateQueries({ queryKey: ['watchlist', 'check'] });
    },
  });

  const markWatched = useMutation({
    mutationFn: ({ userId, movieId }: { userId: string; movieId: string }) =>
      markAsWatched(userId, movieId),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', userId] });
    },
  });

  const moveBack = useMutation({
    mutationFn: ({ userId, movieId }: { userId: string; movieId: string }) =>
      moveBackToWatchlist(userId, movieId),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', userId] });
    },
  });

  return { add, remove, markWatched, moveBack };
}
