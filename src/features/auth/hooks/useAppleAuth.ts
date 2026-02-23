import { useState } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';

export function useAppleAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAvailable = Platform.OS === 'ios';

  const signInWithApple = async () => {
    if (!isAvailable) {
      setError('Apple Sign In is only available on iOS');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) throw new Error('No identity token from Apple');

      const { error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (authError) throw authError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Apple sign in failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { signInWithApple, isAvailable, isLoading, error };
}
