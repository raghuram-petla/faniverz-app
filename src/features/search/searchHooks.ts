import { useQuery } from '@tanstack/react-query';
import { searchAll, UniversalSearchResult } from './searchApi';

// @coupling: searchAll in searchApi.ts runs 3 parallel Supabase queries (movies, actors, production houses) via Promise.allSettled — partial results are preserved if any single query fails.
export function useUniversalSearch(query: string) {
  return useQuery<UniversalSearchResult>({
    queryKey: ['universal-search', query],
    queryFn: () => searchAll(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}
