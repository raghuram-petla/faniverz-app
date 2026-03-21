'use client';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { createCrudHooks } from '@/hooks/createCrudHooks';
import type { Movie } from '@/lib/types';

const PAGE_SIZE = 50;

// @contract Resolved advanced filters passed to useAdminMovies (debounced values already resolved)
export interface AdvancedFilters {
  genres: string[];
  releaseYear: string;
  releaseMonth: string;
  certification: string;
  language: string;
  platformId: string;
  isFeatured: boolean;
  minRating: string;
  actorSearch: string;
  directorSearch: string;
}

// @contract Applies status filter conditions that don't use .in('id', ...)
// Returns idScope (IDs to include) and excludeIds separately to avoid double .in() on same column
function applyStatusFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  statusFilter: string,
  today: string,
  pmIds: string[],
): { query: unknown; empty: boolean; includeIds: string[] | null; excludeIds: string[] } {
  if (statusFilter === 'upcoming') {
    return {
      query: query.gt('release_date', today),
      empty: false,
      includeIds: null,
      excludeIds: [],
    };
  } else if (statusFilter === 'in_theaters') {
    return { query: query.eq('in_theaters', true), empty: false, includeIds: null, excludeIds: [] };
  } else if (statusFilter === 'announced') {
    return {
      query: query.is('release_date', null),
      empty: false,
      includeIds: null,
      excludeIds: [],
    };
  } else if (statusFilter === 'streaming') {
    if (pmIds.length === 0) return { query, empty: true, includeIds: null, excludeIds: [] };
    // @edge Return pmIds as includeIds instead of calling .in() — merged with other ID sets later
    return {
      query: query.lte('release_date', today).eq('in_theaters', false),
      empty: false,
      includeIds: pmIds,
      excludeIds: [],
    };
  } else if (statusFilter === 'released') {
    const q = query
      .not('release_date', 'is', null)
      .lte('release_date', today)
      .eq('in_theaters', false);
    return { query: q, empty: false, includeIds: null, excludeIds: pmIds };
  }
  return { query, empty: false, includeIds: null, excludeIds: [] };
}

// @contract Applies direct column filters (not ID-based) from AdvancedFilters to query builder
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyColumnFilters(query: any, filters: AdvancedFilters | undefined) {
  if (!filters) return query;

  if (filters.genres.length > 0) {
    query = query.overlaps('genres', filters.genres);
  }
  if (filters.releaseYear) {
    const month = filters.releaseMonth || '01';
    const endMonth = filters.releaseMonth || '12';
    const start = `${filters.releaseYear}-${month}-01`;
    const lastDay = new Date(Number(filters.releaseYear), Number(endMonth), 0).getDate();
    const end = `${filters.releaseYear}-${endMonth}-${String(lastDay).padStart(2, '0')}`;
    query = query.gte('release_date', start).lte('release_date', end);
  }
  if (filters.certification) {
    query = query.eq('certification', filters.certification);
  }
  if (filters.language) {
    query = query.eq('original_language', filters.language);
  }
  if (filters.isFeatured) {
    query = query.eq('is_featured', true);
  }
  if (filters.minRating) {
    query = query.gte('rating', Number(filters.minRating));
  }
  if (filters.directorSearch) {
    query = query.ilike('director', `%${filters.directorSearch}%`);
  }
  return query;
}

// @invariant All ID-based include filters must be intersected in JS before a single .in('id', ...)
// PostgREST overwrites duplicate column filters — multiple .in('id', ...) breaks silently
function intersectIdSets(...sets: (string[] | null)[]): string[] | null {
  const defined = sets.filter((s): s is string[] => s !== null);
  if (defined.length === 0) return null;
  return defined.reduce((acc, set) => acc.filter((id) => set.includes(id)));
}

const crud = createCrudHooks<Movie>({
  table: 'movies',
  queryKeyBase: 'movies',
  singleKeyBase: 'movie',
  orderBy: 'release_date',
  orderAscending: false,
  searchField: 'title',
  enabledFn: (s) => s.length >= 2 || s === '',
});

/**
 * List movies with optional search, status filter, PH scoping, and advanced filters.
 *
 * @boundary Bypasses createCrudHooks — needs PH scoping, multi-status filtering, join lookups
 * @coupling Depends on movie_production_houses, movie_platforms, movie_cast junctions
 */
