'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { crudFetch } from '@/lib/admin-crud-client';
import type { Movie, MovieTheatricalRun } from '@/lib/types';

const INVALIDATE_KEYS = [
  ['admin', 'theater-movies'],
  ['admin', 'theater-search'],
  ['admin', 'upcoming-movies'],
  ['admin', 'upcoming-rereleases'],
  ['admin', 'movies'],
];

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  INVALIDATE_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
}

// @contract Fetches all movies currently marked as in_theaters, ordered by release_date desc
export function useTheaterMovies() {
  return useQuery({
    queryKey: ['admin', 'theater-movies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('in_theaters', true)
        .order('release_date', { ascending: false });
      if (error) throw error;
      return data as Movie[];
    },
  });
}

// @contract Fetches movies with a future release_date that are NOT yet in theaters
export function useUpcomingMovies() {
  const today = new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: ['admin', 'upcoming-movies', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('in_theaters', false)
        .gt('release_date', today)
        .order('release_date', { ascending: true });
      if (error) throw error;
      return data as Movie[];
    },
  });
}

// @contract Fetches theatrical runs with future dates, joined with movie data
export function useUpcomingRereleases() {
  const today = new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: ['admin', 'upcoming-rereleases', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movie_theatrical_runs')
        .select('*, movies!inner(id, title, poster_url, in_theaters)')
        .gt('release_date', today)
        .order('release_date', { ascending: true });
      if (error) throw error;
      return data as (MovieTheatricalRun & {
        movies: { id: string; title: string; poster_url: string | null; in_theaters: boolean };
      })[];
    },
  });
}

// @contract Searches movies by title for the manual add flow
export function useTheaterSearch(search: string) {
  return useQuery({
    queryKey: ['admin', 'theater-search', search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .ilike('title', `%${search}%`)
        .eq('in_theaters', false)
        .order('release_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Movie[];
    },
    enabled: search.length >= 2,
  });
}

// @sideeffect Removes a movie from theaters: sets in_theaters = false + closes active theatrical run
export function useRemoveFromTheaters() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { movieId: string; endDate: string }) => {
      // @contract Close the active run (end_date IS NULL) and flip the in_theaters flag in parallel
      await Promise.all([
        crudFetch('PATCH', {
          table: 'movies',
          id: params.movieId,
          data: { in_theaters: false },
        }),
        supabase
          .from('movie_theatrical_runs')
          .update({ end_date: params.endDate })
          .eq('movie_id', params.movieId)
          .is('end_date', null),
      ]);
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

// @sideeffect Adds a movie to theaters: creates theatrical run + sets in_theaters = true
// @contract Both operations happen in parallel; partial failure leaves inconsistent state
export function useAddToTheaters() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { movieId: string; startDate: string; label: string | null }) => {
      await Promise.all([
        crudFetch('PATCH', {
          table: 'movies',
          id: params.movieId,
          data: { in_theaters: true },
        }),
        crudFetch('POST', {
          table: 'movie_theatrical_runs',
          data: {
            movie_id: params.movieId,
            release_date: params.startDate,
            label: params.label,
          },
        }),
      ]);
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}
