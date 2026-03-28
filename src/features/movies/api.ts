import { supabase } from '@/lib/supabase';
import { Movie, MovieWithDetails, MovieStatus } from '@/types';
import { escapeLike } from '@/utils/escapeLike';
import { unwrapList } from '@/utils/supabaseQuery';

/** Returns today's date as YYYY-MM-DD in local timezone (avoids UTC offset bug with toISOString). */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface MovieFilters {
  movieStatus?: MovieStatus;
  genre?: string;
  platformId?: string;
  sortBy?: 'popular' | 'top_rated' | 'latest' | 'upcoming';
}

// @boundary: 'streaming' filter requires two sequential Supabase calls — first to movie_platforms then to movies. If movie_platforms has stale data (e.g., platform removed but row lingers), phantom movies appear in streaming results.
// @edge: 'released' filter uses `lte(release_date) AND eq(in_theaters, false)` — a movie that left theaters but has no OTT entry yet shows as 'released', not 'streaming'. This differs from deriveMovieStatus (shared/movieStatus.ts) which checks platformCount > 0.
// @coupling: sort order 'popular' uses review_count from movies table — this column is updated by a DB trigger (update_movie_rating in triggers migration) on review insert/update/delete, NOT by this app. Stale review_count = wrong sort order.
// @contract: returns null when streaming/platformId filters yield zero matching IDs (caller should return [] early). Returns the mutated query otherwise. When featuredFirst is true, prepends is_featured DESC before the sortBy ordering.
async function applyMovieFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters?: MovieFilters,
  options?: { featuredFirst?: boolean },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  if (filters?.movieStatus) {
    const todayStr = getLocalDateString();
    switch (filters.movieStatus) {
      case 'upcoming':
        query = query.gt('release_date', todayStr);
        break;
      case 'in_theaters':
        query = query.eq('in_theaters', true);
        break;
      case 'streaming': {
        // @edge: select only movie_id column (no limit) so all entries are returned.
        // movie_platforms grows linearly with (movies × platforms) — even at 10k movies × 8 platforms
        // this is only 80k UUIDs (~5 MB), acceptable for a one-time filter fetch. A hard limit of 1000
        // silently excluded movies on rows >1000, producing an incomplete streaming list.
        const { data: streamingIds, error: streamErr } = await supabase
          .from('movie_platforms')
          .select('movie_id');
        if (streamErr) throw streamErr;
        if (streamingIds && streamingIds.length > 0) {
          // Deduplicate movie_ids client-side since PostgREST doesn't support DISTINCT
          const uniqueIds = [...new Set(streamingIds.map((m: { movie_id: string }) => m.movie_id))];
          query = query.in('id', uniqueIds);
        } else {
          return null;
        }
        break;
      }
      case 'released':
        query = query.lte('release_date', todayStr).eq('in_theaters', false);
        break;
    }
  }

  if (filters?.genre) {
    query = query.contains('genres', [filters.genre]);
  }

  if (filters?.platformId) {
    const { data: movieIds, error: platErr } = await supabase
      .from('movie_platforms')
      .select('movie_id')
      .eq('platform_id', filters.platformId);
    if (platErr) throw platErr;
    if (movieIds && movieIds.length > 0) {
      query = query.in(
        'id',
        movieIds.map((m: { movie_id: string }) => m.movie_id),
      );
    } else {
      return null;
    }
  }

  // Featured-first ordering is prepended before sortBy so it becomes the primary ORDER BY column
  /* istanbul ignore else */
  if (options?.featuredFirst) {
    query = query.order('is_featured', { ascending: false });
  }

  switch (filters?.sortBy) {
    case 'top_rated':
      query = query.order('rating', { ascending: false });
      break;
    case 'latest':
      query = query.order('release_date', { ascending: false });
      break;
    case 'upcoming':
      query = query.order('release_date', { ascending: true });
      break;
    /* istanbul ignore next */
    case 'popular':
    default:
      query = query.order('review_count', { ascending: false });
      break;
  }

  return query;
}

export async function fetchMovies(filters?: MovieFilters): Promise<Movie[]> {
  let query = supabase.from('movies').select('*');

  const result = await applyMovieFilters(query, filters, { featuredFirst: true });
  if (result === null) return [];
  query = result;

  return unwrapList(await query);
}

