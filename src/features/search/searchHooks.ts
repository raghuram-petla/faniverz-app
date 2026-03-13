import { useQuery } from '@tanstack/react-query';
import { searchAll, UniversalSearchResult } from './searchApi';

// @coupling: searchAll in searchApi.ts runs 3 parallel Supabase queries (movies, actors, production houses). If any single query fails, the entire promise rejects — partial results are lost.
export function useUniversalSearch(query: string) {
  return useQuery<UniversalSearchResult>({
    queryKey: ['universal-search', query],
    queryFn: () => searchAll(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}
