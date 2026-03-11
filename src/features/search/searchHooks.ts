import { useQuery } from '@tanstack/react-query';
import { searchAll, UniversalSearchResult } from './searchApi';

export function useUniversalSearch(query: string) {
  return useQuery<UniversalSearchResult>({
    queryKey: ['universal-search', query],
    queryFn: () => searchAll(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}
