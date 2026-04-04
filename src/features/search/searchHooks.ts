import { useQuery } from '@tanstack/react-query';
import { STALE_5M } from '@/constants/queryConfig';
import { SEARCH_PAGINATION } from '@/constants/paginationConfig';
import { useSmartInfiniteQuery } from '@/hooks/useSmartInfiniteQuery';
import { useDebounce } from '@/hooks/useDebounce';
import {
  searchAll,
  searchMoviesPaginated,
  searchActorsPaginated,
  searchProductionHousesPaginated,
  type UniversalSearchResult,
} from './searchApi';
import type { Movie, Actor, ProductionHouse } from '@shared/types';

// @coupling: searchAll in searchApi.ts runs 3 parallel Supabase queries (movies, actors, production houses) via Promise.allSettled — partial results are preserved if any single query fails.
// @sync: 300ms debounce (via useDebounce) matches useMovieSearch — prevents 3 parallel Supabase queries on every keystroke. Without debounce, each character typed creates a new cache key and immediately fires all 3 queries.
export function useUniversalSearch(query: string) {
  // @sideeffect: debounces query state so the TanStack Query key only changes after 300ms of inactivity
  const debouncedQuery = useDebounce(query, 300);

  return useQuery<UniversalSearchResult>({
    queryKey: ['universal-search', debouncedQuery],
    queryFn: () => searchAll(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: STALE_5M,
  });
}

// --- Paginated search hooks for individual entity types ---

/** @contract Debounces query then uses smart infinite query for paginated movie search */
export function useSearchMoviesPaginated(query: string) {
  const debouncedQuery = useDebounce(query, 300);

  return useSmartInfiniteQuery<Movie>({
    queryKey: ['search-movies', debouncedQuery],
    queryFn: (offset, limit) => searchMoviesPaginated(debouncedQuery, offset, limit),
    config: SEARCH_PAGINATION,
    staleTime: STALE_5M,
    enabled: debouncedQuery.length >= 2,
  });
}

/** @contract Debounces query then uses smart infinite query for paginated actor search */
export function useSearchActorsPaginated(query: string) {
  const debouncedQuery = useDebounce(query, 300);

  return useSmartInfiniteQuery<Actor>({
    queryKey: ['search-actors', debouncedQuery],
    queryFn: (offset, limit) => searchActorsPaginated(debouncedQuery, offset, limit),
    config: SEARCH_PAGINATION,
    staleTime: STALE_5M,
    enabled: debouncedQuery.length >= 2,
  });
}

/** @contract Debounces query then uses smart infinite query for paginated production house search */
export function useSearchProductionHousesPaginated(query: string) {
  const debouncedQuery = useDebounce(query, 300);

  return useSmartInfiniteQuery<ProductionHouse>({
    queryKey: ['search-production-houses', debouncedQuery],
    queryFn: (offset, limit) => searchProductionHousesPaginated(debouncedQuery, offset, limit),
    config: SEARCH_PAGINATION,
    staleTime: STALE_5M,
    enabled: debouncedQuery.length >= 2,
  });
}
