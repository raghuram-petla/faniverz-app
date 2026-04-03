import { useCallback, useEffect, useRef, useState } from 'react';

const PROGRAMMATIC_REFRESH_MIN_MS = 450;

/**
 * @contract Manages programmatic (non-pull) refresh: shows the indicator for at least
 * PROGRAMMATIC_REFRESH_MIN_MS to avoid flicker, then hides it once the refetch completes.
 * @coupling usePullToRefresh — calls showRefreshIndicator/hideRefreshIndicator to bridge
 * the programmatic flow into the same visual indicator the pull gesture uses.
 */
export interface UseProgrammaticRefreshParams {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  showRefreshIndicator: () => void;
  hideRefreshIndicator: () => void;
}

export function useProgrammaticRefresh({
  refreshing,
  onRefresh,
  showRefreshIndicator,
  hideRefreshIndicator,
}: UseProgrammaticRefreshParams) {
  const [showProgrammaticRefreshIndicator, setShowProgrammaticRefreshIndicator] = useState(false);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runProgrammaticRefresh = useCallback(() => {
    if (refreshing || showProgrammaticRefreshIndicator) return;
    showRefreshIndicator();
    setShowProgrammaticRefreshIndicator(true);
    const startedAt = Date.now();

    void onRefresh().finally(() => {
      const remainingMs = Math.max(0, PROGRAMMATIC_REFRESH_MIN_MS - (Date.now() - startedAt));
      /* istanbul ignore next -- defensive: guard prevents re-entry so existing timeout is unreachable */
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        hideRefreshIndicator();
        setShowProgrammaticRefreshIndicator(false);
        refreshTimeoutRef.current = null;
      }, remainingMs);
    });
  }, [
    hideRefreshIndicator,
    onRefresh,
    refreshing,
    showProgrammaticRefreshIndicator,
    showRefreshIndicator,
  ]);

  useEffect(
    () => () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      hideRefreshIndicator();
    },
    [hideRefreshIndicator],
  );

  return { showProgrammaticRefreshIndicator, runProgrammaticRefresh };
}
