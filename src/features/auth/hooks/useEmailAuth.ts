import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useEmailAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // @boundary: display_name is passed via options.data (raw_user_meta_data) — the DB trigger handle_new_user()
  // reads it as the 3rd fallback after 'full_name' and 'name'. If the key were renamed here without updating
  // the trigger, new email signups would fall through to using email as display_name.
  // @sideeffect: Supabase signUp creates auth.users row AND fires handle_new_user trigger which inserts into profiles.
  // If the trigger fails (e.g., profiles table constraint violation), auth.users row still exists but profiles row doesn't —
  // causing useProfile to throw PGRST116 on the next fetch.
  const signUp = async (email: string, password: string, displayName?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      });
      if (authError) throw authError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // @coupling: signOut only clears the Supabase session. Cache/store cleanup happens in AuthProvider's
  // onAuthStateChange listener reacting to 'SIGNED_OUT'. If signOut succeeds but the listener doesn't fire
  // (e.g., component unmounted), stale user data persists in TanStack Query cache until app restart.
  const signOut = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signOut();
      if (authError) throw authError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // @edge: resetPasswordForEmail silently succeeds even for non-existent emails (Supabase security behavior).
  // Callers cannot distinguish "email sent" from "email not found" — intentional to prevent email enumeration.
  const resetPassword = async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email);
      if (authError) throw authError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password reset failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { signIn, signUp, signOut, resetPassword, isLoading, error };
}
