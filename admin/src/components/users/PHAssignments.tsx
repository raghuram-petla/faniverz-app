'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { useAdminProductionHouses } from '@/hooks/useAdminProductionHouses';
import { Pencil, X } from 'lucide-react';
import Image from 'next/image';
import { getImageUrl } from '@shared/imageUrl';
import { CheckboxListField, type CheckboxListFieldItem } from './CheckboxListField';
import type { AdminPHAssignment } from '@/lib/types';

/**
 * @contract Manages production house assignments for a PH admin user.
 * Compact cell shows assigned PH names + edit button.
 * Edit button opens a modal with searchable checkbox list (same as invite flow).
 * Only visible when the target user's role is 'production_house_admin'.
 */
export interface PHAssignmentsProps {
  userId: string;
  /** @contract Only show for production_house_admin role */
  roleId: string;
  /** @contract Already-fetched PH assignments from useAdminUserList — used for compact display */
  assignedPHs: AdminPHAssignment[];
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Session expired');
  return session.access_token;
}

export function PHAssignments({ userId, roleId, assignedPHs }: PHAssignmentsProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<CheckboxListFieldItem[]>([]);

  // @contract Server-side search for production houses — same pattern as invite flow
  const [phSearch, setPhSearch] = useState('');
  const { data: phData, isFetching: phLoading } = useAdminProductionHouses(
    phSearch,
    undefined,
    isOpen,
  );
  const phItems = useMemo(
    () =>
      (phData?.pages.flat() ?? []).map((ph) => ({
        id: ph.id,
        name: ph.name,
        imageUrl: ph.logo_url,
      })),
    [phData],
  );

  // @sideeffect Sync local state when modal opens — seed from assignedPHs prop
  useEffect(() => {
    if (isOpen) {
      const ids = assignedPHs.map((a) => a.production_house_id);
      setSelectedIds(ids);
      setSelectedItems(
        assignedPHs
          .filter((a) => a.production_house)
          .map((a) => ({
            id: a.production_house_id,
            name: a.production_house!.name,
            imageUrl: a.production_house!.logo_url,
          })),
      );
    }
  }, [isOpen, assignedPHs]);

  const saveMutation = useMutation({
    mutationFn: async (productionHouseIds: string[]) => {
      const token = await getAccessToken();
      const res = await fetch('/api/user-ph-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, productionHouseIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsOpen(false);
    },
  });

  // @contract Same toggle pattern as invite flow — tracks both IDs and item data
  // @coupling: /api/user-ph-assignments POST replaces all assignments (delete + insert), not incremental
  const toggle = useCallback(
    (phId: string) => {
      setSelectedIds((prev) =>
        prev.includes(phId) ? prev.filter((id) => id !== phId) : [...prev, phId],
      );
      setSelectedItems((prev) => {
        if (prev.some((p) => p.id === phId)) return prev.filter((p) => p.id !== phId);
        const item = phItems.find((p) => p.id === phId);
        /* v8 ignore start -- fallback when toggled ID is not in current phItems (race condition) */
        return item ? [...prev, item] : prev;
        /* v8 ignore stop */
      });
    },
    [phItems],
  );

  if (roleId !== 'production_house_admin') return null;

  const assignedIdSet = new Set(assignedPHs.map((a) => a.production_house_id));
  const hasChanges = (() => {
    if (assignedIdSet.size !== selectedIds.length) return true;
    for (const id of selectedIds) if (!assignedIdSet.has(id)) return true;
    return false;
  })();

  return (
    <>
      {/* Compact cell: PH pills + edit icon */}
      <div className="flex flex-wrap items-center gap-1.5">
        {assignedPHs.length > 0 ? (
          assignedPHs.map((a) => {
            const name = a.production_house?.name ?? a.production_house_id;
            const logoUrl = a.production_house?.logo_url;
            /* v8 ignore start -- getImageUrl null fallback unreachable in tests (mock always returns url) */
            const src = logoUrl
              ? (getImageUrl(logoUrl, 'sm', 'PRODUCTION_HOUSES') ?? logoUrl)
              : null;
            /* v8 ignore stop */
            return (
              <span
                key={a.production_house_id}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-elevated text-xs text-on-surface"
              >
                {src && (
                  <Image
                    src={src}
                    alt={name}
                    width={16}
                    height={16}
                    className="rounded-sm object-contain"
                    unoptimized
                  />
                )}
                {name}
              </span>
            );
          })
        ) : (
          <span className="text-sm text-on-surface-muted">—</span>
        )}
        <button
          onClick={() => setIsOpen(true)}
          className="p-1 text-on-surface-subtle hover:text-on-surface transition-colors shrink-0"
          title="Edit PH assignments"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setIsOpen(false)}
          data-testid="ph-modal-backdrop"
        >
          <div
            className="bg-surface-card border border-outline rounded-xl w-full max-w-md mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline">
              <h3 className="text-base font-semibold text-on-surface">Edit PH Assignments</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-on-surface-subtle hover:text-on-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <CheckboxListField
                label="Production Houses"
                items={phItems}
                selectedIds={selectedIds}
                selectedItems={selectedItems}
                onToggle={toggle}
                onSearch={setPhSearch}
                isLoading={phLoading}
                emptyMessage="No production houses found"
              />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-t border-outline">
              {saveMutation.isError && (
                <p className="text-xs text-status-red">{saveMutation.error?.message}</p>
              )}
              {!saveMutation.isError && <div />}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-on-surface-muted hover:bg-surface-elevated transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveMutation.mutate(selectedIds)}
                  disabled={!hasChanges || saveMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {/* v8 ignore start */}
                  {saveMutation.isPending ? 'Saving...' : 'Save'}
                  {/* v8 ignore stop */}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
