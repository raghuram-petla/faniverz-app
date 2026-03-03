'use client';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { logAudit } from '@/lib/audit-client';
import type { Movie } from '@/lib/types';

const PAGE_SIZE = 50;

export function useAdminMovies(search = '', statusFilter = '') {
  return useInfiniteQuery({
    queryKey: ['admin', 'movies', search, statusFilter],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from('movies')
        .select('*')
        .order('release_date', { ascending: false })
        .range(from, to);
      if (search) {
        query = query.ilike('title', `%${search}%`);
      }
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
export function useAllMovies() {
  return useQuery({
    queryKey: ['admin', 'movies', 'all'],
    queryFn: async () => {
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
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'movies'] });
      logAudit('create', 'movie', data.id, { title: data.title });
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
      logAudit('update', 'movie', data.id, { title: data.title });
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
      logAudit('delete', 'movie', id);
    },
  });
}
