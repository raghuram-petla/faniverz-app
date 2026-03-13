import { supabase } from '@/lib/supabase';
import type { Movie, Actor, ProductionHouse } from '@shared/types';

export interface UniversalSearchResult {
  movies: Movie[];
  actors: Actor[];
  productionHouses: ProductionHouse[];
}

// @boundary: query string is wrapped in % wildcards for ILIKE without sanitization. If query contains
// SQL LIKE special characters (%, _), they are treated as wildcards — searching for "100%" matches any
// title starting with "100" followed by anything. No escaping is needed for SQL injection (parameterized
// by Supabase SDK), but the wildcard behavior can produce unexpected search results.
export async function searchAll(query: string): Promise<UniversalSearchResult> {
  const q = `%${query}%`;

  // @coupling: searches three tables in parallel. If any single query fails, the entire Promise.all rejects
  // and no results are returned for any entity type. A slow/failing actors query blocks movies and production
  // houses from displaying even though they may have succeeded.
  // @edge: .limit(10) per entity type means the UI shows max 30 results total, but there's no "show more"
  // mechanism. If the user's query matches the 11th movie, it's silently excluded with no indicator.
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
