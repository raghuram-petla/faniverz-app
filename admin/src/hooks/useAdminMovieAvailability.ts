'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { crudFetch } from '@/lib/admin-crud-client';
import type { MoviePlatformAvailability, Country, AvailabilityType } from '@shared/types';

/** @contract Fetches all availability rows for a movie, with platform relation */
// @coupling JOINs movie_platform_availability + platforms via PostgREST foreign-key embed
// @edge triple-sort: country_code → availability_type → tmdb_display_priority (nulls last)
export function useMovieAvailability(movieId: string) {
  return useQuery({
    queryKey: ['admin', 'movie_availability', movieId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movie_platform_availability')
        .select('*, platform:platforms(*)')
        .eq('movie_id', movieId)
        .order('country_code')
        .order('availability_type')
        .order('tmdb_display_priority', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as MoviePlatformAvailability[];
    },
    enabled: !!movieId,
  });
}

/** @contract Fetches countries reference table sorted by display_order */
// @edge staleTime 24h — countries rarely change; avoids re-fetching on every movie edit page visit
export function useCountries() {
  return useQuery({
    queryKey: ['admin', 'countries'],
    queryFn: async () => {
      const { data, error } = await supabase.from('countries').select('*').order('display_order');
      if (error) throw error;
      return data as Country[];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
}

// @sideeffect Inserts availability row via /api/admin-crud; invalidates movie-scoped cache
// @edge Composite unique constraint (movie_id, platform_id, country_code, availability_type) — duplicate insert throws
export function useAddMovieAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: {
      movie_id: string;
      platform_id: string;
      country_code: string;
      availability_type: AvailabilityType;
      available_from?: string | null;
      streaming_url?: string | null;
    }) => {
      return crudFetch<MoviePlatformAvailability>('POST', {
        table: 'movie_platform_availability',
        data: row,
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'movie_availability', data.movie_id] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to add availability');
    },
  });
}

// @contract Only available_from and streaming_url are updatable; platform/country/type are immutable natural keys
export function useUpdateMovieAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      movie_id,
      ...updates
    }: {
      id: string;
      movie_id: string;
      available_from?: string | null;
      streaming_url?: string | null;
    }) => {
      return crudFetch<MoviePlatformAvailability>('PATCH', {
        table: 'movie_platform_availability',
        id,
        data: updates,
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'movie_availability', vars.movie_id] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to update availability');
    },
  });
}

// @sideeffect Hard-deletes availability row by surrogate id via /api/admin-crud
export function useRemoveMovieAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, movie_id }: { id: string; movie_id: string }) => {
      await crudFetch('DELETE', { table: 'movie_platform_availability', id });
      return { movie_id };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'movie_availability', vars.movie_id] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to remove availability');
    },
  });
}
