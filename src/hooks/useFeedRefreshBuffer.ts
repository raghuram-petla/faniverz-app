import { useRef } from 'react';

/**
 * @contract Buffers feed items during refresh to prevent content flash under the
 * Refreshing pill. Items are frozen while isRefreshActive is true.
 * @sideeffect Detects "no new data" by comparing top item IDs before/after refresh.
 * @coupling PullToRefreshIndicator reads noNewData to show "You're all caught up".
 * @edge noNewData is computed synchronously during render (not via useState) so that
 * PullToRefreshIndicator receives the correct value in the SAME render that
 * refreshing transitions to false — avoids one-render-late timing bugs.
 */
// @assumes items have stable id ordering — top-10 ID comparison relies on server-consistent sort
export function useFeedRefreshBuffer<T extends { id: string }>(
  items: T[],
  isRefreshActive: boolean,
) {
  const stableRef = useRef(items);
  const snapshotIdsRef = useRef('');
  const wasRefreshingRef = useRef(false);
  const noNewDataRef = useRef(false);

  // @sync Snapshot top IDs when refresh begins
  if (isRefreshActive && !wasRefreshingRef.current) {
    wasRefreshingRef.current = true;
    snapshotIdsRef.current = items
      .slice(0, 10)
      .map((i) => i.id)
      .join(',');
  }

  // @sync Compute noNewData synchronously when refresh ends
  noNewDataRef.current = false;
  if (!isRefreshActive && wasRefreshingRef.current) {
    wasRefreshingRef.current = false;
    const newIds = items
      .slice(0, 10)
      .map((i) => i.id)
      .join(',');
    noNewDataRef.current = newIds === snapshotIdsRef.current;
  }

  if (!isRefreshActive) stableRef.current = items;

  return { displayItems: stableRef.current, noNewData: noNewDataRef.current };
}