export function useAdminMovies(
  search = '',
  statusFilter = '',
  productionHouseIds?: string[],
  advancedFilters?: AdvancedFilters,
  /** @contract When non-null, filters movies by original_language for language-scoped access */
  selectedLanguageCode?: string | null,
) {
  const hasPHScope = productionHouseIds && productionHouseIds.length > 0;
  const needsPlatformIds = statusFilter === 'streaming' || statusFilter === 'released';
  const hasActorSearch = !!advancedFilters?.actorSearch;
  const hasPlatformFilter = !!advancedFilters?.platformId;

  // @sideeffect Prefetches all movie_platforms IDs for 'streaming'/'released' filter derivation
  const { data: platformMovieIds, isSuccess: platformIdsReady } = useQuery({
    queryKey: ['admin', 'platform-movie-ids'],
    queryFn: async () => {
      const { data: pmData } = await supabase.from('movie_platforms').select('movie_id');
      return [...new Set((pmData ?? []).map((r: { movie_id: string }) => r.movie_id))];
    },
    enabled: needsPlatformIds,
    staleTime: 60_000,
  });

  // @sideeffect Resolves actor name → movie IDs via movie_cast join
  const { data: actorMovieIds, isSuccess: actorIdsReady } = useQuery({
    queryKey: ['admin', 'actor-movie-ids', advancedFilters?.actorSearch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movie_cast')
        .select('movie_id, actors!inner(name)')
        .ilike('actors.name' as string, `%${advancedFilters?.actorSearch ?? ''}%`);
      if (error) throw error;
      return [...new Set((data ?? []).map((r: { movie_id: string }) => r.movie_id))];
    },
    enabled: hasActorSearch,
    staleTime: 30_000,
  });

  // @sideeffect Resolves platform filter → movie IDs via movie_platforms
  const { data: platformFilterIds, isSuccess: platformFilterReady } = useQuery({
    queryKey: ['admin', 'platform-filter-ids', advancedFilters?.platformId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movie_platforms')
        .select('movie_id')
        .eq('platform_id', advancedFilters?.platformId ?? '');
      if (error) throw error;
      return [...new Set((data ?? []).map((r: { movie_id: string }) => r.movie_id))];
    },
    enabled: hasPlatformFilter,
    staleTime: 60_000,
  });

  const joinFiltersReady =
    (!hasActorSearch || actorIdsReady) && (!hasPlatformFilter || platformFilterReady);

  return useInfiniteQuery({
    queryKey: [
      'admin',
      'movies',
      search,
      statusFilter,
      productionHouseIds,
      advancedFilters,
      selectedLanguageCode,
    ],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const today = new Date().toISOString().split('T')[0];
      const pmIds = platformMovieIds ?? [];
      const resolvedActorIds = hasActorSearch ? (actorMovieIds ?? []) : null;
      const resolvedPlatformIds = hasPlatformFilter ? (platformFilterIds ?? []) : null;

      // Resolve PH scoping IDs
      let phMovieIds: string[] | null = null;
      if (hasPHScope) {
        const { data: junctionData, error: jErr } = await supabase
          .from('movie_production_houses')
          .select('movie_id')
          .in('production_house_id', productionHouseIds);
        if (jErr) throw jErr;
        phMovieIds = [...new Set((junctionData ?? []).map((r) => r.movie_id))];
        if (phMovieIds.length === 0) return [] as Movie[];
      }

      let query = supabase
        .from('movies')
        .select('*')
        .order('release_date', { ascending: false })
        .range(from, to);

      if (search) query = query.ilike('title', `%${search}%`);

      // @boundary Language scoping — filter movies by selected language code
      if (selectedLanguageCode) {
        query = query.eq('original_language', selectedLanguageCode);
      }

      // Apply status filter — returns includeIds separately instead of .in()
      const statusResult = applyStatusFilter(query, statusFilter, today, pmIds);
      if (statusResult.empty) return [] as Movie[];
      query = statusResult.query as typeof query;

      // Apply column-based advanced filters (no .in() calls)
      query = applyColumnFilters(query, advancedFilters);

      // @invariant Merge all ID-based include sets into one .in('id', ...) call
      const mergedIds = intersectIdSets(
        phMovieIds,
        statusResult.includeIds,
        resolvedActorIds,
        resolvedPlatformIds,
      );
      if (mergedIds !== null) {
        if (mergedIds.length === 0) return [] as Movie[];
        query = query.in('id', mergedIds);
      }

      // Apply excludeIds from status filter (e.g., "released" excludes streaming movies)
      if (statusResult.excludeIds.length > 0) {
        query = query.not('id', 'in', `(${statusResult.excludeIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Movie[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < PAGE_SIZE ? undefined : lastPageParam + 1,
    enabled:
      (search.length >= 2 || search === '') &&
      (!needsPlatformIds || platformIdsReady) &&
      joinFiltersReady,
  });
}

/** Fetch all movies (no pagination) — for dropdowns / selectors */
// @edge limit(5000) on non-PH path — could be slow if movie count exceeds threshold
export function useAllMovies(productionHouseIds?: string[]) {
  const hasPHScope = productionHouseIds && productionHouseIds.length > 0;

  return useQuery({
    queryKey: ['admin', 'movies', 'all', productionHouseIds],
    queryFn: async () => {
      if (hasPHScope) {
        const { data: junctionData, error: jErr } = await supabase
          .from('movie_production_houses')
          .select('movie_id')
          .in('production_house_id', productionHouseIds);
        if (jErr) throw jErr;

        const movieIds = [...new Set((junctionData ?? []).map((r) => r.movie_id))];
        if (movieIds.length === 0) return [] as Movie[];

        const { data, error } = await supabase
          .from('movies')
          .select('*')
          .in('id', movieIds)
          .order('release_date', { ascending: false });
        if (error) throw error;
        return data as Movie[];
      }

      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('release_date', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data as Movie[];
    },
  });
}

export const useAdminMovie = crud.useSingle;
export const useCreateMovie = crud.useCreate;
export const useUpdateMovie = crud.useUpdate;
export const useDeleteMovie = crud.useDelete;
