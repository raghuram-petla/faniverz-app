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

  // Fetch cast
  const { data: castData } = await supabase
    .from('movie_cast')
    .select('*, actor:actors(*)')
    .eq('movie_id', id)
    .order('display_order', { ascending: true });

  // Fetch platforms
  const { data: platformData } = await supabase
    .from('movie_platforms')
    .select('*, platform:platforms(*)')
    .eq('movie_id', id);

  return {
    ...movie,
    cast: castData ?? [],
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
