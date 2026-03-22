/**
 * Extended sync operations — videos, watch providers, keywords, translations.
 * Called by sync-engine.ts after the core movie/cast sync.
 * Server-side only.
 *
 * @boundary: makes 1 additional TMDB API call per movie (watch providers).
 * @coupling: depends on tmdb.ts for API calls, sync-images.ts for image sync.
 * @contract: additive sync — only inserts missing items (by tmdb_video_key / keyword_id),
 * making imports resumable across 504 timeouts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getWatchProviders } from './tmdb';
import { mapTmdbVideoType } from './tmdbTypes';
import type { TmdbMovieDetailExtended, TmdbProductionCompany, TmdbVideo } from './tmdbTypes';

// ── Video sync ──────────────────────────────────────────────────────────────

/**
 * Sync all YouTube videos from TMDB into movie_videos table.
 * Additive: only inserts videos not already present (by tmdb_video_key).
 * @sideeffect: inserts missing videos; cleans up stale entries when complete.
 */
export async function syncVideos(
  movieId: string,
  videos: TmdbVideo[],
  supabase: SupabaseClient,
): Promise<number> {
  const youtubeVideos = videos.filter((v) => v.site === 'YouTube');
  if (!youtubeVideos.length) return 0;

  // @contract: additive — query existing, only insert missing
  const { data: existingRows } = await supabase
    .from('movie_videos')
    .select('tmdb_video_key')
    .eq('movie_id', movieId)
    .not('tmdb_video_key', 'is', null);
  const existingKeys = new Set((existingRows ?? []).map((r) => r.tmdb_video_key as string));
  const missing = youtubeVideos.filter((v) => !existingKeys.has(v.key));

  let count = youtubeVideos.length - missing.length;
  for (let i = 0; i < missing.length; i++) {
    const video = missing[i];
    const videoType = mapTmdbVideoType(video.type);
    const originalIdx = youtubeVideos.findIndex((v) => v.key === video.key);

    const { error: insertErr } = await supabase.from('movie_videos').insert({
      movie_id: movieId,
      youtube_id: video.key,
      title: video.name || video.type,
      video_type: videoType,
      video_date: video.published_at ? video.published_at.split('T')[0] : null,
      display_order: originalIdx,
      tmdb_video_key: video.key,
    });
    if (!insertErr) count++;
  }

  // @sideeffect: cleanup stale TMDB-synced videos not in current TMDB list
  const validKeys = new Set(youtubeVideos.map((v) => v.key));
  const { data: allExisting } = await supabase
    .from('movie_videos')
    .select('id, tmdb_video_key')
    .eq('movie_id', movieId)
    .not('tmdb_video_key', 'is', null);
  const staleIds = (allExisting ?? [])
    .filter((r) => !validKeys.has(r.tmdb_video_key as string))
    .map((r) => r.id as string);
  if (staleIds.length > 0) {
    await supabase.from('movie_videos').delete().in('id', staleIds);
  }

  return count;
}

// ── Watch provider sync ─────────────────────────────────────────────────────

/**
 * Sync watch providers from TMDB into movie_platforms table.
 * @sideeffect: auto-creates platforms if they don't exist (matched by tmdb_provider_id).
 * @sideeffect: skips existing movie-platform links to preserve admin-curated streaming_url.
 * @contract: platform ID is generated from provider name (lowercase, no spaces) for consistency.
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
    // @contract: find platform by tmdb_provider_id, then create if not found
    let platformId: string | null = null;

    const { data: existing } = await supabase
      .from('platforms')
      .select('id')
      .eq('tmdb_provider_id', provider.provider_id)
      .maybeSingle();

    if (existing) {
      platformId = existing.id as string;
    } else {
      // @sideeffect: auto-create platform from TMDB provider data
      // @edge: append tmdb provider_id to slug to avoid collisions (e.g. "Prime Video" vs "Prime Video with Ads")
      const slug = provider.provider_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const newId = `${slug}-${provider.provider_id}`;
      const { data: newPlatform, error: platErr } = await supabase
        .from('platforms')
        .insert({
          id: newId,
          name: provider.provider_name,
          logo: provider.provider_name.charAt(0),
          logo_url: provider.logo_path
            ? `https://image.tmdb.org/t/p/w92${provider.logo_path}`
            : null,
          color: '#6B7280',
          tmdb_provider_id: provider.provider_id,
          display_order: 99,
        })
        .select('id')
        .single();
      if (platErr) {
        console.warn(
          `syncWatchProviders: create platform failed for ${provider.provider_name}`,
          platErr.message,
        );
        continue;
      }
      platformId = newPlatform.id as string;
    }

    // Skip if already linked (don't overwrite admin-curated streaming_url)
    const { data: existingLink } = await supabase
      .from('movie_platforms')
      .select('movie_id')
      .eq('movie_id', movieId)
      .eq('platform_id', platformId)
      .maybeSingle();
    if (existingLink) continue;

    const { error: insertErr } = await supabase.from('movie_platforms').insert({
      movie_id: movieId,
      platform_id: platformId,
    });
    if (!insertErr) count++;
  }

  return count;
}

// ── Keywords sync ───────────────────────────────────────────────────────────

/**
 * Sync keywords from TMDB into movie_keywords table.
 * Additive: only inserts missing keywords (by keyword_id).
 * @sideeffect: inserts missing keywords; cleans up stale entries when complete.
 */
