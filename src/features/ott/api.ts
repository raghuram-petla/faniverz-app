import { supabase } from '@/lib/supabase';
import type { OttReleaseWithPlatform, Platform } from '@/types/ott';
import type { Movie } from '@/types/movie';

export interface RecentOttEntry {
  id: number;
  movie_id: number;
  ott_release_date: string;
  platform: Platform;
  movie: Movie;
}

export async function fetchOttReleases(movieId: number): Promise<OttReleaseWithPlatform[]> {
  const { data, error } = await supabase
    .from('ott_releases')
    .select('*, platform:platforms(*)')
    .eq('movie_id', movieId)
    .order('ott_release_date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as OttReleaseWithPlatform[];
}

export async function fetchRecentOttReleases(): Promise<RecentOttEntry[]> {
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const sinceDate = twoWeeksAgo.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('ott_releases')
    .select('id, movie_id, ott_release_date, platform:platforms(*), movie:movies(*)')
    .gte('ott_release_date', sinceDate)
    .order('ott_release_date', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as unknown as RecentOttEntry[];
}

export async function fetchPlatforms(): Promise<Platform[]> {
  const { data, error } = await supabase
    .from('platforms')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Platform[];
}
