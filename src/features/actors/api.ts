import { supabase } from '@/lib/supabase';
import { Actor, ActorCredit, FavoriteActor } from '@/types';

// @coupling: returns FavoriteActor with nested actor:actors(*) join. The FavoriteActor type (src/types/user.ts) has actor_id and optional actor field. If an actor is deleted from the actors table but the FK has no CASCADE, the join returns actor: null while the favorite row persists. UI code destructuring actor.name will crash on null. Currently favorite_actors has no FK — it's just a UUID field — so orphaned favorites are possible.
export async function fetchFavoriteActors(userId: string): Promise<FavoriteActor[]> {
  const { data, error } = await supabase
    .from('favorite_actors')
    .select('*, actor:actors(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addFavoriteActor(userId: string, actorId: string): Promise<void> {
  const { error } = await supabase
    .from('favorite_actors')
    .insert({ user_id: userId, actor_id: actorId });

  if (error) throw error;
}

export async function removeFavoriteActor(userId: string, actorId: string): Promise<void> {
  const { error } = await supabase
    .from('favorite_actors')
    .delete()
    .eq('user_id', userId)
    .eq('actor_id', actorId);

  if (error) throw error;
}

// @boundary: query is interpolated directly into the ilike pattern — special Postgres LIKE characters (%, _) in the search term are not escaped. A search for "100%" would match any actor whose name contains "100" followed by any character. This is unlikely for actor names but is a latent injection vector.
// @edge: no ordering specified — Supabase returns in insertion order. Results for common names like "Ram" could return 20 results in arbitrary order, with the most relevant match possibly excluded by the limit.
export async function searchActors(query: string): Promise<Actor[]> {
  const { data, error } = await supabase
    .from('actors')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(20);

  if (error) throw error;
  return data ?? [];
}

export async function fetchActorById(id: string): Promise<Actor | null> {
  const { data, error } = await supabase.from('actors').select('*').eq('id', id).maybeSingle();

  if (error) throw error;
  return data;
}

// @coupling: joins movie:movies(*) — the ActorCredit type expects movie as optional Movie. The client-side sort uses movie.release_date which could be null. Null release_dates sort as '' (empty string) which sorts before all dates, pushing announced movies (no release_date) to the bottom of the "newest first" list. This is correct behavior but may confuse users expecting announced movies at the top.
// @edge: no filter on credit_type — returns BOTH cast and crew entries. If an actor is credited as both cast and crew on the same movie (e.g., actor + producer), the movie appears twice in the filmography list.
export async function fetchActorFilmography(actorId: string): Promise<ActorCredit[]> {
  const { data, error } = await supabase
    .from('movie_cast')
    .select('*, movie:movies(*)')
    .eq('actor_id', actorId);

  if (error) throw error;

  // Sort by movie release_date descending (newest first)
  return (data ?? []).sort((a, b) => {
    const dateA = (a as ActorCredit).movie?.release_date ?? '';
    const dateB = (b as ActorCredit).movie?.release_date ?? '';
    return dateB.localeCompare(dateA);
  }) as ActorCredit[];
}
