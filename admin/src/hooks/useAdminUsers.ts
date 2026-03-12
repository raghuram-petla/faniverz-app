'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
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
  });
}

/** Revoke an invitation */
export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admin_invitations')
        .update({ status: 'revoked' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'invitations'] });
    },
  });
}

/** Revoke admin access (delete role + PH assignments) */
export function useRevokeAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      // Delete PH assignments first (FK constraint)
      await supabase.from('admin_ph_assignments').delete().eq('user_id', userId);
      // Delete role assignment
      const { error } = await supabase.from('admin_user_roles').delete().eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

/** Update admin role */
export function useUpdateAdminRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: AdminRoleId }) => {
      const { error } = await supabase
        .from('admin_user_roles')
        .update({ role_id: roleId })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

/** Block an admin (set status to blocked with reason) */
export function useBlockAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      blockedBy,
      reason,
    }: {
      userId: string;
      blockedBy: string;
      reason: string;
    }) => {
      const { error } = await supabase
        .from('admin_user_roles')
        .update({
          status: 'blocked',
          blocked_by: blockedBy,
          blocked_at: new Date().toISOString(),
          blocked_reason: reason,
        })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

/** Unblock an admin (restore active status) */
export function useUnblockAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('admin_user_roles')
        .update({
          status: 'active',
          blocked_by: null,
          blocked_at: null,
          blocked_reason: null,
        })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}
