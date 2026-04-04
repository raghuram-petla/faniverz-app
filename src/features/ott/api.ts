import { supabase } from '@/lib/supabase';
import { OTTPlatform, MoviePlatform, MoviePlatformAvailability, AvailabilityType } from '@/types';
import { getDeviceCountry } from '@/utils/getDeviceCountry';
import { unwrapList } from '@/utils/supabaseQuery';

// @contract: returns platforms sorted by display_order — UI renders them in this order for OTT badges and filter chips. If display_order has gaps or duplicates, the visual order may differ from admin intent.
export async function fetchPlatforms(): Promise<OTTPlatform[]> {
  return unwrapList(
    await supabase.from('platforms').select('*').order('display_order', { ascending: true }),
  );
}

// @boundary: getDeviceCountry() returns a 2-letter ISO code (e.g., 'IN', 'US') from expo-localization. If the device locale doesn't map to a country (e.g., simulator with no region set), it defaults to 'IN'. Movies available only in other regions silently return empty results.
// @coupling: groups by AvailabilityType which must match the CHECK constraint on movie_platform_availability.availability_type in the DB. If a new type is added to the DB but not to the AvailabilityType union, those rows are fetched but crash at `result[r.availability_type]` (undefined key access on Record).
export async function fetchMovieAvailability(
  movieId: string,
): Promise<Record<AvailabilityType, MoviePlatformAvailability[]>> {
  const country = getDeviceCountry();
  const { data, error } = await supabase
    .from('movie_platform_availability')
    .select('*, platform:platforms(*)')
    .eq('movie_id', movieId)
    .eq('country_code', country)
    .order('tmdb_display_priority', { ascending: true, nullsFirst: false });
  if (error) throw error;

  const result: Record<AvailabilityType, MoviePlatformAvailability[]> = {
    flatrate: [],
    rent: [],
    buy: [],
    ads: [],
    free: [],
  };
  // @edge: skip rows with availability_type not in the known enum — prevents crash if DB adds new types before mobile code updates
  for (const r of (data ?? []) as MoviePlatformAvailability[]) {
    if (result[r.availability_type]) {
      result[r.availability_type].push(r);
    }
  }
  return result;
}

// @sync: legacy endpoint — used by older components that haven't migrated to fetchMovieAvailability. Both query different tables (movie_platforms vs movie_platform_availability). movie_platforms has no country_code filter, so it returns global results. Callers should migrate to fetchMovieAvailability for region-aware data.
// @coupling: movie_platforms table is also queried by fetchMoviesByPlatform (movies/api.ts) and the 'streaming' filter in applyMovieFilters. If movie_platforms is deprecated in favor of movie_platform_availability, all three callsites must migrate.
export async function fetchOttReleases(movieId: string): Promise<MoviePlatform[]> {
  return unwrapList(
    await supabase
      .from('movie_platforms')
      .select('*, platform:platforms(*)')
      .eq('movie_id', movieId),
  );
}

// @edge: only returns 'flatrate' availability — rent/buy/ads/free platforms are excluded from card badges. If a movie is only available for rent (no flatrate), its card shows no platform badges even though the movie IS available.
// @invariant: deduplicates platforms per movie using a Set<string> — without this, movies with multiple country entries for the same platform would show duplicate badges.
export async function fetchMoviePlatformMap(
  movieIds: string[],
): Promise<Record<string, OTTPlatform[]>> {
  if (movieIds.length === 0) return {};

  const country = getDeviceCountry();
  const { data, error } = await supabase
    .from('movie_platform_availability')
    .select('movie_id, platform:platforms(*)')
    .in('movie_id', movieIds)
    .eq('country_code', country)
    .eq('availability_type', 'flatrate');
  if (error) throw error;

  const map: Record<string, OTTPlatform[]> = {};
  const seen: Record<string, Set<string>> = {};
  for (const item of data ?? []) {
    if (!item.platform) continue;
    const platform = item.platform as unknown as OTTPlatform;
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
