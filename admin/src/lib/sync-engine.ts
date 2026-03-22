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
import {
  extractTrailerUrl,
  extractKeyCrewMembers,
  extractTeluguTranslation,
  extractIndiaCertification,
} from './tmdbTypes';
import { maybeUploadImage, R2_BUCKETS } from './r2-sync';
import { syncAllImages } from './sync-images';
import { syncVideos, syncKeywords, syncProductionCompanies } from './sync-extended';
import { syncWatchProvidersMultiCountry } from './sync-watch-providers';
import { upsertActorPreserveType } from './sync-actor';

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
 * - Fetches movie details + credits + videos + release_dates from TMDB
 * - Uploads poster + backdrop to R2 with variants
 * - Upserts movie (onConflict: tmdb_id) with all TMDB-sourced fields
 * - Deletes existing cast, re-inserts ALL cast + key crew
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

  // @contract: extract Telugu translation, IMDb ID, and India certification
  const { titleTe, synopsisTe } = extractTeluguTranslation(detail.translations);
  const imdbId = detail.external_ids?.imdb_id ?? null;
  const indiaCert = extractIndiaCertification(detail.release_dates);

  // @invariant: upsert only writes TMDB-sourced fields — admin-curated fields
  // (is_featured, ott_platform_id, ott_release_date) are intentionally omitted
  // so a re-sync never overwrites manual admin edits.
  // @contract: certification is only auto-filled on NEW movies to avoid overwriting admin edits.
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
        ...(isNew && indiaCert && { certification: indiaCert }),
        original_language: detail.original_language ?? 'te',
        tmdb_last_synced_at: new Date().toISOString(),
        // @contract: extended fields from expanded append_to_response
        ...(imdbId && { imdb_id: imdbId }),
        ...(titleTe && { title_te: titleTe }),
        ...(synopsisTe && { synopsis_te: synopsisTe }),
        // @contract: new TMDB metadata fields
        tagline: detail.tagline || null,
        tmdb_status: detail.status || null,
        tmdb_vote_average: detail.vote_average ?? null,
        tmdb_vote_count: detail.vote_count ?? null,
        // @edge: TMDB returns 0 for unknown budget/revenue — treat as null like runtime
        budget: detail.budget || null,
        revenue: detail.revenue || null,
        tmdb_popularity: detail.popularity ?? null,
        spoken_languages: detail.spoken_languages?.map((l) => l.iso_639_1) ?? null,
        ...(detail.belongs_to_collection && {
          collection_id: detail.belongs_to_collection.id,
          collection_name: detail.belongs_to_collection.name,
        }),
      },
      { onConflict: 'tmdb_id', ignoreDuplicates: false },
    )
    .select('id')
    .single();

  if (movieErr) throw new Error(`Movie upsert failed: ${movieErr.message}`);
  const movieId = movie.id as string;

  // @sideeffect: extended sync — images first (updates movies.poster_url/backdrop_url),
  // then videos, watch providers, keywords, production companies in parallel.
  // Errors are logged but don't fail the overall import.
  try {
    await syncAllImages(movieId, tmdbId, apiKey, supabase, {
      posterPath: detail.poster_path,
      backdropPath: detail.backdrop_path,
    });
    await Promise.all([
      syncVideos(movieId, detail.videos.results, supabase),
      syncWatchProvidersMultiCountry(movieId, tmdbId, apiKey, supabase),
      syncKeywords(movieId, detail, supabase),
      syncProductionCompanies(movieId, detail.production_companies ?? [], supabase),
    ]);
  } catch (extErr) {
    console.warn(`Extended sync partial failure for ${detail.title}:`, extErr);
  }

  // @sideeffect: delete-then-reinsert is NOT atomic — if the process crashes between
  // delete and the cast insert loop, the movie has zero cast until the next re-sync.
  const { error: castDeleteErr } = await supabase
    .from('movie_cast')
    .delete()
    .eq('movie_id', movieId);
  if (castDeleteErr) throw new Error(`Cast delete failed: ${castDeleteErr.message}`);

  // @contract: sync ALL cast (no limit) — TMDB cast is pre-sorted by billing order.
  // @edge: actors are upserted with person_type preserved for existing actors to avoid
  // the overwrite bug where a director-who-acts gets their type clobbered.
  const allCast = detail.credits.cast;
  let castCount = 0;

  for (const castMember of allCast) {
    const photoUrl = await maybeUploadImage(
      castMember.profile_path,
      R2_BUCKETS.actorPhotos,
      `${randomUUID()}.jpg`,
      TMDB_IMAGE.profile,
    );

    const actorId = await upsertActorPreserveType(supabase, {
      tmdb_person_id: castMember.id,
      name: castMember.name,
      photo_url: photoUrl,
      default_person_type: 'actor',
      gender: castMember.gender ?? null,
    });
    if (!actorId) continue;

    const { error: castInsertErr } = await supabase.from('movie_cast').insert({
      movie_id: movieId,
      actor_id: actorId,
      role_name: castMember.character || null,
      display_order: castMember.order,
      credit_type: 'cast',
      role_order: null,
    });
    if (!castInsertErr) castCount++;
  }

  // @coupling: keyCrew filtering is defined in tmdbTypes.ts CREW_JOB_MAP
  const keyCrew = extractKeyCrewMembers(detail.credits.crew);
  let crewCount = 0;

  for (const crewMember of keyCrew) {
    const photoUrl = await maybeUploadImage(
      crewMember.profile_path,
      R2_BUCKETS.actorPhotos,
      `${randomUUID()}.jpg`,
      TMDB_IMAGE.profile,
    );

    const actorId = await upsertActorPreserveType(supabase, {
      tmdb_person_id: crewMember.id,
      name: crewMember.name,
      photo_url: photoUrl,
      default_person_type: 'technician',
      gender: crewMember.gender ?? null,
    });
    if (!actorId) continue;

    const { error: crewInsertErr } = await supabase.from('movie_cast').insert({
      movie_id: movieId,
      actor_id: actorId,
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
