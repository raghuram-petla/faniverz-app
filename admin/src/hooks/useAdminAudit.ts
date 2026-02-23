'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { AuditLogEntry } from '@/lib/types';

export function useAdminAuditLog(filters?: { action?: string; entityType?: string }) {
  return useQuery({
    queryKey: ['admin', 'audit', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (filters?.action) query = query.eq('action', filters.action);
      if (filters?.entityType) query = query.eq('entity_type', filters.entityType);
      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLogEntry[];
    },
  });
}
