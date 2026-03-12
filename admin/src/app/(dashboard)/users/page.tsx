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

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>('admins');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [impersonateTarget, setImpersonateTarget] = useState<AdminUserWithDetails | null>(null);
  const [blockTarget, setBlockTarget] = useState<AdminUserWithDetails | null>(null);
  const { user: realUser } = useAuth();
  const { isSuperAdmin, canManageAdmin } = usePermissions();
  const { data: users, isLoading: usersLoading } = useAdminUserList();
  const { data: invitations, isLoading: invitesLoading } = useAdminInvitations();
  const revokeAdmin = useRevokeAdmin();
  const revokeInvitation = useRevokeInvitation();
  const updateRole = useUpdateAdminRole();
  const blockAdminMut = useBlockAdmin();
  const unblockAdmin = useUnblockAdmin();

  const activeSuperAdminCount =
    users?.filter((u) => u.role_id === 'super_admin' && u.status === 'active').length ?? 0;

  // Regular admins see only PH admins; super admins see everyone
  const visibleUsers = users?.filter((u) => {
    if (!isSuperAdmin && u.role_id !== 'production_house_admin') return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    return true;
  });

  function handleRevoke(userId: string, roleId: string) {
    if (roleId === 'super_admin' && activeSuperAdminCount <= 1)
      return void alert('Cannot revoke the last super admin.');
    if (!confirm('Revoke admin access? This permanently removes their role.')) return;
    revokeAdmin.mutate(userId, { onError: (err: Error) => alert(`Error: ${err.message}`) });
  }

  function handleBlock(reason: string) {
    if (!blockTarget || !realUser) return;
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
