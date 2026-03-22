import { supabase } from '@/lib/supabase';
import { OTTPlatform, MoviePlatform, MoviePlatformAvailability, AvailabilityType } from '@/types';
import { getDeviceCountry } from '@/utils/getDeviceCountry';

export async function fetchPlatforms(): Promise<OTTPlatform[]> {
  const { data, error } = await supabase
    .from('platforms')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** @contract Fetch availability for a movie in the user's country, grouped by type */
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
  for (const r of (data ?? []) as MoviePlatformAvailability[]) {
    result[r.availability_type].push(r);
  }
  return result;
}

/** @contract Legacy fetch for backward compat — returns flat MoviePlatform[] */
export async function fetchOttReleases(movieId: string): Promise<MoviePlatform[]> {
  const { data, error } = await supabase
    .from('movie_platforms')
    .select('*, platform:platforms(*)')
    .eq('movie_id', movieId);
  if (error) throw error;
  return data ?? [];
}

/** @contract Fetch platforms per movie for card badges — uses new table with country filter */
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
