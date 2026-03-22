/**
 * Image sync operations — posters and backdrops from TMDB images endpoint.
 * All images stored in unified movie_images table with image_type discriminator.
 * Server-side only.
 *
 * @boundary: makes 1 TMDB API call (getMovieImages) for both posters + backdrops.
 * @coupling: depends on r2-sync.ts for image uploads.
 * @contract: additive sync — only uploads missing images (by tmdb_file_path),
 * making imports resumable across 504 timeouts. Stale cleanup runs only when
 * all images are processed (function completes without timeout).
 */

import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getMovieImages, TMDB_IMAGE } from './tmdb';
import type { TmdbImage } from './tmdbTypes';
import { uploadImageFromUrl, R2_BUCKETS } from './r2-sync';

/** Sort images: Telugu first, then Hindi, English, null, by vote_average desc. */
function sortByLanguagePriority(images: TmdbImage[]): TmdbImage[] {
  return [...images].sort((a, b) => {
    const langOrder = (l: string | null) => (l === 'te' ? 0 : l === 'hi' ? 1 : l === 'en' ? 2 : 3);
    const langDiff = langOrder(a.iso_639_1) - langOrder(b.iso_639_1);
    if (langDiff !== 0) return langDiff;
    return b.vote_average - a.vote_average;
  });
}

/** @contract: query existing tmdb_file_paths for a given movie+image_type */
async function getExistingPaths(
  supabase: SupabaseClient,
  movieId: string,
  imageType: string,
): Promise<Set<string>> {
  // @edge: if query fails, return empty set — caller treats all items as missing (safe, just redundant uploads)
  const { data, error } = await supabase
    .from('movie_images')
    .select('tmdb_file_path')
    .eq('movie_id', movieId)
    .eq('image_type', imageType)
    .not('tmdb_file_path', 'is', null);
  if (error) console.warn('getExistingPaths: query failed', error.message);
  return new Set((data ?? []).map((r) => r.tmdb_file_path as string));
}

/** @sideeffect: delete stale TMDB-synced images not in the current TMDB list */
async function cleanupStaleImages(
  supabase: SupabaseClient,
  movieId: string,
  imageType: string,
  validPaths: Set<string>,
) {
  const { data: allExisting } = await supabase
    .from('movie_images')
    .select('id, tmdb_file_path')
    .eq('movie_id', movieId)
    .eq('image_type', imageType)
    .not('tmdb_file_path', 'is', null);
  const staleIds = (allExisting ?? [])
    .filter((r) => !validPaths.has(r.tmdb_file_path as string))
    .map((r) => r.id as string);
  if (staleIds.length > 0) {
    await supabase.from('movie_images').delete().in('id', staleIds);
  }
}

/**
 * Sync all posters from TMDB images endpoint into movie_images table.
 * Additive: only uploads missing images, skips already-synced ones.
 *
 * @sideeffect: uploads missing posters to R2 in sequential R2 uploads (batch 1 to avoid DNS EBUSY on Vercel free plan).
 */
export async function syncPosters(
  movieId: string,
  tmdbId: number,
  images: { posters: TmdbImage[] },
  supabase: SupabaseClient,
  /** @contract TMDB's main poster path — this image becomes is_main_poster regardless of language sort */
  tmdbMainPosterPath?: string | null,
): Promise<number> {
  if (!images.posters.length) return 0;

  // @contract TMDB's chosen main poster takes priority; remaining sorted by language then vote
  const sorted = sortByLanguagePriority(images.posters);
  if (tmdbMainPosterPath) {
    const mainIdx = sorted.findIndex((p) => p.file_path === tmdbMainPosterPath);
    if (mainIdx > 0) {
      const [main] = sorted.splice(mainIdx, 1);
      sorted.unshift(main);
    }
  }

  // @contract: additive — query existing, only process missing
  const existingPaths = await getExistingPaths(supabase, movieId, 'poster');
  const missing = sorted.filter((p) => !existingPaths.has(p.file_path));
  const indexMap = new Map(sorted.map((p, i) => [p.file_path, i]));
  let count = sorted.length - missing.length; // already-done count

  // @sideeffect: upload missing posters in sequential R2 uploads (batch 1 to avoid DNS EBUSY on Vercel free plan)
  for (let i = 0; i < missing.length; i += 1) {
    const batch = missing.slice(i, i + 1);
    const results = await Promise.all(
      batch.map(async (poster) => {
        const key = `${randomUUID()}.jpg`;
        const imageUrl = await uploadImageFromUrl(
          TMDB_IMAGE.poster(poster.file_path),
          R2_BUCKETS.moviePosters,
          key,
        );
        const sortIdx = indexMap.get(poster.file_path) ?? 0;
        const isMain = sortIdx === 0;

        if (isMain) {
          // @sideeffect: unset existing main poster before setting new one
          await supabase
            .from('movie_images')
            .update({ is_main_poster: false })
            .eq('movie_id', movieId)
            .eq('is_main_poster', true);
        }

        const { error } = await supabase.from('movie_images').insert({
          movie_id: movieId,
          image_url: imageUrl,
          image_type: 'poster',
          title: isMain ? 'Main Poster' : `Poster (${poster.iso_639_1 ?? 'no lang'})`,
          is_main_poster: isMain,
          display_order: sortIdx,
          tmdb_file_path: poster.file_path,
          iso_639_1: poster.iso_639_1,
          width: poster.width,
          height: poster.height,
          vote_average: poster.vote_average,
        });

        if (!error && isMain) {
          await supabase
            .from('movies')
            .update({ poster_url: imageUrl, poster_image_type: 'poster' })
            .eq('id', movieId);
        }
        return { error };
      }),
    );
    // @contract: count successes after batch completes to avoid race on shared counter
    for (const r of results) {
      if (r.error) console.warn('syncPosters: insert failed', r.error.message);
      else count++;
    }
  }

  // @sideeffect: cleanup stale images only when all are processed (function completed)
  await cleanupStaleImages(supabase, movieId, 'poster', new Set(sorted.map((p) => p.file_path)));

  return count;
}

