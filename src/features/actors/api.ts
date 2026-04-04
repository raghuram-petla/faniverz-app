import { supabase } from '@/lib/supabase';
import { Actor, ActorCredit, FavoriteActor } from '@/types';
import { unwrapList, unwrapOne } from '@/utils/supabaseQuery';

// @coupling: returns FavoriteActor with nested actor:actors(*) join. No FK constraint on actor_id,
// so orphaned favorites (deleted actor) are filtered out to prevent null crashes.
export async function fetchFavoriteActors(userId: string): Promise<FavoriteActor[]> {
  const { data, error } = await supabase
    .from('favorite_actors')
    .select('*, actor:actors(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).filter((f) => f.actor !== null);
}

export async function addFavoriteActor(userId: string, actorId: string): Promise<void> {
  // @contract: upsert prevents constraint violation on rapid double-tap
  const { error } = await supabase
    .from('favorite_actors')
    .upsert({ user_id: userId, actor_id: actorId }, { onConflict: 'user_id,actor_id' });

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

// @contract: uses .maybeSingle() — returns null on not-found (unlike fetchMovieById which uses .single() and throws PGRST116). Callers can safely check null without try/catch.
export async function fetchActorById(id: string): Promise<Actor | null> {
  return unwrapOne(await supabase.from('actors').select('*').eq('id', id).maybeSingle());
}

// @coupling: joins movie:movies(*) — the ActorCredit type expects movie as optional Movie.
export async function fetchActorFilmography(actorId: string): Promise<ActorCredit[]> {
  const { data, error } = await supabase
    .from('movie_cast')
    .select('*, movie:movies(*)')
    .eq('actor_id', actorId);

  if (error) throw error;

  // @invariant: deduplicates by movie_id — an actor credited as both cast AND crew for the same movie shows once (keeps the first row encountered, which is arbitrary since no ORDER BY was specified in the query). The "kept" credit's role_name is displayed in the filmography UI.
  const seen = new Set<string>();
  const deduped = (data ?? []).filter((c) => {
    if (!c.movie_id || seen.has(c.movie_id)) return false;
    seen.add(c.movie_id);
    return true;
  });

  // Sort by movie release_date descending (newest first)
  return deduped.sort((a, b) => {
    const dateA = (a as ActorCredit).movie?.release_date ?? /* istanbul ignore next */ '';
    const dateB = (b as ActorCredit).movie?.release_date ?? /* istanbul ignore next */ '';
    return dateB.localeCompare(dateA);
  }) as ActorCredit[];
}
