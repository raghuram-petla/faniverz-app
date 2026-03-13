import { useState, useCallback } from 'react';

// @contract accepts N refetch functions; runs all in parallel and manages a single refreshing flag
// @edge if any refetchFn rejects, others still settle but the rejection propagates after setRefreshing(false)
export function useRefresh(...refetchFns: (() => Promise<unknown>)[]) {
  const [refreshing, setRefreshing] = useState(false);

  // @assumes callers pass stable refetchFn references (e.g. from TanStack Query) to avoid re-creating this callback
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all(refetchFns.map((fn) => fn()));
    } finally {
      setRefreshing(false);
    }
  }, refetchFns);

  return { refreshing, onRefresh };
}
