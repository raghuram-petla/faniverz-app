import { supabase } from '@/lib/supabase';
import { escapeLike } from '@/utils/escapeLike';
import { unwrapList } from '@/utils/supabaseQuery';
import type { Movie, Actor, ProductionHouse } from '@shared/types';

export interface UniversalSearchResult {
  movies: Movie[];
  actors: Actor[];
  productionHouses: ProductionHouse[];
}

// @boundary: query string is escaped and wrapped in % wildcards for ILIKE — special chars (%, _) are
// escaped so they match literally. SQL injection is prevented by Supabase SDK parameterization.
export async function searchAll(query: string): Promise<UniversalSearchResult> {
  const q = `%${escapeLike(query)}%`;

  // @edge: .limit(10) per entity type means the UI shows max 30 results total, but there's no "show more"
  // mechanism. If the user's query matches the 11th movie, it's silently excluded with no indicator.
  // @contract: uses Promise.allSettled so a single failing query doesn't block results from other entity types
  const [moviesRes, actorsRes, housesRes] = await Promise.allSettled([
    supabase
      .from('movies')
      .select('*')
      .ilike('title', q)
      .order('rating', { ascending: false })
      .limit(10),
    supabase.from('actors').select('*').ilike('name', q).limit(10),
    supabase.from('production_houses').select('*').ilike('name', q).limit(10),
  ]);

  return {
    movies:
      moviesRes.status === 'fulfilled' && !moviesRes.value.error
        ? (moviesRes.value.data ?? [])
        : [],
    actors:
      actorsRes.status === 'fulfilled' && !actorsRes.value.error
        ? (actorsRes.value.data ?? [])
        : [],
    productionHouses:
      housesRes.status === 'fulfilled' && !housesRes.value.error
        ? (housesRes.value.data ?? [])
        : [],
  };
}

// --- Paginated search APIs for smart pagination ---

// @contract: `offset` is absolute row offset, `limit` is number of rows to fetch.
export async function searchMoviesPaginated(
  query: string,
  offset: number,
  limit: number = 10,
): Promise<Movie[]> {
  const q = `%${escapeLike(query)}%`;
  const to = offset + limit - 1;
  return unwrapList(
    await supabase
      .from('movies')
      .select('*')
      .ilike('title', q)
      .order('rating', { ascending: false })
      .range(offset, to),
  );
}

// @contract: `offset` is absolute row offset, `limit` is number of rows to fetch.
export async function searchActorsPaginated(
  query: string,
  offset: number,
  limit: number = 10,
): Promise<Actor[]> {
  const q = `%${escapeLike(query)}%`;
  const to = offset + limit - 1;
  return unwrapList(await supabase.from('actors').select('*').ilike('name', q).range(offset, to));
}

// @contract: `offset` is absolute row offset, `limit` is number of rows to fetch.
export async function searchProductionHousesPaginated(
  query: string,
  offset: number,
  limit: number = 10,
): Promise<ProductionHouse[]> {
  const q = `%${escapeLike(query)}%`;
  const to = offset + limit - 1;
  return unwrapList(
    await supabase.from('production_houses').select('*').ilike('name', q).range(offset, to),
  );
}
