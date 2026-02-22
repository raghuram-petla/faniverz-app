'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';

export function useAdminAuditLog(options?: {
  action?: string;
  entityType?: string;
  adminUserId?: string;
}) {
  return useQuery({
    queryKey: ['admin-audit-log', options],
    queryFn: async () => {
      let query = supabase
        .from('admin_audit_log')
        .select('*, profiles(display_name)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (options?.action) {
        query = query.eq('action', options.action);
      }
      if (options?.entityType) {
        query = query.eq('entity_type', options.entityType);
      }
      if (options?.adminUserId) {
        query = query.eq('admin_user_id', options.adminUserId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
