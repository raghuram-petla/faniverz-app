'use client';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase-browser';
import type { AdminUser, AdminRoleId } from '@/lib/types';

/**
 * @contract central auth state for admin panel — guards all admin routes
 * @invariant user is null when unauthenticated OR when authenticated but without admin role
 */
interface AuthContextValue {
  /** @nullable null when logged out, denied access, or blocked */
  user: AdminUser | null;
  isLoading: boolean;
  /** True when user is authenticated but has no admin role or is blocked */
  isAccessDenied: boolean;
  /** Reason the admin was blocked, if applicable */
  blockedReason: string | null;
  /** @sideeffect redirects to Google OAuth flow */
  signInWithGoogle: () => Promise<void>;
  /** @sideeffect clears local auth state and Supabase session */
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

  /** @edge 3s timeout prevents infinite loading spinner if auth check hangs */
  useEffect(() => {
    let initialLoadDone = false;

    const timeout = setTimeout(() => {
      /* v8 ignore start */
      if (!initialLoadDone) {
        /* v8 ignore stop */
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

    /**
     * @boundary fetches profile + admin role + PH assignments via REST API (not Supabase client)
     * @assumes accessToken is a valid Supabase JWT with read access to profiles and admin_user_roles
     */
    async function fetchAdminUser(userId: string, email: string | undefined, accessToken: string) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const headers = { apikey: anonKey, Authorization: `Bearer ${accessToken}` };

        /** @sideeffect auto-accepts pending invitation before role check — converts invite to role */
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

        /** @edge PH assignments only fetched for production_house_admin role to minimize queries */
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

        /** @edge Language assignments fetched with codes in one query via PostgREST embed */
        let langIds: string[] = [];
        let langCodes: string[] = [];
        if (role === 'admin') {
          const langRes = await fetch(
            `${supabaseUrl}/rest/v1/user_languages?user_id=eq.${userId}&select=language_id,languages(code)`,
            { headers },
          );
          if (langRes.ok) {
            const langData = await langRes.json();
            langIds = langData.map((r: { language_id: string }) => r.language_id);
            langCodes = langData.map((r: { languages: { code: string } }) => r.languages.code);
          }
        }

        setUser({
          ...profiles[0],
          role,
          productionHouseIds: phIds,
          languageIds: langIds,
          languageCodes: langCodes,
        });
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
    /**
     * @boundary reads Supabase auth token directly from localStorage for fast session restore
     * @assumes localStorage key format: sb-{projectRef}-auth-token
     */
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

    // @edge: restoreSession provides a fast initial load from localStorage while
    // onAuthStateChange is the authoritative source. Both call fetchAdminUser — the
    // second call overwrites the first with the same data, which is harmless.
    // finish() is called from both paths; the initialLoadDone guard ensures only one clears loading.
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

  /**
   * @sideeffect clears React state, localStorage token, and Supabase session
   * @edge localStorage removal is try-caught for SSR safety; signOut error is logged but not thrown
   */
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
    supabase.auth.signOut().catch((err) => console.error('Sign out failed:', err));
  }, []);

  // @sideeffect: memoized — prevents re-render cascade across all useAuth() consumers
  const value = useMemo(() => ({ user, isLoading, isAccessDenied, blockedReason, signInWithGoogle, signOut, refreshUser }), [user, isLoading, isAccessDenied, blockedReason, signInWithGoogle, signOut, refreshUser]); // prettier-ignore

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
