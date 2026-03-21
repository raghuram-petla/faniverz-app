import { useState, useCallback, useRef } from 'react';

// @contract: accepts N refetch functions; runs all in parallel and manages a single refreshing flag
// @contract: uses Promise.allSettled so a single failing refetch doesn't block the others
export function useRefresh(...refetchFns: (() => Promise<unknown>)[]) {
  const [refreshing, setRefreshing] = useState(false);

  // @sync: ref holds the latest refetchFns to avoid recreating onRefresh on every render
  // (rest params create a new array instance each call, making them unsuitable as useCallback deps)
  const fnsRef = useRef(refetchFns);
  fnsRef.current = refetchFns;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled(fnsRef.current.map((fn) => fn()));
    setRefreshing(false);
  }, []);

  return { refreshing, onRefresh };
}
