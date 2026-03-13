import { supabase } from '@/lib/supabase';
import type { EntityFollow, EnrichedFollow, FeedEntityType } from '@shared/types';

export async function fetchUserFollows(userId: string): Promise<EntityFollow[]> {
  const { data, error } = await supabase
    .from('entity_follows')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function followEntity(
  userId: string,
  entityType: FeedEntityType,
  entityId: string,
): Promise<void> {
  const { error } = await supabase
    .from('entity_follows')
    .insert({ user_id: userId, entity_type: entityType, entity_id: entityId });
  if (error) throw error;
}

export async function fetchEnrichedFollows(userId: string): Promise<EnrichedFollow[]> {
  const follows = await fetchUserFollows(userId);
  if (follows.length === 0) return [];

  const grouped: Record<FeedEntityType, string[]> = {
    movie: [],
    actor: [],
    production_house: [],
    user: [],
  };
  for (const f of follows) {
    grouped[f.entity_type]?.push(f.entity_id);
  }

  const [movies, actors, houses] = await Promise.all([
    grouped.movie.length > 0
      ? supabase
          .from('movies')
          .select('id, title, poster_url')
          .in('id', grouped.movie)
          .then((r) => {
            if (r.error) throw r.error;
            return r.data ?? [];
          })
      : [],
    grouped.actor.length > 0
      ? supabase
          .from('actors')
          .select('id, name, photo_url')
          .in('id', grouped.actor)
          .then((r) => {
            if (r.error) throw r.error;
            return r.data ?? [];
          })
      : [],
    grouped.production_house.length > 0
      ? supabase
          .from('production_houses')
          .select('id, name, logo_url')
          .in('id', grouped.production_house)
          .then((r) => {
            if (r.error) throw r.error;
            return r.data ?? [];
          })
      : [],
  ]);

  const lookup = new Map<string, { name: string; image_url: string | null }>();
  for (const m of movies) lookup.set(m.id, { name: m.title, image_url: m.poster_url });
  for (const a of actors) lookup.set(a.id, { name: a.name, image_url: a.photo_url });
  for (const h of houses) lookup.set(h.id, { name: h.name, image_url: h.logo_url });

  return follows.map((f) => {
    const info = lookup.get(f.entity_id);
    return {
      entity_type: f.entity_type,
      entity_id: f.entity_id,
      name: info?.name ?? 'Deleted',
      image_url: info?.image_url ?? null,
      created_at: f.created_at,
    };
  });
}

export async function unfollowEntity(
  userId: string,
  entityType: FeedEntityType,
  entityId: string,
): Promise<void> {
  const { error } = await supabase
    .from('entity_follows')
    .delete()
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);
  if (error) throw error;
}
