import { QueryClient } from '@tanstack/react-query';
import { ADMIN_STALE_5M } from '@/lib/query-config';

// @assumes: refetchOnWindowFocus is disabled — admin users who switch tabs and come
// back will see stale data for up to 5 minutes (staleTime). This is intentional to
// avoid refetch storms when alt-tabbing between admin and the app, but means that
// concurrent admin users editing the same movie won't see each other's changes until
// the cache expires or they manually refresh.
// @edge: retry is set to 1 (not 0) — a transient 500 from a Supabase edge function
// gets ONE automatic retry. If the retry also fails, the error bubbles to the UI.
// Mutations are not configured here and use TanStack Query's default (no retry).
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: ADMIN_STALE_5M,
        gcTime: 2 * ADMIN_STALE_5M,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

// @invariant: server-side calls get a fresh QueryClient every time (no cross-request
// cache leakage in SSR). Browser-side uses a module-level singleton — this means
// navigating between admin pages preserves the query cache, but a full page reload
// clears it. The dashboard layout mounts QueryClientProvider with this singleton.
export function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
