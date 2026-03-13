import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/features/auth/providers/AuthProvider';

/**
 * Returns a `gate` function that wraps callbacks with an auth check.
 * If the user is not signed in, navigates to login instead of executing.
 */
// @boundary auth guard — intercepts unauthenticated actions and redirects to login
// @coupling AuthProvider (user), expo-router (navigation)
export function useAuthGate() {
  // @nullable user is null when not signed in; gate uses this to decide redirect vs execute
  const { user } = useAuth();
  const router = useRouter();

  // @contract wraps any callback T, preserving its signature; returns early (no-op) when unauthenticated
  const gate = useCallback(
    <T extends (...args: never[]) => void>(callback: T): T => {
      return ((...args: Parameters<T>) => {
        if (!user) {
          router.push('/(auth)/login' as never);
          return;
        }
        callback(...args);
      }) as unknown as T;
    },
    [user, router],
  );

  return { gate, isAuthenticated: !!user };
}
