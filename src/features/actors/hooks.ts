import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchFavoriteActors, addFavoriteActor, removeFavoriteActor, searchActors } from './api';

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

export function useFavoriteActorMutations() {
  const queryClient = useQueryClient();

  const add = useMutation({
    mutationFn: ({ userId, actorId }: { userId: string; actorId: string }) =>
      addFavoriteActor(userId, actorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actors', 'favorites'] });
    },
  });

  const remove = useMutation({
    mutationFn: ({ userId, actorId }: { userId: string; actorId: string }) =>
      removeFavoriteActor(userId, actorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actors', 'favorites'] });
    },
  });

  return { add, remove };
}
