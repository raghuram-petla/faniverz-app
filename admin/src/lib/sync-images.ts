/**
 * Image sync operations — posters and backdrops from TMDB images endpoint.
 * All images stored in unified movie_images table with image_type discriminator.
 * Server-side only.
 *
 * @boundary: makes 1 TMDB API call (getMovieImages) for both posters + backdrops.
 * @coupling: depends on r2-sync.ts for image uploads.
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

/**
 * Sync all posters from TMDB images endpoint into movie_images table.
 * Marks the highest-priority poster as is_main_poster (Telugu > Hindi > English > null).
 *
 * @sideeffect: uploads each poster to R2; clears TMDB-synced posters and re-inserts.
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
  // Move TMDB's main poster to index 0 if found
  if (tmdbMainPosterPath) {
    const mainIdx = sorted.findIndex((p) => p.file_path === tmdbMainPosterPath);
    if (mainIdx > 0) {
      const [main] = sorted.splice(mainIdx, 1);
      sorted.unshift(main);
    }
  }

  // @sideeffect: clear TMDB-synced poster images (keep manually added ones without tmdb_file_path)
  await supabase
    .from('movie_images')
    .delete()
    .eq('movie_id', movieId)
    .eq('image_type', 'poster')
    .not('tmdb_file_path', 'is', null);

  let count = 0;
  for (let i = 0; i < sorted.length && i < 20; i++) {
    const poster = sorted[i];
    const key = `${randomUUID()}.jpg`;
    const imageUrl = await uploadImageFromUrl(
      TMDB_IMAGE.poster(poster.file_path),
      R2_BUCKETS.moviePosters,
      key,
    );

    const isMain = i === 0;
    if (isMain) {
      // Update or insert main poster
      const { data: existingMain } = await supabase
        .from('movie_images')
        .select('id')
        .eq('movie_id', movieId)
        .eq('is_main_poster', true)
        .maybeSingle();

      const posterData = {
        image_url: imageUrl,
        image_type: 'poster' as const,
        tmdb_file_path: poster.file_path,
        iso_639_1: poster.iso_639_1,
        width: poster.width,
        height: poster.height,
        vote_average: poster.vote_average,
      };

      if (existingMain) {
        await supabase.from('movie_images').update(posterData).eq('id', existingMain.id);
      } else {
        await supabase.from('movie_images').insert({
          movie_id: movieId,
          ...posterData,
          title: 'Main Poster',
          is_main_poster: true,
          display_order: 0,
        });
      }
      // Keep movies.poster_url + poster_image_type in sync
      await supabase
        .from('movies')
        .update({ poster_url: imageUrl, poster_image_type: 'poster' })
        .eq('id', movieId);
    } else {
      await supabase.from('movie_images').insert({
        movie_id: movieId,
        image_url: imageUrl,
        image_type: 'poster',
        title: `Poster (${poster.iso_639_1 ?? 'no lang'})`,
        is_main_poster: false,
        display_order: i,
        tmdb_file_path: poster.file_path,
        iso_639_1: poster.iso_639_1,
        width: poster.width,
        height: poster.height,
        vote_average: poster.vote_average,
      });
    }
    count++;
  }

  return count;
}

/**
 * Sync all backdrops from TMDB images endpoint into movie_images table.
 * @sideeffect: uploads each backdrop to R2; replaces existing TMDB-synced backdrops.
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
  // Move TMDB's main backdrop to index 0 if found
  if (tmdbMainBackdropPath) {
    const mainIdx = sorted.findIndex((b) => b.file_path === tmdbMainBackdropPath);
    if (mainIdx > 0) {
      const [main] = sorted.splice(mainIdx, 1);
      sorted.unshift(main);
    }
  }

  // Clear existing TMDB-synced backdrop images
  await supabase
    .from('movie_images')
    .delete()
    .eq('movie_id', movieId)
    .eq('image_type', 'backdrop')
    .not('tmdb_file_path', 'is', null);

  let count = 0;
  for (let i = 0; i < sorted.length && i < 15; i++) {
    const backdrop = sorted[i];
    const key = `${randomUUID()}.jpg`;
    const imageUrl = await uploadImageFromUrl(
      TMDB_IMAGE.backdrop(backdrop.file_path),
      R2_BUCKETS.movieBackdrops,
      key,
    );

    const isMainBackdrop = i === 0;
    if (isMainBackdrop) {
      // Unset existing main backdrop before setting new one
      await supabase
        .from('movie_images')
        .update({ is_main_backdrop: false })
        .eq('movie_id', movieId)
        .eq('is_main_backdrop', true);
      await supabase
        .from('movies')
        .update({ backdrop_url: imageUrl, backdrop_image_type: 'backdrop' })
        .eq('id', movieId);
    }

    await supabase.from('movie_images').insert({
      movie_id: movieId,
      image_url: imageUrl,
      image_type: 'backdrop',
      is_main_backdrop: isMainBackdrop,
      tmdb_file_path: backdrop.file_path,
      width: backdrop.width,
      height: backdrop.height,
      iso_639_1: backdrop.iso_639_1,
      vote_average: backdrop.vote_average,
      display_order: i + 1000,
    });
    count++;
  }

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
