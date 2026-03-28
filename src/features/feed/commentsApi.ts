import { supabase } from '@/lib/supabase';
import type { FeedComment } from '@shared/types';

// @coupling: select joins profile:profiles(display_name) using an implicit FK from feed_comments.user_id -> profiles.id. The FeedComment type (shared/types.ts) declares profile as optional { display_name: string | null }. If a user deletes their account (profiles row deleted via CASCADE), existing comments are also deleted (ON DELETE CASCADE on the FK). So orphan comments without profiles shouldn't occur — but if CASCADE is removed, profile will be null and display shows as anonymous.
// @contract: body column has CHECK(char_length(body) BETWEEN 1 AND 500) in the DB. The API doesn't validate length before insert — if the client sends >500 chars, the DB rejects it and the error surfaces as a generic Alert in useAddComment. No field-level validation message is shown.
// @contract: `offset` is absolute row offset, `limit` is number of rows to fetch.
export async function fetchComments(
  feedItemId: string,
  offset: number = 0,
  limit: number = 20,
): Promise<FeedComment[]> {
  const to = offset + limit - 1;

  const { data, error } = await supabase
    .from('feed_comments')
    .select('id, feed_item_id, user_id, body, created_at, profile:profiles(display_name)')
    .eq('feed_item_id', feedItemId)
    .order('created_at', { ascending: true })
    .range(offset, to);

  if (error) throw error;
  return (data ?? []) as unknown as FeedComment[];
}

// @sideeffect: insert fires trg_feed_comment_count trigger which increments news_feed.comment_count by 1. The optimistic update in useAddComment increments the local count immediately — if the insert fails, onError must decrement it back. If the trigger is disabled/removed, comment_count drifts from actual comment rows over time.
export async function addComment(
  feedItemId: string,
  userId: string,
  body: string,
): Promise<FeedComment> {
  const { data, error } = await supabase
    .from('feed_comments')
    .insert({ feed_item_id: feedItemId, user_id: userId, body })
    .select('id, feed_item_id, user_id, body, created_at, profile:profiles(display_name)')
    .single();

  if (error) throw error;
  return data as unknown as FeedComment;
}

// @sideeffect: on successful delete, the DB trigger trg_feed_comment_count decrements news_feed.comment_count by 1. But if the delete matches 0 rows (wrong userId or already deleted), no trigger fires and the count stays unchanged. The function returns success either way — the caller can't distinguish "deleted" from "nothing to delete".
export async function deleteComment(commentId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('feed_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);

  if (error) throw error;
}
