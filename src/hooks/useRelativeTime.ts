import { useState, useEffect, useRef } from 'react';
import { formatRelativeTime } from '@/utils/formatDate';

/**
 * Returns a live-updating relative timestamp string (e.g. "2m ago").
 * Refresh interval adapts to the age of the timestamp:
 *   - < 1 min old  → every 15s
 *   - < 1 hour old → every 30s
 *   - < 24h old    → every 5 min
 *   - older         → no refresh (days/weeks don't change visibly)
 *
 * @contract Returns 'Unknown' for null/undefined/invalid dateStr (same as formatRelativeTime).
 */
// @coupling formatRelativeTime — delegates formatting; only manages refresh cadence
export function useRelativeTime(dateStr: string | null | undefined): string {
  const [text, setText] = useState(() => formatRelativeTime(dateStr));
  const dateRef = useRef(dateStr);

  // @sync reset immediately when the underlying date prop changes
  if (dateRef.current !== dateStr) {
    dateRef.current = dateStr;
    const next = formatRelativeTime(dateStr);
    /* istanbul ignore else -- text always differs when dateStr changes in practice */
    if (next !== text) setText(next);
  }

  useEffect(() => {
    if (!dateStr) return;

    /** @edge interval adapts: frequent for recent posts, infrequent for older ones */
    function getInterval(): number {
      const diffMs = Date.now() - new Date(dateStr!).getTime();
      const diffMins = diffMs / 60_000;
      if (diffMins < 1) return 15_000; // "Just now" → 15s
      if (diffMins < 60) return 30_000; // minutes range → 30s
      if (diffMins < 1440) return 300_000; // hours range → 5 min
      return 0; // days+ → no refresh
    }

    const interval = getInterval();
    if (interval === 0) return;

    const id = setInterval(() => {
      setText(formatRelativeTime(dateStr));
    }, interval);

    return () => clearInterval(id);
  }, [dateStr]);

  return text;
}
