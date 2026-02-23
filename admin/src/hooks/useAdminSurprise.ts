'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { SurpriseContent } from '@/lib/types';

export function useAdminSurprise() {
  return useQuery({
    queryKey: ['admin', 'surprise'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surprise_content')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SurpriseContent[];
    },
  });
}

export function useAdminSurpriseItem(id: string) {
  return useQuery({
    queryKey: ['admin', 'surprise', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surprise_content')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as SurpriseContent;
    },
    enabled: !!id,
  });
}

export function useCreateSurprise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Partial<SurpriseContent>) => {
      const { data, error } = await supabase
        .from('surprise_content')
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data as SurpriseContent;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'surprise'] }),
  });
}

export function useUpdateSurprise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...item }: Partial<SurpriseContent> & { id: string }) => {
      const { data, error } = await supabase
        .from('surprise_content')
        .update(item)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SurpriseContent;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'surprise'] }),
  });
}

export function useDeleteSurprise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('surprise_content').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'surprise'] }),
  });
}
