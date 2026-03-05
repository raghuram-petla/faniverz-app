'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { MovieVideo } from '@/lib/types';

export function useMovieVideos(movieId: string) {
  return useQuery({
    queryKey: ['admin', 'videos', movieId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movie_videos')
        .select('*')
        .eq('movie_id', movieId)
        .order('display_order');
      if (error) throw error;
      return data as MovieVideo[];
    },
    enabled: !!movieId,
  });
}

export function useAddVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (video: Partial<MovieVideo>) => {
      const { data, error } = await supabase.from('movie_videos').insert(video).select().single();
      if (error) throw error;
      return data as MovieVideo;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin', 'videos', variables.movie_id] });
    },
  });
}

export function useUpdateVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      movieId,
      ...video
    }: Partial<MovieVideo> & { id: string; movieId: string }) => {
      const { data, error } = await supabase
        .from('movie_videos')
        .update(video)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, movieId } as MovieVideo & { movieId: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'videos', data.movieId] });
    },
  });
}

export function useRemoveVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, movieId }: { id: string; movieId: string }) => {
      const { error } = await supabase.from('movie_videos').delete().eq('id', id);
      if (error) throw error;
      return movieId;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin', 'videos', variables.movieId] });
    },
  });
}
