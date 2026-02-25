import { supabase } from '@/lib/supabase';
import { Movie, MovieWithDetails, ReleaseType } from '@/types';

export interface MovieFilters {
  releaseType?: ReleaseType;
  genre?: string;
  platformId?: string;
  sortBy?: 'popular' | 'top_rated' | 'latest' | 'upcoming';
}

export async function fetchMovies(filters?: MovieFilters): Promise<Movie[]> {
  let query = supabase.from('movies').select('*');

  if (filters?.releaseType) {
    query = query.eq('release_type', filters.releaseType);
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

  // Fetch cast & crew
  const { data: castData } = await supabase
    .from('movie_cast')
    .select(
      '*, actor:actors(id, name, photo_url, birth_date, person_type, tmdb_person_id, created_at)',
    )
    .eq('movie_id', id);

  const allCredits = castData ?? [];

  // Actors: tier_rank ASC, then birth_date ASC (older actor shown first within same tier)
  const cast = allCredits
    .filter((c) => c.credit_type === 'cast')
    .sort((a, b) => {
      const tierDiff = (a.tier_rank ?? 99) - (b.tier_rank ?? 99);
      if (tierDiff !== 0) return tierDiff;
      const dateA = a.actor?.birth_date ? new Date(a.actor.birth_date).getTime() : Infinity;
      const dateB = b.actor?.birth_date ? new Date(b.actor.birth_date).getTime() : Infinity;
      return dateA - dateB;
    });

  // Crew: role_order ASC (Director first, then Producer, Music Director, DOP, …)
  const crew = allCredits
    .filter((c) => c.credit_type === 'crew')
    .sort((a, b) => (a.role_order ?? 99) - (b.role_order ?? 99));

  // Fetch platforms
  const { data: platformData } = await supabase
    .from('movie_platforms')
    .select('*, platform:platforms(*)')
    .eq('movie_id', id);

  return {
    ...movie,
    cast,
    crew,
    platforms: platformData ?? [],
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

  if (filters?.releaseType) {
    query = query.eq('release_type', filters.releaseType);
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
