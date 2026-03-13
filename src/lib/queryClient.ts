import { QueryClient } from '@tanstack/react-query';

// @invariant: singleton — if a second QueryClient is created (e.g. in tests without proper mocking), caches are isolated and invalidateQueries in mutations silently miss.
// @coupling: refetchOnWindowFocus: false is critical for React Native — enabling it causes every query to refetch on each app foreground (AppState change), degrading performance and burning API calls.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
