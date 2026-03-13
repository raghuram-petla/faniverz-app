import { supabase } from '@/lib/supabase';
import { WatchlistEntry } from '@/types';

// @coupling: selects movie:movies(*) which fetches ALL movie columns plus a platform_count aggregate.
// Consumers call deriveMovieStatus(e.movie, platformCount) which needs release_date, in_theaters, and
// platform count to correctly classify streaming movies.
// @edge: no pagination — fetches the entire watchlist in one call.
export async function fetchWatchlist(userId: string): Promise<WatchlistEntry[]> {
  const { data, error } = await supabase
    .from('watchlists')
    .select('*, movie:movies(*, movie_platforms(count))')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  if (error) throw error;
  // @sideeffect: flatten platform count from nested aggregate into a top-level field
  return (data ?? []).map((entry) => {
    if (!entry.movie) return entry;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const movie = entry.movie as any;
    const count: number = movie?.movie_platforms?.[0]?.count ?? 0;
    return { ...entry, _platformCount: count };
  });
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
    .select('*, movie:movies(*, movie_platforms(count))')
    .eq('user_id', userId)
    .order('added_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  // @sideeffect: flatten platform count from nested aggregate
  return (data ?? []).map((entry) => {
    if (!entry.movie) return entry;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const movie = entry.movie as any;
    const count: number = movie?.movie_platforms?.[0]?.count ?? 0;
    return { ...entry, _platformCount: count };
  });
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
