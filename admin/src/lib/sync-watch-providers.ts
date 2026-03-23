/**
 * Multi-country watch provider sync — writes to movie_platform_availability table.
 * Iterates all countries and all 5 availability types from TMDB.
 * Auto-creates platforms and countries as needed.
 * Server-side only.
 *
 * @boundary: makes 1 TMDB API call (watch/providers) per movie.
 * @coupling: depends on tmdb.ts for API, platforms table for provider matching.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAllWatchProviders, getWatchRegions } from './tmdb';
import type { TmdbWatchProvider } from './tmdbTypes';
import type { AvailabilityType } from '@shared/types';
import { colors } from '@shared/colors';

const AVAILABILITY_TYPES: AvailabilityType[] = ['flatrate', 'rent', 'buy', 'ads', 'free'];

/**
 * Resolve a TMDB provider to a platform ID in our DB — find by tmdb_provider_id
 * or tmdb_alias_ids, auto-create if not found.
 * @contract: returns null only on insert failure (logged as warning).
 */
async function resolvePlatformId(
  provider: TmdbWatchProvider,
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('platforms')
    .select('id')
    .eq('tmdb_provider_id', provider.provider_id)
    .maybeSingle();
  if (existing) return existing.id as string;

  // @sideeffect: auto-create platform from TMDB provider data
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
      logo_url: provider.logo_path ? `https://image.tmdb.org/t/p/w92${provider.logo_path}` : null,
      color: colors.gray500,
      tmdb_provider_id: provider.provider_id,
      display_order: 99,
    })
    .select('id')
    .single();
  if (platErr) {
    console.warn(`resolvePlatformId: create failed for ${provider.provider_name}`, platErr.message);
    return null;
  }
  return newPlatform.id as string;
}

/** @sideeffect Ensure country exists in countries table with proper name */
async function ensureCountry(
  countryCode: string,
  name: string,
  supabase: SupabaseClient,
): Promise<void> {
  await supabase
    .from('countries')
    .upsert({ code: countryCode, name }, { onConflict: 'code', ignoreDuplicates: true });
}

/**
 * Sync watch providers from TMDB into movie_platform_availability table.
 * Fetches ALL countries and ALL availability types.
 * Also writes to legacy movie_platforms table for backward compat (IN flatrate only).
 *
 * @sideeffect: auto-creates platforms and countries as needed.
 * @sideeffect: upserts rows — preserves admin-curated streaming_url via ignoreDuplicates.
 */
export async function syncWatchProvidersMultiCountry(
  movieId: string,
  tmdbId: number,
  apiKey: string,
  supabase: SupabaseClient,
): Promise<number> {
  const [response, regionNames] = await Promise.all([
    getAllWatchProviders(tmdbId, apiKey),
    getWatchRegions(apiKey),
  ]);
  const results = response.results;
  if (!results || Object.keys(results).length === 0) return 0;

  // @contract: cache resolved platform IDs to avoid repeated lookups for same provider
  const platformCache = new Map<number, string | null>();
  // @contract: track which countries each platform serves for regions update
  const platformRegions = new Map<string, Set<string>>();

  let count = 0;
  for (const [countryCode, countryData] of Object.entries(results)) {
    let countryHasData = false;

    for (const availType of AVAILABILITY_TYPES) {
      const providers = countryData[availType];
      if (!providers?.length) continue;

      if (!countryHasData) {
        await ensureCountry(countryCode, regionNames[countryCode] ?? countryCode, supabase);
        countryHasData = true;
      }

      for (const provider of providers) {
        if (!platformCache.has(provider.provider_id)) {
          platformCache.set(provider.provider_id, await resolvePlatformId(provider, supabase));
        }
        const platformId = platformCache.get(provider.provider_id);
        if (!platformId) continue;

        // Track region for this platform
        if (!platformRegions.has(platformId)) platformRegions.set(platformId, new Set());
        platformRegions.get(platformId)!.add(countryCode);

        const { error } = await supabase.from('movie_platform_availability').upsert(
          {
            movie_id: movieId,
            platform_id: platformId,
            country_code: countryCode,
            availability_type: availType,
            tmdb_display_priority: provider.display_priority ?? null,
          },
          {
            onConflict: 'movie_id,platform_id,country_code,availability_type',
            ignoreDuplicates: true,
          },
        );
        if (!error) count++;

        // @sideeffect: also write to legacy movie_platforms for backward compat (IN flatrate only)
        if (countryCode === 'IN' && availType === 'flatrate') {
          await supabase
            .from('movie_platforms')
            .upsert(
              { movie_id: movieId, platform_id: platformId },
              { onConflict: 'movie_id,platform_id', ignoreDuplicates: true },
            );
        }
      }
    }
  }

  // @sideeffect: merge new regions into each platform's regions array
  for (const [platformId, newRegions] of platformRegions) {
    const { data: plat } = await supabase
      .from('platforms')
      .select('regions')
      .eq('id', platformId)
      .single();
    const existing = new Set<string>(plat?.regions ?? []);
    for (const r of newRegions) existing.add(r);
    await supabase
      .from('platforms')
      .update({ regions: [...existing].sort() })
      .eq('id', platformId);
  }

  return count;
}
