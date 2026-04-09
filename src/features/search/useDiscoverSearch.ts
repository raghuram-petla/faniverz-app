import { useMemo } from 'react';
import { useSearchMoviesPaginated, useUniversalSearch } from './searchHooks';
import { useMoviesByProductionHouseIds } from '@/features/productionHouses/hooks';
import type { Movie } from '@/types';

export function useDiscoverSearch(searchQuery: string) {
  const isSearching = searchQuery.length >= 2;
  const srch = useSearchMoviesPaginated(searchQuery);
  const { data: universalResults } = useUniversalSearch(searchQuery);

  const entitiesFirst =
    (universalResults?.topEntityScore ?? 0) > (universalResults?.topMovieScore ?? 0);

  const searchPHIds = useMemo(
    () => (universalResults?.productionHouses ?? []).map((ph) => ph.id),
    [universalResults?.productionHouses],
  );
  const { data: phSearchMovies = [] } = useMoviesByProductionHouseIds(searchPHIds);

  const searchMovies = useMemo(() => {
    const movies: Movie[] = srch.allItems ?? [];
    if (phSearchMovies.length === 0) return movies;
    const seen = new Set(movies.map((m) => m.id));
    return [...movies, ...phSearchMovies.filter((m) => !seen.has(m.id))];
  }, [srch.allItems, phSearchMovies]);

  return {
    isSearching,
    searchMovies,
    universalResults,
    entitiesFirst,
    srch,
  };
}
