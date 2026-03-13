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
