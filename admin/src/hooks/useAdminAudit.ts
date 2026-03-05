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

/** Strip characters that break PostgREST .or() filter syntax */
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

      // Non-super admins: restrict to own entries (defense in depth — RLS also enforces this)
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
