import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setIsGuest(false);
      }
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        useCalendarStore.getState().clearFilters();
        useFilterStore.getState().clearAll();
        useFeedStore.setState({ filter: 'all' });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        isGuest,
        setIsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
