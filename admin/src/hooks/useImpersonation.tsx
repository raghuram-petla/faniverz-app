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

async function buildTargetUser(targetUserId: string): Promise<AdminUser | null> {
  const [profileRes, roleRes, phRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', targetUserId).single(),
    supabase.from('admin_user_roles').select('role_id').eq('user_id', targetUserId).single(),
    supabase.from('admin_ph_assignments').select('production_house_id').eq('user_id', targetUserId),
  ]);

  if (!profileRes.data || !roleRes.data) return null;
  return {
    ...profileRes.data,
    role: roleRes.data.role_id as AdminRoleId,
    productionHouseIds: (phRes.data ?? []).map((r) => r.production_house_id),
  };
}

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

  const isSuperAdmin = realUser?.role === 'super_admin';

  // Restore active session on mount
  useEffect(() => {
    if (!realUser || !isSuperAdmin) return;

    (async () => {
      const { data } = await supabase
        .from('admin_impersonation_sessions')
        .select('*')
        .eq('real_user_id', realUser.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!data) return;

      if (data.target_user_id) {
        const built = await buildTargetUser(data.target_user_id);
        if (built) setEffectiveUser(built);
      } else {
        setEffectiveUser({
          ...realUser,
          role: data.target_role as AdminRoleId,
          productionHouseIds: data.target_ph_ids ?? [],
        });
      }
    })();
  }, [realUser, isSuperAdmin]);

  const startImpersonation = useCallback(async (targetUserId: string) => {
    const user = realUserRef.current;
    if (!user || user.role !== 'super_admin') return;
    try {
      const target = await buildTargetUser(targetUserId);
      if (!target) return;
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
    if (!user || user.role !== 'super_admin') return;
    try {
      await endActiveSession(user.id);
      await supabase.from('admin_impersonation_sessions').insert({
        real_user_id: user.id,
        target_user_id: null,
        target_role: role,
        target_ph_ids: phIds,
      });
      setEffectiveUser({ ...user, role, productionHouseIds: phIds });
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
