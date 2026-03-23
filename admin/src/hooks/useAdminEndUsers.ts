'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { createSimpleMutation } from './createSimpleMutation';

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

// @boundary Queries 'profiles' table directly — separate from admin_user_roles
// @edge Search uses raw ilike — special chars in search string are not escaped
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
        // @boundary: escape LIKE wildcards (%, _, \) to prevent unintended matches
        const escaped = search.replace(/[\\%_]/g, (ch) => `\\${ch}`);
        query = query.or(
          `display_name.ilike.%${escaped}%,username.ilike.%${escaped}%,email.ilike.%${escaped}%`,
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

// @boundary Calls Next.js /api/manage-user route instead of Supabase directly — needs auth token
// @assumes Session exists; will fail silently with undefined token if not authenticated
async function callManageUser(action: string, userId: string, extra?: Record<string, unknown>) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  // @edge: throw immediately if session expired — avoids sending "Bearer undefined"
  if (!session?.access_token) {
    throw new Error('Session expired — please sign in again.');
  }
  const res = await fetch('/api/manage-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, userId, ...extra }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to ${action} user`);
  }
  return res.json();
}

// @sideeffect Bans user via server-side admin API (not direct DB) to enforce auth checks
export const useBanUser = createSimpleMutation<string>({
  mutationFn: (userId) => callManageUser('ban', userId),
  invalidateKeys: [['admin', 'end-users']],
  errorMessage: 'Failed to ban user',
});

export const useUnbanUser = createSimpleMutation<string>({
  mutationFn: (userId) => callManageUser('unban', userId),
  invalidateKeys: [['admin', 'end-users']],
  errorMessage: 'Failed to unban user',
});

// @contract Only display_name, bio, location can be updated — other profile fields are read-only
export const useUpdateEndUserProfile = createSimpleMutation<{
  userId: string;
  fields: { display_name?: string; bio?: string; location?: string };
}>({
  mutationFn: ({ userId, fields }) => callManageUser('update-profile', userId, { fields }),
  invalidateKeys: [['admin', 'end-users']],
  errorMessage: 'Failed to update profile',
});
