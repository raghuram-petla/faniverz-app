import { supabase } from '@/lib/supabase';
import type { EditorialReviewWithUserData, CraftName } from '@shared/types';

// @boundary fetches editorial review via RPC — returns null if no published review exists
export async function fetchEditorialReview(
  movieId: string,
  userId?: string,
): Promise<EditorialReviewWithUserData | null> {
  const { data, error } = await supabase.rpc('get_editorial_review', {
    p_movie_id: movieId,
    p_user_id: userId || null,
  });

  if (error) throw error;
  if (!data || data.length === 0) return null;

  // @contract RPC returns array — take first (one editorial review per movie)
  return data[0] as EditorialReviewWithUserData;
}

// @sideeffect upserts agree/disagree poll vote
export async function upsertPollVote(
  editorialReviewId: string,
  userId: string,
  vote: 'agree' | 'disagree',
): Promise<void> {
  const { error } = await supabase
    .from('editorial_review_polls')
    .upsert(
      { editorial_review_id: editorialReviewId, user_id: userId, vote },
      { onConflict: 'editorial_review_id,user_id' },
    );

  if (error) throw error;
}

// @sideeffect removes poll vote
export async function removePollVote(editorialReviewId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('editorial_review_polls')
    .delete()
    .eq('editorial_review_id', editorialReviewId)
    .eq('user_id', userId);

  if (error) throw error;
}

// @sideeffect upserts a single craft rating for a movie
export async function upsertCraftRating(
  movieId: string,
  userId: string,
  craft: CraftName,
  rating: number,
): Promise<void> {
  const column = `rating_${craft}`;
  const { error } = await supabase.from('user_craft_ratings').upsert(
    {
      movie_id: movieId,
      user_id: userId,
      [column]: rating,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,movie_id' },
  );

  if (error) throw error;
}
