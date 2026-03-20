/**
 * Actor refresh logic — fetches latest data from TMDB and updates the actor row.
 * Extracted from sync-engine.ts to keep files under 300 lines.
 *
 * @coupling: depends on r2-sync.ts maybeUploadImage for photo uploads — if R2
 * credentials are missing, TMDB CDN URLs are stored directly in the DB.
 */

import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPersonDetails, TMDB_IMAGE } from './tmdb';
import { maybeUploadImage, R2_BUCKETS } from './r2-sync';

export interface RefreshActorResult {
  actorId: string;
  name: string;
  updated: boolean;
  fields: string[];
}

/**
 * Refresh an actor's data from TMDB.
 * Updates biography, place_of_birth, birth_date, photo_url, gender.
 */
export async function processActorRefresh(
  actorId: string,
  tmdbPersonId: number,
  apiKey: string,
  supabase: SupabaseClient,
): Promise<RefreshActorResult> {
  const person = await getPersonDetails(tmdbPersonId, apiKey);

  // Upload photo to R2
  const photoUrl = await maybeUploadImage(
    person.profile_path,
    R2_BUCKETS.actorPhotos,
    `${randomUUID()}.jpg`,
    TMDB_IMAGE.profile,
  );

  // Get current actor data to determine what changed
  const { data: current, error: actorErr } = await supabase
    .from('actors')
    .select('biography, place_of_birth, birth_date, photo_url, gender, name')
    .eq('id', actorId)
    .single();
  if (actorErr) throw new Error(`Actor fetch failed: ${actorErr.message}`);

  const updates: Record<string, unknown> = {};
  const fields: string[] = [];

  if (person.name && person.name !== current?.name) {
    updates.name = person.name;
    fields.push('name');
  }
  if (person.biography && person.biography !== current?.biography) {
    updates.biography = person.biography;
    fields.push('biography');
  }
  if (person.place_of_birth && person.place_of_birth !== current?.place_of_birth) {
    updates.place_of_birth = person.place_of_birth;
    fields.push('place_of_birth');
  }
  if (person.birthday && person.birthday !== current?.birth_date) {
    updates.birth_date = person.birthday;
    fields.push('birth_date');
  }
  if (photoUrl && photoUrl !== current?.photo_url) {
    updates.photo_url = photoUrl;
    fields.push('photo_url');
  }
  if (person.gender !== undefined && person.gender !== current?.gender) {
    updates.gender = person.gender;
    fields.push('gender');
  }

  if (fields.length > 0) {
    const { error } = await supabase.from('actors').update(updates).eq('id', actorId);
    if (error) throw new Error(`Actor update failed: ${error.message}`);
  }

  return {
    actorId,
    name: person.name || current?.name || 'Unknown',
    updated: fields.length > 0,
    fields,
  };
}
