import { supabase } from '@/lib/supabase';
import type { Movie, Actor, ProductionHouse } from '@shared/types';

export interface UniversalSearchResult {
  movies: Movie[];
  actors: Actor[];
  productionHouses: ProductionHouse[];
}

export async function searchAll(query: string): Promise<UniversalSearchResult> {
  const q = `%${query}%`;

  const [moviesRes, actorsRes, housesRes] = await Promise.all([
    supabase
      .from('movies')
      .select('*')
      .ilike('title', q)
      .order('rating', { ascending: false })
      .limit(10),
    supabase.from('actors').select('*').ilike('name', q).limit(10),
    supabase.from('production_houses').select('*').ilike('name', q).limit(10),
  ]);

  if (moviesRes.error) throw moviesRes.error;
  if (actorsRes.error) throw actorsRes.error;
  if (housesRes.error) throw housesRes.error;

  return {
    movies: moviesRes.data ?? [],
    actors: actorsRes.data ?? [],
    productionHouses: housesRes.data ?? [],
  };
}
