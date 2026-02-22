import { supabase } from '@/lib/supabase';
import type { Review, ReviewInsert, ReviewUpdate, ReviewSortOption } from '@/types/review';

export interface ReviewWithProfile extends Review {
  profile: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

const SORT_MAP: Record<ReviewSortOption, { column: string; ascending: boolean }> = {
  recent: { column: 'created_at', ascending: false },
  highest: { column: 'rating', ascending: false },
  lowest: { column: 'rating', ascending: true },
};

export async function fetchReviewsForMovie(
  movieId: number,
  sort: ReviewSortOption = 'recent',
  page: number = 0,
  pageSize: number = 10
): Promise<ReviewWithProfile[]> {
  const { column, ascending } = SORT_MAP[sort];
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from('reviews')
    .select('*, profile:profiles(display_name, avatar_url)')
    .eq('movie_id', movieId)
    .order(column, { ascending })
    .range(from, to);

  if (error) throw error;
  return (data ?? []) as unknown as ReviewWithProfile[];
}

export async function fetchMyReview(
  movieId: number,
  userId: string
): Promise<ReviewWithProfile | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profile:profiles(display_name, avatar_url)')
    .eq('movie_id', movieId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as ReviewWithProfile | null;
}

export async function insertReview(userId: string, review: ReviewInsert): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .insert({ ...review, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data as Review;
}

export async function updateReview(reviewId: number, updates: ReviewUpdate): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .update(updates)
    .eq('id', reviewId)
    .select()
    .single();

  if (error) throw error;
  return data as Review;
}

export async function deleteReview(reviewId: number): Promise<void> {
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId);

  if (error) throw error;
}
