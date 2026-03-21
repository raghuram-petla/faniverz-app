/**
 * Sync engine — shared logic for importing/refreshing movies and actors from TMDB.
 * Used by API routes. Server-side only.
 *
 * @boundary: TMDB API + R2 uploads + Supabase writes happen in sequence, not in a
 * transaction. A crash after movie upsert but before cast insert leaves a movie row
 * with zero cast/crew — the app renders "No cast" but re-running the same import
 * overwrites cleanly because movie upserts on tmdb_id and cast is delete-then-reinsert.
 *
 * @coupling: depends on r2-sync.ts maybeUploadImage for all image uploads — if R2
 * credentials are missing, the entire sync still succeeds but stores TMDB CDN URLs
 * directly in the DB, which will break if TMDB changes their image CDN paths.
 */

import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getMovieDetails, TMDB_IMAGE } from './tmdb';
import { extractTrailerUrl, extractKeyCrewMembers, extractTeluguTranslation } from './tmdbTypes';
import { maybeUploadImage, R2_BUCKETS } from './r2-sync';
import { syncAllImages } from './sync-images';
import { syncVideos, syncWatchProviders, syncKeywords } from './sync-extended';

// ── Result types ──────────────────────────────────────────────────────────────

export interface ImportMovieResult {
  movieId: string;
  title: string;
  tmdbId: number;
  isNew: boolean;
  castCount: number;
  crewCount: number;
}

// ── Movie import/refresh ──────────────────────────────────────────────────────

/**
 * Import or refresh a single movie from TMDB.
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
  // @sideeffect: parallel R2 uploads — if one fails the other may succeed, leaving
  // the movie with a poster but no backdrop (or vice versa). The failed URL falls
  // back to the TMDB CDN URL via maybeUploadImage, so the app still renders images.
  // @contract: UUID keys avoid collisions between manual uploads and TMDB sync
  const [posterUrl, backdropUrl] = await Promise.all([
    maybeUploadImage(
      detail.poster_path,
      R2_BUCKETS.moviePosters,
      `${randomUUID()}.jpg`,
      TMDB_IMAGE.poster,
    ),
    maybeUploadImage(
      detail.backdrop_path,
      R2_BUCKETS.movieBackdrops,
      `${randomUUID()}.jpg`,
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

  // @contract: extract Telugu translation and IMDb ID from extended response
  const { titleTe, synopsisTe } = extractTeluguTranslation(detail.translations);
  const imdbId = detail.external_ids?.imdb_id ?? null;

  // @invariant: upsert only writes TMDB-sourced fields — admin-curated fields
  // (certification, is_featured, release_type, ott_platform_id, ott_release_date)
  // are intentionally omitted so a re-sync never overwrites manual admin edits.
  const { data: movie, error: movieErr } = await supabase
    .from('movies')
    .upsert(
      {
        tmdb_id: detail.id,
        title: detail.title,
        synopsis: detail.overview || null,
        release_date: detail.release_date,
        runtime: detail.runtime || null,
        genres,
        poster_url: posterUrl,
        backdrop_url: backdropUrl,
        trailer_url: trailerUrl,
        director,
        ...(isNew && { in_theaters: false }),
        original_language: detail.original_language ?? 'te',
        tmdb_last_synced_at: new Date().toISOString(),
        // @contract: extended fields from expanded append_to_response
        ...(imdbId && { imdb_id: imdbId }),
        ...(titleTe && { title_te: titleTe }),
        ...(synopsisTe && { synopsis_te: synopsisTe }),
      },
      { onConflict: 'tmdb_id', ignoreDuplicates: false },
    )
    .select('id')
    .single();

  if (movieErr) throw new Error(`Movie upsert failed: ${movieErr.message}`);
  const movieId = movie.id as string;

  // @sideeffect: extended sync — images first (updates movies.poster_url/backdrop_url),
  // then videos, watch providers, keywords in parallel.
  // Errors are logged but don't fail the overall import.
  try {
    await syncAllImages(movieId, tmdbId, apiKey, supabase, {
      posterPath: detail.poster_path,
      backdropPath: detail.backdrop_path,
    });
    await Promise.all([
      syncVideos(movieId, detail.videos.results, supabase),
      syncWatchProviders(movieId, tmdbId, apiKey, supabase),
      syncKeywords(movieId, detail, supabase),
    ]);
  } catch (extErr) {
    console.warn(`Extended sync partial failure for ${detail.title}:`, extErr);
  }

  // @sideeffect: delete-then-reinsert is NOT atomic — if the process crashes between
  // delete and the cast insert loop, the movie has zero cast until the next re-sync.
  // A transaction would prevent this but Supabase JS client doesn't support multi-statement txns.
  const { error: castDeleteErr } = await supabase
    .from('movie_cast')
    .delete()
    .eq('movie_id', movieId);
  if (castDeleteErr) throw new Error(`Cast delete failed: ${castDeleteErr.message}`);

  // @edge: cast members are processed sequentially (not parallel) to avoid
  // overwhelming R2 with concurrent image uploads. If an actor upsert fails
  // (actorErr), that cast member is silently skipped — castCount will be less
  // than topCast.length but no error is thrown to the caller.
  // @assumes: TMDB cast array is pre-sorted by billing order (castMember.order).
  const topCast = detail.credits.cast.slice(0, 15);
  let castCount = 0;

  for (const castMember of topCast) {
    const photoUrl = await maybeUploadImage(
      castMember.profile_path,
      R2_BUCKETS.actorPhotos,
      `${randomUUID()}.jpg`,
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

    const { error: castInsertErr } = await supabase.from('movie_cast').insert({
      movie_id: movieId,
      actor_id: actor.id,
      role_name: castMember.character || null,
      display_order: castMember.order,
      credit_type: 'cast',
      role_order: null,
    });
    if (!castInsertErr) castCount++;
  }

  // @coupling: keyCrew filtering is defined in tmdb.ts CREW_JOB_MAP — only Director,
  // Producer, Executive Producer, Music Composer, DOP, and Editor are synced.
  // Adding new crew roles requires updating CREW_JOB_MAP, not this file.
  const keyCrew = extractKeyCrewMembers(detail.credits.crew);
  let crewCount = 0;

  for (const crewMember of keyCrew) {
    const photoUrl = await maybeUploadImage(
      crewMember.profile_path,
      R2_BUCKETS.actorPhotos,
      `${randomUUID()}.jpg`,
      TMDB_IMAGE.profile,
    );

    const { data: actor, error: actorErr } = await supabase
      .from('actors')
      .upsert(
        {
          tmdb_person_id: crewMember.id,
          name: crewMember.name,
          photo_url: photoUrl,
          // @invariant: crew are stored as 'technician' in the actors table, cast as 'actor'.
          // The mobile app filters on person_type for "Cast" vs "Crew" sections.
          // If a person appears as both actor and crew in different movies, the LAST
          // sync wins because upsert on tmdb_person_id overwrites person_type.
          person_type: 'technician',
          gender: crewMember.gender ?? null,
        },
        { onConflict: 'tmdb_person_id', ignoreDuplicates: false },
      )
      .select('id')
      .single();

    if (actorErr) continue;

    const { error: crewInsertErr } = await supabase.from('movie_cast').insert({
      movie_id: movieId,
      actor_id: actor.id,
      role_name: crewMember.roleName,
      display_order: 0,
      credit_type: 'crew',
      role_order: crewMember.roleOrder,
    });
    if (!crewInsertErr) crewCount++;
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

// Re-export sync log helpers for backwards compatibility
export { createSyncLog, completeSyncLog } from './sync-log';
export { processActorRefresh } from './sync-actor';
