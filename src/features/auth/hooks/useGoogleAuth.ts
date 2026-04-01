import { useState, useRef } from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '@/lib/supabase';

// @boundary Native Google Sign-In SDK flow — presents native sign-in sheet, gets ID token,
// passes it to Supabase for validation. Requires "Skip nonce check" enabled in Supabase
// dashboard (Authentication > Providers > Google) because the native SDK doesn't expose nonce control.
export function useGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = useRef(false);

  const signInWithGoogle = async () => {
    if (!configured.current) {
      const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
      if (!webClientId) {
        throw new Error(
          'Google Sign-In is not configured: missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
        );
      }
      const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
      GoogleSignin.configure({ webClientId, iosClientId });
      configured.current = true;
    }

    setIsLoading(true);
    setError(null);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error('No ID token from Google');

      // @boundary: idToken comes from Google Sign-In SDK — Supabase validates it server-side.
      // "Skip nonce check" must be enabled in Supabase Google provider settings for iOS compatibility.
      const { error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (authError) throw authError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { signInWithGoogle, isLoading, error };
}
