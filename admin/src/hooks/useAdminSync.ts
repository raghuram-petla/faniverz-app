'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { SyncLog } from '@/lib/types';

// @contract: returns last 50 sync logs, newest first
// @sync: auto-polls every 10s while any log has status === 'running'
export function useAdminSyncLogs() {
  return useQuery({
    queryKey: ['admin', 'sync'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as SyncLog[];
    },
    refetchInterval: (query) => {
      const logs = query.state.data;
      if (logs?.some((log) => log.status === 'running')) return 10_000;
      return false;
    },
  });
}

// @boundary: invokes a Supabase Edge Function by name (e.g. 'sync-movies')
// @sideeffect: window.alert on failure; invalidates sync query cache on success
export function useTriggerSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (functionName: string) => {
      const { error } = await supabase.functions.invoke(functionName);
      if (error) throw error;
      return functionName;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'sync'] });
    },
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : 'Sync failed');
    },
  });
}
