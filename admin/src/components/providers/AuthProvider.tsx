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

    function finish() {
      if (!initialLoadDone) {
        initialLoadDone = true;
        setIsLoading(false);
      }
    }

    // Restore session directly from localStorage + REST API.
    // The Supabase client's _initialize() can deadlock on token refresh,
    // blocking getSession(), onAuthStateChange, and all data queries.
    async function restoreSession() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const ref = new URL(supabaseUrl).hostname.split('.')[0];
        const stored = localStorage.getItem(`sb-${ref}-auth-token`);
        if (!stored) return;

        const { user: storedUser, access_token } = JSON.parse(stored);
        if (!storedUser?.id || !access_token) return;

        const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${storedUser.id}&select=*`, {
          headers: { apikey: anonKey, Authorization: `Bearer ${access_token}` },
        });
        if (res.ok) {
          const rows = await res.json();
          if (rows[0]?.is_admin) setUser(rows[0]);
        }
      } catch {
        // Session expired or invalid — user will see login page
      } finally {
        finish();
      }
    }
    restoreSession();

    // Handle subsequent auth changes (sign in, sign out, token refresh).
    // These fire after the Supabase client eventually finishes initializing.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (data?.is_admin) setUser(data);
          else setUser(null);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      finish();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    // Clear UI and stored session immediately (don't wait for Supabase client
    // which may be blocked by the Web Lock during initialization)
    setUser(null);
    try {
      const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0];
      localStorage.removeItem(`sb-${ref}-auth-token`);
    } catch {
      // ignore
    }
    // Also tell the Supabase client to clean up (fire-and-forget)
    supabase.auth.signOut().catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
