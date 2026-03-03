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
    let initialLoadDone = false;

    const timeout = setTimeout(() => {
      if (!initialLoadDone) {
        console.error('[Auth] Timed out — forcing load complete');
        initialLoadDone = true;
        setIsLoading(false);
      }
    }, 5000);

    async function fetchProfile(userId: string) {
      try {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (data?.is_admin) setUser(data);
        else setUser(null);
      } catch {
        setUser(null);
      }
    }

    // Use onAuthStateChange as the single source of truth.
    // It fires SIGNED_IN (or INITIAL_SESSION) on load if a session exists.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
      }
      // Stop the spinner after the first event (initial load)
      if (!initialLoadDone) {
        initialLoadDone = true;
        clearTimeout(timeout);
        setIsLoading(false);
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