// @coupling: the actor join in movie_cast.select() explicitly lists columns (id, name, photo_url, birth_date, person_type, tmdb_person_id, created_at) — if the Actor type in shared/types.ts adds new fields (e.g., biography, height_cm), they won't appear here unless the select() is updated. The cast/crew CastMember type assumes .actor is the full Actor shape but gets a partial.
// @edge: .single() throws PGRST116 if movie not found — the error is re-thrown, so callers see a Supabase error, not null. This differs from fetchFeedItemById which catches PGRST116 and returns null.
// @assumes: movie_cast rows always have credit_type = 'cast' | 'crew'. If a row has NULL or an unexpected value, it's silently excluded from both cast and crew arrays.
export async function fetchMovieById(id: string): Promise<MovieWithDetails | null> {
  const { data: movie, error } = await supabase.from('movies').select('*').eq('id', id).single();

  if (error) throw error;
  if (!movie) return null;

  // @contract: uses Promise.all with per-query .then() error handling — partial failures degrade to empty arrays
  const [castResult, platformResult, postersResult, videosResult, productionHousesResult] =
    await Promise.all([
      supabase
        .from('movie_cast')
        .select(
          '*, actor:actors(id, name, photo_url, birth_date, person_type, tmdb_person_id, created_at)',
        )
        .eq('movie_id', id)
        .then(({ data, error }) => {
          if (error) console.warn('fetchMovieById: cast fetch failed', error);
          return data ?? [];
        }),
      supabase
        .from('movie_platforms')
        .select('*, platform:platforms(*)')
        .eq('movie_id', id)
        .then(({ data, error }) => {
          if (error) console.warn('fetchMovieById: platforms fetch failed', error);
          return data ?? [];
        }),
      supabase
        .from('movie_images')
        .select('*')
        .eq('movie_id', id)
        .order('display_order')
        .then(({ data, error }) => {
          if (error) console.warn('fetchMovieById: images fetch failed', error);
          return data ?? [];
        }),
      supabase
        .from('movie_videos')
        .select('*')
        .eq('movie_id', id)
        .order('display_order')
        .then(({ data, error }) => {
          if (error) console.warn('fetchMovieById: videos fetch failed', error);
          return data ?? [];
        }),
      supabase
        .from('movie_production_houses')
        .select('*, production_house:production_houses(*)')
        .eq('movie_id', id)
        .then(({ data, error }) => {
          if (error) console.warn('fetchMovieById: production houses fetch failed', error);
          return data ?? [];
        }),
    ]);

  const allCredits = castResult;

  // Actors: sorted by display_order ASC (per-movie billing from TMDB)
  const cast = allCredits
    .filter((c) => c.credit_type === 'cast')
    .sort((a, b) => a.display_order - b.display_order);

  // Crew: role_order ASC (Director first, then Producer, Music Director, DOP, …)
  const crew = allCredits
    .filter((c) => c.credit_type === 'crew')
    .sort((a, b) => (a.role_order ?? 99) - (b.role_order ?? 99));

  // Extract production houses from junction table
  const productionHouses = productionHousesResult
    .map((mph) => mph.production_house)
    .filter(Boolean);

  return {
    ...movie,
    cast,
    crew,
    platforms: platformResult,
    posters: postersResult,
    videos: videosResult,
    productionHouses,
  };
}

// @edge: month param is 0-indexed (JavaScript Date convention) — new Date(year, 12, 1) wraps to January of next year. Callers must pass 0-11 not 1-12, but the parameter name 'month' doesn't signal this.
// @assumes: release_date is stored as 'YYYY-MM-DD' string in Supabase. String comparison (gte/lte) works correctly only because the format is lexicographically sortable. A different date format would silently return wrong results.
export async function fetchMoviesByMonth(year: number, month: number): Promise<Movie[]> {
  const startDate = getLocalDateString(new Date(year, month, 1));
  const endDate = getLocalDateString(new Date(year, month + 1, 0));

  return unwrapList(
    await supabase
      .from('movies')
      .select('*')
      .gte('release_date', startDate)
      .lte('release_date', endDate)
      .order('release_date', { ascending: true }),
  );
}

// @edge: only searches title and director columns — genres, cast names, and production houses are not searched. Users searching for an actor name get no results here; must use searchActors separately.
export async function searchMovies(query: string): Promise<Movie[]> {
  const escaped = escapeLike(query);
  return unwrapList(
    await supabase
      .from('movies')
      .select('*')
      .or(`title.ilike.%${escaped}%,director.ilike.%${escaped}%`)
      .order('rating', { ascending: false })
      .limit(20),
  );
}

// @sync: shares filter/sort logic with fetchMovies via applyMovieFilters helper — adding a new MovieStatus case or sort option only requires updating applyMovieFilters.
// @sync: like fetchMovies, passes featuredFirst: true so featured movies surface first in paginated results too.
// @contract: `offset` is absolute row offset, `limit` is number of rows to fetch.
export async function fetchMoviesPaginated(
  offset: number,
  limit: number = 10,
  filters?: MovieFilters,
): Promise<Movie[]> {
  let query = supabase.from('movies').select('*');

  const result = await applyMovieFilters(query, filters, { featuredFirst: true });
  if (result === null) return [];
  query = result;

  const to = offset + limit - 1;
  query = query.range(offset, to);

  return unwrapList(await query);
}

// @assumes: getLocalDateString() returns the device's local date — if a user's device clock is off by a day, they'll see yesterday's releases in upcoming or miss today's.
// @contract: `offset` is absolute row offset, `limit` is number of rows to fetch.
export async function fetchUpcomingMovies(offset: number, limit: number = 10): Promise<Movie[]> {
  const todayStr = getLocalDateString();
  const to = offset + limit - 1;

  return unwrapList(
    await supabase
      .from('movies')
      .select('*')
      .gte('release_date', todayStr)
      .order('release_date', { ascending: true })
      .range(offset, to),
  );
}

// @edge: limit defaults to 50 but applies to the junction table query (movie_platforms), not the final movies query. A platform with 100 movies only returns 50 — but there's no pagination or "load more" for this endpoint. The second query (movies) has no limit, returning all matched IDs.
// @coupling: uses movie_platforms table (legacy), not movie_platform_availability. Country-specific availability is ignored — all movies linked to this platform globally are returned.
export async function fetchMoviesByPlatform(
  platformId: string,
  limit: number = 50,
): Promise<Movie[]> {
  const { data: movieIds, error: platErr3 } = await supabase
    .from('movie_platforms')
    .select('movie_id')
    .eq('platform_id', platformId)
    .limit(limit);
  if (platErr3) throw platErr3;
  if (!movieIds || movieIds.length === 0) return [];

  return unwrapList(
    await supabase
      .from('movies')
      .select('*')
      .in(
        'id',
        movieIds.map((m) => m.movie_id),
      )
      .order('release_date', { ascending: false }),
  );
}
