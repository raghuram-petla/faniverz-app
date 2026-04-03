'use client';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { AuditLogEntry } from '@/lib/types';
import { sanitizeSearchTerm } from '@/lib/sanitizeSearchTerm';

const PAGE_SIZE = 50;

export interface AuditFilters {
  action?: string;
  entityType?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  /** When set, only show entries for this admin user (non-super admins) */
  adminUserId?: string;
}

export function useAdminAuditLog(filters?: AuditFilters) {
  return useInfiniteQuery({
    queryKey: ['admin', 'audit', filters],
    // @contract Audit data is time-sensitive — always refetch when page is visited
    staleTime: 0,
    queryFn: async ({ pageParam: rawPageParam }) => {
      /* v8 ignore start */
      const pageParam = rawPageParam ?? 0;
      /* v8 ignore stop */
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('audit_log_view')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      // @sync: adminUserId filter is defense-in-depth — RLS on audit_log_view already
      // restricts non-super admins to their own rows. If RLS policy is ever loosened
      // (e.g. for a "team lead" role), this client-side filter still prevents data leaks.
      // However, removing this filter without updating RLS would expose all admin
      // actions to any admin user.
      if (filters?.adminUserId) {
        query = query.eq('admin_user_id', filters.adminUserId);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', `${filters.dateFrom}T00:00:00`);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
      }
      if (filters?.search) {
        const term = sanitizeSearchTerm(filters.search);
        if (term) {
          query = query.or(
            `admin_email.ilike.%${term}%,entity_type.ilike.%${term}%,entity_id.ilike.%${term}%`,
          );
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLogEntry[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < PAGE_SIZE ? undefined : lastPageParam + 1,
  });
}

// @contract Calls the /api/audit/revert endpoint to revert a single audit entry
// @sideeffect Nuclear cache invalidation: reverts can touch any audited table, so
// we invalidate ALL ['admin', ...] queries. Reverts are rare; the refetch cost is
// negligible compared to showing stale data on entity edit pages.
export function useRevertAuditEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (auditEntryId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch('/api/audit/revert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ auditEntryId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Revert failed' }));
        throw new Error(err.error ?? 'Revert failed');
      }

      return res.json();
    },
    onSuccess: () => {
      // @invariant A revert can modify any audited table (movies, actors, platforms,
      // cast, posters, etc.) and cascading invalidation is fragile — miss one key and
      // you get stale data. Nuclear invalidation guarantees correctness.
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    // @edge Revert failures must surface to the admin — silent failure could leave
    // the admin believing a revert succeeded when data is unchanged
    /* v8 ignore start -- onError only triggered by real mutation failure */
    onError: (error: Error) => {
      window.alert(error.message || 'Revert failed');
    },
    /* v8 ignore stop */
  });
}
