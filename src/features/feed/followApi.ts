import { supabase } from '@/lib/supabase';
import type { EntityFollow, EnrichedFollow, FeedEntityType } from '@shared/types';

// @contract: shared helper to unwrap Supabase query result with error handling
function unwrap<T>(result: { data: T[] | null; error: { message: string } | null }): T[] {
  if (result.error) throw result.error;
  return result.data ?? /* istanbul ignore next */ [];
}

// @boundary: entity_id is a UUID referencing different tables depending on entity_type (movies, actors, production_houses, profiles). There's no FK constraint — if the referenced entity is deleted, the follow row persists as an orphan. fetchEnrichedFollows handles this by showing name='Deleted', but the follow still counts in the user's follows list.
export async function fetchUserFollows(userId: string): Promise<EntityFollow[]> {
  const { data, error } = await supabase
    .from('entity_follows')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? /* istanbul ignore next */ [];
}

// @contract: uses upsert to safely handle duplicate follow attempts (e.g. rapid taps or stale followSet)
export async function followEntity(
  userId: string,
  entityType: FeedEntityType,
  entityId: string,
): Promise<void> {
  const { error } = await supabase
    .from('entity_follows')
    .upsert(
      { user_id: userId, entity_type: entityType, entity_id: entityId },
      { onConflict: 'user_id,entity_type,entity_id' },
    );
  if (error) throw error;
}

// @assumes: entity_id is always a valid UUID for the corresponding table. If entity_id contains a non-UUID value, the .in('id', [...]) query returns empty results — those follows silently show as 'Deleted' with no error.
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

  // @contract: queries all 4 entity types in parallel, including user profiles
  const [movies, actors, houses, users] = await Promise.all([
    grouped.movie.length > 0
      ? supabase.from('movies').select('id, title, poster_url').in('id', grouped.movie).then(unwrap)
      : [],
    grouped.actor.length > 0
      ? supabase.from('actors').select('id, name, photo_url').in('id', grouped.actor).then(unwrap)
      : [],
    grouped.production_house.length > 0
      ? supabase
          .from('production_houses')
          .select('id, name, logo_url')
          .in('id', grouped.production_house)
          .then(unwrap)
      : [],
    grouped.user.length > 0
      ? supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', grouped.user)
          .then(unwrap)
      : [],
  ]);

  const lookup = new Map<string, { name: string; image_url: string | null }>();
  for (const m of movies) lookup.set(m.id, { name: m.title, image_url: m.poster_url });
  for (const a of actors) lookup.set(a.id, { name: a.name, image_url: a.photo_url });
  for (const h of houses) lookup.set(h.id, { name: h.name, image_url: h.logo_url });
  for (const u of users) lookup.set(u.id, { name: u.display_name, image_url: u.avatar_url });

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

// @edge: delete matches on all three columns (user_id, entity_type, entity_id). If the follow doesn't exist (already unfollowed via another device), Supabase returns success with 0 affected rows — no error. The caller's optimistic update already removed it from the local set, so the UI stays consistent.
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
