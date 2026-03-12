'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';

export interface EndUserProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  preferred_lang: string | null;
  created_at: string;
}

export interface UseAdminEndUsersOptions {
  search: string;
  page: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 50;

export function useAdminEndUsers({
  search,
  page,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseAdminEndUsersOptions) {
  return useQuery({
    queryKey: ['admin', 'end-users', search, page, pageSize],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('profiles')
        .select(
          'id, display_name, username, email, avatar_url, bio, location, preferred_lang, created_at',
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(from, to);

      if (search) {
        query = query.or(
          `display_name.ilike.%${search}%,username.ilike.%${search}%,email.ilike.%${search}%`,
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        users: (data ?? []) as EndUserProfile[],
        totalCount: count ?? 0,
      };
    },
  });
}

async function callManageUser(action: string, userId: string, extra?: Record<string, unknown>) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch('/api/manage-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ action, userId, ...extra }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to ${action} user`);
  }
  return res.json();
}

export function useBanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => callManageUser('ban', userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'end-users'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to ban user');
    },
  });
}

export function useUnbanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => callManageUser('unban', userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'end-users'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to unban user');
    },
  });
}

export function useUpdateEndUserProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      fields,
    }: {
      userId: string;
      fields: { display_name?: string; bio?: string; location?: string };
    }) => callManageUser('update-profile', userId, { fields }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'end-users'] });
    },
    onError: (error: Error) => {
      window.alert(error.message || 'Failed to update profile');
    },
  });
}
