import { supabase } from '@/lib/supabase';
import { Review, CreateReviewInput, UpdateReviewInput } from '@/types';
import { unwrapList, unwrapOne } from '@/utils/supabaseQuery';

// @contract: selects profile:profiles(id, display_name, avatar_url) — matches Review type Pick<UserProfile, 'id' | 'display_name' | 'avatar_url'>.
// @edge: limited to 100 most recent reviews per movie to prevent unbounded fetches on popular movies
export async function fetchMovieReviews(movieId: string): Promise<Review[]> {
  return unwrapList(
    await supabase
      .from('reviews')
      .select('*, profile:profiles(id, display_name, avatar_url)')
      .eq('movie_id', movieId)
      .order('created_at', { ascending: false })
      .limit(100),
  );
}

// @contract: selects movie:movies(id, title, poster_url) — matches Review type Pick<Movie, 'id' | 'title' | 'poster_url'>.
export async function fetchUserReviews(userId: string): Promise<Review[]> {
  return unwrapList(
    await supabase
      .from('reviews')
      .select('*, movie:movies(id, title, poster_url, poster_image_type)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  );
}

// --- Paginated review APIs ---

// @contract: `offset` is absolute row offset, `limit` is number of rows to fetch.
export async function fetchMovieReviewsPaginated(
  movieId: string,
  offset: number,
  limit: number = 10,
): Promise<Review[]> {
  const to = offset + limit - 1;
  return unwrapList(
    await supabase
      .from('reviews')
      .select('*, profile:profiles(id, display_name, avatar_url)')
      .eq('movie_id', movieId)
      .order('created_at', { ascending: false })
      .range(offset, to),
  );
}

// @contract: `offset` is absolute row offset, `limit` is number of rows to fetch.
export async function fetchUserReviewsPaginated(
  userId: string,
  offset: number,
  limit: number = 10,
): Promise<Review[]> {
  const to = offset + limit - 1;
  return unwrapList(
    await supabase
      .from('reviews')
      .select('*, movie:movies(id, title, poster_url, poster_image_type)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, to),
  );
}

// @sideeffect: insert triggers the DB function update_movie_rating which recalculates movies.rating (AVG of all review ratings) and movies.review_count. This happens synchronously in the same transaction. The returned Review has the old movie rating snapshot — the caller must refetch the movie to see the updated rating.
// @contract: .select() after insert returns the review WITHOUT profile or movie joins. The returned Review has profile=undefined and movie=undefined. useReviewMutations.create.onSuccess doesn't use the returned data — it just invalidates caches. But if onSuccess logic is added that reads the returned review's profile, it will be null.
export async function createReview(input: CreateReviewInput): Promise<Review> {
  return unwrapOne(await supabase.from('reviews').insert(input).select().single()) as Review;
}

export async function updateReview(id: string, input: UpdateReviewInput): Promise<Review> {
  return unwrapOne(
    await supabase.from('reviews').update(input).eq('id', id).select().single(),
  ) as Review;
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
// @edge: delete error is checked before falling through to upsert — prevents duplicate helpful votes
// on network error or RLS rejection (without this guard, deleted would be null and code would insert).
export async function toggleHelpful(userId: string, reviewId: string): Promise<boolean> {
  const { data: deleted, error: deleteError } = await supabase
    .from('review_helpful')
    .delete()
    .eq('user_id', userId)
    .eq('review_id', reviewId)
    .select('id');

  if (deleteError) throw deleteError;

  if (deleted && deleted.length > 0) {
    return false;
  }

  const { error } = await supabase
    .from('review_helpful')
    .upsert({ user_id: userId, review_id: reviewId }, { onConflict: 'user_id,review_id' });
  if (error) throw error;
  return true;
}
