import { supabase } from '@/lib/supabase';
import { OTTPlatform, MoviePlatform } from '@/types';

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
  return data ?? [];
}

export async function fetchMoviePlatformMap(
  movieIds: string[],
): Promise<Record<string, OTTPlatform[]>> {
  if (movieIds.length === 0) return {};

  const { data, error } = await supabase
    .from('movie_platforms')
    .select('movie_id, platform:platforms(*)')
    .in('movie_id', movieIds);

  if (error) throw error;

  const map: Record<string, OTTPlatform[]> = {};
  for (const item of data ?? []) {
    if (!map[item.movie_id]) map[item.movie_id] = [];
    if (item.platform) map[item.movie_id].push(item.platform as unknown as OTTPlatform);
  }
  return map;
}
