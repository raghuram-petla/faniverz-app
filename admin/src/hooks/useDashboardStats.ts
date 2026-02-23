'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { DashboardStats } from '@/lib/types';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async (): Promise<DashboardStats> => {
      const [moviesRes, usersRes, reviewsRes, notifsRes] = await Promise.all([
        supabase.from('movies').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date().toISOString().split('T')[0]),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ]);
      return {
        totalMovies: moviesRes.count ?? 0,
        totalUsers: usersRes.count ?? 0,
        reviewsToday: reviewsRes.count ?? 0,
        activeNotifications: notifsRes.count ?? 0,
      };
    },
    staleTime: 60_000,
  });
}