/**
 * Sync all backdrops from TMDB images endpoint into movie_images table.
 * Additive: only uploads missing backdrops, skips already-synced ones.
 *
 * @sideeffect: uploads missing backdrops to R2 in sequential R2 uploads (batch 1 to avoid DNS EBUSY on Vercel free plan).
 */
export async function syncBackdrops(
  movieId: string,
  tmdbId: number,
  images: { backdrops: TmdbImage[] },
  supabase: SupabaseClient,
  /** @contract TMDB's main backdrop path — this image becomes is_main_backdrop */
  tmdbMainBackdropPath?: string | null,
): Promise<number> {
  if (!images.backdrops.length) return 0;

  const sorted = [...images.backdrops].sort((a, b) => b.vote_average - a.vote_average);
  if (tmdbMainBackdropPath) {
    const mainIdx = sorted.findIndex((b) => b.file_path === tmdbMainBackdropPath);
    if (mainIdx > 0) {
      const [main] = sorted.splice(mainIdx, 1);
      sorted.unshift(main);
    }
  }

  // @contract: additive — query existing, only process missing
  const existingPaths = await getExistingPaths(supabase, movieId, 'backdrop');
  const missing = sorted.filter((b) => !existingPaths.has(b.file_path));
  const indexMap = new Map(sorted.map((b, i) => [b.file_path, i]));
  let count = sorted.length - missing.length;

  // @sideeffect: upload missing backdrops in sequential R2 uploads (batch 1 to avoid DNS EBUSY on Vercel free plan)
  for (let i = 0; i < missing.length; i += 1) {
    const batch = missing.slice(i, i + 1);
    const results = await Promise.all(
      batch.map(async (backdrop) => {
        const key = `${randomUUID()}.jpg`;
        const imageUrl = await uploadImageFromUrl(
          TMDB_IMAGE.backdrop(backdrop.file_path),
          R2_BUCKETS.movieBackdrops,
          key,
        );
        const sortIdx = indexMap.get(backdrop.file_path) ?? 0;
        const isMain = sortIdx === 0;

        if (isMain) {
          await supabase
            .from('movie_images')
            .update({ is_main_backdrop: false })
            .eq('movie_id', movieId)
            .eq('is_main_backdrop', true);
        }

        const { error } = await supabase.from('movie_images').insert({
          movie_id: movieId,
          image_url: imageUrl,
          image_type: 'backdrop',
          is_main_backdrop: isMain,
          tmdb_file_path: backdrop.file_path,
          width: backdrop.width,
          height: backdrop.height,
          iso_639_1: backdrop.iso_639_1,
          vote_average: backdrop.vote_average,
          display_order: sortIdx + 1000,
        });
        // @contract: update movies.backdrop_url only after successful insert
        if (!error && isMain) {
          await supabase
            .from('movies')
            .update({ backdrop_url: imageUrl, backdrop_image_type: 'backdrop' })
            .eq('id', movieId);
        }
        return { error };
      }),
    );
    for (const r of results) {
      if (r.error) console.warn('syncBackdrops: insert failed', r.error.message);
      else count++;
    }
  }

  await cleanupStaleImages(supabase, movieId, 'backdrop', new Set(sorted.map((b) => b.file_path)));

  return count;
}

/**
 * Fetch images from TMDB and sync both posters and backdrops.
 * @boundary: 1 TMDB API call for images endpoint.
 * @returns counts of synced posters and backdrops.
 */
export async function syncAllImages(
  movieId: string,
  tmdbId: number,
  apiKey: string,
  supabase: SupabaseClient,
  /** @contract TMDB's main poster/backdrop paths from movie detail — used to pick the correct main */
  tmdbMainPaths?: { posterPath?: string | null; backdropPath?: string | null },
): Promise<{ posterCount: number; backdropCount: number }> {
  const images = await getMovieImages(tmdbId, apiKey);
  const [posterCount, backdropCount] = await Promise.all([
    syncPosters(movieId, tmdbId, images, supabase, tmdbMainPaths?.posterPath),
    syncBackdrops(movieId, tmdbId, images, supabase, tmdbMainPaths?.backdropPath),
  ]);
  return { posterCount, backdropCount };
}
