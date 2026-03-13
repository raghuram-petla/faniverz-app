import { supabase } from '@/lib/supabase';
import { Review, CreateReviewInput, UpdateReviewInput } from '@/types';

// @coupling: selects profile:profiles(display_name, avatar_url) — the Review type declares profile as Pick<UserProfile, 'id' | 'display_name' | 'avatar_url'> but 'id' is NOT selected here. Any consumer accessing review.profile.id gets undefined at runtime despite TypeScript showing it as a string. This is a type-safety gap caused by the select being narrower than the type declaration.
// @edge: no pagination — fetches ALL reviews for a movie. A popular movie with hundreds of reviews returns them all in one call. No limit applied.
export async function fetchMovieReviews(movieId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profile:profiles(display_name, avatar_url)')
    .eq('movie_id', movieId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// @coupling: selects movie:movies(title, poster_url) — the Review type declares movie as Pick<Movie, 'id' | 'title' | 'poster_url'> but 'id' is NOT selected. Same type-safety gap as fetchMovieReviews: movie.id is undefined at runtime. If the UI tries to navigate to a movie detail page using review.movie.id, navigation will break with an undefined route param.
export async function fetchUserReviews(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, movie:movies(title, poster_url)')
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

// @edge: read-then-write pattern (SELECT then INSERT/DELETE) is NOT atomic — two rapid taps can both read existing=null and both insert, causing a unique constraint violation on the second insert. The error bubbles up as a generic alert in useReviewMutations.helpful.onError. The helpful_count trigger would fire twice, incrementing by 2 instead of 1. On the next toggle, the SELECT finds one row (the first insert), deletes it, but the second orphaned row persists, leaving helpful_count permanently off by 1.
// @sideeffect: both the insert and delete fire the on_review_helpful_change_update_count trigger which does a COUNT(*) recalculation (not increment/decrement). So the race condition above would self-heal on the next trigger fire IF the orphaned row is eventually cleaned up. But the orphaned row stays unless manually deleted.
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
