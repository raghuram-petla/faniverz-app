import { supabase } from '@/lib/supabase';
import { WatchlistEntry } from '@/types';

// @coupling: selects movie:movies(*) which fetches ALL movie columns. The WatchlistEntry type declares movie as optional Movie. Consumers like useWatchlist call deriveMovieStatus(e.movie, 0) which needs release_date and in_theaters — these are guaranteed present via movies(*). But if the select is narrowed to specific columns, deriveMovieStatus will break silently (fields will be undefined, treated as falsy).
// @edge: no pagination — fetches the entire watchlist in one call. For power users with 100+ watchlist entries, this returns a large payload. useWatchlistPaginated exists but uses a separate query key ('watchlist-paginated') and they don't share cache.
export async function fetchWatchlist(userId: string): Promise<WatchlistEntry[]> {
  const { data, error } = await supabase
    .from('watchlists')
    .select('*, movie:movies(*)')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// @edge: .select() after insert returns the watchlist row WITHOUT the movie join. The returned WatchlistEntry has movie=undefined. The hook (useWatchlistMutations.add) doesn't use the returned data — it just invalidates. But if someone adds onSuccess logic that reads the returned entry's movie, it will be null.
// @assumes: no UNIQUE constraint on (user_id, movie_id) is documented in the migration — if one exists, duplicate adds throw. If none exists, a user can add the same movie to watchlist multiple times, creating duplicate entries.
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

// @edge: watched_at is set to client's local time via new Date().toISOString(). If the device clock is significantly off, watched_at will be inaccurate. The DB column is timestamptz so it stores correctly, but the value itself is whatever the client sends.
// @assumes: a watchlist entry for this user+movie already exists. If it doesn't, the update matches 0 rows — no error, no feedback. The caller (useWatchlistMutations.markWatched) has no special handling for this case.
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

// @contract: returns the full WatchlistEntry (without movie join) or null. Uses .maybeSingle() so it returns null instead of throwing when not found (unlike .single()). The returned entry includes status field — callers can check if it's 'watchlist' vs 'watched'. The useIsWatchlisted hook in hooks.ts exposes this directly.
export async function isMovieWatchlisted(
  userId: string,
  movieId: string,
): Promise<WatchlistEntry | null> {
  const { data, error } = await supabase
    .from('watchlists')
    .select('*')
    .eq('user_id', userId)
    .eq('movie_id', movieId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
