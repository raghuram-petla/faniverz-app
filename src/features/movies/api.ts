import { supabase } from '@/lib/supabase';
import { Movie } from '@/types';

export async function fetchMovies(): Promise<Movie[]> {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .order('release_date', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchMovieById(id: string): Promise<Movie | null> {
  const { data, error } = await supabase.from('movies').select('*').eq('id', id).single();

  if (error) throw error;
  return data;
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
