/**
 * Image sync operations — posters and backdrops from TMDB images endpoint.
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
 * Sync all posters from TMDB images endpoint into movie_posters table.
 * Marks the highest-priority poster as is_main (Telugu > Hindi > English > null).
 *
 * @sideeffect: uploads each poster to R2; clears TMDB-synced posters and re-inserts.
 */
export async function syncPosters(
  movieId: string,
  tmdbId: number,
  images: { posters: TmdbImage[] },
  supabase: SupabaseClient,
): Promise<number> {
  if (!images.posters.length) return 0;

  const sorted = sortByLanguagePriority(images.posters);

  // @sideeffect: clear TMDB-synced posters (keep manually added ones without tmdb_file_path)
  await supabase
    .from('movie_posters')
    .delete()
    .eq('movie_id', movieId)
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
        .from('movie_posters')
        .select('id')
        .eq('movie_id', movieId)
        .eq('is_main', true)
        .maybeSingle();

      const posterData = {
        image_url: imageUrl,
        tmdb_file_path: poster.file_path,
        iso_639_1: poster.iso_639_1,
        width: poster.width,
        height: poster.height,
        vote_average: poster.vote_average,
      };

      if (existingMain) {
        await supabase.from('movie_posters').update(posterData).eq('id', existingMain.id);
      } else {
        await supabase.from('movie_posters').insert({
          movie_id: movieId,
          ...posterData,
          title: 'Main Poster',
          is_main: true,
          display_order: 0,
        });
      }
      // Keep movies.poster_url in sync
      await supabase.from('movies').update({ poster_url: imageUrl }).eq('id', movieId);
    } else {
      await supabase.from('movie_posters').insert({
        movie_id: movieId,
        image_url: imageUrl,
        title: `Poster (${poster.iso_639_1 ?? 'no lang'})`,
        is_main: false,
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
 * Sync all backdrops from TMDB images endpoint into movie_backdrops table.
 * @sideeffect: uploads each backdrop to R2; replaces existing TMDB-synced backdrops.
 */
export async function syncBackdrops(
  movieId: string,
  tmdbId: number,
  images: { backdrops: TmdbImage[] },
  supabase: SupabaseClient,
): Promise<number> {
  if (!images.backdrops.length) return 0;

  const sorted = [...images.backdrops].sort((a, b) => b.vote_average - a.vote_average);

  // Clear existing TMDB-synced backdrops
  await supabase
    .from('movie_backdrops')
    .delete()
    .eq('movie_id', movieId)
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

    if (i === 0) {
      await supabase.from('movies').update({ backdrop_url: imageUrl }).eq('id', movieId);
    }

    await supabase.from('movie_backdrops').insert({
      movie_id: movieId,
      image_url: imageUrl,
      tmdb_file_path: backdrop.file_path,
      width: backdrop.width,
      height: backdrop.height,
      iso_639_1: backdrop.iso_639_1,
      vote_average: backdrop.vote_average,
      display_order: i,
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
): Promise<{ posterCount: number; backdropCount: number }> {
  const images = await getMovieImages(tmdbId, apiKey);
  const [posterCount, backdropCount] = await Promise.all([
    syncPosters(movieId, tmdbId, images, supabase),
    syncBackdrops(movieId, tmdbId, images, supabase),
  ]);
  return { posterCount, backdropCount };
}
