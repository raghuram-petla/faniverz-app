'use client';
import { useState } from 'react';
import {
  useAdminUserList,
  useAdminInvitations,
  useRevokeAdmin,
  useRevokeInvitation,
  useUpdateAdminRole,
} from '@/hooks/useAdminUsers';
import { ADMIN_ROLE_LABELS } from '@/lib/types';
import type { AdminUserWithDetails, AdminRoleId } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import {
  Shield,
  UserPlus,
  Trash2,
  Loader2,
  User,
  Clock,
  XCircle,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { ImpersonateModal } from '@/components/users/ImpersonateModal';
import Link from 'next/link';

type Tab = 'admins' | 'invitations';

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>('admins');
  const [impersonateTarget, setImpersonateTarget] = useState<AdminUserWithDetails | null>(null);
  const { user: realUser } = useAuth();
  const { data: users, isLoading: usersLoading } = useAdminUserList();
  const { data: invitations, isLoading: invitesLoading } = useAdminInvitations();
  const revokeAdmin = useRevokeAdmin();
  const revokeInvitation = useRevokeInvitation();
  const updateRole = useUpdateAdminRole();

  const superAdminCount = users?.filter((u) => u.role_id === 'super_admin').length ?? 0;

  function handleRevoke(userId: string, roleId: string) {
    if (roleId === 'super_admin' && superAdminCount <= 1) {
      alert('Cannot revoke the last super admin.');
      return;
    }
    if (!confirm('Revoke admin access for this user?')) return;
    revokeAdmin.mutate(userId, { onError: (err: Error) => alert(`Error: ${err.message}`) });
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
        <Link
          href="/users/invite"
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Invite Admin
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-input rounded-lg p-1 w-fit">
        {(['admins', 'invitations'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-surface-card text-on-surface shadow-sm' : 'text-on-surface-muted'
            }`}
          >
            {t === 'admins' ? 'Active Admins' : 'Invitations'}
          </button>
        ))}
      </div>

      {tab === 'admins' && (
        <>
          {usersLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-on-surface-subtle" />
            </div>
          ) : (
            <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline">
                    <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                      User
                    </th>
                    <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                      Role
                    </th>
                    <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                      Assigned PHs
                    </th>
                    <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                      Since
                    </th>
                    <th className="text-right text-sm font-medium text-on-surface-muted px-6 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-outline-subtle hover:bg-surface-elevated"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-input flex items-center justify-center">
                            <User className="w-4 h-4 text-on-surface-muted" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-on-surface">
                              {u.display_name || 'Unnamed'}
                            </p>
                            <p className="text-xs text-on-surface-subtle">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {u.id === realUser?.id ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-red-600/10 text-red-500">
                            {ADMIN_ROLE_LABELS[u.role_id]}
                          </span>
                        ) : (
                          <select
                            value={u.role_id}
                            onChange={(e) => {
                              const newRole = e.target.value as AdminRoleId;
                              if (confirm(`Change role to ${ADMIN_ROLE_LABELS[newRole]}?`)) {
                                updateRole.mutate(
                                  { userId: u.id, roleId: newRole },
                                  { onError: (err: Error) => alert(`Error: ${err.message}`) },
                                );
                              }
                            }}
                            disabled={updateRole.isPending}
                            className="bg-input rounded-lg px-2 py-1 text-xs text-on-surface outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50"
                          >
                            <option value="super_admin">Super Admin</option>
                            <option value="admin">Admin</option>
                            <option value="production_house_admin">PH Admin</option>
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-muted">
                        {u.ph_assignments.length > 0
                          ? u.ph_assignments
                              .map((ph) => ph.production_house?.name ?? ph.production_house_id)
                              .join(', ')
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-muted">
                        {formatDateTime(u.role_assigned_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {u.id !== realUser?.id && (
                            <button
                              onClick={() => setImpersonateTarget(u)}
                              className="p-2 text-on-surface-subtle hover:text-amber-500 transition-colors"
                              title="Impersonate"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRevoke(u.id, u.role_id)}
                            disabled={revokeAdmin.isPending}
                            className="p-2 text-on-surface-subtle hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Revoke access"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!users || users.length === 0) && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-on-surface-subtle">
                        No admin users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'invitations' && (
        <>
          {invitesLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-on-surface-subtle" />
            </div>
          ) : (
            <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline">
                    <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                      Email
                    </th>
                    <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                      Role
                    </th>
                    <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                      Status
                    </th>
                    <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                      Invited
                    </th>
                    <th className="text-right text-sm font-medium text-on-surface-muted px-6 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invitations?.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-outline-subtle hover:bg-surface-elevated"
                    >
                      <td className="px-6 py-4 text-sm text-on-surface">{inv.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-red-600/10 text-red-500">
                          {ADMIN_ROLE_LABELS[inv.role_id]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {inv.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-yellow-400 text-xs font-medium">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                        {inv.status === 'accepted' && (
                          <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
                            <CheckCircle className="w-3 h-3" /> Accepted
                          </span>
                        )}
                        {inv.status === 'revoked' && (
                          <span className="inline-flex items-center gap-1 text-red-400 text-xs font-medium">
                            <XCircle className="w-3 h-3" /> Revoked
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-muted">
                        {formatDateTime(inv.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {inv.status === 'pending' && (
                          <button
                            onClick={() => {
                              if (confirm('Revoke this invitation?'))
                                revokeInvitation.mutate(inv.id, {
                                  onError: (err: Error) => alert(`Error: ${err.message}`),
                                });
                            }}
                            disabled={revokeInvitation.isPending}
                            className="p-2 text-on-surface-subtle hover:text-red-500 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!invitations || invitations.length === 0) && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-on-surface-subtle">
                        No invitations yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {impersonateTarget && (
        <ImpersonateModal
          targetUser={impersonateTarget}
          onClose={() => setImpersonateTarget(null)}
        />
      )}
    </div>
  );
}
