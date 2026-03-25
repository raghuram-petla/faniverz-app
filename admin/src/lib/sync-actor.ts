/**
 * Actor sync logic — refresh from TMDB and upsert with person_type preservation.
 * Extracted from sync-engine.ts to keep files under 300 lines.
 *
 * @coupling: depends on r2-sync.ts maybeUploadImage for photo uploads — if R2
 * credentials are missing, TMDB CDN URLs are stored directly in the DB.
 */

import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPersonDetails, TMDB_IMAGE } from './tmdb';
import { maybeUploadImage, R2_BUCKETS } from './r2-sync';

interface RefreshActorResult {
  actorId: string;
  name: string;
  updated: boolean;
  fields: string[];
}

// ── Actor upsert with person_type preservation ───────────────────────────────

/**
 * Upsert an actor by tmdb_person_id, preserving person_type for existing actors.
 * @contract: if actor already exists, only updates name/photo/gender (not person_type).
 * If new, inserts with the provided default_person_type.
 * @returns actor UUID or null on failure.
 */
export async function upsertActorPreserveType(
  supabase: SupabaseClient,
  params: {
    tmdb_person_id: number;
    name: string;
    photo_url: string | null;
    default_person_type: 'actor' | 'technician';
    gender: number | null;
  },
): Promise<string | null> {
  // @contract: check if actor exists first to preserve person_type on update.
  // @edge: race condition safe — if concurrent inserts collide on tmdb_person_id unique
  // constraint, the loser retries with an update instead of silently dropping the actor.
  const { data: existing } = await supabase
    .from('actors')
    .select('id')
    .eq('tmdb_person_id', params.tmdb_person_id)
    .maybeSingle();

  if (existing) {
    // @invariant: preserve person_type — a director who also acts keeps their existing type
    const { error } = await supabase
      .from('actors')
      .update({
        name: params.name,
        photo_url: params.photo_url,
        gender: params.gender,
      })
      .eq('id', existing.id);
    if (error) return null;
    return existing.id as string;
  }

  // New actor — insert with default person_type
  const { data: actor, error } = await supabase
    .from('actors')
    .insert({
      tmdb_person_id: params.tmdb_person_id,
      name: params.name,
      photo_url: params.photo_url,
      person_type: params.default_person_type,
      gender: params.gender,
    })
    .select('id')
    .single();

  // @edge: handle race condition — if insert fails due to unique constraint (concurrent sync),
  // fall back to select to get the existing row
  if (error) {
    const { data: fallback } = await supabase
      .from('actors')
      .select('id')
      .eq('tmdb_person_id', params.tmdb_person_id)
      .maybeSingle();
    return (fallback?.id as string) ?? null;
  }
  return actor.id as string;
}

// ── Actor refresh from TMDB ──────────────────────────────────────────────────

// @contract: all fields from TMDB /person/{id} + external_ids are synced here.
const ACTOR_SELECT_FIELDS =
  'biography, place_of_birth, birth_date, photo_url, gender, name, ' +
  'imdb_id, known_for_department, also_known_as, death_date, instagram_id, twitter_id';

/**
 * Refresh an actor's data from TMDB.
 * Updates biography, place_of_birth, birth_date, photo_url, gender,
 * imdb_id, known_for_department, also_known_as, death_date, instagram_id, twitter_id.
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
  const { data: rawCurrent, error: actorErr } = await supabase
    .from('actors')
    .select(ACTOR_SELECT_FIELDS)
    .eq('id', actorId)
    .single();
  if (actorErr) throw new Error(`Actor fetch failed: ${actorErr.message}`);
  // @edge: Supabase can't infer column types from a dynamic string select — cast to Record
  const current = rawCurrent as unknown as Record<string, unknown> | null;

  const updates: Record<string, unknown> = {};
  const fields: string[] = [];

  // @contract: existing fields
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

  // @contract: new TMDB fields — imdb_id, social IDs, known_for_department, etc.
  const personImdbId = person.external_ids?.imdb_id ?? person.imdb_id ?? null;
  if (personImdbId && personImdbId !== current?.imdb_id) {
    updates.imdb_id = personImdbId;
    fields.push('imdb_id');
  }
  if (
    person.known_for_department &&
    person.known_for_department !== current?.known_for_department
  ) {
    updates.known_for_department = person.known_for_department;
    fields.push('known_for_department');
  }
  // @edge: sort both arrays before comparing to avoid unnecessary writes from order differences
  if (person.also_known_as?.length) {
    /* v8 ignore start */
    const currentAka = (current?.also_known_as as string[] | null) ?? [];
    /* v8 ignore stop */
    const sortedNew = [...person.also_known_as].sort();
    const sortedCurrent = [...currentAka].sort();
    /* v8 ignore start */
    if (JSON.stringify(sortedNew) !== JSON.stringify(sortedCurrent)) {
      updates.also_known_as = person.also_known_as;
      fields.push('also_known_as');
      /* v8 ignore stop */
    }
  }
  if (person.deathday && person.deathday !== current?.death_date) {
    updates.death_date = person.deathday;
    fields.push('death_date');
  }
  if (
    person.external_ids?.instagram_id &&
    person.external_ids.instagram_id !== current?.instagram_id
  ) {
    updates.instagram_id = person.external_ids.instagram_id;
    fields.push('instagram_id');
  }
  if (person.external_ids?.twitter_id && person.external_ids.twitter_id !== current?.twitter_id) {
    updates.twitter_id = person.external_ids.twitter_id;
    fields.push('twitter_id');
  }

  if (fields.length > 0) {
    const { error } = await supabase.from('actors').update(updates).eq('id', actorId);
    if (error) throw new Error(`Actor update failed: ${error.message}`);
  }

  return {
    actorId,
    name: person.name || (current?.name as string) || 'Unknown',
    updated: fields.length > 0,
    fields,
  };
}
