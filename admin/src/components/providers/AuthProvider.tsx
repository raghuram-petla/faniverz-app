'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-browser';
import type { AdminUser, AdminRoleId } from '@/lib/types';

interface AuthContextValue {
  user: AdminUser | null;
  isLoading: boolean;
  /** True when user is authenticated but has no admin role or is blocked */
  isAccessDenied: boolean;
  /** Reason the admin was blocked, if applicable */
  blockedReason: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-fetch the profile from Supabase and update user state */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAccessDenied: false,
  blockedReason: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  useEffect(() => {
    let initialLoadDone = false;

    const timeout = setTimeout(() => {
      if (!initialLoadDone) {
        initialLoadDone = true;
        setIsLoading(false);
      }
    }, 3000);

    function finish() {
      if (!initialLoadDone) {
        initialLoadDone = true;
        clearTimeout(timeout);
        setIsLoading(false);
      }
    }

    async function fetchAdminUser(userId: string, email: string | undefined, accessToken: string) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const headers = { apikey: anonKey, Authorization: `Bearer ${accessToken}` };

        // Try to auto-accept invitation first (if applicable)
        if (email) {
          await tryAcceptInvitation(email, userId, accessToken);
        }

        // Fetch profile
        const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`, {
          headers,
        });
        if (!profileRes.ok) {
          setUser(null);
          setIsAccessDenied(false);
          return;
        }
        const profiles = await profileRes.json();
        if (!profiles[0]) {
          setUser(null);
          setIsAccessDenied(false);
          return;
        }

        // Fetch admin role
        const roleRes = await fetch(
          `${supabaseUrl}/rest/v1/admin_user_roles?user_id=eq.${userId}&select=role_id,status,blocked_reason`,
          { headers },
        );
        if (!roleRes.ok) {
          setUser(null);
          setIsAccessDenied(true);
          setBlockedReason(null);
          return;
        }
        const roles = await roleRes.json();
        if (!roles[0]?.role_id) {
          setUser(null);
          setIsAccessDenied(true);
          setBlockedReason(null);
          return;
        }

        // Check if blocked
        if (roles[0].status === 'blocked') {
          setUser(null);
          setIsAccessDenied(true);
          setBlockedReason(roles[0].blocked_reason ?? 'Your access has been blocked.');
          return;
        }

        setBlockedReason(null);
        const role = roles[0].role_id as AdminRoleId;

        // Fetch PH assignments (only needed for PH admins, but cheap to always fetch)
        let phIds: string[] = [];
        if (role === 'production_house_admin') {
          const phRes = await fetch(
            `${supabaseUrl}/rest/v1/admin_ph_assignments?user_id=eq.${userId}&select=production_house_id`,
            { headers },
          );
          if (phRes.ok) {
            const phData = await phRes.json();
            phIds = phData.map((r: { production_house_id: string }) => r.production_house_id);
          }
        }

        setUser({ ...profiles[0], role, productionHouseIds: phIds });
        setIsAccessDenied(false);
      } catch {
        setUser(null);
        setIsAccessDenied(false);
      }
    }

    async function tryAcceptInvitation(email: string, userId: string, accessToken: string) {
      try {
        const res = await fetch('/api/accept-invitation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ email, userId }),
        });
        // Silently succeed or fail — the role fetch below will determine access
        if (!res.ok) return;
      } catch {
        // ignore — invitation acceptance is best-effort
      }
    }

    // Fast path: restore session from localStorage
    async function restoreSession(): Promise<boolean> {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const ref = new URL(supabaseUrl).hostname.split('.')[0];
        const stored = localStorage.getItem(`sb-${ref}-auth-token`);
        if (!stored) return false;

        const { user: storedUser, access_token } = JSON.parse(stored);
        if (!storedUser?.id || !access_token) return false;

        await fetchAdminUser(storedUser.id, storedUser.email, access_token);
        return true;
      } catch {
        return false;
      }
    }

    restoreSession().then((restored) => {
      if (restored) finish();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await fetchAdminUser(
          session.user.id,
          session.user.email ?? undefined,
          session.access_token,
        );
      } else {
        setUser(null);
        setIsAccessDenied(false);
        setBlockedReason(null);
      }
      finish();
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

  const refreshUser = useCallback(async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const ref = new URL(supabaseUrl).hostname.split('.')[0];
      const stored = localStorage.getItem(`sb-${ref}-auth-token`);
      if (!stored) return;

      const { user: storedUser, access_token } = JSON.parse(stored);
      if (!storedUser?.id || !access_token) return;

      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const headers = { apikey: anonKey, Authorization: `Bearer ${access_token}` };
      const profileRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${storedUser.id}&select=*`,
        { headers },
      );
      if (!profileRes.ok) return;
      const profiles = await profileRes.json();
      if (!profiles[0]) return;

      setUser((prev) => (prev ? { ...prev, ...profiles[0] } : prev));
    } catch {
      // ignore — refresh is best-effort
    }
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setIsAccessDenied(false);
    setBlockedReason(null);
    try {
      const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0];
      localStorage.removeItem(`sb-${ref}-auth-token`);
    } catch {
      // ignore
    }
    supabase.auth.signOut().catch(() => {});
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAccessDenied,
        blockedReason,
        signInWithGoogle,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
