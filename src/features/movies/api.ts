import { supabase } from '@/lib/supabase';
import { Movie, MovieWithDetails, MovieStatus } from '@/types';

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
        const { data: streamingIds, error: streamErr } = await supabase
          .from('movie_platforms')
          .select('movie_id');
        if (streamErr) throw streamErr;
        if (streamingIds && streamingIds.length > 0) {
          query = query.in(
            'id',
            streamingIds.map((m: { movie_id: string }) => m.movie_id),
          );
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

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// @coupling: the actor join in movie_cast.select() explicitly lists columns (id, name, photo_url, birth_date, person_type, tmdb_person_id, created_at) — if the Actor type in shared/types.ts adds new fields (e.g., biography, height_cm), they won't appear here unless the select() is updated. The cast/crew CastMember type assumes .actor is the full Actor shape but gets a partial.
// @edge: .single() throws PGRST116 if movie not found — the error is re-thrown, so callers see a Supabase error, not null. This differs from fetchFeedItemById which catches PGRST116 and returns null.
// @assumes: movie_cast rows always have credit_type = 'cast' | 'crew'. If a row has NULL or an unexpected value, it's silently excluded from both cast and crew arrays.
export async function fetchMovieById(id: string): Promise<MovieWithDetails | null> {
  const { data: movie, error } = await supabase.from('movies').select('*').eq('id', id).single();

  if (error) throw error;
  if (!movie) return null;

  // Fetch all related data in parallel
  const [castResult, platformResult, postersResult, videosResult, productionHousesResult] =
    await Promise.all([
      supabase
        .from('movie_cast')
        .select(
          '*, actor:actors(id, name, photo_url, birth_date, person_type, tmdb_person_id, created_at)',
        )
        .eq('movie_id', id),
      supabase.from('movie_platforms').select('*, platform:platforms(*)').eq('movie_id', id),
      supabase.from('movie_posters').select('*').eq('movie_id', id).order('display_order'),
      supabase.from('movie_videos').select('*').eq('movie_id', id).order('display_order'),
      supabase
        .from('movie_production_houses')
        .select('*, production_house:production_houses(*)')
        .eq('movie_id', id),
    ]);

  const allCredits = castResult.data ?? [];

  // Actors: sorted by display_order ASC (per-movie billing from TMDB)
  const cast = allCredits
    .filter((c) => c.credit_type === 'cast')
    .sort((a, b) => a.display_order - b.display_order);

  // Crew: role_order ASC (Director first, then Producer, Music Director, DOP, …)
  const crew = allCredits
    .filter((c) => c.credit_type === 'crew')
    .sort((a, b) => (a.role_order ?? 99) - (b.role_order ?? 99));

  // Extract production houses from junction table
  const productionHouses = (productionHousesResult.data ?? [])
    .map((mph) => mph.production_house)
    .filter(Boolean);

  return {
    ...movie,
    cast,
    crew,
    platforms: platformResult.data ?? [],
    posters: postersResult.data ?? [],
    videos: videosResult.data ?? [],
    productionHouses,
  };
}

// @edge: month param is 0-indexed (JavaScript Date convention) — new Date(year, 12, 1) wraps to January of next year. Callers must pass 0-11 not 1-12, but the parameter name 'month' doesn't signal this.
// @assumes: release_date is stored as 'YYYY-MM-DD' string in Supabase. String comparison (gte/lte) works correctly only because the format is lexicographically sortable. A different date format would silently return wrong results.
export async function fetchMoviesByMonth(year: number, month: number): Promise<Movie[]> {
  const startDate = getLocalDateString(new Date(year, month, 1));
  const endDate = getLocalDateString(new Date(year, month + 1, 0));

  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .gte('release_date', startDate)
    .lte('release_date', endDate)
    .order('release_date', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// @boundary: query string is interpolated directly into PostgREST filter syntax — a query containing commas, parentheses, or dots could break the .or() filter or cause unexpected matching. No sanitization is performed.
// @edge: only searches title and director columns — genres, cast names, and production houses are not searched. Users searching for an actor name get no results here; must use searchActors separately.
export async function searchMovies(query: string): Promise<Movie[]> {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .or(`title.ilike.%${query}%,director.ilike.%${query}%`)
    .order('rating', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data ?? [];
}

// @sync: shares filter/sort logic with fetchMovies via applyMovieFilters helper — adding a new MovieStatus case or sort option only requires updating applyMovieFilters.
// @edge: unlike fetchMovies, this function does NOT pass featuredFirst: true — so featured movies don't surface first in paginated results, breaking consistency with the non-paginated list.
export async function fetchMoviesPaginated(
  page: number,
  pageSize: number = 10,
  filters?: MovieFilters,
): Promise<Movie[]> {
  let query = supabase.from('movies').select('*');

  const result = await applyMovieFilters(query, filters, { featuredFirst: true });
  if (result === null) return [];
  query = result;

  const from = page * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// @assumes: getLocalDateString() returns the device's local date — if a user's device clock is off by a day, they'll see yesterday's releases in upcoming or miss today's.
export async function fetchUpcomingMovies(page: number, pageSize: number = 10): Promise<Movie[]> {
  const todayStr = getLocalDateString();
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .gte('release_date', todayStr)
    .order('release_date', { ascending: true })
    .range(from, to);

  if (error) throw error;
  return data ?? [];
}

// @edge: no pagination — fetches ALL movies for a platform in one call. For a platform like Netflix with hundreds of titles, this returns a large payload with no limit.
export async function fetchMoviesByPlatform(platformId: string): Promise<Movie[]> {
  const { data: movieIds, error: platErr3 } = await supabase
    .from('movie_platforms')
    .select('movie_id')
    .eq('platform_id', platformId);
  if (platErr3) throw platErr3;
  if (!movieIds || movieIds.length === 0) return [];

  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .in(
      'id',
      movieIds.map((m) => m.movie_id),
    )
    .order('release_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
