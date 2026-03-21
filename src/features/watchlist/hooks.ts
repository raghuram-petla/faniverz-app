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

// @contract: API response extends WatchlistEntry with _platformCount for streaming classification
type WatchlistEntryWithPlatformCount = WatchlistEntry & { _platformCount?: number };

// @contract: shared filter logic for watchlist entries — uses _platformCount from API response
// to correctly classify streaming movies via deriveMovieStatus.
function categorizeEntries(entries: WatchlistEntryWithPlatformCount[]) {
  const available = entries.filter((e) => {
    if (e.status !== 'watchlist' || !e.movie) return false;
    const movieStatus = deriveMovieStatus(e.movie, e._platformCount ?? 0);
    return movieStatus === 'in_theaters' || movieStatus === 'streaming';
  });
  const upcoming = entries.filter((e) => {
    if (e.status !== 'watchlist' || !e.movie) return false;
    const movieStatus = deriveMovieStatus(e.movie, e._platformCount ?? 0);
    return movieStatus === 'upcoming';
  });
  const watched = entries.filter((e) => e.status === 'watched');
  return { available, upcoming, watched };
}

// @invariant: query key ['watchlist', userId] is shared with useWatchlistSet below.
export function useWatchlist(userId: string) {
  const query = useQuery({
    queryKey: ['watchlist', userId],
    queryFn: () => fetchWatchlist(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const entries = query.data ?? [];
  const { available, upcoming, watched } = categorizeEntries(entries);

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
    staleTime: 2 * 60 * 1000,
  });

  const entries = query.data?.pages.flat() ?? [];
  const { available, upcoming, watched } = categorizeEntries(entries);

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

// @contract: invalidateAll covers 3 cache keys: ['watchlist', userId],
// ['watchlist-paginated', userId], and ['watchlist', 'check', userId].
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
    // @sideeffect: optimistic update — immediately marks movie as watchlisted in the check cache
    onMutate: async ({ userId, movieId }) => {
      await queryClient.cancelQueries({ queryKey: ['watchlist', 'check', userId, movieId] });
      const prev = queryClient.getQueryData<WatchlistEntry | null>([
        'watchlist',
        'check',
        userId,
        movieId,
      ]);
      queryClient.setQueryData<WatchlistEntry | null>(['watchlist', 'check', userId, movieId], {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        user_id: userId,
        movie_id: movieId,
        status: 'watchlist',
        added_at: new Date().toISOString(),
        watched_at: null,
      } as WatchlistEntry);
      return { prev };
    },
    onError: (_err, { userId, movieId }, context) => {
      if (context?.prev !== undefined) {
        queryClient.setQueryData(['watchlist', 'check', userId, movieId], context.prev);
      }
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToAddWatchlist'));
    },
    onSettled: (_data, _err, { userId }) => {
      invalidateAll(userId);
    },
  });

  const remove = useMutation({
    mutationFn: ({ userId, movieId }: { userId: string; movieId: string }) =>
      removeFromWatchlist(userId, movieId),
    onMutate: async ({ userId, movieId }) => {
      await queryClient.cancelQueries({ queryKey: ['watchlist', userId] });
      await queryClient.cancelQueries({ queryKey: ['watchlist-paginated', userId] });
      await queryClient.cancelQueries({ queryKey: ['watchlist', 'check', userId, movieId] });
      const prev = queryClient.getQueryData<WatchlistEntry[]>(['watchlist', userId]);
      const prevPaginated = queryClient.getQueryData<InfiniteData<WatchlistEntry[], number>>([
        'watchlist-paginated',
        userId,
      ]);
      const prevCheck = queryClient.getQueryData<WatchlistEntry | null>([
        'watchlist',
        'check',
        userId,
        movieId,
      ]);
      queryClient.setQueryData<WatchlistEntry[]>(['watchlist', userId], (old) =>
        old?.filter((e) => e.movie_id !== movieId),
      );
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
      // @sideeffect: optimistic update — immediately marks movie as not watchlisted
      queryClient.setQueryData(['watchlist', 'check', userId, movieId], null);
      return { prev, prevPaginated, prevCheck };
    },
    // @edge: rollback all three caches on failure so movie reappears in watchlist immediately
    onError: (_err, { userId, movieId }, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['watchlist', userId], context.prev);
      }
      if (context?.prevPaginated) {
        queryClient.setQueryData(['watchlist-paginated', userId], context.prevPaginated);
      }
      if (context?.prevCheck !== undefined) {
        queryClient.setQueryData(['watchlist', 'check', userId, movieId], context.prevCheck);
      }
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToRemoveWatchlist'));
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

// @coupling: used by useMovieAction and HeroCarousel to check if a movie is watchlisted.
// @invariant: shares query key ['watchlist', userId] with useWatchlist — they read from the same cache.
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
