import { supabase } from '@/lib/supabase';

// @contract: Circuit breaker — once the RPC fails, all subsequent calls are no-ops for the
// rest of the JS session. Prevents log spam when the news_feed relation is missing.
let circuitOpen = false;

/** @edge Reset for testing only — not exported from the module's public API. */
export function _resetCircuitBreaker(): void {
  circuitOpen = false;
}

/**
 * @sideeffect Calls RPC record_feed_views to insert rows into feed_views table.
 * DB trigger increments news_feed.view_count for each genuinely new view.
 * @contract Fire-and-forget — logs warning on first error, then stops retrying (circuit breaker).
 * View tracking is non-critical; failures should not break the feed experience.
 */
export async function recordFeedViews(feedItemIds: string[]): Promise<void> {
  if (feedItemIds.length === 0) return;
  if (circuitOpen) return;

  const { error } = await supabase.rpc('record_feed_views', {
    p_feed_item_ids: feedItemIds,
  });
  if (error) {
    circuitOpen = true;
    console.warn('[view-tracking] Failed to record feed views:', error.message);
  }
}
