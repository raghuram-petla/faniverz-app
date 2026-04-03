import { supabase } from '@/lib/supabase';

// @sideeffect: upsert fires trg_comment_like_count trigger on INSERT, incrementing feed_comments.like_count.
// Also fires trg_notify_comment_like (creates notification for comment owner).
// @contract: onConflict 'comment_id,user_id' matches the UNIQUE constraint on comment_likes.
export async function likeComment(commentId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('comment_likes')
    .upsert({ comment_id: commentId, user_id: userId }, { onConflict: 'comment_id,user_id' });
  if (error) throw error;
}

// @sideeffect: delete fires trg_comment_like_count trigger, decrementing feed_comments.like_count.
export async function unlikeComment(commentId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('comment_likes')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', userId);
  if (error) throw error;
}

// @contract: batches .in() calls in chunks of 40 to stay within URL length limits.
// Returns Record<commentId, true> for liked comments.
export async function fetchUserCommentLikes(
  userId: string,
  commentIds: string[],
): Promise<Record<string, true>> {
  if (commentIds.length === 0) return {};

  const BATCH_SIZE = 40;
  const batches: string[][] = [];
  for (let i = 0; i < commentIds.length; i += BATCH_SIZE) {
    batches.push(commentIds.slice(i, i + BATCH_SIZE));
  }

  const results = await Promise.all(
    batches.map(async (batch) => {
      const { data, error } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', userId)
        .in('comment_id', batch);
      if (error) throw error;
      return data ?? [];
    }),
  );

  const liked: Record<string, true> = {};
  for (const rows of results) {
    for (const row of rows) {
      liked[row.comment_id as string] = true;
    }
  }
  return liked;
}
