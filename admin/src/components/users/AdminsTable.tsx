'use client';
import { ADMIN_ROLE_LABELS } from '@/lib/types';
import type { AdminUserWithDetails, AdminRoleId } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { Loader2, Eye, Ban, ShieldCheck, Trash2 } from 'lucide-react';

export interface AdminsTableProps {
  users: AdminUserWithDetails[] | undefined;
  isLoading: boolean;
  realUserId: string | undefined;
  isSuperAdmin: boolean;
  canManageAdmin: (role: AdminRoleId) => boolean;
  onImpersonate: (u: AdminUserWithDetails) => void;
  onBlock: (u: AdminUserWithDetails) => void;
  onUnblock: (userId: string) => void;
  onRevoke: (userId: string, roleId: string) => void;
  onRoleChange: (userId: string, roleId: AdminRoleId) => void;
  isRolePending: boolean;
  isRevokePending: boolean;
}

/** Roles available in the role-change dropdown (root is SQL-only) */
const CHANGEABLE_ROLES: { value: AdminRoleId; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'production_house_admin', label: 'PH Admin' },
];

export function AdminsTable({
  users,
  isLoading,
  realUserId,
  isSuperAdmin,
  canManageAdmin,
  onImpersonate,
  onBlock,
  onUnblock,
  onRevoke,
  onRoleChange,
  isRolePending,
  isRevokePending,
}: AdminsTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-on-surface-subtle" />
      </div>
    );
  }

  return (
    <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-outline">
            {['User', 'Role', 'Status', 'PHs', 'Since'].map((h) => (
              <th key={h} className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                {h}
              </th>
            ))}
            <th className="text-right text-sm font-medium text-on-surface-muted px-6 py-4">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {users?.map((u) => {
            const isSelf = u.id === realUserId;
            const canManage = !isSelf && canManageAdmin(u.role_id);
            // Root role is SQL-only: always show as static badge, never as dropdown
            const showRoleDropdown = !isSelf && isSuperAdmin && u.role_id !== 'root';
            return (
              <tr key={u.id} className="border-b border-outline-subtle hover:bg-surface-elevated">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt={u.display_name ?? 'Admin avatar'}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center text-xs font-medium text-red-400">
                        {(u.display_name ?? '?')[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-on-surface">
                        {u.display_name || 'Unnamed'}
                      </p>
                      <p className="text-xs text-on-surface-subtle">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {showRoleDropdown ? (
                    <select
                      value={u.role_id}
                      onChange={(e) => {
                        const newRole = e.target.value as AdminRoleId;
                        if (confirm(`Change role to ${ADMIN_ROLE_LABELS[newRole]}?`))
                          onRoleChange(u.id, newRole);
                      }}
                      disabled={isRolePending || u.status === 'blocked'}
                      className="bg-input rounded-lg px-2 py-1 text-xs text-on-surface outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50"
                    >
                      {CHANGEABLE_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                        u.role_id === 'root'
                          ? 'bg-amber-600/10 text-amber-500'
                          : 'bg-red-600/10 text-red-500'
                      }`}
                    >
                      {ADMIN_ROLE_LABELS[u.role_id]}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {u.status === 'blocked' ? (
                    <span
                      className="inline-flex items-center gap-1 text-red-400 text-xs font-medium"
                      title={u.blocked_reason ?? ''}
                    >
                      <Ban className="w-3 h-3" /> Blocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
                      <ShieldCheck className="w-3 h-3" /> Active
                    </span>
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
                    {/* Hierarchy: only show impersonate for roles BELOW the current user.
                        canManageAdmin enforces: root→all except root, super_admin→admin+PH, admin→PH.
                        isSuperAdmin gates overall ability to impersonate (admins cannot). */}
                    {!isSelf &&
                      isSuperAdmin &&
                      canManageAdmin(u.role_id) &&
                      u.status === 'active' && (
                        <button
                          onClick={() => onImpersonate(u)}
                          className="p-2 text-on-surface-subtle hover:text-amber-500 transition-colors"
                          title="Impersonate"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    {canManage && u.status === 'active' && (
                      <button
                        onClick={() => onBlock(u)}
                        className="p-2 text-on-surface-subtle hover:text-orange-500 transition-colors"
                        title="Block"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                    {canManage && u.status === 'blocked' && (
                      <button
                        onClick={() => onUnblock(u.id)}
                        className="p-2 text-on-surface-subtle hover:text-green-500 transition-colors"
                        title="Unblock"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => onRevoke(u.id, u.role_id)}
                        disabled={isRevokePending}
                        className="p-2 text-on-surface-subtle hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Revoke access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {(!users || users.length === 0) && (
            <tr>
              <td colSpan={6} className="text-center py-10 text-on-surface-subtle">
                No admin users found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
