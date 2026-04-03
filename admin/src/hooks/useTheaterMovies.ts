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

// @edge: computed at call time, not at module load — ensures freshness across midnight boundaries
function oneMonthFromToday(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

// @contract Fetches movies with a future release_date (up to 1 month out) that are NOT yet in theaters
export function useUpcomingMovies() {
  const today = new Date().toISOString().split('T')[0];
  const maxDate = oneMonthFromToday();
  return useQuery({
    queryKey: ['admin', 'upcoming-movies', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('in_theaters', false)
        .gt('release_date', today)
        .lte('release_date', maxDate)
        .order('release_date', { ascending: true });
      if (error) throw error;
      return data as Movie[];
    },
  });
}

// @contract Fetches theatrical runs with future dates (up to 1 month out), joined with movie data
// @coupling !inner JOIN — only returns runs where the movie still exists (cascading FK safety)
export function useUpcomingRereleases() {
  const today = new Date().toISOString().split('T')[0];
  const maxDate = oneMonthFromToday();
  return useQuery({
    queryKey: ['admin', 'upcoming-rereleases', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movie_theatrical_runs')
        .select('*, movies!inner(id, title, poster_url, in_theaters)')
        .gt('release_date', today)
        .lte('release_date', maxDate)
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
      // @sideeffect Both operations go through crudFetch for audit attribution
      // @edge Find the active run ID first so crudFetch can target by id
      const { data: activeRun } = await supabase
        .from('movie_theatrical_runs')
        .select('id')
        .eq('movie_id', params.movieId)
        .is('end_date', null)
        .maybeSingle();

      const promises: Promise<unknown>[] = [
        crudFetch('PATCH', {
          table: 'movies',
          id: params.movieId,
          data: { in_theaters: false },
        }),
      ];
      if (activeRun?.id) {
        promises.push(
          crudFetch('PATCH', {
            table: 'movie_theatrical_runs',
            id: activeRun.id,
            data: { end_date: params.endDate },
          }),
        );
      }
      await Promise.all(promises);
      return params.movieId;
    },
    // @sideeffect Also invalidate single movie + theatrical-runs so edit page shows fresh data
    onSuccess: (movieId: string) => {
      invalidateAll(queryClient);
      queryClient.invalidateQueries({ queryKey: ['admin', 'movie', movieId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'theatrical-runs', movieId] });
    },
    // @edge Partial failure can leave in_theaters flag out of sync with theatrical runs
    /* v8 ignore start -- onError only triggered by real mutation failure */
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to remove from theaters');
    },
    /* v8 ignore stop */
  });
}

// @sideeffect Adds a movie to theaters: creates theatrical run + sets in_theaters = true
// @contract Both operations happen in parallel; partial failure leaves inconsistent state
// @edge premiereDate sets movies.premiere_date; newReleaseDate updates movies.release_date
export function useAddToTheaters() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      movieId: string;
      startDate: string;
      label: string | null;
      premiereDate?: string | null;
      newReleaseDate?: string | null;
    }) => {
      const moviePatch: Record<string, unknown> = { in_theaters: true };
      if (params.premiereDate) moviePatch.premiere_date = params.premiereDate;
      if (params.newReleaseDate) moviePatch.release_date = params.newReleaseDate;
      await Promise.all([
        crudFetch('PATCH', {
          table: 'movies',
          id: params.movieId,
          data: moviePatch,
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
      return params.movieId;
    },
    // @sideeffect Also invalidate single movie + theatrical-runs so edit page shows fresh data
    onSuccess: (movieId: string) => {
      invalidateAll(queryClient);
      queryClient.invalidateQueries({ queryKey: ['admin', 'movie', movieId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'theatrical-runs', movieId] });
    },
    // @edge Partial failure can leave in_theaters flag out of sync with theatrical runs
    /* v8 ignore start -- onError only triggered by real mutation failure */
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to add to theaters');
    },
    /* v8 ignore stop */
  });
}
