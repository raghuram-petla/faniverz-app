import { supabase } from '@/lib/supabase';
import { Actor, ActorCredit, FavoriteActor } from '@/types';

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
  const { data, error } = await supabase.from('actors').select('*').eq('id', id).single();

  if (error) throw error;
  return data;
}

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
