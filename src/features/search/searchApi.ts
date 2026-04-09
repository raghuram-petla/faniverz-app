import { supabase } from '@/lib/supabase';
import type { Movie, Actor, ProductionHouse, OTTPlatform } from '@shared/types';

// @contract: search_score is present on every item returned by the search RPCs
type Scored = { search_score?: number };

function topScore(items: Scored[]): number {
  return items.reduce((max, i) => Math.max(max, i.search_score ?? 0), 0);
}

export interface UniversalSearchResult {
  movies: Movie[];
  actors: Actor[];
  productionHouses: ProductionHouse[];
  platforms: OTTPlatform[];
  // @contract: top score per entity type — used to order sections by relevance
  topMovieScore: number;
  topEntityScore: number;
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

  const movies = (result?.movies ?? []) as (Movie & Scored)[];
  const actors = (result?.actors ?? []) as (Actor & Scored)[];
  const houses = (result?.production_houses ?? []) as (ProductionHouse & Scored)[];
  const plats = (result?.platforms ?? []) as (OTTPlatform & Scored)[];

  return {
    movies,
    actors,
    productionHouses: houses,
    platforms: plats,
    topMovieScore: topScore(movies),
    topEntityScore: Math.max(topScore(actors), topScore(houses), topScore(plats)),
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
