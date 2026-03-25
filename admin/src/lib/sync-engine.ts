// @boundary Sync engine — TMDB import/refresh for movies and actors. Server-side only.
// @coupling r2-sync.ts for image uploads; tmdb.ts for API calls. Not transactional — resumable.

import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getMovieDetails, TMDB_IMAGE } from './tmdb';
import {
  extractKeyCrewMembers,
  extractTeluguTranslation,
  extractIndiaCertification,
} from './tmdbTypes';
import { maybeUploadImage, R2_BUCKETS } from './r2-sync';
import { syncAllImages } from './sync-images';
import { syncVideos, syncKeywords, syncProductionCompanies } from './sync-extended';
import { syncWatchProvidersMultiCountry } from './sync-watch-providers';
import { syncCastCrewAdditive, syncCastCrew } from './sync-cast';

// ── Result types ──────────────────────────────────────────────────────────────

export interface ImportMovieResult {
  movieId: string;
  title: string;
  tmdbId: number;
  isNew: boolean;
  castCount: number;
  crewCount: number;
  posterCount: number;
  backdropCount: number;
}

/** @contract: options for processMovieFromTmdb */
interface ProcessMovieOptions {
  /** @contract: when true, uses additive sync for cast/crew/images/extended
   * so that 504 retries make forward progress instead of starting from scratch */
  resumable?: boolean;
  /** @edge: pass original_language (e.g. "te") to fetch videos in that language
   * alongside English. Without this, only en + untagged videos are fetched. */
  originalLanguage?: string;
}

// ── Movie import/refresh ──────────────────────────────────────────────────────

/**
 * Import or refresh a single movie from TMDB.
 * - Fetches movie details + credits + videos + release_dates from TMDB
 * - Uploads poster + backdrop to R2 with variants
 * - Upserts movie (onConflict: tmdb_id) with all TMDB-sourced fields
 * - Syncs cast/crew, extended metadata, and gallery images
 *
 * @contract: when resumable=true, phases are reordered for priority (cast first,
 * images last) and all operations are additive (skip already-done items).
 */
export async function processMovieFromTmdb(
  tmdbId: number,
  apiKey: string,
  supabase: SupabaseClient,
  options?: ProcessMovieOptions,
): Promise<ImportMovieResult> {
  const detail = await getMovieDetails(tmdbId, apiKey, options?.originalLanguage);

  // @edge: picks the FIRST Director credit — movies with co-directors (e.g. Russo Brothers)
  // only store one name. The full crew list is synced separately via syncCastCrew.
  const director = detail.credits.crew.find((c) => c.job === 'Director')?.name ?? null;
  // @sideeffect: parallel R2 uploads — if one fails the other may succeed
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

  // @deprecated trailer_url is redundant — trailers are stored in movie_videos table.
  // Stop writing trailer_url during sync to prevent ghost duplication in admin UI.
  const genres = detail.genres.map((g) => g.name);

  const { data: existing } = await supabase
    .from('movies')
    .select('id')
    .eq('tmdb_id', tmdbId)
    .maybeSingle();

  const isNew = !existing;

  const { titleTe, synopsisTe } = extractTeluguTranslation(detail.translations);
  const imdbId = detail.external_ids?.imdb_id ?? null;
  const indiaCert = extractIndiaCertification(detail.release_dates);

  // @invariant: upsert only writes TMDB-sourced fields — admin-curated fields (release_type,
  // in_theaters, ott_release_date, curated descriptions, etc.) are preserved across re-syncs.
  // @edge: if TMDB returns empty overview, synopsis is set to null, overwriting any previously
  // synced synopsis. Admin-written synopsis (via the edit form) would also be overwritten.
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
        // @deprecated trailer_url no longer written — movie_videos is the single source of truth
        director,
        ...(isNew && { in_theaters: false }),
        ...(isNew && indiaCert && { certification: indiaCert }),
        original_language: detail.original_language ?? 'te',
        tmdb_last_synced_at: new Date().toISOString(),
        ...(imdbId && { imdb_id: imdbId }),
        ...(titleTe && { title_te: titleTe }),
        ...(synopsisTe && { synopsis_te: synopsisTe }),
        tagline: detail.tagline || null,
        tmdb_status: detail.status || null,
        tmdb_vote_average: detail.vote_average ?? null,
        tmdb_vote_count: detail.vote_count ?? null,
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

  if (options?.resumable) {
    return resumableSync(movieId, detail, tmdbId, apiKey, supabase, isNew);
  }
  return fullReplaceSync(movieId, detail, tmdbId, apiKey, supabase, isNew);
}

/**
 * Resumable sync — additive operations, reordered for priority.
 * Each retry skips already-completed items and makes forward progress.
 * @contract: phase order: Cast/Crew → Extended → Gallery Images (images last, least critical)
 */
async function resumableSync(
  movieId: string,
  detail: Awaited<ReturnType<typeof getMovieDetails>>,
  tmdbId: number,
  apiKey: string,
  supabase: SupabaseClient,
  isNew: boolean,
): Promise<ImportMovieResult> {
  // Phase 1: Cast/Crew (additive, parallelized)
  const { castCount, crewCount } = await syncCastCrewAdditive(movieId, detail, supabase);

  // Phase 2: Extended sync (additive — videos/keywords skip existing)
  try {
    await Promise.all([
      syncVideos(movieId, detail.videos.results, supabase),
      syncWatchProvidersMultiCountry(movieId, tmdbId, apiKey, supabase),
      syncKeywords(movieId, detail, supabase),
      syncProductionCompanies(movieId, detail.production_companies ?? [], supabase),
    ]);
  } catch (extErr) {
    console.warn(`Extended sync partial failure for ${detail.title}:`, extErr);
  }

  // Phase 3: Gallery images (additive, parallelized — slowest, runs last)
  let imgCounts = { posterCount: 0, backdropCount: 0 };
  try {
    imgCounts = await syncAllImages(movieId, tmdbId, apiKey, supabase, {
      posterPath: detail.poster_path,
      backdropPath: detail.backdrop_path,
    });
  } catch (imgErr) {
    console.warn(`Image sync failure for ${detail.title}:`, imgErr);
  }

  return {
    movieId,
    title: detail.title,
    tmdbId: detail.id,
    isNew,
    castCount,
    crewCount,
    ...imgCounts,
  };
}

/**
 * Full-replace sync — delete-then-reinsert pattern (used by refresh-movie).
 * @contract: keeps original behavior for non-resumable callers.
 */
async function fullReplaceSync(
  movieId: string,
  detail: Awaited<ReturnType<typeof getMovieDetails>>,
  tmdbId: number,
  apiKey: string,
  supabase: SupabaseClient,
  isNew: boolean,
): Promise<ImportMovieResult> {
  let imgCounts = { posterCount: 0, backdropCount: 0 };
  try {
    imgCounts = await syncAllImages(movieId, tmdbId, apiKey, supabase, {
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

  // @sideeffect: delegate to syncCastCrew with forceResync=true (delete-then-reinsert)
  const castFields: string[] = [];
  await syncCastCrew(movieId, detail, true, supabase, castFields);
  const castCount = detail.credits.cast.length;
  const crewCount = extractKeyCrewMembers(detail.credits.crew).length;

  return {
    movieId,
    title: detail.title,
    tmdbId: detail.id,
    isNew,
    castCount,
    crewCount,
    ...imgCounts,
  };
}
export { createSyncLog, completeSyncLog } from './sync-log';
export { processActorRefresh } from './sync-actor';
