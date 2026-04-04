'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { createSimpleMutation } from './createSimpleMutation';
import type { Notification } from '@/lib/types';

// @nullable filters param and both sub-fields — omitted = all notifications
// @coupling JOINs movies table for poster_url display in notification list
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

// @contract Not using createSimpleMutation because onSuccess triggers a side-effect
// (edge function push delivery) with its own error handling that must not surface via window.alert.
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

      // @sideeffect Triggers edge function 'send-push' for immediate notifications
      // @edge Push failure is surfaced via window.alert so admin can retry manually
      // @assumes Notifications within 60s of now are treated as "immediate"
      const isImmediate =
        !notification.scheduled_for ||
        new Date(notification.scheduled_for).getTime() <= Date.now() + 60_000;
      if (isImmediate && data) {
        try {
          const { error: pushError } = await supabase.functions.invoke('send-push', {
            body: { notification_id: data.id },
          });
          if (pushError) {
            console.error('Push delivery failed:', pushError);
            window.alert(
              `Notification created but push delivery failed: ${pushError.message ?? 'Unknown error'}. You can retry from the notifications list.`,
            );
          }
        } catch (pushErr) {
          console.error('Push delivery error:', pushErr);
          window.alert(
            `Notification created but push delivery failed. You can retry from the notifications list.`,
          );
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

// @sideeffect Sets status to 'cancelled' — does NOT send cancellation to already-delivered push notifications.
// @edge: if a scheduled notification is cancelled AFTER the edge function picks it up for delivery,
// the push still goes out. The cancellation window closes once send-push starts processing.
export const useCancelNotification = createSimpleMutation<string, string>({
  mutationFn: async (id) => {
    const { error } = await supabase
      .from('notifications')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) throw error;
    return id;
  },
  invalidateKeys: [['admin', 'notifications']],
});

// @sideeffect Resets failed notification to 'pending' — does NOT re-trigger push delivery
export const useRetryNotification = createSimpleMutation<string, string>({
  mutationFn: async (id) => {
    const { error } = await supabase
      .from('notifications')
      .update({ status: 'pending' })
      .eq('id', id);
    if (error) throw error;
    return id;
  },
  invalidateKeys: [['admin', 'notifications']],
});

// @sideeffect Batch status transition: all 'failed' -> 'pending' in one UPDATE
// @edge No row-count limit — large volumes could cause slow queries
export const useBulkRetryFailed = createSimpleMutation<void>({
  mutationFn: async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ status: 'pending' })
      .eq('status', 'failed');
    if (error) throw error;
  },
  invalidateKeys: [['admin', 'notifications']],
});

// @sideeffect Batch status transition: all 'pending' -> 'cancelled' in one UPDATE
export const useBulkCancelPending = createSimpleMutation<void>({
  mutationFn: async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ status: 'cancelled' })
      .eq('status', 'pending');
    if (error) throw error;
  },
  invalidateKeys: [['admin', 'notifications']],
});
