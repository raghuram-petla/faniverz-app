'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { OTTPlatform } from '@/lib/types';

export function useAdminPlatforms() {
  return useQuery({
    queryKey: ['admin', 'platforms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('platforms').select('*').order('display_order');
      if (error) throw error;
      return data as OTTPlatform[];
    },
  });
}

export function useCreatePlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (platform: Partial<OTTPlatform>) => {
      const { data, error } = await supabase.from('platforms').insert(platform).select().single();
      if (error) throw error;
      return data as OTTPlatform;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'platforms'] }),
  });
}

export function useUpdatePlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...platform }: Partial<OTTPlatform> & { id: string }) => {
      const { data, error } = await supabase
        .from('platforms')
        .update(platform)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as OTTPlatform;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'platforms'] }),
  });
}

export function useDeletePlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('platforms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'platforms'] }),
  });
}
