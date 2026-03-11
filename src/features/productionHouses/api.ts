import { supabase } from '@/lib/supabase';
import type { ProductionHouse } from '@shared/types';
import type { Movie } from '@/types';

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

export async function fetchProductionHouseMovies(id: string): Promise<Movie[]> {
  const { data: junction, error: jErr } = await supabase
    .from('movie_production_houses')
    .select('movie_id')
    .eq('production_house_id', id);
  if (jErr) throw jErr;
  if (!junction || junction.length === 0) return [];

  const movieIds = junction.map((j) => j.movie_id);
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .in('id', movieIds)
    .order('release_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
