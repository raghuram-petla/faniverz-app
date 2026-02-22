import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, STALE_TIMES } from '@/lib/constants';
import { fetchWatchlist, addToWatchlist, removeFromWatchlist, isInWatchlist } from './api';
import type { WatchlistEntry } from './api';

export function useWatchlist(userId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.WATCHLIST, userId],
    queryFn: () => fetchWatchlist(userId!),
    staleTime: STALE_TIMES.WATCHLIST,
    enabled: !!userId,
  });
}

export function useWatchlistStatus(userId: string | undefined, movieId: number) {
  return useQuery({
    queryKey: [QUERY_KEYS.WATCHLIST, userId, 'status', movieId],
    queryFn: () => isInWatchlist(userId!, movieId),
    staleTime: STALE_TIMES.WATCHLIST,
    enabled: !!userId && movieId > 0,
  });
}

export function useToggleWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      movieId,
      isCurrentlyWatchlisted,
    }: {
      userId: string;
      movieId: number;
      isCurrentlyWatchlisted: boolean;
    }) => {
      if (isCurrentlyWatchlisted) {
        await removeFromWatchlist(userId, movieId);
      } else {
        await addToWatchlist(userId, movieId);
      }
    },
    onMutate: async ({ userId, movieId, isCurrentlyWatchlisted }) => {
      const statusKey = [QUERY_KEYS.WATCHLIST, userId, 'status', movieId];
      const listKey = [QUERY_KEYS.WATCHLIST, userId];

      await queryClient.cancelQueries({ queryKey: statusKey });
      await queryClient.cancelQueries({ queryKey: listKey });

      const previousStatus = queryClient.getQueryData<boolean>(statusKey);
      const previousList = queryClient.getQueryData<WatchlistEntry[]>(listKey);

      queryClient.setQueryData<boolean>(statusKey, !isCurrentlyWatchlisted);

      if (isCurrentlyWatchlisted && previousList) {
        queryClient.setQueryData<WatchlistEntry[]>(
          listKey,
          previousList.filter((entry) => entry.movie_id !== movieId)
        );
      }

      return { previousStatus, previousList, statusKey, listKey };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(context.statusKey, context.previousStatus);
        queryClient.setQueryData(context.listKey, context.previousList);
      }
    },
    onSettled: (_data, _error, { userId, movieId }) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.WATCHLIST, userId, 'status', movieId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.WATCHLIST, userId],
      });
    },
  });
}
