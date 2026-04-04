import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import i18n from '@/i18n';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { STALE_5M } from '@/constants/queryConfig';
import { FOLLOWING_PAGINATION } from '@/constants/paginationConfig';
import { useSmartInfiniteQuery } from '@/hooks/useSmartInfiniteQuery';
import {
  fetchUserFollows,
  fetchEnrichedFollows,
  fetchEnrichedFollowsPaginated,
  followEntity,
  unfollowEntity,
} from './followApi';
import { createOptimisticMutation } from './optimisticMutationFactory';
import type { EntityFollow, EnrichedFollow, FeedEntityType } from '@shared/types';

// @coupling: followSet builds keys as `${entity_type}:${entity_id}` — any consumer checking isFollowed must use this exact format. If entity_type enum in shared/types.ts adds a new value (e.g., 'director'), the set will contain it but consumers won't know to check for it.
// @edge: RLS on entity_follows limits SELECT to auth.uid() = user_id — if the Supabase auth token is stale/expired, this returns empty data (not an error), making it look like the user follows nothing. The hook has no way to distinguish "no follows" from "auth expired".
export function useEntityFollows() {
  const { user } = useAuth();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ['entity-follows', userId],
    queryFn: () => fetchUserFollows(userId ?? /* istanbul ignore next */ ''),
    enabled: !!userId,
    staleTime: STALE_5M,
  });

  const followSet = useMemo(() => {
    const set = new Set<string>();
    if (query.data) {
      for (const f of query.data) {
        set.add(`${f.entity_type}:${f.entity_id}`);
      }
    }
    return set;
  }, [query.data]);

  return { ...query, followSet };
}

// @contract: entity_follows table has UNIQUE(user_id, entity_type, entity_id) — duplicate follow attempts throw a Supabase 23505 (unique_violation) error. The onError handler rolls back the optimistic add and shows an Alert.
// @edge: optimistic update adds a temp EntityFollow with id='temp-{timestamp}'. If the user rapidly follows/unfollows before onSettled fires, there's a race window where invalidation from follow's onSettled may overwrite the unfollow's optimistic state.
// @coupling: onSettled invalidates both ['entity-follows'] and ['enriched-follows'] to keep both caches in sync.
// @coupling: uses createOptimisticMutation with ['entity-follows'] as the primary key; the factory's
// primaryUpdater appends a temporary EntityFollow record to the flat array (not paginated pages).
export function useFollowEntity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  type FollowVars = { entityType: FeedEntityType; entityId: string };

  const handlers = createOptimisticMutation<FollowVars, EntityFollow[]>(queryClient, {
    queryKeys: ['entity-follows'] as const,
    primaryUpdater: (old, { entityType, entityId }) => [
      ...(old ?? []),
      {
        id: `temp-${Date.now()}`,
        user_id: user?.id ?? '',
        entity_type: entityType,
        entity_id: entityId,
        created_at: new Date().toISOString(),
      },
    ],
    onError: () => Alert.alert(i18n.t('common.error'), i18n.t('common.failedToFollow')),
  });

  return useMutation({
    mutationFn: ({ entityType, entityId }: FollowVars) => {
      if (!user?.id) throw new Error('Must be logged in to follow');
      return followEntity(user.id, entityType, entityId);
    },
    ...handlers,
    // @sync: additionally invalidate enriched-follows on settled so the UI stays in sync
    onSettled: () => {
      handlers.onSettled!();
      queryClient.invalidateQueries({ queryKey: ['enriched-follows'] });
    },
  });
}

// @coupling: fetchEnrichedFollows does 4 parallel lookups (movies, actors, production_houses, profiles) to resolve names/images for all entity types including user follows.
// @invariant: query key ['enriched-follows', userId] is invalidated by useFollowEntity/useUnfollowEntity onSettled.
export function useEnrichedFollows() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery<EnrichedFollow[]>({
    queryKey: ['enriched-follows', userId],
    queryFn: () => fetchEnrichedFollows(userId ?? /* istanbul ignore next */ ''),
    enabled: !!userId,
    staleTime: STALE_5M,
  });
}

/** @contract Paginated version of useEnrichedFollows using smart infinite query */
// @coupling: invalidated by useFollowEntity/useUnfollowEntity via ['enriched-follows'] prefix, but this uses key ['enriched-follows-paginated'] which does NOT match that prefix. Follow/unfollow mutations won't refresh the paginated list — it only updates on staleTime expiry or manual refetch.
export function useEnrichedFollowsPaginated() {
  const { user } = useAuth();
  const userId = user?.id;

  return useSmartInfiniteQuery<EnrichedFollow & { id: string }>({
    queryKey: ['enriched-follows-paginated', userId],
    queryFn: (offset, limit) =>
      fetchEnrichedFollowsPaginated(userId ?? /* istanbul ignore next */ '', offset, limit),
    config: FOLLOWING_PAGINATION,
    staleTime: STALE_5M,
    enabled: !!userId,
  });
}

// @edge: delete uses triple filter (user_id + entity_type + entity_id). If entity_id is wrong (e.g., passed a movie title instead of UUID), the delete succeeds with 0 affected rows — no error, no feedback, follow stays. The optimistic update already removed it from cache, so the UI briefly shows unfollowed, then re-follows on invalidation.
// @coupling: uses createOptimisticMutation — see useFollowEntity for the pattern.
export function useUnfollowEntity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  type FollowVars = { entityType: FeedEntityType; entityId: string };

  const handlers = createOptimisticMutation<FollowVars, EntityFollow[]>(queryClient, {
    queryKeys: ['entity-follows'] as const,
    primaryUpdater: (old, { entityType, entityId }) =>
      (old ?? []).filter((f) => !(f.entity_type === entityType && f.entity_id === entityId)),
    onError: () => Alert.alert(i18n.t('common.error'), i18n.t('common.failedToUnfollow')),
  });

  return useMutation({
    mutationFn: ({ entityType, entityId }: FollowVars) => {
      if (!user?.id) throw new Error('Must be logged in to unfollow');
      return unfollowEntity(user.id, entityType, entityId);
    },
    ...handlers,
    // @sync: additionally invalidate enriched-follows on settled so the UI stays in sync
    onSettled: () => {
      handlers.onSettled!();
      queryClient.invalidateQueries({ queryKey: ['enriched-follows'] });
    },
  });
}
