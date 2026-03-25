'use client';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { createCrudHooks } from '@/hooks/createCrudHooks';
import type { Movie } from '@/lib/types';
import { ADMIN_STALE_30S, ADMIN_STALE_1M } from '@/lib/query-config';
import {
  type AdvancedFilters,
  applyStatusFilter,
  applyColumnFilters,
  intersectIdSets,
} from '@/hooks/useAdminMoviesFilters';

export type { AdvancedFilters } from '@/hooks/useAdminMoviesFilters';

const PAGE_SIZE = 50;

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
    staleTime: ADMIN_STALE_1M,
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
    staleTime: ADMIN_STALE_30S,
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
    staleTime: ADMIN_STALE_1M,
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
