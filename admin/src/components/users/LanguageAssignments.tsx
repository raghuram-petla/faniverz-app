'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { Loader2 } from 'lucide-react';
import { useLanguageContext } from '@/hooks/useLanguageContext';

/**
 * @contract Manages language assignments for an admin user.
 * Shows checkboxes for each available language.
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
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  // @sideeffect Sync local state with fetched assignments
  useEffect(() => {
    if (assignments) {
      setSelected(new Set(assignments.map((a) => a.language_id)));
    }
  }, [assignments]);

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
    },
  });

  if (roleId !== 'admin') return null;

  if (isLoading) {
    return <Loader2 className="w-4 h-4 animate-spin text-on-surface-muted" />;
  }

  const toggle = (langId: string) => {
    const next = new Set(selected);
    if (next.has(langId)) next.delete(langId);
    else next.add(langId);
    setSelected(next);
  };

  // @contract compare selected set to fetched assignments — shows Save button only on diff
  const hasChanges = (() => {
    const currentIds = new Set(assignments?.map((a) => a.language_id) ?? []);
    if (currentIds.size !== selected.size) return true;
    for (const id of selected) if (!currentIds.has(id)) return true;
    return false;
  })();

  return (
    <div className="space-y-2">
      <p className="text-xs text-on-surface-muted font-medium">Language Access</p>
      <div className="flex flex-wrap gap-2">
        {languages.map((lang) => (
          <label
            key={lang.id}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-input text-sm cursor-pointer hover:bg-input-active transition-colors"
          >
            <input
              type="checkbox"
              checked={selected.has(lang.id)}
              onChange={() => toggle(lang.id)}
              className="w-4 h-4 rounded accent-red-600"
            />
            <span className="text-on-surface">{lang.name}</span>
          </label>
        ))}
      </div>
      {hasChanges && (
        <button
          onClick={() => saveMutation.mutate([...selected])}
          disabled={saveMutation.isPending}
          className="mt-1 px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Languages'}
        </button>
      )}
      {saveMutation.isError && (
        <p className="text-xs text-status-red">{saveMutation.error?.message}</p>
      )}
    </div>
  );
}
