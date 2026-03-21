'use client';
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase-browser';
import type { AdminUser, AdminRoleId } from '@/lib/types';

interface ImpersonationContextValue {
  isImpersonating: boolean;
  effectiveUser: AdminUser | null;
  realUser: AdminUser | null;
  startImpersonation: (targetUserId: string) => Promise<void>;
  startRoleImpersonation: (role: AdminRoleId, phIds?: string[]) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextValue>({
  isImpersonating: false,
  effectiveUser: null,
  realUser: null,
  startImpersonation: async () => {},
  startRoleImpersonation: async () => {},
  stopImpersonation: async () => {},
});

export function useImpersonation() {
  return useContext(ImpersonationContext);
}

/** Returns the impersonated user when active, otherwise the real user */
export function useEffectiveUser(): AdminUser | null {
  const { effectiveUser } = useImpersonation();
  const { user } = useAuth();
  return effectiveUser ?? user;
}

export interface ImpersonationProviderProps {
  children: React.ReactNode;
}

// @assumes: the target user exists in BOTH profiles AND admin_user_roles tables.
// If the target is a regular app user (no admin_user_roles row), roleRes.data is null
// and this returns null — the impersonation silently fails with no error message to
// the admin. The admin sees no feedback about why impersonation didn't start.
// @coupling: reads from profiles table (shared with mobile app) — profile fields
// like display_name, avatar_url come from whatever the app user has set.
async function buildTargetUser(targetUserId: string): Promise<AdminUser | null> {
  const [profileRes, roleRes, phRes, langRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', targetUserId).single(),
    supabase.from('admin_user_roles').select('role_id').eq('user_id', targetUserId).single(),
    supabase.from('admin_ph_assignments').select('production_house_id').eq('user_id', targetUserId),
    supabase.from('user_languages').select('language_id').eq('user_id', targetUserId),
  ]);

  if (!profileRes.data || !roleRes.data) return null;
  const role = roleRes.data.role_id as AdminRoleId;
  const langIds = role === 'admin' ? (langRes.data ?? []).map((r) => r.language_id) : [];

  // @boundary Resolve language UUIDs to codes via a second query (only for admin role)
  let langCodes: string[] = [];
  if (langIds.length > 0) {
    const { data: codeRows } = await supabase.from('languages').select('code').in('id', langIds);
    langCodes = (codeRows ?? []).map((r) => r.code);
  }

  return {
    ...profileRes.data,
    role,
    productionHouseIds: (phRes.data ?? []).map((r) => r.production_house_id),
    languageIds: langIds,
    languageCodes: langCodes,
  };
}

// @sideeffect: sets is_active=false and ended_at on ALL active sessions for this user,
// not just the current one. If the user has stale 'running' sessions from browser crashes,
// they're all cleaned up here. This is safe because a user can only have one active
// impersonation at a time — the insert in startImpersonation doesn't check for existing
// active sessions, it relies on this cleanup running first.
async function endActiveSession(userId: string) {
  await supabase
    .from('admin_impersonation_sessions')
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq('real_user_id', userId)
    .eq('is_active', true);
}

export function ImpersonationProvider({ children }: ImpersonationProviderProps) {
  const { user: realUser } = useAuth();
  const [effectiveUser, setEffectiveUser] = useState<AdminUser | null>(null);
  const realUserRef = useRef(realUser);
  realUserRef.current = realUser;

  // @invariant: impersonation privilege is checked against realUser.role, NEVER effectiveUser.
  // If this checked effectiveUser, a root user impersonating a ph_admin would lose the
  // ability to stop impersonation (stopImpersonation would silently no-op).
  // @edge: does NOT prevent a super_admin from impersonating a root user — the hierarchy
  // check is only "can I impersonate at all?", not "can I impersonate THIS role?".
  // A super_admin impersonating root gains root-level UI access for the session.
  const isSuperAdmin = realUser?.role === 'super_admin' || realUser?.role === 'root';

  // @sideeffect: on mount, restores any active impersonation session from the DB so
  // that refreshing the browser page doesn't drop the impersonation. Without this,
  // the admin would need to re-start impersonation after every page reload.
  // @edge: if the target user's role or PH assignments changed since the session was
  // created, role-based impersonation uses the stale target_role from the session row,
  // but user-based impersonation re-fetches live data via buildTargetUser. This creates
  // an inconsistency: role impersonation persists the original role, user impersonation
  // always reflects the target's current role.
  useEffect(() => {
    if (!realUser || !isSuperAdmin) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('admin_impersonation_sessions')
        .select('*')
        .eq('real_user_id', realUser.id)
        .eq('is_active', true)
        .maybeSingle();

      if (cancelled || !data) return;

      if (data.target_user_id) {
        const built = await buildTargetUser(data.target_user_id);
        if (!cancelled && built) setEffectiveUser(built);
      } else {
        // @edge Role impersonation uses empty languageIds (all access) since
        // it's a generic role test, not a specific user's permissions
        setEffectiveUser({
          ...realUser,
          role: data.target_role as AdminRoleId,
          productionHouseIds: data.target_ph_ids ?? [],
          languageIds: [],
          languageCodes: [],
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [realUser, isSuperAdmin]);

  const startImpersonation = useCallback(async (targetUserId: string) => {
    const user = realUserRef.current;
    if (!user || (user.role !== 'super_admin' && user.role !== 'root')) return;
    try {
      const target = await buildTargetUser(targetUserId);
      if (!target) return;
      // @contract: prevent privilege escalation — super_admin cannot impersonate root
      if (user.role === 'super_admin' && target.role === 'root') {
        window.alert('super_admin cannot impersonate a root user');
        return;
      }
      await endActiveSession(user.id);
      await supabase.from('admin_impersonation_sessions').insert({
        real_user_id: user.id,
        target_user_id: targetUserId,
        target_role: target.role,
        target_ph_ids: target.productionHouseIds,
      });
      setEffectiveUser(target);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to start impersonation');
    }
  }, []);

  const startRoleImpersonation = useCallback(async (role: AdminRoleId, phIds: string[] = []) => {
    const user = realUserRef.current;
    if (!user || (user.role !== 'super_admin' && user.role !== 'root')) return;
    // @contract: prevent privilege escalation — super_admin cannot assume root role
    if (user.role === 'super_admin' && role === 'root') {
      window.alert('super_admin cannot impersonate root role');
      return;
    }
    try {
      await endActiveSession(user.id);
      await supabase.from('admin_impersonation_sessions').insert({
        real_user_id: user.id,
        target_user_id: null,
        target_role: role,
        target_ph_ids: phIds,
      });
      setEffectiveUser({
        ...user,
        role,
        productionHouseIds: phIds,
        languageIds: [],
        languageCodes: [],
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to start role impersonation');
    }
  }, []);

  const stopImpersonation = useCallback(async () => {
    const user = realUserRef.current;
    if (!user) return;
    try {
      await endActiveSession(user.id);
      setEffectiveUser(null);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to stop impersonation');
    }
  }, []);

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating: effectiveUser !== null,
        effectiveUser,
        realUser,
        startImpersonation,
        startRoleImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}
