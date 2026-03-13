'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { AuditLogEntry } from '@/lib/types';

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

// @boundary: PostgREST's .or() filter uses commas as delimiters and parentheses for
// grouping. Unsanitized search terms containing these characters (e.g. "O'Brien" or
// "actor, director") would corrupt the filter syntax, causing Supabase to return a
// 400 error instead of filtered results. This strips them rather than escaping them,
// so searching for "O'Brien" actually searches for "OBrien" — partial match loss.
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,.()"'\\]/g, '').trim();
}

export function useAdminAuditLog(filters?: AuditFilters) {
  return useInfiniteQuery({
    queryKey: ['admin', 'audit', filters],
    queryFn: async ({ pageParam = 0 }) => {
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
      lastPage.length === PAGE_SIZE ? lastPageParam + 1 : undefined,
  });
}
