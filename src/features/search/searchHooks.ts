import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchAll, UniversalSearchResult } from './searchApi';

// @sync: 300ms debounce matches useMovieSearch — prevents 3 parallel Supabase queries on every keystroke.
// Without debounce, each character typed creates a new cache key and immediately fires all 3 queries.
// @coupling: searchAll in searchApi.ts runs 3 parallel Supabase queries (movies, actors, production houses) via Promise.allSettled — partial results are preserved if any single query fails.
export function useUniversalSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // @sideeffect: debounces query state so the TanStack Query key only changes after 300ms of inactivity
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery<UniversalSearchResult>({
    queryKey: ['universal-search', debouncedQuery],
    queryFn: () => searchAll(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}
