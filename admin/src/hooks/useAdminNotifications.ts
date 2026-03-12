'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { Notification } from '@/lib/types';

export function useAdminNotifications(filters?: { status?: string; type?: string }) {
  return useQuery({
    queryKey: ['admin', 'notifications', filters],
    queryFn: async () => {
      let query = supabase
        .from('notifications')
        .select('*, movie:movies(id, title, poster_url)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.type) query = query.eq('type', filters.type);
      const { data, error } = await query;
      if (error) throw error;
      return data as Notification[];
    },
  });
}

export function useCreateNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notification: Partial<Notification>) => {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();
      if (error) throw error;

      // Trigger push delivery for immediate sends (fire-and-forget — don't fail the mutation)
      const isImmediate =
        !notification.scheduled_for ||
        new Date(notification.scheduled_for).getTime() <= Date.now() + 60_000;
      if (isImmediate && data) {
        try {
          const { error: pushError } = await supabase.functions.invoke('send-push', {
            body: { notification_id: data.id },
          });
          if (pushError) console.error('Push delivery failed:', pushError);
        } catch (pushErr) {
          console.error('Push delivery error:', pushErr);
        }
      }

      return data as Notification;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Operation failed');
    },
  });
}

export function useCancelNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Operation failed');
    },
  });
}

export function useRetryNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'pending' })
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Operation failed');
    },
  });
}

export function useBulkRetryFailed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'pending' })
        .eq('status', 'failed');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Operation failed');
    },
  });
}

export function useBulkCancelPending() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'cancelled' })
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Operation failed');
    },
  });
}
