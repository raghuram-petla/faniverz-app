'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { WatchlistEntry } from '@/lib/types';

interface WatchlistEntryWithProfile extends WatchlistEntry {
  profile?: { id: string; display_name: string | null; email: string | null } | null;
}

export function useAdminWatchlist(search = '') {
  return useQuery({
    queryKey: ['admin', 'watchlist', search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('watchlists')
        .select('*, movie:movies(id, title, poster_url), profile:profiles(id, display_name, email)')
        .order('added_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      const entries = data as WatchlistEntryWithProfile[];

      // Client-side filter on joined movie title and profile display_name
      // (PostgREST cannot OR across foreign table columns)
      if (search) {
        const lower = search.toLowerCase();
        return entries.filter(
          (e) =>
            e.movie?.title?.toLowerCase().includes(lower) ||
            e.profile?.display_name?.toLowerCase().includes(lower),
        );
      }

      return entries;
    },
    enabled: search.length >= 2 || search === '',
  });
}

export function useDeleteWatchlistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('watchlists').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'watchlist'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to delete watchlist entry');
    },
  });
}
