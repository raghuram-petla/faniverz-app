'use client';
import { ADMIN_ROLE_LABELS } from '@/lib/types';
import type { AdminUserWithDetails, AdminRoleId } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { getImageUrl } from '@shared/imageUrl';
import { Loader2, Eye, Ban, ShieldCheck, Trash2 } from 'lucide-react';
import { LanguageAssignments } from './LanguageAssignments';
import { PHAssignments } from './PHAssignments';

/**
 * @contract renders admin users table with role hierarchy-aware actions
 * @invariant self-actions (block/revoke/role-change on own account) are always disabled
 */
export interface AdminsTableProps {
  /** @nullable undefined during initial fetch */
  users: AdminUserWithDetails[] | undefined;
  isLoading: boolean;
  realUserId: string | undefined;
  /** @assumes true for root or super_admin — gates impersonation button visibility */
  isSuperAdmin: boolean;
  /** @boundary enforces role hierarchy: returns true only for roles below the caller's level */
  canManageAdmin: (role: AdminRoleId) => boolean;
  onImpersonate: (u: AdminUserWithDetails) => void;
  onBlock: (u: AdminUserWithDetails) => void;
  onUnblock: (userId: string) => void;
  onRevoke: (userId: string, roleId: string) => void;
  /** @sideeffect updates admin_user_roles.role_id in DB */
  onRoleChange: (userId: string, roleId: AdminRoleId) => void;
  isRolePending: boolean;
  isRevokePending: boolean;
}

/** All non-root roles for dropdown (filtered per-user by canManageAdmin) */
const ALL_CHANGEABLE_ROLES: { value: AdminRoleId; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Faniverz Admin' },
  { value: 'production_house_admin', label: 'Production Admin' },
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
      <table className="w-full table-fixed">
        <colgroup>
          <col className="w-[18%]" />
          <col className="w-[12%]" />
          <col className="w-[8%]" />
          <col className="w-[24%]" />
          <col className="w-[16%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-outline">
            {['User', 'Role', 'Status', 'PHs', 'Languages', 'Since'].map((h) => (
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
            /** @invariant canManage is false for self and for users with equal/higher role */
            const canManage = !isSelf && canManageAdmin(u.role_id);
            // Show role dropdown only if the current user can manage this user
            /** @edge root role never gets a dropdown — root is SQL-only, not assignable via UI */
            const showRoleDropdown = canManage && u.role_id !== 'root';
            /** @boundary filters assignable roles to only those below the current user's level */
            const assignableRoles = ALL_CHANGEABLE_ROLES.filter(
              (r) => r.value === u.role_id || canManageAdmin(r.value),
            );
            return (
              <tr key={u.id} className="border-b border-outline-subtle hover:bg-surface-elevated">
                <td className="px-6 py-4">
                  {/** @nullable avatar_url may be null; fallback shows first letter of display_name or '?' */}
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      <img
                        /* v8 ignore start */
                        src={getImageUrl(u.avatar_url, 'sm', 'AVATARS') ?? u.avatar_url}
                        /* v8 ignore stop */
                        /* v8 ignore start */
                        alt={u.display_name ?? 'Admin avatar'}
                        /* v8 ignore stop */
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center text-xs font-medium text-status-red">
                        {/* v8 ignore start */}
                        {(u.display_name ?? '?')[0]?.toUpperCase() ?? '?'}
                        {/* v8 ignore stop */}
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
                      {assignableRoles.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                        u.role_id === 'root'
                          ? 'bg-amber-600/10 text-status-amber'
                          : 'bg-red-600/10 text-status-red'
                      }`}
                    >
                      {ADMIN_ROLE_LABELS[u.role_id]}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {u.status === 'blocked' ? (
                    <span
                      className="inline-flex items-center gap-1 text-status-red text-xs font-medium"
                      title={u.blocked_reason ?? ''}
                    >
                      <Ban className="w-3 h-3" /> Blocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-status-green text-xs font-medium">
                      <ShieldCheck className="w-3 h-3" /> Active
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {/* @contract PH assignments editable for PH admin role when viewer is super admin */}
                  {isSuperAdmin && u.role_id === 'production_house_admin' ? (
                    <PHAssignments
                      userId={u.id}
                      roleId={u.role_id}
                      assignedPHs={u.ph_assignments}
                    />
                  ) : (
                    <span className="text-sm text-on-surface-muted">
                      {u.ph_assignments.length > 0
                        ? u.ph_assignments
                            .map((ph) => ph.production_house?.name ?? ph.production_house_id)
                            .join(', ')
                        : '—'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {/* @contract Language assignments only shown for admin role users */}
                  {isSuperAdmin && u.role_id === 'admin' ? (
                    <LanguageAssignments userId={u.id} roleId={u.role_id} />
                  ) : (
                    <span className="text-sm text-on-surface-muted">—</span>
                  )}
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
                          className="p-2 text-on-surface-subtle hover:text-status-amber transition-colors"
                          title="Impersonate"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    {canManage && u.status === 'active' && (
                      <button
                        onClick={() => onBlock(u)}
                        className="p-2 text-on-surface-subtle hover:text-status-orange transition-colors"
                        title="Block"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                    {canManage && u.status === 'blocked' && (
                      <button
                        onClick={() => onUnblock(u.id)}
                        className="p-2 text-on-surface-subtle hover:text-status-green transition-colors"
                        title="Unblock"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => onRevoke(u.id, u.role_id)}
                        disabled={isRevokePending}
                        className="p-2 text-on-surface-subtle hover:text-status-red transition-colors disabled:opacity-50"
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
              <td colSpan={7} className="text-center py-10 text-on-surface-subtle">
                No admin users found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
