'use client';
import { useState, useEffect } from 'react';
import { useImpersonation } from '@/hooks/useImpersonation';
import { supabase } from '@/lib/supabase-browser';
import { ADMIN_ROLE_LABELS } from '@/lib/types';
import type { AdminRoleId, AdminUserWithDetails, ProductionHouse } from '@/lib/types';
import { X, Loader2 } from 'lucide-react';

/**
 * @contract two modes: user-impersonation (targetUser set) or role-impersonation (targetUser null)
 * @sideeffect writes impersonation state to ImpersonationContext, affecting entire admin panel
 */
export interface ImpersonateModalProps {
  /** Pre-selected target user (from Users page). Null = role-only mode. */
  targetUser: AdminUserWithDetails | null;
  onClose: () => void;
}

export function ImpersonateModal({ targetUser, onClose }: ImpersonateModalProps) {
  const { startImpersonation, startRoleImpersonation, realUser } = useImpersonation();
  /** @invariant role dropdown respects hierarchy — only show roles BELOW the real user's role:
   *   root         -> super_admin, admin, PH admin, viewer
   *   super_admin  -> admin, PH admin, viewer (no super_admin option)
   * root is never shown as an impersonation target (SQL-only role). */
  const isRoot = realUser?.role === 'root';
  const [role, setRole] = useState<AdminRoleId>('admin');
  const [selectedPhIds, setSelectedPhIds] = useState<string[]>([]);
  const [productionHouses, setProductionHouses] = useState<ProductionHouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [phLoading, setPhLoading] = useState(false);
  const [phError, setPhError] = useState<string | null>(null);

  /** @sideeffect: fetches production_houses only when role is PH admin and no targetUser set */
  useEffect(() => {
    if (targetUser || role !== 'production_house_admin') return;
    let cancelled = false;
    setPhLoading(true);
    setPhError(null);
    supabase
      .from('production_houses')
      .select('*')
      .order('name')
      .then(
        ({ data, error }) => {
          if (cancelled) return;
          if (error) {
            setPhError(error.message);
          } else {
            setProductionHouses(data ?? []);
          }
          setPhLoading(false);
        },
        (err) => {
          /* v8 ignore start */
          if (cancelled) return;
          /* v8 ignore stop */
          setPhError(err instanceof Error ? err.message : 'Failed to load production houses');
          setPhLoading(false);
        },
      );
    return () => {
      cancelled = true;
    };
  }, [role, targetUser]);

  async function handleStart() {
    setLoading(true);
    try {
      if (targetUser) {
        await startImpersonation(targetUser.id);
      } else {
        await startRoleImpersonation(role, role === 'production_house_admin' ? selectedPhIds : []);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  }

  function togglePH(id: string) {
    setSelectedPhIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  /** @invariant PH admin requires at least one production house selected; other roles are self-sufficient
   *  @edge viewer role impersonation is synthetic — no admin_user_roles row needed, just sets effective role */
  const canStart =
    targetUser ||
    role === 'super_admin' ||
    role === 'admin' ||
    role === 'viewer' ||
    (role === 'production_house_admin' && selectedPhIds.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-surface-card border border-outline rounded-xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface">
            {targetUser ? 'Impersonate User' : 'Impersonate Role'}
          </h2>
          <button onClick={onClose} className="text-on-surface-subtle hover:text-on-surface">
            <X className="w-5 h-5" />
          </button>
        </div>

        {targetUser ? (
          <div className="bg-surface-elevated rounded-lg p-4 space-y-1">
            <p className="font-medium text-on-surface">
              {targetUser.display_name || targetUser.email}
            </p>
            {targetUser.display_name && (
              <p className="text-sm text-on-surface-subtle">{targetUser.email}</p>
            )}
            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-red-600/10 text-status-red mt-1">
              {ADMIN_ROLE_LABELS[targetUser.role_id]}
            </span>
            {targetUser.ph_assignments.length > 0 && (
              <p className="text-xs text-on-surface-muted mt-1">
                PHs:{' '}
                {targetUser.ph_assignments
                  .map((a) => a.production_house?.name ?? a.production_house_id)
                  .join(', ')}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-on-surface-muted mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as AdminRoleId);
                  setSelectedPhIds([]);
                }}
                className="w-full bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
              >
                {/* Hierarchy: root sees super_admin option; super_admin does not */}
                {isRoot && <option value="super_admin">Super Admin</option>}
                <option value="admin">Faniverz Admin</option>
                <option value="production_house_admin">Production Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            {role === 'production_house_admin' && (
              <div>
                <label className="block text-sm font-medium text-on-surface-muted mb-1">
                  Production Houses
                </label>
                {phError ? (
                  <p className="text-xs text-status-red p-2">{phError}</p>
                ) : phLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-on-surface-subtle" />
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1 bg-input rounded-lg p-2">
                    {productionHouses.map((ph) => (
                      <label
                        key={ph.id}
                        className="flex items-center gap-2 cursor-pointer p-1 hover:bg-surface-elevated rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPhIds.includes(ph.id)}
                          onChange={() => togglePH(ph.id)}
                          className="accent-red-600"
                        />
                        <span className="text-sm text-on-surface">{ph.name}</span>
                      </label>
                    ))}
                    {productionHouses.length === 0 && (
                      <p className="text-xs text-on-surface-subtle p-1">
                        No production houses found
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/** @assumes audit log records actions under the real user's identity, not the impersonated one */}
        <p className="text-xs text-on-surface-subtle">
          You will see the admin panel as this {targetUser ? 'user' : 'role'} would see it. All
          changes will be recorded in the audit log under your real identity.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-on-surface-muted hover:text-on-surface transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!canStart || loading}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Start Impersonating
          </button>
        </div>
      </div>
    </div>
  );
}
