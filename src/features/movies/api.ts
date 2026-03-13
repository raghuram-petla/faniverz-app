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

export async function fetchMovies(filters?: MovieFilters): Promise<Movie[]> {
  let query = supabase.from('movies').select('*');

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
        // Movies that have at least one platform entry
        const { data: streamingIds } = await supabase.from('movie_platforms').select('movie_id');
        if (streamingIds && streamingIds.length > 0) {
          query = query.in(
            'id',
            streamingIds.map((m) => m.movie_id),
          );
        } else {
          return [];
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
    const { data: movieIds } = await supabase
      .from('movie_platforms')
      .select('movie_id')
      .eq('platform_id', filters.platformId);
    if (movieIds && movieIds.length > 0) {
      query = query.in(
        'id',
        movieIds.map((m) => m.movie_id),
      );
    } else {
      return [];
    }
  }

  // Featured movies always surface first
  query = query.order('is_featured', { ascending: false });

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

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

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

export async function fetchMoviesByMonth(year: number, month: number): Promise<Movie[]> {
  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .gte('release_date', startDate)
    .lte('release_date', endDate)
    .order('release_date', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

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

export async function fetchMoviesPaginated(
  page: number,
  pageSize: number = 10,
  filters?: MovieFilters,
): Promise<Movie[]> {
  let query = supabase.from('movies').select('*');

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
        const { data: streamingIds } = await supabase.from('movie_platforms').select('movie_id');
        if (streamingIds && streamingIds.length > 0) {
          query = query.in(
            'id',
            streamingIds.map((m) => m.movie_id),
          );
        } else {
          return [];
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
    const { data: movieIds } = await supabase
      .from('movie_platforms')
      .select('movie_id')
      .eq('platform_id', filters.platformId);
    if (movieIds && movieIds.length > 0) {
      query = query.in(
        'id',
        movieIds.map((m) => m.movie_id),
      );
    } else {
      return [];
    }
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

  const from = page * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchUpcomingMovies(page: number, pageSize: number = 10): Promise<Movie[]> {
  const todayStr = new Date().toISOString().split('T')[0];
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

export async function fetchMoviesByPlatform(platformId: string): Promise<Movie[]> {
  const { data: movieIds } = await supabase
    .from('movie_platforms')
    .select('movie_id')
    .eq('platform_id', platformId);

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
