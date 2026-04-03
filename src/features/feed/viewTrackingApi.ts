import { supabase } from '@/lib/supabase';

/**
 * @sideeffect Calls RPC record_feed_views to insert rows into feed_views table.
 * DB trigger increments news_feed.view_count for each genuinely new view.
 * @contract Fire-and-forget — logs warning on error, does not throw.
 * View tracking is non-critical; failures should not break the feed experience.
 */
export async function recordFeedViews(feedItemIds: string[]): Promise<void> {
  if (feedItemIds.length === 0) return;
  const { error } = await supabase.rpc('record_feed_views', {
    p_feed_item_ids: feedItemIds,
  });
  if (error) {
    console.warn('[view-tracking] Failed to record feed views:', error.message);
  }
}
