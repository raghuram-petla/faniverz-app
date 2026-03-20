/**
 * Extended sync operations — videos, watch providers, keywords, translations.
 * Called by sync-engine.ts after the core movie/cast sync.
 * Server-side only.
 *
 * @boundary: makes 1 additional TMDB API call per movie (watch providers).
 * @coupling: depends on tmdb.ts for API calls, sync-images.ts for image sync.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getWatchProviders } from './tmdb';
import { mapTmdbVideoType, TMDB_PROVIDER_MAP } from './tmdbTypes';
import type { TmdbMovieDetailExtended, TmdbVideo } from './tmdbTypes';

// ── Video sync ──────────────────────────────────────────────────────────────

/**
 * Sync all YouTube videos from TMDB into movie_videos table.
 * @sideeffect: clears TMDB-synced videos (preserving manually added) and re-inserts.
 */
export async function syncVideos(
  movieId: string,
  videos: TmdbVideo[],
  supabase: SupabaseClient,
): Promise<number> {
  const youtubeVideos = videos.filter((v) => v.site === 'YouTube');
  if (!youtubeVideos.length) return 0;

  // Clear existing TMDB-synced videos (those with tmdb_video_key set)
  await supabase
    .from('movie_videos')
    .delete()
    .eq('movie_id', movieId)
    .not('tmdb_video_key', 'is', null);

  let count = 0;
  for (let i = 0; i < youtubeVideos.length; i++) {
    const video = youtubeVideos[i];
    const videoType = mapTmdbVideoType(video.type);

    await supabase.from('movie_videos').insert({
      movie_id: movieId,
      youtube_id: video.key,
      title: video.name || video.type,
      video_type: videoType,
      video_date: video.published_at ? video.published_at.split('T')[0] : null,
      display_order: i,
      tmdb_video_key: video.key,
    });
    count++;
  }

  return count;
}

// ── Watch provider sync ─────────────────────────────────────────────────────

/**
 * Sync watch providers from TMDB into movie_platforms table.
 * @sideeffect: inserts provider links (skips existing to preserve admin-curated streaming_url).
 */
export async function syncWatchProviders(
  movieId: string,
  tmdbId: number,
  apiKey: string,
  supabase: SupabaseClient,
): Promise<number> {
  const providers = await getWatchProviders(tmdbId, apiKey);
  if (!providers.length) return 0;

  let count = 0;
  for (const provider of providers) {
    const platformId = TMDB_PROVIDER_MAP[provider.provider_id];
    if (!platformId) continue;

    // Check if platform exists in our platforms table
    const { data: platform } = await supabase
      .from('platforms')
      .select('id')
      .eq('id', platformId)
      .maybeSingle();
    if (!platform) continue;

    // Skip if already linked (don't overwrite admin-curated streaming_url)
    const { data: existing } = await supabase
      .from('movie_platforms')
      .select('movie_id')
      .eq('movie_id', movieId)
      .eq('platform_id', platformId)
      .maybeSingle();
    if (existing) continue;

    await supabase.from('movie_platforms').insert({
      movie_id: movieId,
      platform_id: platformId,
    });
    count++;
  }

  return count;
}

// ── Keywords sync ───────────────────────────────────────────────────────────

/**
 * Sync keywords from TMDB into movie_keywords table.
 * @sideeffect: deletes existing keywords and re-inserts from TMDB.
 */
export async function syncKeywords(
  movieId: string,
  detail: TmdbMovieDetailExtended,
  supabase: SupabaseClient,
): Promise<number> {
  const keywords = detail.keywords?.keywords ?? [];
  if (!keywords.length) return 0;

  await supabase.from('movie_keywords').delete().eq('movie_id', movieId);

  const rows = keywords.map((kw) => ({
    movie_id: movieId,
    keyword_id: kw.id,
    keyword_name: kw.name,
  }));

  await supabase.from('movie_keywords').insert(rows);
  return keywords.length;
}