export async function syncKeywords(
  movieId: string,
  detail: TmdbMovieDetailExtended,
  supabase: SupabaseClient,
): Promise<number> {
  const keywords = detail.keywords?.keywords ?? [];
  if (!keywords.length) return 0;

  // @contract: additive — query existing, only insert missing
  const { data: existingRows } = await supabase
    .from('movie_keywords')
    .select('keyword_id')
    .eq('movie_id', movieId);
  const existingIds = new Set((existingRows ?? []).map((r) => r.keyword_id as number));
  const missing = keywords.filter((kw) => !existingIds.has(kw.id));

  if (missing.length > 0) {
    const rows = missing.map((kw) => ({
      movie_id: movieId,
      keyword_id: kw.id,
      keyword_name: kw.name,
    }));
    const { error: insertErr } = await supabase.from('movie_keywords').insert(rows);
    if (insertErr) return keywords.length - missing.length;
  }

  // @sideeffect: cleanup stale keywords not in current TMDB list
  const validIds = new Set(keywords.map((kw) => kw.id));
  const staleRows = (existingRows ?? []).filter((r) => !validIds.has(r.keyword_id as number));
  if (staleRows.length > 0) {
    for (const row of staleRows) {
      await supabase
        .from('movie_keywords')
        .delete()
        .eq('movie_id', movieId)
        .eq('keyword_id', row.keyword_id);
    }
  }

  return keywords.length;
}

// ── Production company sync ─────────────────────────────────────────────────

/**
 * Sync TMDB production companies → our production_houses table + junction.
 * @sideeffect: creates new production_houses if no match by tmdb_company_id.
 * Skips existing links to preserve admin curation.
 */
export async function syncProductionCompanies(
  movieId: string,
  companies: TmdbProductionCompany[],
  supabase: SupabaseClient,
): Promise<number> {
  if (!companies.length) return 0;

  let count = 0;
  for (const company of companies) {
    // Check if production house already exists by tmdb_company_id
    let phId: string | null = null;
    const { data: existing } = await supabase
      .from('production_houses')
      .select('id')
      .eq('tmdb_company_id', company.id)
      .maybeSingle();

    if (existing) {
      phId = existing.id as string;
    } else {
      // Create new production house with all TMDB fields
      const { data: newPh, error: phErr } = await supabase
        .from('production_houses')
        .insert({
          name: company.name,
          tmdb_company_id: company.id,
          logo_url: company.logo_path ? `https://image.tmdb.org/t/p/w92${company.logo_path}` : null,
          origin_country: company.origin_country || null,
        })
        .select('id')
        .single();
      if (phErr) {
        console.warn(`syncProductionCompanies: insert failed for ${company.name}`, phErr.message);
        continue;
      }
      phId = newPh.id as string;
    }

    // Skip if already linked
    const { data: existingLink } = await supabase
      .from('movie_production_houses')
      .select('movie_id')
      .eq('movie_id', movieId)
      .eq('production_house_id', phId)
      .maybeSingle();
    if (existingLink) continue;

    const { error: linkErr } = await supabase.from('movie_production_houses').insert({
      movie_id: movieId,
      production_house_id: phId,
    });
    if (!linkErr) count++;
  }

  return count;
}
