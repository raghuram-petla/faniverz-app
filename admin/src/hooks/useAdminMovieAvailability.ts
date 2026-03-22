'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { crudFetch } from '@/lib/admin-crud-client';
import type { MoviePlatformAvailability, Country, AvailabilityType } from '@shared/types';

/** @contract Fetches all availability rows for a movie, with platform relation */
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
