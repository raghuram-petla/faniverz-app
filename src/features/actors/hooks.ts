import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFavoriteActors,
  addFavoriteActor,
  removeFavoriteActor,
  searchActors,
  fetchActorById,
  fetchActorFilmography,
} from './api';

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

  return {
    actor: actorQuery.data ?? null,
    filmography: filmographyQuery.data ?? [],
    isLoading: actorQuery.isLoading || filmographyQuery.isLoading,
  };
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
