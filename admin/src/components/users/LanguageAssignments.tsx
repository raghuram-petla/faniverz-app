'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { Loader2, Pencil, X } from 'lucide-react';
import { useLanguageContext } from '@/hooks/useLanguageContext';
import { CheckboxListField } from './CheckboxListField';

/**
 * @contract Manages language assignments for an admin user.
 * Compact cell shows assigned language pills + edit button.
 * Edit opens a modal with CheckboxListField.
 * Only visible when the target user's role is 'admin'.
 * Save calls POST /api/user-languages.
 */
export interface LanguageAssignmentsProps {
  userId: string;
  /** @contract Only show for admin role — root/super have implicit all access */
  roleId: string;
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Session expired');
  return session.access_token;
}

export function LanguageAssignments({ userId, roleId }: LanguageAssignmentsProps) {
  const queryClient = useQueryClient();
  const { languages } = useLanguageContext();
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  // @contract Fetch current assignments for this user
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['user-languages', userId],
    queryFn: async () => {
      const token = await getAccessToken();
      const res = await fetch(`/api/user-languages?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json() as Promise<{ language_id: string }[]>;
    },
    enabled: roleId === 'admin',
  });

  // @sideeffect Sync local state when modal opens
  useEffect(() => {
    if (isOpen && assignments) {
      setSelected(assignments.map((a) => a.language_id));
    }
  }, [isOpen, assignments]);

  const saveMutation = useMutation({
    mutationFn: async (languageIds: string[]) => {
      const token = await getAccessToken();
      const res = await fetch('/api/user-languages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, languageIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-languages', userId] });
      setIsOpen(false);
    },
  });

  if (roleId !== 'admin') return null;

  if (isLoading) {
    return <Loader2 className="w-4 h-4 animate-spin text-on-surface-muted" />;
  }

  const toggle = (langId: string) => {
    setSelected((prev) =>
      prev.includes(langId) ? prev.filter((id) => id !== langId) : [...prev, langId],
    );
  };

  // @contract Build display from fetched assignments + language context
  const langMap = new Map(languages.map((l) => [l.id, l.name]));
  const assignedIds = new Set(assignments?.map((a) => a.language_id) ?? []);
  const assignedNames = [...assignedIds].map((id) => langMap.get(id) ?? id);

  const hasChanges = (() => {
    if (assignedIds.size !== selected.length) return true;
    for (const id of selected) if (!assignedIds.has(id)) return true;
    return false;
  })();

  const langItems = languages.map((l) => ({ id: l.id, name: l.name }));

  return (
    <>
      {/* Compact cell: language pills + edit icon */}
      <div className="flex flex-wrap items-center gap-1.5">
        {assignedNames.length > 0 ? (
          assignedNames.map((name) => (
            <span
              key={name}
              className="inline-block px-2 py-0.5 rounded-md bg-surface-elevated text-xs text-on-surface"
            >
              {name}
            </span>
          ))
        ) : (
          <span className="text-sm text-on-surface-muted">—</span>
        )}
        <button
          onClick={() => setIsOpen(true)}
          className="p-1 text-on-surface-subtle hover:text-on-surface transition-colors shrink-0"
          title="Edit language assignments"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setIsOpen(false)}
          data-testid="lang-modal-backdrop"
        >
          <div
            className="bg-surface-card border border-outline rounded-xl w-full max-w-md mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline">
              <h3 className="text-base font-semibold text-on-surface">Edit Language Assignments</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-on-surface-subtle hover:text-on-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <CheckboxListField
                label="Languages"
                items={langItems}
                selectedIds={selected}
                onToggle={toggle}
                emptyMessage="No languages available"
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
                  onClick={() => saveMutation.mutate(selected)}
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
