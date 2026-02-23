'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { SyncLog } from '@/lib/types';

export function useAdminSyncLogs() {
  return useQuery({
    queryKey: ['admin', 'sync'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as SyncLog[];
    },
  });
}

export function useTriggerSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (functionName: string) => {
      const { error } = await supabase.functions.invoke(functionName);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'sync'] }),
  });
}
