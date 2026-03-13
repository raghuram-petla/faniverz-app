import { useMemo } from 'react';
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  InfiniteData,
} from '@tanstack/react-query';
import {
  fetchWatchlist,
  fetchWatchlistPaginated,
  addToWatchlist,
  removeFromWatchlist,
  markAsWatched,
  moveBackToWatchlist,
  isMovieWatchlisted,
} from './api';
import { Alert } from 'react-native';
import i18n from '@/i18n';
import { WatchlistEntry } from '@/types';
import { deriveMovieStatus } from '@shared/movieStatus';
import { useAuth } from '@/features/auth/providers/AuthProvider';

const PAGE_SIZE = 10;

// @coupling: deriveMovieStatus is called with platformCount=0 for EVERY entry. This means movies that are actually streaming (have platform entries) are classified as 'released' not 'streaming' by this hook. The watchlist API (fetchWatchlist) joins movies(*) but does NOT fetch platform data, so the hook has no way to know platform count. 'available' filter catches in_theaters correctly but misses streaming movies unless in_theaters is also true.
// @invariant: query key ['watchlist', userId] is shared with useWatchlistSet below. Both hooks call fetchWatchlist with the same userId. If either hook's queryFn changes (e.g., adding a filter), both will return different data for the same cache key, causing cache corruption. They MUST use the same queryFn.
export function useWatchlist(userId: string) {
  const query = useQuery({
    queryKey: ['watchlist', userId],
    queryFn: () => fetchWatchlist(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const entries = query.data ?? [];
  const available = entries.filter((e) => {
    if (e.status !== 'watchlist' || !e.movie) return false;
    const movieStatus = deriveMovieStatus(e.movie, 0);
    return movieStatus === 'in_theaters' || movieStatus === 'streaming';
  });
  const upcoming = entries.filter((e) => {
    if (e.status !== 'watchlist' || !e.movie) return false;
    const movieStatus = deriveMovieStatus(e.movie, 0);
    return movieStatus === 'upcoming';
  });
  const watched = entries.filter((e) => e.status === 'watched');

  return { ...query, available, upcoming, watched };
}

// @sync: duplicates the available/upcoming/watched filter logic from useWatchlist above. If the deriveMovieStatus call is ever changed (e.g., passing actual platform count), it must be updated in BOTH hooks. No shared utility for this derivation exists.
export function useWatchlistPaginated(userId: string) {
  const query = useInfiniteQuery({
    queryKey: ['watchlist-paginated', userId],
    queryFn: ({ pageParam }) => fetchWatchlistPaginated(userId, pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < PAGE_SIZE ? undefined : lastPageParam + 1,
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const entries = query.data?.pages.flat() ?? [];
  const available = entries.filter((e) => {
    if (e.status !== 'watchlist' || !e.movie) return false;
    const movieStatus = deriveMovieStatus(e.movie, 0);
    return movieStatus === 'in_theaters' || movieStatus === 'streaming';
  });
  const upcoming = entries.filter((e) => {
    if (e.status !== 'watchlist' || !e.movie) return false;
    const movieStatus = deriveMovieStatus(e.movie, 0);
    return movieStatus === 'upcoming';
  });
  const watched = entries.filter((e) => e.status === 'watched');

  return { ...query, available, upcoming, watched };
}

export function useIsWatchlisted(userId: string, movieId: string) {
  return useQuery({
    queryKey: ['watchlist', 'check', userId, movieId],
    queryFn: () => isMovieWatchlisted(userId, movieId),
    enabled: !!userId && !!movieId,
    staleTime: 2 * 60 * 1000,
  });
}

// @contract: invalidateAll covers 3 cache keys: ['watchlist', userId], ['watchlist-paginated', userId], and ['watchlist', 'check', userId]. If a new watchlist query is added with a different key pattern, it must be added to invalidateAll or it will show stale data after mutations.
// @edge: add mutation does NOT have optimistic update — UI won't reflect the add until server response + invalidation. The remove mutation DOES have optimistic update. This asymmetry means "add to watchlist" feels slower than "remove from watchlist" to the user.
export function useWatchlistMutations() {
  const queryClient = useQueryClient();

  const invalidateAll = (userId: string) => {
    queryClient.invalidateQueries({ queryKey: ['watchlist', userId] });
    queryClient.invalidateQueries({ queryKey: ['watchlist-paginated', userId] });
    queryClient.invalidateQueries({ queryKey: ['watchlist', 'check', userId] });
  };

  const add = useMutation({
    mutationFn: ({ userId, movieId }: { userId: string; movieId: string }) =>
      addToWatchlist(userId, movieId),
    onSuccess: (_data, { userId }) => {
      invalidateAll(userId);
    },
    onError: () => {
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToAddWatchlist'));
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
      queryClient.setQueryData<InfiniteData<WatchlistEntry[], number>>(
        ['watchlist-paginated', userId],
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => page.filter((e) => e.movie_id !== movieId)),
          };
        },
      );
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
    onError: () => {
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToMarkWatched'));
    },
  });

  const moveBack = useMutation({
    mutationFn: ({ userId, movieId }: { userId: string; movieId: string }) =>
      moveBackToWatchlist(userId, movieId),
    onSuccess: (_data, { userId }) => {
      invalidateAll(userId);
    },
    onError: () => {
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToMoveWatchlist'));
    },
  });

  return { add, remove, markWatched, moveBack };
}

// @coupling: used by useMovieAction (hooks/useMovieAction.ts) and HeroCarousel to check if a movie is watchlisted. The set only contains movie_ids with status='watchlist' — watched movies are excluded. So a movie marked as watched won't show as "watchlisted" in the UI, which is correct behavior but worth noting if someone expects "any watchlist entry" to be in the set.
// @invariant: shares query key ['watchlist', userId] with useWatchlist — they read from the same cache. When useWatchlistMutations invalidates, BOTH hooks re-render. If this hook is used on a screen without useWatchlist, the cache is populated by whichever hook renders first.
export function useWatchlistSet() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const query = useQuery({
    queryKey: ['watchlist', userId],
    queryFn: () => fetchWatchlist(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const watchlistSet = useMemo(() => {
    const set = new Set<string>();
    if (query.data) {
      for (const e of query.data) {
        if (e.status === 'watchlist') set.add(e.movie_id);
      }
    }
    return set;
  }, [query.data]);

  return { ...query, watchlistSet };
}
