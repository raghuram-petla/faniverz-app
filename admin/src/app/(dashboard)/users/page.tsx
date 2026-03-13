'use client';
import { useState } from 'react';
import {
  useAdminUserList,
  useAdminInvitations,
  useRevokeAdmin,
  useRevokeInvitation,
  useUpdateAdminRole,
  useBlockAdmin,
  useUnblockAdmin,
} from '@/hooks/useAdminUsers';
import type { AdminUserWithDetails } from '@/lib/types';
import { Shield, UserPlus } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { ImpersonateModal } from '@/components/users/ImpersonateModal';
import { BlockAdminModal } from '@/components/users/BlockAdminModal';
import { AdminsTable } from '@/components/users/AdminsTable';
import { InvitationsTable } from '@/components/users/InvitationsTable';
import Link from 'next/link';

type Tab = 'admins' | 'invitations';
type StatusFilter = 'active' | 'blocked' | 'all';

// @coupling Heavy dependency on usePermissions for role hierarchy enforcement throughout
export default function UsersPage() {
  const [tab, setTab] = useState<Tab>('admins');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [impersonateTarget, setImpersonateTarget] = useState<AdminUserWithDetails | null>(null);
  const [blockTarget, setBlockTarget] = useState<AdminUserWithDetails | null>(null);
  // @assumes realUser is the actual authenticated user (not impersonated) for self-protection checks
  const { user: realUser } = useAuth();
  const { role, isSuperAdmin, canManageAdmin } = usePermissions();
  const { data: users, isLoading: usersLoading } = useAdminUserList();
  const { data: invitations, isLoading: invitesLoading } = useAdminInvitations();
  const revokeAdmin = useRevokeAdmin();
  const revokeInvitation = useRevokeInvitation();
  const updateRole = useUpdateAdminRole();
  const blockAdminMut = useBlockAdmin();
  const unblockAdmin = useUnblockAdmin();

  // @invariant Must always have at least 1 active root and 1 active super_admin — prevents lockout
  const activeRootCount =
    users?.filter((u) => u.role_id === 'root' && u.status === 'active').length ?? 0;
  const activeSuperAdminCount =
    users?.filter((u) => u.role_id === 'super_admin' && u.status === 'active').length ?? 0;

  // Each role only sees users at their own level and below
  // @boundary Role hierarchy enforced client-side — higher-ranked users are hidden
  const ROLE_RANK: Record<string, number> = {
    root: 4,
    super_admin: 3,
    admin: 2,
    production_house_admin: 1,
  };
  const myRank = ROLE_RANK[role ?? ''] ?? 0;
  // @edge Unknown role_id defaults to rank 0 via nullish coalesce
  const visibleUsers = users?.filter((u) => {
    if (ROLE_RANK[u.role_id] > myRank) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    return true;
  });

  // @sideeffect Permanently removes admin role — user loses all admin panel access
  // @invariant Guards against revoking the last root or super_admin to prevent lockout
  function handleRevoke(userId: string, roleId: string) {
    if (roleId === 'root' && activeRootCount <= 1)
      return void alert('Cannot revoke the last root user.');
    if (roleId === 'super_admin' && activeSuperAdminCount <= 1)
      return void alert('Cannot revoke the last super admin.');
    if (!confirm('Revoke admin access? This permanently removes their role.')) return;
    revokeAdmin.mutate(userId, { onError: (err: Error) => alert(`Error: ${err.message}`) });
  }

  // @sideeffect Blocks admin and records blockedBy + reason for audit trail
  function handleBlock(reason: string) {
    if (!blockTarget || !realUser) return;
    if (blockTarget.role_id === 'root' && activeRootCount <= 1)
      return void alert('Cannot block the last active root user.');
    if (blockTarget.role_id === 'super_admin' && activeSuperAdminCount <= 1)
      return void alert('Cannot block the last active super admin.');
    blockAdminMut.mutate(
      { userId: blockTarget.id, blockedBy: realUser.id, reason },
      {
        onSuccess: () => setBlockTarget(null),
        onError: (err: Error) => alert(`Error: ${err.message}`),
      },
    );
  }

  function handleUnblock(userId: string) {
    if (!confirm('Unblock this admin? They will regain previous access.')) return;
    unblockAdmin.mutate(userId, { onError: (err: Error) => alert(`Error: ${err.message}`) });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-on-surface">User Management</h1>
        </div>
        {isSuperAdmin && (
          <Link
            href="/users/invite"
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Invite Admin
          </Link>
        )}
      </div>

      {/* Tabs + status filter */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 bg-input rounded-lg p-1 w-fit">
          {(['admins', 'invitations'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t ? 'bg-surface-card text-on-surface shadow-sm' : 'text-on-surface-muted'
              }`}
            >
              {t === 'admins' ? 'Admins' : 'Invitations'}
            </button>
          ))}
        </div>
        {tab === 'admins' && (
          <div className="flex gap-1 bg-input rounded-lg p-1 w-fit">
            {(['active', 'blocked', 'all'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                  statusFilter === s
                    ? 'bg-surface-card text-on-surface shadow-sm'
                    : 'text-on-surface-muted'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'admins' && (
        <AdminsTable
          users={visibleUsers}
          isLoading={usersLoading}
          realUserId={realUser?.id}
          isSuperAdmin={isSuperAdmin}
          canManageAdmin={canManageAdmin}
          onImpersonate={setImpersonateTarget}
          onBlock={setBlockTarget}
          onUnblock={handleUnblock}
          onRevoke={handleRevoke}
          onRoleChange={(userId, roleId) => {
            updateRole.mutate(
              { userId, roleId },
              { onError: (err: Error) => alert(`Error: ${err.message}`) },
            );
          }}
          isRolePending={updateRole.isPending}
          isRevokePending={revokeAdmin.isPending}
        />
      )}

      {tab === 'invitations' && (
        <InvitationsTable
          invitations={invitations}
          isLoading={invitesLoading}
          onRevoke={(id) => {
            if (confirm('Revoke this invitation?'))
              revokeInvitation.mutate(id, {
                onError: (err: Error) => alert(`Error: ${err.message}`),
              });
          }}
          isRevokePending={revokeInvitation.isPending}
        />
      )}

      {impersonateTarget && (
        <ImpersonateModal
          targetUser={impersonateTarget}
          onClose={() => setImpersonateTarget(null)}
        />
      )}
      {blockTarget && (
        <BlockAdminModal
          target={blockTarget}
          onConfirm={handleBlock}
          onClose={() => setBlockTarget(null)}
          isPending={blockAdminMut.isPending}
        />
      )}
    </div>
  );
}
