import { supabase } from '@/lib/supabase';
import { WatchlistEntry } from '@/types';

export async function fetchWatchlist(userId: string): Promise<WatchlistEntry[]> {
  const { data, error } = await supabase
    .from('watchlists')
    .select('*, movie:movies(*)')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addToWatchlist(userId: string, movieId: string): Promise<WatchlistEntry> {
  const { data, error } = await supabase
    .from('watchlists')
    .insert({ user_id: userId, movie_id: movieId, status: 'watchlist' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeFromWatchlist(userId: string, movieId: string): Promise<void> {
  const { error } = await supabase
    .from('watchlists')
    .delete()
    .eq('user_id', userId)
    .eq('movie_id', movieId);

  if (error) throw error;
}

export async function markAsWatched(userId: string, movieId: string): Promise<void> {
  const { error } = await supabase
    .from('watchlists')
    .update({ status: 'watched', watched_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('movie_id', movieId);

  if (error) throw error;
}

export async function moveBackToWatchlist(userId: string, movieId: string): Promise<void> {
  const { error } = await supabase
    .from('watchlists')
    .update({ status: 'watchlist', watched_at: null })
    .eq('user_id', userId)
    .eq('movie_id', movieId);

  if (error) throw error;
}

export async function fetchWatchlistPaginated(
  userId: string,
  page: number,
  pageSize: number = 10,
): Promise<WatchlistEntry[]> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from('watchlists')
    .select('*, movie:movies(*)')
    .eq('user_id', userId)
    .order('added_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return data ?? [];
}

export async function isMovieWatchlisted(
  userId: string,
  movieId: string,
): Promise<WatchlistEntry | null> {
  const { data } = await supabase
    .from('watchlists')
    .select('*')
    .eq('user_id', userId)
    .eq('movie_id', movieId)
    .maybeSingle();

  return data;
}
