'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { logAdminAction } from '@/lib/audit';

export function useAdminNotifications(options?: { status?: string; type?: string }) {
  return useQuery({
    queryKey: ['admin-notifications', options],
    queryFn: async () => {
      let query = supabase
        .from('notification_queue')
        .select('*, profiles(display_name), movies(title)')
        .order('scheduled_for', { ascending: false })
        .limit(200);

      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.type) {
        query = query.eq('type', options.type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useNotificationStats() {
  return useQuery({
    queryKey: ['admin-notification-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const [pending, sentToday, failedToday] = await Promise.all([
        supabase
          .from('notification_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('notification_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'sent')
          .gte('sent_at', today),
        supabase
          .from('notification_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'failed')
          .gte('created_at', today),
      ]);

      return {
        pending: pending.count ?? 0,
        sentToday: sentToday.count ?? 0,
        failedToday: failedToday.count ?? 0,
      };
    },
  });
}

export function useCancelNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('notification_queue')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('status', 'pending');
      if (error) throw error;
      return id;
    },
    onSuccess: async (id) => {
      await logAdminAction('update', 'notification', id);
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notification-stats'] });
    },
  });
}

export function useRetryNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('notification_queue')
        .update({ status: 'pending', sent_at: null })
        .eq('id', id)
        .eq('status', 'failed');
      if (error) throw error;
      return id;
    },
    onSuccess: async (id) => {
      await logAdminAction('update', 'notification', id);
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notification-stats'] });
    },
  });
}

export function useBulkRetryFailed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notification_queue')
        .update({ status: 'pending', sent_at: null })
        .eq('status', 'failed');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notification-stats'] });
    },
  });
}

export function useBulkCancelPending() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notification_queue')
        .update({ status: 'cancelled' })
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notification-stats'] });
    },
  });
}

export function useComposeNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: {
      title: string;
      body: string;
      target: 'all' | 'digest_subscribers' | 'movie_watchlisters';
      movie_id?: number;
      scheduled_for?: string;
      data?: Record<string, unknown>;
    }) => {
      const scheduledFor = notification.scheduled_for ?? new Date().toISOString();

      if (notification.target === 'movie_watchlisters' && notification.movie_id) {
        // Get all users who watchlisted this movie
        const { data: watchlisters, error: wErr } = await supabase
          .from('watchlists')
          .select('user_id')
          .eq('movie_id', notification.movie_id);
        if (wErr) throw wErr;

        const entries = (watchlisters ?? []).map((w) => ({
          user_id: w.user_id,
          movie_id: notification.movie_id,
          type: 'watchlist_reminder' as const,
          title: notification.title,
          body: notification.body,
          data: notification.data ?? null,
          scheduled_for: scheduledFor,
          status: 'pending' as const,
        }));

        if (entries.length > 0) {
          const { error } = await supabase.from('notification_queue').insert(entries);
          if (error) throw error;
        }
        return entries.length;
      }

      if (notification.target === 'digest_subscribers') {
        const { data: subscribers, error: sErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('notify_digest', true);
        if (sErr) throw sErr;

        const entries = (subscribers ?? []).map((s) => ({
          user_id: s.id,
          movie_id: notification.movie_id ?? null,
          type: 'weekly_digest' as const,
          title: notification.title,
          body: notification.body,
          data: notification.data ?? null,
          scheduled_for: scheduledFor,
          status: 'pending' as const,
        }));

        if (entries.length > 0) {
          const { error } = await supabase.from('notification_queue').insert(entries);
          if (error) throw error;
        }
        return entries.length;
      }

      // Target: all users
      const { data: allUsers, error: uErr } = await supabase.from('profiles').select('id');
      if (uErr) throw uErr;

      const entries = (allUsers ?? []).map((u) => ({
        user_id: u.id,
        movie_id: notification.movie_id ?? null,
        type: 'watchlist_reminder' as const,
        title: notification.title,
        body: notification.body,
        data: notification.data ?? null,
        scheduled_for: scheduledFor,
        status: 'pending' as const,
      }));

      if (entries.length > 0) {
        const { error } = await supabase.from('notification_queue').insert(entries);
        if (error) throw error;
      }
      return entries.length;
    },
    onSuccess: async () => {
      await logAdminAction('create', 'notification', 0);
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notification-stats'] });
    },
  });
}
