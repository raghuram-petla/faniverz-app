import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { fetchUserFollows, fetchEnrichedFollows, followEntity, unfollowEntity } from './followApi';
import type { EntityFollow, EnrichedFollow, FeedEntityType } from '@shared/types';

export function useEntityFollows() {
  const { user } = useAuth();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ['entity-follows', userId],
    queryFn: () => fetchUserFollows(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
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

export function useFollowEntity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ entityType, entityId }: { entityType: FeedEntityType; entityId: string }) => {
      if (!user?.id) throw new Error('Must be logged in to follow');
      return followEntity(user.id, entityType, entityId);
    },
    onMutate: async ({ entityType, entityId }) => {
      await queryClient.cancelQueries({ queryKey: ['entity-follows'] });
      const previousFollows = queryClient.getQueryData<EntityFollow[]>([
        'entity-follows',
        user?.id,
      ]);
      queryClient.setQueryData<EntityFollow[]>(['entity-follows', user?.id], (old) => [
        ...(old ?? []),
        {
          id: `temp-${Date.now()}`,
          user_id: user!.id,
          entity_type: entityType,
          entity_id: entityId,
          created_at: new Date().toISOString(),
        },
      ]);
      return { previousFollows };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFollows) {
        queryClient.setQueryData(['entity-follows', user?.id], context.previousFollows);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-follows'] });
    },
  });
}

export function useEnrichedFollows() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery<EnrichedFollow[]>({
    queryKey: ['enriched-follows', userId],
    queryFn: () => fetchEnrichedFollows(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUnfollowEntity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ entityType, entityId }: { entityType: FeedEntityType; entityId: string }) => {
      if (!user?.id) throw new Error('Must be logged in to unfollow');
      return unfollowEntity(user.id, entityType, entityId);
    },
    onMutate: async ({ entityType, entityId }) => {
      await queryClient.cancelQueries({ queryKey: ['entity-follows'] });
      const previousFollows = queryClient.getQueryData<EntityFollow[]>([
        'entity-follows',
        user?.id,
      ]);
      queryClient.setQueryData<EntityFollow[]>(['entity-follows', user?.id], (old) =>
        (old ?? []).filter((f) => !(f.entity_type === entityType && f.entity_id === entityId)),
      );
      return { previousFollows };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFollows) {
        queryClient.setQueryData(['entity-follows', user?.id], context.previousFollows);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-follows'] });
    },
  });
}
