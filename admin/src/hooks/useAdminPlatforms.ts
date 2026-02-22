'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { logAdminAction } from '@/lib/audit';

export function useAdminPlatforms() {
  return useQuery({
    queryKey: ['admin-platforms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (platform: Record<string, unknown>) => {
      const { data, error } = await supabase.from('platforms').insert(platform).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await logAdminAction('create', 'platform', data.id);
      queryClient.invalidateQueries({ queryKey: ['admin-platforms'] });
    },
  });
}

export function useUpdatePlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from('platforms')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await logAdminAction('update', 'platform', data.id);
      queryClient.invalidateQueries({ queryKey: ['admin-platforms'] });
    },
  });
}

export function useDeletePlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('platforms').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: async (id) => {
      await logAdminAction('delete', 'platform', id);
      queryClient.invalidateQueries({ queryKey: ['admin-platforms'] });
    },
  });
}

export function useReorderPlatforms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: number[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from('platforms').update({ display_order: index }).eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-platforms'] });
    },
  });
}
