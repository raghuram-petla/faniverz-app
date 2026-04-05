import { supabase } from '@/lib/supabase';
import type { FeedComment } from '@shared/types';

const COMMENT_SELECT =
  'id, feed_item_id, user_id, body, created_at, parent_comment_id, like_count, reply_count, profile:profiles(display_name, avatar_url)';

// @contract: fetches only top-level comments (parent_comment_id IS NULL), newest first.
// Replies are fetched separately via fetchReplies().
// @coupling: select joins profile:profiles using FK feed_comments.user_id -> profiles.id.
// @contract: `offset` is absolute row offset, `limit` is number of rows.
export async function fetchComments(
  feedItemId: string,
  offset: number = 0,
  limit: number = 20,
): Promise<FeedComment[]> {
  const to = offset + limit - 1;

  const { data, error } = await supabase
    .from('feed_comments')
    .select(COMMENT_SELECT)
    .eq('feed_item_id', feedItemId)
    .is('parent_comment_id', null)
    .order('created_at', { ascending: false })
    .range(offset, to);

  if (error) throw error;
  return (data ?? []) as unknown as FeedComment[];
}

// @contract: fetches all replies for a given parent comment, ordered ascending.
// No pagination — replies are typically few per parent.
export async function fetchReplies(parentCommentId: string): Promise<FeedComment[]> {
  const { data, error } = await supabase
    .from('feed_comments')
    .select(COMMENT_SELECT)
    .eq('parent_comment_id', parentCommentId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as FeedComment[];
}

// @sideeffect: insert fires trg_feed_comment_count (increments news_feed.comment_count).
// If parentCommentId is set, also fires trg_comment_reply_count (increments parent's reply_count)
// and trg_notify_comment_reply (creates notification for parent comment owner).
export async function addComment(
  feedItemId: string,
  userId: string,
  body: string,
  parentCommentId?: string,
): Promise<FeedComment> {
  const { data, error } = await supabase
    .from('feed_comments')
    .insert({
      feed_item_id: feedItemId,
      user_id: userId,
      body,
      parent_comment_id: parentCommentId ?? null,
    })
    .select(COMMENT_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as FeedComment;
}

// @sideeffect: on delete, trg_feed_comment_count decrements news_feed.comment_count.
// If deleted comment had parent_comment_id, trg_comment_reply_count decrements parent's reply_count.
// CASCADE deletes any replies to this comment.
export async function deleteComment(commentId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('feed_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);

  if (error) throw error;
}
