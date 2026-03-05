/**
 * Sync engine — shared logic for importing/refreshing movies and actors from TMDB.
 * Used by API routes. Server-side only.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getMovieDetails,
  getPersonDetails,
  extractTrailerUrl,
  extractKeyCrewMembers,
  TMDB_IMAGE,
} from './tmdb';
import { maybeUploadImage, R2_BUCKETS } from './r2-sync';

// ── Result types ──────────────────────────────────────────────────────────────

export interface ImportMovieResult {
  movieId: string;
  title: string;
  tmdbId: number;
  isNew: boolean;
  castCount: number;
  crewCount: number;
}

interface RefreshActorResult {
  actorId: string;
  name: string;
  updated: boolean;
  fields: string[];
}

// ── Movie import/refresh ──────────────────────────────────────────────────────

/**
 * Import or refresh a single movie from TMDB.
 * Mirrors the logic from scripts/seed-telugu-movies.ts processMovie().
 *
 * - Fetches movie details + credits + videos from TMDB
 * - Uploads poster + backdrop to R2 with variants
 * - Upserts movie (onConflict: tmdb_id)
 * - Deletes existing cast, re-inserts top 15 cast + key crew
 * - Uploads actor photos to R2
 */
export async function processMovieFromTmdb(
  tmdbId: number,
  apiKey: string,
  supabase: SupabaseClient,
): Promise<ImportMovieResult> {
  const detail = await getMovieDetails(tmdbId, apiKey);

  const director = detail.credits.crew.find((c) => c.job === 'Director')?.name ?? null;
  const tmpKey = String(tmdbId);

  // Upload poster + backdrop to R2
  const [posterUrl, backdropUrl] = await Promise.all([
    maybeUploadImage(
      detail.poster_path,
      R2_BUCKETS.moviePosters,
      `${tmpKey}.jpg`,
      TMDB_IMAGE.poster,
    ),
    maybeUploadImage(
      detail.backdrop_path,
      R2_BUCKETS.movieBackdrops,
      `${tmpKey}.jpg`,
      TMDB_IMAGE.backdrop,
    ),
  ]);

  const trailerUrl = extractTrailerUrl(detail.videos.results);
  const genres = detail.genres.map((g) => g.name);

  // Check if movie exists to determine isNew
  const { data: existing } = await supabase
    .from('movies')
    .select('id')
    .eq('tmdb_id', tmdbId)
    .maybeSingle();

  const isNew = !existing;

  // Upsert movie — only TMDB-sourced fields (certification, is_featured omitted)
  const { data: movie, error: movieErr } = await supabase
    .from('movies')
    .upsert(
      {
        tmdb_id: detail.id,
        title: detail.title,
        synopsis: detail.overview || null,
        release_date: detail.release_date,
        runtime: detail.runtime ?? null,
        genres,
        poster_url: posterUrl,
        backdrop_url: backdropUrl,
        trailer_url: trailerUrl,
        director,
        in_theaters: false,
        original_language: 'te',
        tmdb_last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'tmdb_id', ignoreDuplicates: false },
    )
    .select('id')
    .single();

  if (movieErr) throw new Error(`Movie upsert failed: ${movieErr.message}`);
  const movieId = movie.id as string;

  // Delete existing cast for clean re-sync
  await supabase.from('movie_cast').delete().eq('movie_id', movieId);

  // Upsert top 15 cast
  const topCast = detail.credits.cast.slice(0, 15);
  let castCount = 0;

  for (const castMember of topCast) {
    const photoUrl = await maybeUploadImage(
      castMember.profile_path,
      R2_BUCKETS.actorPhotos,
      `${castMember.id}.jpg`,
      TMDB_IMAGE.profile,
    );

    const { data: actor, error: actorErr } = await supabase
      .from('actors')
      .upsert(
        {
          tmdb_person_id: castMember.id,
          name: castMember.name,
          photo_url: photoUrl,
          person_type: 'actor',
          gender: castMember.gender ?? null,
        },
        { onConflict: 'tmdb_person_id', ignoreDuplicates: false },
      )
      .select('id')
      .single();

    if (actorErr) continue;

    await supabase.from('movie_cast').insert({
      movie_id: movieId,
      actor_id: actor.id,
      role_name: castMember.character || null,
      display_order: castMember.order,
      credit_type: 'cast',
      role_order: null,
    });
    castCount++;
  }

  // Upsert key crew
  const keyCrew = extractKeyCrewMembers(detail.credits.crew);
  let crewCount = 0;

  for (const crewMember of keyCrew) {
    const photoUrl = await maybeUploadImage(
      crewMember.profile_path,
      R2_BUCKETS.actorPhotos,
      `${crewMember.id}.jpg`,
      TMDB_IMAGE.profile,
    );

    const { data: actor, error: actorErr } = await supabase
      .from('actors')
      .upsert(
        {
          tmdb_person_id: crewMember.id,
          name: crewMember.name,
          photo_url: photoUrl,
          person_type: 'technician',
          gender: crewMember.gender ?? null,
        },
        { onConflict: 'tmdb_person_id', ignoreDuplicates: false },
      )
      .select('id')
      .single();

    if (actorErr) continue;

    await supabase.from('movie_cast').insert({
      movie_id: movieId,
      actor_id: actor.id,
      role_name: crewMember.roleName,
      display_order: 0,
      credit_type: 'crew',
      role_order: crewMember.roleOrder,
    });
    crewCount++;
  }

  return {
    movieId,
    title: detail.title,
    tmdbId: detail.id,
    isNew,
    castCount,
    crewCount,
  };
}

// ── Actor refresh ─────────────────────────────────────────────────────────────

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
    `${tmdbPersonId}.jpg`,
    TMDB_IMAGE.profile,
  );

  // Get current actor data to determine what changed
  const { data: current } = await supabase
    .from('actors')
    .select('biography, place_of_birth, birth_date, photo_url, gender, name')
    .eq('id', actorId)
    .single();

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

// Re-export sync log helpers for backwards compatibility
export { createSyncLog, completeSyncLog } from './sync-log';
