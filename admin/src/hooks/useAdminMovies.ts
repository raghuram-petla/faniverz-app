'use client';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { createCrudHooks } from '@/hooks/createCrudHooks';
import type { Movie } from '@/lib/types';

const PAGE_SIZE = 50;

// @contract: shared filter logic for both PH-scoped and unscoped movie queries
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyStatusFilter(query: any, statusFilter: string, today: string, pmIds: string[]) {
  if (statusFilter === 'upcoming') {
    return { query: query.gt('release_date', today), empty: false };
  } else if (statusFilter === 'in_theaters') {
    return { query: query.eq('in_theaters', true), empty: false };
  } else if (statusFilter === 'announced') {
    return { query: query.is('release_date', null), empty: false };
  } else if (statusFilter === 'streaming') {
    if (pmIds.length === 0) return { query, empty: true };
    return {
      query: query.in('id', pmIds).lte('release_date', today).eq('in_theaters', false),
      empty: false,
    };
  } else if (statusFilter === 'released') {
    let q = query
      .not('release_date', 'is', null)
      .lte('release_date', today)
      .eq('in_theaters', false);
    if (pmIds.length > 0) {
      q = q.not('id', 'in', `(${pmIds.join(',')})`);
    }
    return { query: q, empty: false };
  }
  return { query, empty: false };
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
 * List movies with optional search, status filter, and PH scoping.
 * When productionHouseIds is provided (PH admin), only movies linked to those PHs are returned.
 *
 * @boundary Bypasses createCrudHooks — needs PH scoping, multi-status filtering, platform ID lookup
 * @coupling Depends on movie_production_houses junction + movie_platforms for status derivation
 */
export function useAdminMovies(search = '', statusFilter = '', productionHouseIds?: string[]) {
  const hasPHScope = productionHouseIds && productionHouseIds.length > 0;
  const needsPlatformIds = statusFilter === 'streaming' || statusFilter === 'released';

  // @sideeffect Prefetches all movie_platforms IDs for 'streaming'/'released' filter derivation
  // @edge staleTime=60s — newly added OTT releases may not appear in filter results for up to 1 min
  const { data: platformMovieIds, isSuccess: platformIdsReady } = useQuery({
    queryKey: ['admin', 'platform-movie-ids'],
    queryFn: async () => {
      const { data: pmData } = await supabase.from('movie_platforms').select('movie_id');
      return [...new Set((pmData ?? []).map((r: { movie_id: string }) => r.movie_id))];
    },
    enabled: needsPlatformIds,
    staleTime: 60_000,
  });

  return useInfiniteQuery({
    queryKey: ['admin', 'movies', search, statusFilter, productionHouseIds],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const today = new Date().toISOString().split('T')[0];
      const pmIds = platformMovieIds ?? [];

      if (hasPHScope) {
        const { data: junctionData, error: jErr } = await supabase
          .from('movie_production_houses')
          .select('movie_id')
          .in('production_house_id', productionHouseIds);
        if (jErr) throw jErr;

        const movieIds = [...new Set((junctionData ?? []).map((r) => r.movie_id))];
        if (movieIds.length === 0) return [] as Movie[];

        let query = supabase
          .from('movies')
          .select('*')
          .in('id', movieIds)
          .order('release_date', { ascending: false })
          .range(from, to);
        if (search) query = query.ilike('title', `%${search}%`);
        const phResult = applyStatusFilter(query, statusFilter, today, pmIds);
        if (phResult.empty) return [] as Movie[];
        query = phResult.query;

        const { data, error } = await query;
        if (error) throw error;
        return data as Movie[];
      }

      let query = supabase
        .from('movies')
        .select('*')
        .order('release_date', { ascending: false })
        .range(from, to);
      if (search) query = query.ilike('title', `%${search}%`);
      const result = applyStatusFilter(query, statusFilter, today, pmIds);
      if (result.empty) return [] as Movie[];
      query = result.query;

      const { data, error } = await query;
      if (error) throw error;
      return data as Movie[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < PAGE_SIZE ? undefined : lastPageParam + 1,
    enabled: (search.length >= 2 || search === '') && (!needsPlatformIds || platformIdsReady),
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
