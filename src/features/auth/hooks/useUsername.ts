import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { checkUsernameAvailable, setUsername, validateUsername } from '../usernameApi';

export function useCheckUsername(username: string) {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // @contract: requestId guards against stale responses from slow network calls
  const requestIdRef = useRef(0);

  useEffect(() => {
    const validationError = validateUsername(username);
    if (validationError || !username) {
      setIsAvailable(null);
      setError(validationError);
      return;
    }

    setIsChecking(true);
    setError(null);

    const currentRequestId = ++requestIdRef.current;

    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(username);
        // Only apply result if this is still the latest request
        if (currentRequestId !== requestIdRef.current) return;
        setIsAvailable(available);
        if (!available) setError('Username is taken');
      } catch {
        if (currentRequestId !== requestIdRef.current) return;
        setError('Failed to check availability');
        setIsAvailable(null);
      } finally {
        if (currentRequestId === requestIdRef.current) setIsChecking(false);
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
    onSuccess: () => {
      // @contract: scoped to current user's profile key to avoid invalidating other users' cached profiles
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to set username');
    },
  });
}
