import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { searchMovies } from '../api';

// @sync: 300ms debounce means the displayed results can be stale if user types fast then immediately acts on shown results. No loading indicator during debounce gap.
// @coupling: searchMovies in ../api.ts uses .ilike() with unsanitized query — the boundary trust issue lives there, not here.
export function useMovieSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ['movies', 'search', debouncedQuery],
    queryFn: () => searchMovies(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}
