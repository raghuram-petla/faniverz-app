'use client';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { Movie } from '@/lib/types';

const PAGE_SIZE = 50;

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

      if (hasPHScope) {
        // PH admin: fetch movie IDs from junction table first, then fetch movies
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
          query = query.gt('release_date', new Date().toISOString().split('T')[0]);
        } else if (statusFilter === 'in_theaters') {
          query = query.eq('in_theaters', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as Movie[];
      }

      // Regular admin / super admin: all movies
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

export function useAdminMovie(id: string) {
  return useQuery({
    queryKey: ['admin', 'movie', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('movies').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Movie;
    },
    enabled: !!id,
  });
}

export function useCreateMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (movie: Partial<Movie>) => {
      const { data, error } = await supabase.from('movies').insert(movie).select().single();
      if (error) throw error;
      return data as Movie;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
    },
  });
}

export function useUpdateMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...movie }: Partial<Movie> & { id: string }) => {
      const { data, error } = await supabase
        .from('movies')
        .update(movie)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Movie;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
      qc.invalidateQueries({ queryKey: ['admin', 'movie', data.id] });
    },
  });
}

export function useDeleteMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('movies').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
      qc.invalidateQueries({ queryKey: ['admin', 'movie', id] });
    },
  });
}
