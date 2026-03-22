import { supabase } from '@/lib/supabase';
import { OTTPlatform, MoviePlatform } from '@/types';

/** @contract Build set of TMDB provider IDs that are aliases of other platforms */
function buildAliasSet(platforms: OTTPlatform[]): Set<number> {
  const aliasIds = new Set<number>();
  for (const p of platforms) {
    for (const aid of p.tmdb_alias_ids ?? []) aliasIds.add(aid);
  }
  return aliasIds;
}

/** @contract Filter out platforms whose tmdb_provider_id is an alias of another */
function excludeAliases<T extends { platform?: OTTPlatform | null }>(items: T[]): T[] {
  const aliasIds = buildAliasSet(items.map((i) => i.platform).filter((p): p is OTTPlatform => !!p));
  return items.filter(
    (i) => !i.platform?.tmdb_provider_id || !aliasIds.has(i.platform.tmdb_provider_id),
  );
}

export async function fetchPlatforms(): Promise<OTTPlatform[]> {
  const { data, error } = await supabase
    .from('platforms')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchOttReleases(movieId: string): Promise<MoviePlatform[]> {
  const { data, error } = await supabase
    .from('movie_platforms')
    .select('*, platform:platforms(*)')
    .eq('movie_id', movieId);

  if (error) throw error;
  return excludeAliases(data ?? []);
}

// @contract: deduplicates platforms per movie by platform id to prevent duplicate logos.
// @boundary: double cast bypasses type safety — if platforms schema changes, TypeScript won't catch it.
export async function fetchMoviePlatformMap(
  movieIds: string[],
): Promise<Record<string, OTTPlatform[]>> {
  if (movieIds.length === 0) return {};

  const { data, error } = await supabase
    .from('movie_platforms')
    .select('movie_id, platform:platforms(*)')
    .in('movie_id', movieIds);

  if (error) throw error;

  // @contract: build global alias set across ALL platforms in the result, then filter per movie
  const allPlatforms = (data ?? [])
    .map((i) => i.platform as unknown as OTTPlatform | null)
    .filter((p): p is OTTPlatform => !!p);
  const aliasIds = buildAliasSet(allPlatforms);

  const map: Record<string, OTTPlatform[]> = {};
  const seen: Record<string, Set<string>> = {};
  for (const item of data ?? []) {
    if (!item.platform) continue;
    const platform = item.platform as unknown as OTTPlatform;
    // Skip alias platforms
    if (platform.tmdb_provider_id && aliasIds.has(platform.tmdb_provider_id)) continue;
    if (!map[item.movie_id]) {
      map[item.movie_id] = [];
      seen[item.movie_id] = new Set();
    }
    if (!seen[item.movie_id].has(platform.id)) {
      seen[item.movie_id].add(platform.id);
      map[item.movie_id].push(platform);
    }
  }
  return map;
}
