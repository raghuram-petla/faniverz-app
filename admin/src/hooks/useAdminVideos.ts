'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { logAudit } from '@/lib/audit-client';
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
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin', 'videos', variables.movie_id] });
      logAudit('create', 'movie_video', data.id, {
        movie_id: data.movie_id,
        title: data.title,
      });
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
      logAudit('update', 'movie_video', data.id, { title: data.title });
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
      logAudit('delete', 'movie_video', variables.id, { movie_id: variables.movieId });
    },
  });
}
