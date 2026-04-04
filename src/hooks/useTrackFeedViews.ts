/**
 * @contract Tracks feed item views by detecting visibility via FlashList's onViewableItemsChanged.
 * Only records views for authenticated users. Each item is tracked at most once per session
 * on the client side; the DB UNIQUE constraint provides permanent dedup.
 *
 * @coupling Works with FlashList's onViewableItemsChanged prop alongside usePrefetchOnVisibility.
 * Both hooks share the same viewabilityConfig (50% visible, 300ms minimum).
 *
 * @sideeffect Batches visible item IDs and flushes to record_feed_views RPC every 5 seconds
 * or when batch reaches 10 items, whichever comes first.
 */
import { useCallback, useEffect, useRef } from 'react';
import type { ViewToken } from 'react-native';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { recordFeedViews } from '@/features/feed/viewTrackingApi';

const FLUSH_INTERVAL_MS = 5000;
const FLUSH_BATCH_THRESHOLD = 10;

export interface UseTrackFeedViewsResult {
  /** Callback for FlashList onViewableItemsChanged — compose with prefetch callback */
  onViewableItemsChanged: (info: { viewableItems: ViewToken[] }) => void;
  /** Call on pull-to-refresh to clear session dedup set */
  resetDedup: () => void;
}

export function useTrackFeedViews(): UseTrackFeedViewsResult {
  const { user } = useAuth();
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  // @contract Session-level dedup — prevents redundant RPC calls for already-sent items
  const sessionViewedRef = useRef(new Set<string>());
  // @contract Accumulator between flushes
  const pendingBatchRef = useRef(new Set<string>());
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const flush = useCallback(() => {
    if (pendingBatchRef.current.size === 0 || !userIdRef.current) return;
    const ids = [...pendingBatchRef.current];
    pendingBatchRef.current.clear();
    // @sideeffect Fire-and-forget — recordFeedViews handles its own error logging
    recordFeedViews(ids);
  }, []);

  // @sync Start interval timer on mount, flush + cleanup on unmount
  useEffect(() => {
    timerRef.current = setInterval(flush, FLUSH_INTERVAL_MS);
    return () => {
      /* istanbul ignore next -- timerRef always set by setInterval above */
      if (timerRef.current) clearInterval(timerRef.current);
      /* istanbul ignore next -- rafRef is always null in Jest (no real RAF scheduling) */
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      // Flush remaining on unmount
      flush();
    };
  }, [flush]);

  const onViewableItemsChanged = useCallback(
    (info: { viewableItems: ViewToken[] }) => {
      if (!userIdRef.current) return;

      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        for (const viewToken of info.viewableItems) {
          const item = viewToken.item as { id?: string };
          if (!item?.id) continue;
          if (sessionViewedRef.current.has(item.id)) continue;

          sessionViewedRef.current.add(item.id);
          pendingBatchRef.current.add(item.id);
        }

        // @edge Eager flush when batch is large (fast scrolling)
        if (pendingBatchRef.current.size >= FLUSH_BATCH_THRESHOLD) {
          flush();
        }

        rafRef.current = null;
      });
    },
    [flush],
  );

  const resetDedup = useCallback(() => {
    sessionViewedRef.current.clear();
  }, []);

  return { onViewableItemsChanged, resetDedup };
}
