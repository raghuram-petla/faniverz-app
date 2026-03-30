/**
 * Private helpers for image sync operations — shared by syncPosters, syncBackdrops, syncAllImages.
 * @boundary: all functions interact with Supabase; none make external HTTP calls.
 * @coupling: depends on tmdbTypes for TmdbImage shape.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { TmdbImage } from './tmdbTypes';

/** Sort images: Telugu first, then Hindi, English, null, by vote_average desc. */
export function sortByLanguagePriority(images: TmdbImage[]): TmdbImage[] {
  return [...images].sort((a, b) => {
    const langOrder = (l: string | null) => (l === 'te' ? 0 : l === 'hi' ? 1 : l === 'en' ? 2 : 3);
    const langDiff = langOrder(a.iso_639_1) - langOrder(b.iso_639_1);
    if (langDiff !== 0) return langDiff;
    return b.vote_average - a.vote_average;
  });
}

/** @contract: query existing tmdb_file_paths for a given movie+image_type */
export async function getExistingPaths(
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
export async function cleanupStaleImages(
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

/** @sideeffect: repairs news_feed rows where thumbnail_url != movie_images.image_url. */
export async function repairFeedThumbnails(
  movieId: string,
  supabase: SupabaseClient,
): Promise<void> {
  const { data: images } = await supabase
    .from('movie_images')
    .select('id, image_url')
    .eq('movie_id', movieId);
  if (!images?.length) return;

  const imageMap = new Map(images.map((i) => [i.id as string, i.image_url as string]));
  const ids = images.map((i) => i.id as string);

  const { data: feedEntries } = await supabase
    .from('news_feed')
    .select('id, source_id, thumbnail_url')
    .eq('source_table', 'movie_images')
    .in('source_id', ids);
  if (!feedEntries?.length) return;

  for (const entry of feedEntries) {
    const expected = imageMap.get(entry.source_id as string);
    if (expected && entry.thumbnail_url !== expected) {
      await supabase.from('news_feed').update({ thumbnail_url: expected }).eq('id', entry.id);
    }
  }
}
