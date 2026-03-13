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

// @edge: no deduplication of platforms per movie — if movie_platforms has duplicate rows for the same
// movie_id + platform_id (no unique constraint enforced here), the same platform appears multiple times
// in the array for that movie. UI components rendering platform logos would show duplicates.
// @boundary: `item.platform as unknown as OTTPlatform` is a double cast that bypasses type safety. Supabase's
// nested select returns platform as a generic object; if the platforms table schema changes (e.g., column rename),
// TypeScript won't catch the mismatch and runtime will have undefined fields on the OTTPlatform objects.
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
