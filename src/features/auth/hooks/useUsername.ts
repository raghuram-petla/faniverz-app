import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { checkUsernameAvailable, setUsername, validateUsername } from '../usernameApi';

export function useCheckUsername(username: string) {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validationError = validateUsername(username);
    if (validationError || !username) {
      setIsAvailable(null);
      setError(validationError);
      return;
    }

    setIsChecking(true);
    setError(null);

    // @sync: 400ms debounce means a user can type a username, see "available" from a stale check, and submit
    // before the latest debounced check fires. useSetUsername has its own server-side uniqueness enforcement
    // (DB UNIQUE constraint) so this is cosmetic, but the UI can briefly show green then error on submit.
    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(username);
        // @edge: no guard against stale responses — if user types "foo" then "bar", and "foo" response
        // arrives after "bar" response, isAvailable reflects "foo" not "bar". The clearTimeout mitigates
        // this for debounce, but slow network responses from a previous non-debounced call can still arrive late.
        setIsAvailable(available);
        if (!available) setError('Username is taken');
      } catch {
        setError('Failed to check availability');
        setIsAvailable(null);
      } finally {
        setIsChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  return { isAvailable, isChecking, error };
}

export function useSetUsername() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (username: string) => {
      if (!user?.id) throw new Error('Must be logged in');
      return setUsername(user.id, username);
    },
    // @coupling: invalidates ['profile'] (no userId suffix) which is a broader key than useProfile's ['profile', user.id].
    // This works because TanStack Query's invalidateQueries does prefix matching — but it also invalidates
    // every other user's profile query if multiple are cached (e.g., viewing another user's profile).
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to set username');
    },
  });
}
