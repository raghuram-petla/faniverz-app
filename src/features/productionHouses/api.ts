import { supabase } from '@/lib/supabase';
import type { ProductionHouse } from '@shared/types';
import type { Movie } from '@/types';
import { unwrapList } from '@/utils/supabaseQuery';

// @contract: uses .single() with PGRST116 catch — returns null on not-found, matching the pattern in fetchFeedItemById. Differs from fetchMovieById which throws on PGRST116.
export async function fetchProductionHouseById(id: string): Promise<ProductionHouse | null> {
  const { data, error } = await supabase
    .from('production_houses')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

// @coupling: two-step fetch (junction table then movies) instead of a Supabase join because movie_production_houses
// is a many-to-many junction and Supabase's nested select would return duplicate movie rows per production house link.
// Downside: two round trips to the server. If movie_production_houses or movies table has RLS policies that differ
// from what the anon key can access, the junction fetch may succeed but the movies fetch may return fewer results.
export async function fetchProductionHouseMovies(id: string): Promise<Movie[]> {
  const { data: junction, error: jErr } = await supabase
    .from('movie_production_houses')
    .select('movie_id')
    .eq('production_house_id', id);
  if (jErr) throw jErr;
  if (!junction || junction.length === 0) return [];

  const movieIds = junction.map((j) => j.movie_id);
  return unwrapList(
    await supabase
      .from('movies')
      .select('*')
      .in('id', movieIds)
      .order('release_date', { ascending: false }),
  );
}
