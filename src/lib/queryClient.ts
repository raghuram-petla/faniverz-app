import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

const PERSIST_CACHE_KEY = 'faniverz-query-cache';

// @invariant: singleton — if a second QueryClient is created (e.g. in tests without proper mocking), caches are isolated and invalidateQueries in mutations silently miss.
// @coupling: refetchOnWindowFocus: false is critical for React Native — enabling it causes every query to refetch on each app foreground (AppState change), degrading performance and burning API calls.
// @sideeffect: gcTime raised to 24h so persisted cache survives app restarts. Without this,
// queries older than gcTime are garbage-collected before they can be restored from disk.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 24 * 60 * 60 * 1000, // 24 hours (must exceed maxAge for persistence to work)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// @contract Persists TanStack Query cache to AsyncStorage so returning users see
// cached content instantly on app reopen. Stale queries auto-refetch in background.
// @coupling maxAge must be <= gcTime or queries are GC'd before they can be restored.
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: PERSIST_CACHE_KEY,
  // @sideeffect throttles writes to AsyncStorage to avoid excessive I/O during
  // rapid query updates (e.g., optimistic vote mutations firing multiple cache updates)
  throttleTime: 1000,
});

// @contract Module-level flag set once when PersistQueryClientProvider finishes restoring
// the cache from AsyncStorage. useSmartInfiniteQuery reads this to trigger a phased
// refresh (page 0 foreground, rest background) instead of TanStack's default all-pages refetch.
// @sync Set by _layout.tsx handleCacheRestored; consumed by useSmartInfiniteQuery on mount.
let _cacheRestored = false;
export function markCacheRestored(): void {
  _cacheRestored = true;
}
export function wasCacheRestored(): boolean {
  return _cacheRestored;
}

// @sideeffect Called on sign-out to wipe persisted cache alongside queryClient.clear().
// Without this, the next user who signs in would briefly see the previous user's feed data.
export async function clearPersistedCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PERSIST_CACHE_KEY);
  } catch {
    // Non-critical — worst case is stale data on next sign-in that gets refetched
  }
}
