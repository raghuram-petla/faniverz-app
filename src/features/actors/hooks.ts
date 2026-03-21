import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import i18n from '@/i18n';
import {
  fetchFavoriteActors,
  addFavoriteActor,
  removeFavoriteActor,
  searchActors,
  fetchActorById,
  fetchActorFilmography,
} from './api';

// @invariant: query key ['actors', 'favorites', userId] must match the invalidation key in useFavoriteActorMutations which invalidates ['actors', 'favorites'] (prefix match without userId). This works because TanStack Query's prefix matching catches all userId variants. But if someone changes the invalidation to ['actors', 'favorites', specificUserId], other users' caches won't refresh.
// @coupling: fetchFavoriteActors returns FavoriteActor[] with nested .actor relation (actors(*)). The FavoriteActor type in src/types/user.ts declares actor as optional Actor. If the actors table schema changes (e.g., new required column), the (*) select picks it up automatically, but the Actor type in shared/types.ts must also be updated or TS won't see the new field.
export function useFavoriteActors(userId: string) {
  return useQuery({
    queryKey: ['actors', 'favorites', userId],
    queryFn: () => fetchFavoriteActors(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSearchActors(query: string) {
  return useQuery({
    queryKey: ['actors', 'search', query],
    queryFn: () => searchActors(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

// @coupling: two parallel queries with independent loading states — isLoading is true until BOTH resolve. If actorQuery succeeds but filmographyQuery fails (e.g., movie_cast table has permission issues), the hook returns actor data with empty filmography array and isLoading=false. No error state is exposed — callers can't distinguish "no filmography" from "filmography fetch failed".
// @edge: refetch() calls both refetches in parallel via Promise.all. If one fails, the other's result is still applied. But the Promise.all rejects on first failure — the caller's error handling only sees the first error, not both.
export function useActorDetail(id: string) {
  const actorQuery = useQuery({
    queryKey: ['actor', id],
    queryFn: () => fetchActorById(id),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });

  const filmographyQuery = useQuery({
    queryKey: ['actor', id, 'filmography'],
    queryFn: () => fetchActorFilmography(id),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });

  const refetch = async () => {
    await Promise.allSettled([actorQuery.refetch(), filmographyQuery.refetch()]);
  };

  return {
    actor: actorQuery.data ?? null,
    filmography: filmographyQuery.data ?? [],
    isLoading: actorQuery.isLoading || filmographyQuery.isLoading,
    refetch,
  };
}

// @edge: no optimistic update — UI won't reflect the add/remove until the server roundtrip completes and cache invalidates. Rapid add/remove can cause the favorite button to feel unresponsive for ~1-2s.
// @sideeffect: Alert.alert blocks the UI thread on error — if the user taps the favorite button while offline, they'll see an alert for each failed attempt. No debouncing or deduplication of error alerts.
// @coupling: favorite_actors uses a direct insert (not upsert) — if a user rapidly taps "favorite" twice before the first request completes, the second insert will fail with a unique constraint violation (assuming user_id + actor_id is unique). The error alert will show but the favorite is already added from the first request.
export function useFavoriteActorMutations() {
  const queryClient = useQueryClient();

  const add = useMutation({
    mutationFn: ({ userId, actorId }: { userId: string; actorId: string }) =>
      addFavoriteActor(userId, actorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actors', 'favorites'] });
    },
    onError: () => {
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToAddFavorite'));
    },
  });

  const remove = useMutation({
    mutationFn: ({ userId, actorId }: { userId: string; actorId: string }) =>
      removeFavoriteActor(userId, actorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actors', 'favorites'] });
    },
    onError: () => {
      Alert.alert(i18n.t('common.error'), i18n.t('common.failedToRemoveFavorite'));
    },
  });

  return { add, remove };
}
