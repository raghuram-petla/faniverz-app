'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { MovieTheatricalRun } from '@/lib/types';

export function useMovieTheatricalRuns(movieId: string) {
  return useQuery({
    queryKey: ['admin', 'theatrical-runs', movieId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movie_theatrical_runs')
        .select('*')
        .eq('movie_id', movieId)
        .order('release_date', { ascending: true });
      if (error) throw error;
      return data as MovieTheatricalRun[];
    },
    enabled: !!movieId,
  });
}

export function useAddTheatricalRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (run: { movie_id: string; release_date: string; label?: string | null }) => {
      const { data, error } = await supabase
        .from('movie_theatrical_runs')
        .insert(run)
        .select()
        .single();
      if (error) throw error;
      return data as MovieTheatricalRun;
    },
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ['admin', 'theatrical-runs', data.movie_id] }),
  });
}

export function useRemoveTheatricalRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, movieId }: { id: string; movieId: string }) => {
      const { error } = await supabase.from('movie_theatrical_runs').delete().eq('id', id);
      if (error) throw error;
      return movieId;
    },
    onSuccess: (movieId) =>
      qc.invalidateQueries({ queryKey: ['admin', 'theatrical-runs', movieId] }),
  });
}
