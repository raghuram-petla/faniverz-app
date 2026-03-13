import { supabase } from '@/lib/supabase';
import { Review, CreateReviewInput, UpdateReviewInput } from '@/types';

// @contract: selects profile:profiles(id, display_name, avatar_url) — matches Review type Pick<UserProfile, 'id' | 'display_name' | 'avatar_url'>.
// @edge: no pagination — fetches ALL reviews for a movie. A popular movie with hundreds of reviews returns them all in one call. No limit applied.
export async function fetchMovieReviews(movieId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profile:profiles(id, display_name, avatar_url)')
    .eq('movie_id', movieId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// @contract: selects movie:movies(id, title, poster_url) — matches Review type Pick<Movie, 'id' | 'title' | 'poster_url'>.
export async function fetchUserReviews(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, movie:movies(id, title, poster_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// @sideeffect: insert triggers the DB function update_movie_rating which recalculates movies.rating (AVG of all review ratings) and movies.review_count. This happens synchronously in the same transaction. The returned Review has the old movie rating snapshot — the caller must refetch the movie to see the updated rating.
// @contract: .select() after insert returns the review WITHOUT profile or movie joins. The returned Review has profile=undefined and movie=undefined. useReviewMutations.create.onSuccess doesn't use the returned data — it just invalidates caches. But if onSuccess logic is added that reads the returned review's profile, it will be null.
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

// @sideeffect: delete triggers update_movie_rating which recalculates rating and review_count. Also cascades to review_helpful (DELETE CASCADE on FK) which fires update_helpful_count — but that's harmless since the parent review is being deleted anyway.
// @edge: no user_id filter — any authenticated user could delete any review if RLS allows it. Security depends entirely on RLS policy. If RLS is misconfigured (e.g., too permissive for admins), this becomes a wide-open delete endpoint.
export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.from('reviews').delete().eq('id', id);
  if (error) throw error;
}

// @contract: atomic toggle using upsert + delete — avoids read-then-write race condition.
// First attempts to delete; if 0 rows affected, inserts instead. Both paths are single
// statements so concurrent taps cannot produce duplicates.
// @sideeffect: fires on_review_helpful_change_update_count trigger which does COUNT(*) recalculation.
export async function toggleHelpful(userId: string, reviewId: string): Promise<boolean> {
  const { data: deleted } = await supabase
    .from('review_helpful')
    .delete()
    .eq('user_id', userId)
    .eq('review_id', reviewId)
    .select('id');

  if (deleted && deleted.length > 0) {
    return false;
  }

  const { error } = await supabase
    .from('review_helpful')
    .upsert({ user_id: userId, review_id: reviewId }, { onConflict: 'user_id,review_id' });
  if (error) throw error;
  return true;
}
