'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-browser';
import type { UserProfile } from '@/lib/types';

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let done = false;
    const timeout = setTimeout(() => {
      if (!done) {
        console.error('[Auth] Timed out waiting for session — forcing load complete');
        done = true;
        setIsLoading(false);
      }
    }, 5000);

    function finish() {
      if (!done) {
        done = true;
        clearTimeout(timeout);
        setIsLoading(false);
      }
    }

    async function fetchProfile(userId: string): Promise<boolean> {
      try {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (data?.is_admin) {
          setUser(data);
          return true;
        }
        setUser(null);
        return false;
      } catch {
        setUser(null);
        return false;
      }
    }

    // 1. Initial load — getSession reads session from local storage
    console.warn('[Auth] Checking session...');
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        console.warn('[Auth] getSession result:', session ? 'has session' : 'no session');
        if (session) {
          await fetchProfile(session.user.id);
        }
        finish();
      })
      .catch((err) => {
        console.error('[Auth] getSession failed:', err);
        finish();
      });

    // 2. Subsequent changes — sign in, sign out, token refresh
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.warn('[Auth] onAuthStateChange:', event);
      if (event === 'INITIAL_SESSION') return; // already handled above
      if (session) {
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
