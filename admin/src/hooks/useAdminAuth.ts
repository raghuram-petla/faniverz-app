'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import type { User } from '@supabase/supabase-js';

interface AdminAuthState {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
}

export function useAdminAuth(): AdminAuthState {
  const router = useRouter();
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    isAdmin: false,
    isLoading: true,
  });

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setState({ user: null, isAdmin: false, isLoading: false });
        router.replace('/login');
        return;
      }

      // Check is_admin flag in profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();

      if (!profile?.is_admin) {
        setState({ user: session.user, isAdmin: false, isLoading: false });
        return;
      }

      setState({ user: session.user, isAdmin: true, isLoading: false });
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setState({ user: null, isAdmin: false, isLoading: false });
        router.replace('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return state;
}
