'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';

/** Search existing movies by title (typeahead). */
// @edge enabled guard at query.length>=2 prevents excessive DB calls on single-char input
export function useMovieSearch(query: string) {
  return useQuery({
    queryKey: ['admin', 'movie-search', query],
    queryFn: async () => {
      if (query.length < 2) return [];
      const { data, error } = await supabase
        .from('movies')
        .select('id, title, release_date, tmdb_id, tmdb_last_synced_at, poster_url')
        .ilike('title', `%${query}%`)
        .order('release_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: query.length >= 2,
  });
}

/** Search existing actors by name (typeahead). */
export function useActorSearch(query: string) {
  return useQuery({
    queryKey: ['admin', 'actor-search', query],
    queryFn: async () => {
      if (query.length < 2) return [];
      const { data, error } = await supabase
        .from('actors')
        .select('id, name, tmdb_person_id, photo_url, biography, birth_date')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: query.length >= 2,
  });
}
