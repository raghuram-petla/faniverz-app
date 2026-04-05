import { useQueryClient } from '@tanstack/react-query';

// @contract: A snapshot entry pairing a TanStack Query key with its cached data at the time of
// onMutate. Used to restore cache on error. TData is the shape of the cached value (e.g.
// { pages: T[][] } for infinite queries, Record<string, V> for flat maps).
export interface CacheSnapshot<TData> {
  queryKey: readonly unknown[];
  data: TData;
}

// @contract: Context object returned by onMutate and consumed by onError for rollback.
// @nullable: secondarySnapshots is only present when a secondaryQueryKey was configured.
export interface OptimisticContext<TPrimary, TSecondary = never> {
  primarySnapshots: CacheSnapshot<TPrimary>[];
  secondarySnapshots?: CacheSnapshot<TSecondary>[];
}

// @contract: Lifecycle callbacks returned by createOptimisticMutation.
// Designed to be spread directly into useMutation({ ...handlers }).
// onSettled uses the full TanStack Query signature: (data, error, variables, context) so it
// type-checks correctly when spread into UseMutationOptions.
export interface OptimisticHandlers<TVariables, TPrimary, TSecondary = never> {
  onMutate: (variables: TVariables) => Promise<OptimisticContext<TPrimary, TSecondary>>;
  onError: (
    error: Error,
    variables: TVariables,
    context: OptimisticContext<TPrimary, TSecondary> | undefined,
  ) => void;
  // @contract: onSettled parameters are all optional so callers can invoke it with zero args
  // (e.g. `handlers.onSettled()`) as well as spread it into useMutation which provides all four.
  onSettled: (
    data?: unknown,
    error?: Error | null,
    variables?: TVariables,
    context?: OptimisticContext<TPrimary, TSecondary> | undefined,
  ) => void;
}

// @contract: Configuration object accepted by createOptimisticMutation.
// - queryKeys: list of top-level query-key strings to cancel, snapshot, update, and invalidate.
// - secondaryQueryKey: optional extra query key (e.g. 'feed-votes', 'feed-bookmarks-set') that
//   also requires cancel + snapshot + update + invalidate, using a different data shape TSecondary.
// - primaryUpdater: pure function that applies the optimistic change to one primary-cache entry.
// - secondaryUpdater: pure function that applies the optimistic change to one secondary-cache entry.
// - onError: optional extra side-effect to run after cache rollback (e.g. show an Alert).
// @invariant: primaryUpdater and secondaryUpdater MUST be pure (no side-effects) — they are called
// inside setQueriesData/setQueryData which may call them multiple times in strict mode.
export interface OptimisticMutationConfig<TVariables, TPrimary, TSecondary = never> {
  queryKeys: readonly string[];
  secondaryQueryKey?: string;
  primaryUpdater: (old: TPrimary, variables: TVariables) => TPrimary;
  secondaryUpdater?: (old: TSecondary, variables: TVariables) => TSecondary;
  onError?: (error: Error, variables: TVariables) => void;
}

