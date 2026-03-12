'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { FavoriteActor } from '@/lib/types';

export function useAdminFavorites(search = '') {
  return useQuery({
    queryKey: ['admin', 'favorites', search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorite_actors')
        .select('*, actor:actors(id, name, photo_url), profile:profiles(id, display_name, email)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      const favorites = data as FavoriteActor[];

      // Client-side filter on joined columns (PostgREST cannot OR across foreign tables)
      if (search) {
        const lower = search.toLowerCase();
        return favorites.filter(
          (f) =>
            f.actor?.name?.toLowerCase().includes(lower) ||
            f.profile?.display_name?.toLowerCase().includes(lower),
        );
      }

      return favorites;
    },
    enabled: search.length >= 2 || search === '',
  });
}

export function useDeleteFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('favorite_actors').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'favorites'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to delete favorite');
    },
  });
}
