'use client';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { createCrudHooks } from '@/hooks/createCrudHooks';
import type { Movie } from '@/lib/types';

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
 * List movies with optional search, status filter, and PH scoping.
 * When productionHouseIds is provided (PH admin), only movies linked to those PHs are returned.
 */
export function useAdminMovies(search = '', statusFilter = '', productionHouseIds?: string[]) {
  const hasPHScope = productionHouseIds && productionHouseIds.length > 0;

  return useInfiniteQuery({
    queryKey: ['admin', 'movies', search, statusFilter, productionHouseIds],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const today = new Date().toISOString().split('T')[0];

      // Pre-fetch platform movie IDs for streaming/released filters
      let platformMovieIds: string[] = [];
      if (statusFilter === 'streaming' || statusFilter === 'released') {
        const { data: pmData } = await supabase.from('movie_platforms').select('movie_id');
        platformMovieIds = [...new Set((pmData ?? []).map((r) => r.movie_id))];
      }

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
        if (statusFilter === 'upcoming') {
          query = query.gt('release_date', today);
        } else if (statusFilter === 'in_theaters') {
          query = query.eq('in_theaters', true);
        } else if (statusFilter === 'announced') {
          query = query.is('release_date', null);
        } else if (statusFilter === 'streaming') {
          if (platformMovieIds.length === 0) return [] as Movie[];
          query = query
            .in('id', platformMovieIds)
            .lte('release_date', today)
            .eq('in_theaters', false);
        } else if (statusFilter === 'released') {
          query = query
            .not('release_date', 'is', null)
            .lte('release_date', today)
            .eq('in_theaters', false);
          if (platformMovieIds.length > 0) {
            query = query.not('id', 'in', `(${platformMovieIds.join(',')})`);
          }
        }

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
      if (statusFilter === 'upcoming') {
        query = query.gt('release_date', new Date().toISOString().split('T')[0]);
      } else if (statusFilter === 'in_theaters') {
        query = query.eq('in_theaters', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Movie[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === PAGE_SIZE ? lastPageParam + 1 : undefined,
    enabled: search.length >= 2 || search === '',
  });
}

/** Fetch all movies (no pagination) — for dropdowns / selectors */
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