// @contract: Factory that produces TanStack Query mutation lifecycle handlers (onMutate, onError,
// onSettled) implementing the standard optimistic-update pattern:
//   1. Cancel in-flight queries for all queryKeys
//   2. Snapshot current cache data for rollback
//   3. Apply optimistic update via setQueriesData
//   4. On error: restore from snapshot, then call optional onError callback
//   5. On settled: invalidate all queryKeys so server data overwrites the optimistic state
//
// Returns an OptimisticHandlers object — spread it into useMutation(). The caller still
// supplies mutationFn separately so auth checks and API calls remain in the hook.
//
// @assumes: primaryUpdater receives `old` that is always defined — the factory skips entries where
// getQueriesData returns undefined. If the cache is empty (no prior fetch), optimistic update is a
// no-op, which is safe: server response will populate the cache on settled invalidation.
// @edge: for large caches (many filter variations × many pages), the onMutate runs synchronously
// per cache entry on the JS thread. Keep primaryUpdater cheap (O(n) page scan at most).
export function createOptimisticMutation<TVariables, TPrimary, TSecondary = never>(
  queryClient: ReturnType<typeof useQueryClient>,
  config: OptimisticMutationConfig<TVariables, TPrimary, TSecondary>,
): OptimisticHandlers<TVariables, TPrimary, TSecondary> {
  const { queryKeys, secondaryQueryKey, primaryUpdater, secondaryUpdater, onError } = config;

  return {
    // @sync: ALL cancellations happen before ANY snapshot is taken to avoid partial-snapshot races
    // where a background refetch could modify the cache between two cancel calls.
    onMutate: async (variables: TVariables): Promise<OptimisticContext<TPrimary, TSecondary>> => {
      // Step 1 + 2: cancel queries and snapshot primaries
      const primarySnapshots: CacheSnapshot<TPrimary>[] = [];
      for (const key of queryKeys) {
        await queryClient.cancelQueries({ queryKey: [key] });
        queryClient.getQueriesData<TPrimary>({ queryKey: [key] }).forEach(([queryKey, data]) => {
          if (data !== undefined) primarySnapshots.push({ queryKey, data });
        });
      }

      // Step 3a: apply optimistic update to primary caches
      for (const key of queryKeys) {
        queryClient.setQueriesData<TPrimary>({ queryKey: [key] }, (old) => {
          if (old === undefined) return old;
          return primaryUpdater(old, variables);
        });
      }

      // Step 1 + 2 + 3b: cancel, snapshot, and update secondary cache if configured
      let secondarySnapshots: CacheSnapshot<TSecondary>[] | undefined;
      if (secondaryQueryKey && secondaryUpdater) {
        await queryClient.cancelQueries({ queryKey: [secondaryQueryKey] });
        secondarySnapshots = [];
        queryClient
          .getQueriesData<TSecondary>({ queryKey: [secondaryQueryKey] })
          .forEach(([queryKey, data]) => {
            if (data !== undefined) {
              (secondarySnapshots as CacheSnapshot<TSecondary>[]).push({ queryKey, data });
            }
          });
        // @edge: pass undefined `old` through to the updater instead of skipping — allows
        // optimistic state to be set even when the query hasn't completed its initial fetch yet
        // (e.g., useUserBookmarks query key changed due to pagination). Updaters must handle
        // undefined via `old ?? {}` or `if (!old)` guards.
        queryClient.setQueriesData<TSecondary>({ queryKey: [secondaryQueryKey] }, (old) =>
          (secondaryUpdater as (old: TSecondary, v: TVariables) => TSecondary)(
            old as TSecondary,
            variables,
          ),
        );
      }

      return { primarySnapshots, secondarySnapshots };
    },

    onError: (
      error: Error,
      variables: TVariables,
      context: OptimisticContext<TPrimary, TSecondary> | undefined,
    ) => {
      // Restore all primary snapshots
      if (context?.primarySnapshots) {
        for (const { queryKey, data } of context.primarySnapshots) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      // Restore secondary snapshots
      if (context?.secondarySnapshots) {
        for (const { queryKey, data } of context.secondarySnapshots) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      // Run caller-supplied side-effect (e.g. Alert)
      onError?.(error, variables);
    },

    // @sideeffect: invalidation overwrites optimistic state with authoritative server data.
    // Runs on both success and error so the cache never stays permanently out of sync.
    // The full TanStack Query onSettled signature (data, error, variables, context) is included
    // even though only the invalidation side-effect is needed, so the return value type-checks
    // correctly when spread directly into UseMutationOptions.
    onSettled: () => {
      for (const key of queryKeys) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      if (secondaryQueryKey) {
        queryClient.invalidateQueries({ queryKey: [secondaryQueryKey] });
      }
    },
  };
}
