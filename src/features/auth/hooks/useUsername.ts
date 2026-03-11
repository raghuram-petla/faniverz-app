import { useState, useEffect } from 'react';
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

    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(username);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
