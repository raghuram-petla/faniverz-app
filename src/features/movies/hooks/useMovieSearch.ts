import { useQuery } from '@tanstack/react-query';
import { STALE_5M } from '@/constants/queryConfig';
import { useDebounce } from '@/hooks/useDebounce';
import { searchMovies } from '../api';

// @sync: 300ms debounce means the displayed results can be stale if user types fast then immediately acts on shown results. No loading indicator during debounce gap.
// @coupling: searchMovies in ../api.ts uses .ilike() with unsanitized query — the boundary trust issue lives there, not here.
// @contract delegates debounce logic to useDebounce hook — inline useState/useEffect pattern removed
export function useMovieSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery({
    queryKey: ['movies', 'search', debouncedQuery],
    queryFn: () => searchMovies(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: STALE_5M,
  });
}
