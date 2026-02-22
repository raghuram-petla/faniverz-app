import { supabase } from '@/lib/supabase';
import type { Movie, MovieCast, CalendarEntry } from '@/types/movie';

export async function fetchMoviesByMonth(year: number, month: number): Promise<CalendarEntry[]> {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  const start = startDate.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];

  // Fetch theatrical releases in this month
  const { data: theatricalMovies, error: theatricalError } = await supabase
    .from('movies')
    .select('*')
    .gte('release_date', start)
    .lte('release_date', end)
    .not('status', 'eq', 'cancelled')
    .order('release_date', { ascending: true });

  if (theatricalError) throw theatricalError;

  // Fetch OTT releases in this month
  const { data: ottReleases, error: ottError } = await supabase
    .from('ott_releases')
    .select('*, movies(*)')
    .gte('ott_release_date', start)
    .lte('ott_release_date', end)
    .order('ott_release_date', { ascending: true });

  if (ottError) throw ottError;

  const entries: CalendarEntry[] = [];

  // Add theatrical entries
  if (theatricalMovies) {
    for (const movie of theatricalMovies as Movie[]) {
      entries.push({
        date: movie.release_date,
        movie,
        dotType: movie.release_type === 'ott_original' ? 'ott_original' : 'theatrical',
      });
    }
  }

  // Add OTT premiere entries (exclude cancelled movies)
  if (ottReleases) {
    for (const release of ottReleases) {
      const movie = release.movies as unknown as Movie;
      if (!movie || movie.status === 'cancelled') continue;

      entries.push({
        date: release.ott_release_date,
        movie,
        dotType: 'ott_premiere',
        platform_id: release.platform_id,
      });
    }
  }

  return entries;
}

export async function fetchMovieDetail(id: number): Promise<Movie | null> {
  const { data, error } = await supabase.from('movies').select('*').eq('id', id).single();

  if (error) throw error;
  return data as Movie;
}

export async function fetchMovieCast(movieId: number): Promise<MovieCast[]> {
  const { data, error } = await supabase
    .from('movie_cast')
    .select('*')
    .eq('movie_id', movieId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return (data as MovieCast[]) ?? [];
}

export async function searchMovies(query: string): Promise<Movie[]> {
  if (!query.trim()) return [];

  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .not('status', 'eq', 'cancelled')
    .or(`title.ilike.%${query}%,title_te.ilike.%${query}%`)
    .order('popularity', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data as Movie[]) ?? [];
}
