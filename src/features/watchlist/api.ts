import { supabase } from '@/lib/supabase';
import type { Movie } from '@/types/movie';

export interface WatchlistEntry {
  id: number;
  user_id: string;
  movie_id: number;
  created_at: string;
  movie: Movie;
}

export async function fetchWatchlist(userId: string): Promise<WatchlistEntry[]> {
  const { data, error } = await supabase
    .from('watchlists')
    .select('*, movie:movies(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as WatchlistEntry[];
}

export async function addToWatchlist(userId: string, movieId: number): Promise<void> {
  const { error } = await supabase
    .from('watchlists')
    .insert({ user_id: userId, movie_id: movieId });

  if (error) throw error;
}

export async function removeFromWatchlist(userId: string, movieId: number): Promise<void> {
  const { error } = await supabase
    .from('watchlists')
    .delete()
    .eq('user_id', userId)
    .eq('movie_id', movieId);

  if (error) throw error;
}

export async function isInWatchlist(userId: string, movieId: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('watchlists')
    .select('id')
    .eq('user_id', userId)
    .eq('movie_id', movieId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}
