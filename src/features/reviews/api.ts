import { supabase } from '@/lib/supabase';
import { Review, CreateReviewInput, UpdateReviewInput } from '@/types';

export async function fetchMovieReviews(movieId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profile:profiles(display_name, avatar_url)')
    .eq('movie_id', movieId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchUserReviews(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, movie:movies(title, poster_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createReview(input: CreateReviewInput): Promise<Review> {
  const { data, error } = await supabase.from('reviews').insert(input).select().single();

  if (error) throw error;
  return data;
}

export async function updateReview(id: string, input: UpdateReviewInput): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.from('reviews').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleHelpful(userId: string, reviewId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('review_helpful')
    .select('*')
    .eq('user_id', userId)
    .eq('review_id', reviewId)
    .maybeSingle();

  if (existing) {
    await supabase.from('review_helpful').delete().eq('user_id', userId).eq('review_id', reviewId);
    return false;
  } else {
    await supabase.from('review_helpful').insert({ user_id: userId, review_id: reviewId });
    return true;
  }
}
