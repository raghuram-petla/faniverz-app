import { supabase } from '@/lib/supabase';
import type { Movie, Actor, ProductionHouse, OTTPlatform } from '@shared/types';

export interface UniversalSearchResult {
  movies: Movie[];
  actors: Actor[];
  productionHouses: ProductionHouse[];
  // @contract: platforms key added in migration 20260407000142_search_platforms
  platforms: OTTPlatform[];
}

// @boundary: search_term is passed as a parameterized RPC argument — no ILIKE escaping needed.
// @contract: single RPC call replaces 3 parallel ILIKE queries; results are ranked by hybrid
//   score (tsvector ts_rank 60% + pg_trgm similarity 40%) with typo tolerance via trigram fuzzy match.
export async function searchAll(query: string): Promise<UniversalSearchResult> {
  // @edge: result_limit applies per entity type (max 30 results total across 3 types)
  const { data, error } = await supabase.rpc('search_universal', {
    search_term: query,
    result_limit: 10,
  });

  if (error) throw error;

  const result = data as {
    movies: Movie[];
    actors: Actor[];
    production_houses: ProductionHouse[];
    // @nullable: platforms key may be absent in older DB versions — always coalesce to []
    platforms: OTTPlatform[];
  } | null;

  return {
    movies: result?.movies ?? [],
    actors: result?.actors ?? [],
    productionHouses: result?.production_houses ?? [],
    platforms: result?.platforms ?? [],
  };
}

// --- Paginated search APIs for smart pagination ---

// @contract: `offset` is absolute row offset, `limit` is number of rows to fetch.
// @contract: results ordered by hybrid search score DESC, then rating DESC — not insertion order.
export async function searchMoviesPaginated(
  query: string,
  offset: number,
  limit: number = 10,
): Promise<Movie[]> {
  const { data, error } = await supabase.rpc('search_movies', {
    search_term: query,
    result_limit: limit,
    result_offset: offset,
  });
  if (error) throw error;
  return (data as Movie[]) ?? [];
}
