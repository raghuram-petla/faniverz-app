'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { EntityFollow } from '@/lib/types';

export function useAdminFollows(search = '') {
  return useQuery({
    queryKey: ['admin', 'follows', search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entity_follows')
        .select('*, profile:profiles(id, display_name, email)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      const follows = data as EntityFollow[];

      // Filter client-side by profile display_name or entity_type
      // (PostgREST cannot OR across foreign table columns)
      if (search) {
        const lower = search.toLowerCase();
        return follows.filter(
          (f) =>
            f.profile?.display_name?.toLowerCase().includes(lower) ||
            f.entity_type?.toLowerCase().includes(lower),
        );
      }

      return follows;
    },
    enabled: search.length >= 2 || search === '',
  });
}

export function useDeleteFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('entity_follows').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'follows'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to delete follow');
    },
  });
}
