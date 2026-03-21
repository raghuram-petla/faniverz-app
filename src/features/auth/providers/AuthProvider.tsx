import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { useCalendarStore } from '@/stores/useCalendarStore';
import { useFilterStore } from '@/stores/useFilterStore';
import { useFeedStore } from '@/stores/useFeedStore';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isGuest: boolean;
  setIsGuest: (guest: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  isGuest: false,
  setIsGuest: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // @edge: getSession and onAuthStateChange race — if onAuthStateChange fires before getSession resolves,
  // session gets set twice. Harmless (React batches state) but means isLoading can briefly be true while session is already populated.
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session: currentSession } }) => {
        setSession(currentSession);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setIsGuest(false);
      }
      // @sideeffect: clears ALL TanStack Query cache (queryClient.clear) plus three Zustand stores on sign-out.
      // If a new store is added and not reset here, stale data from the previous user leaks into the next session.
      // @coupling: directly references useCalendarStore, useFilterStore, useFeedStore — any new user-scoped store must be added here manually.
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        useCalendarStore.getState().clearFilters();
        useFilterStore.getState().clearAll();
        useFeedStore.setState({ filter: 'all' });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // @sideeffect: memoized to prevent re-render cascades — all useAuth() consumers only
  // re-render when auth state actually changes, not when an ancestor re-renders.
  const value = useMemo<AuthContextType>(
    () => ({
      session,
      // @assumes: session.user is always populated when session is non-null (Supabase SDK contract).
      // If Supabase ever returns a session with null user, downstream hooks (useProfile, useUpdateProfile) will silently skip queries via enabled: !!user?.id.
      user: session?.user ?? null,
      isLoading,
      isGuest,
      setIsGuest,
    }),
    [session, isLoading, isGuest, setIsGuest],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
