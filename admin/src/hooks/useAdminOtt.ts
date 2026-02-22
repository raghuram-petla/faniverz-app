'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { logAdminAction } from '@/lib/audit';

export function useAdminOttReleases(options?: {
  platformId?: number;
  source?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['admin-ott-releases', options],
    queryFn: async () => {
      let query = supabase
        .from('ott_releases')
        .select('*, movies(id, title, title_te), platforms(id, name, slug, logo_url)')
        .order('ott_release_date', { ascending: false })
        .limit(100);

      if (options?.platformId) {
        query = query.eq('platform_id', options.platformId);
      }
      if (options?.source) {
        query = query.eq('source', options.source);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useAdminOttDetail(id: number) {
  return useQuery({
    queryKey: ['admin-ott-release', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ott_releases')
        .select('*, movies(id, title, title_te), platforms(id, name, slug)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: id > 0,
  });
}

export function useCreateOttRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (release: Record<string, unknown>) => {
      const { data, error } = await supabase.from('ott_releases').insert(release).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await logAdminAction('create', 'ott_release', data.id);
      queryClient.invalidateQueries({ queryKey: ['admin-ott-releases'] });
    },
  });
}

export function useUpdateOttRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from('ott_releases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await logAdminAction('update', 'ott_release', data.id);
      queryClient.invalidateQueries({ queryKey: ['admin-ott-releases'] });
      queryClient.invalidateQueries({ queryKey: ['admin-ott-release', data.id] });
    },
  });
}

export function useDeleteOttRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('ott_releases').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: async (id) => {
      await logAdminAction('delete', 'ott_release', id);
      queryClient.invalidateQueries({ queryKey: ['admin-ott-releases'] });
    },
  });
}
