import { useState, useRef } from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '@/lib/supabase';

export function useGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = useRef(false);

  // @edge: GoogleSignin.configure is called lazily on first signIn, not at hook mount. If EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  // is undefined, configure() silently accepts it — the error only surfaces later in signIn() as a cryptic
  // "DEVELOPER_ERROR" (Android) or "invalid_client" (iOS), not a missing-config error.
  // @invariant: configured ref persists across renders but not across component remounts. If the component
  // unmounts and remounts, configure() runs again, which is safe (idempotent) but wasteful.
  const signInWithGoogle = async () => {
    if (!configured.current) {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      });
      configured.current = true;
    }

    setIsLoading(true);
    setError(null);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error('No ID token from Google');

      // @boundary: idToken comes from Google Sign-In SDK — not validated by our code; Supabase validates it server-side.
      // If Google SDK returns a stale/revoked token, signInWithIdToken throws with a generic "invalid_grant"
      // that we surface as-is. For new users, this triggers handle_new_user which reads 'full_name' from
      // raw_user_meta_data (set by Supabase from Google's JWT claims, not from our options.data).
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
