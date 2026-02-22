import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { QUERY_KEYS, STALE_TIMES } from '@/lib/constants';
import { searchMovies } from '../api/movies';

function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export function useMovieSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300);

  const result = useQuery({
    queryKey: [QUERY_KEYS.MOVIES, 'search', debouncedQuery],
    queryFn: () => searchMovies(debouncedQuery),
    staleTime: STALE_TIMES.MOVIES,
    enabled: debouncedQuery.trim().length > 0,
  });

  return {
    ...result,
    debouncedQuery,
  };
}
