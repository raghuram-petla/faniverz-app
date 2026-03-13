import { useState } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';

export function useAppleAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // @assumes: Apple Sign In is only available on iOS. On Android, isAvailable is always false and signInWithApple
  // silently returns undefined (no error thrown), so UI must conditionally render the Apple button based on isAvailable.
  const isAvailable = Platform.OS === 'ios';

  const signInWithApple = async () => {
    if (!isAvailable) return;
    setIsLoading(true);
    setError(null);
    try {
      // @edge: Apple only provides FULL_NAME and EMAIL on the FIRST sign-in for a given Apple ID + app combo.
      // Subsequent sign-ins return null for these fields. If the handle_new_user trigger fails on first sign-in
      // and the user retries, the name/email are lost forever — Supabase stores raw_user_meta_data from the
      // first successful auth, so the profile will have null display_name unless manually set later.
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
      const message = err instanceof Error ? err.message : 'Apple sign-in failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { signInWithApple, isLoading, error, isAvailable };
}
