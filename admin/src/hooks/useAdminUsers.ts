'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { createSimpleMutation } from './createSimpleMutation';
import type {
  AdminUserWithDetails,
  AdminInvitation,
  AdminRoleId,
  AdminPHAssignment,
} from '@/lib/types';

interface AdminUserRow {
  id: string;
  user_id: string;
  role_id: AdminRoleId;
  assigned_by: string | null;
  created_at: string;
  status: 'active' | 'blocked';
  blocked_by: string | null;
  blocked_at: string | null;
  blocked_reason: string | null;
  profile: {
    id: string;
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

/** List all admin users with their roles and PH assignments */
// @coupling JOINs admin_user_roles + profiles + admin_ph_assignments + production_houses
// @sideeffect Two sequential queries then client-side merge via phByUser Map
export function useAdminUserList() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      // Fetch users with roles
      const { data: roleData, error: roleErr } = await supabase
        .from('admin_user_roles')
        .select('*, profile:profiles!user_id(id, display_name, email, avatar_url)')
        .order('created_at', { ascending: false });
      if (roleErr) throw roleErr;

      // Fetch all PH assignments
      const { data: phData, error: phErr } = await supabase
        .from('admin_ph_assignments')
        .select('*, production_house:production_houses(id, name, logo_url)');
      if (phErr) throw phErr;

      const phByUser = new Map<string, AdminPHAssignment[]>();
      for (const ph of phData ?? []) {
        const list = phByUser.get(ph.user_id) ?? [];
        list.push(ph);
        phByUser.set(ph.user_id, list);
      }

      return (roleData as AdminUserRow[]).map((r) => ({
        id: r.profile.id,
        display_name: r.profile.display_name,
        email: r.profile.email,
        avatar_url: r.profile.avatar_url,
        role_id: r.role_id,
        role_assigned_at: r.created_at,
        assigned_by: r.assigned_by,
        ph_assignments: phByUser.get(r.user_id) ?? [],
        status: r.status ?? 'active',
        blocked_by: r.blocked_by ?? null,
        blocked_at: r.blocked_at ?? null,
        blocked_reason: r.blocked_reason ?? null,
      })) as AdminUserWithDetails[];
    },
  });
}

/** List all invitations */
// @contract Returns all statuses (pending, accepted, revoked) — filtering is done in the UI
export function useAdminInvitations() {
  return useQuery({
    queryKey: ['admin', 'invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_invitations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AdminInvitation[];
    },
  });
}

/** Create a new invitation */
// @sideeffect Normalizes email to lowercase before insert to prevent duplicate invites
export function useInviteAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invite: {
      email: string;
      role_id: AdminRoleId;
      production_house_ids?: string[];
      invited_by: string;
    }) => {
      const { data, error } = await supabase
        .from('admin_invitations')
        .insert({
          email: invite.email.toLowerCase(),
          role_id: invite.role_id,
          invited_by: invite.invited_by,
          production_house_ids: invite.production_house_ids ?? [],
        })
        .select()
        .single();
      if (error) throw error;
      return data as AdminInvitation;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'invitations'] });
    },
    // @edge: no onError here — page-level try/catch handles mutateAsync errors to avoid double-alert
  });
}

/** Revoke an invitation */
export const useRevokeInvitation = createSimpleMutation<string>({
  mutationFn: async (id) => {
    const { error } = await supabase
      .from('admin_invitations')
      .update({ status: 'revoked' })
      .eq('id', id);
    if (error) throw error;
  },
  invalidateKeys: [['admin', 'invitations']],
});

/** Revoke admin access (delete role + PH assignments) */
// @sideeffect Deletes PH assignments first (FK constraint), then role — ordering matters
// @edge No transaction — if role delete fails after PH delete, user has no role but also no PH links
export const useRevokeAdmin = createSimpleMutation<string>({
  mutationFn: async (userId) => {
    // Delete PH assignments first (FK constraint)
    const { error: phDelErr } = await supabase
      .from('admin_ph_assignments')
      .delete()
      .eq('user_id', userId);
    if (phDelErr) throw new Error(`PH assignment delete failed: ${phDelErr.message}`);
    // Delete role assignment
    const { error } = await supabase.from('admin_user_roles').delete().eq('user_id', userId);
    if (error) throw error;
  },
  invalidateKeys: [['admin', 'users']],
});

/** Update admin role */
// @edge No hierarchy check here — caller must verify canManageAdmin before invoking
export const useUpdateAdminRole = createSimpleMutation<{ userId: string; roleId: AdminRoleId }>({
  mutationFn: async ({ userId, roleId }) => {
    const { error } = await supabase
      .from('admin_user_roles')
      .update({ role_id: roleId })
      .eq('user_id', userId);
    if (error) throw error;
  },
  invalidateKeys: [['admin', 'users']],
});

/** Block an admin (set status to blocked with reason) */
// @contract blocked_by must be the current admin's userId; reason is freeform text
export const useBlockAdmin = createSimpleMutation<{
  userId: string;
  blockedBy: string;
  reason: string;
}>({
  mutationFn: async ({ userId, blockedBy, reason }) => {
    const { error } = await supabase
      .from('admin_user_roles')
      .update({
        status: 'blocked',
        blocked_by: blockedBy,
        blocked_reason: reason,
      })
      .eq('user_id', userId);
    if (error) throw error;
  },
  invalidateKeys: [['admin', 'users']],
});

/** Unblock an admin (restore active status) */
// @sideeffect Clears block status AND resets blocked_by/blocked_reason/blocked_at columns
export const useUnblockAdmin = createSimpleMutation<string>({
  mutationFn: async (userId) => {
    const { error } = await supabase
      .from('admin_user_roles')
      .update({ status: 'active', blocked_by: null, blocked_reason: null, blocked_at: null })
      .eq('user_id', userId);
    if (error) throw error;
  },
  invalidateKeys: [['admin', 'users']],
});
