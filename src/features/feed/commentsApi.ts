import { supabase } from '@/lib/supabase';
import type { FeedComment } from '@shared/types';

export async function fetchComments(
  feedItemId: string,
  page: number,
  pageSize: number = 20,
): Promise<FeedComment[]> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from('feed_comments')
    .select('id, feed_item_id, user_id, body, created_at, profile:profiles(display_name)')
    .eq('feed_item_id', feedItemId)
    .order('created_at', { ascending: true })
    .range(from, to);

  if (error) throw error;
  return (data ?? []) as unknown as FeedComment[];
}

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

export async function deleteComment(commentId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('feed_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);

  if (error) throw error;
}
