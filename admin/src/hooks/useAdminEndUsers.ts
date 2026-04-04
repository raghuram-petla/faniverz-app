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
// @contract When search is provided, uses two-phase lookup:
//   1. search_profiles RPC for fuzzy display_name/username matching (tsvector + pg_trgm)
//   2. email ILIKE for exact-identifier email search (email is not prose, not in tsvector)
//   Both sets of IDs are unioned; final query filters by .in('id', ids).
//   When not searching, returns paginated results with totalCount.
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

      if (search) {
        // Phase 1: resolve matching IDs from hybrid search + email ILIKE in parallel
        const escaped = search.replace(/[\\%_]/g, (ch) => `\\${ch}`);
        const [rpcRes, emailRes] = await Promise.allSettled([
          supabase.rpc('search_profiles', {
            search_term: search,
            result_limit: 1000,
            result_offset: 0,
          }),
          supabase.from('profiles').select('id').ilike('email', `%${escaped}%`).limit(1000),
        ]);

        const rpcIds: string[] =
          rpcRes.status === 'fulfilled' && !rpcRes.value.error
            ? (rpcRes.value.data ?? []).map((r: { id: string }) => r.id)
            : [];
        const emailIds: string[] =
          emailRes.status === 'fulfilled' && !emailRes.value.error
            ? (emailRes.value.data ?? []).map((r: { id: string }) => r.id)
            : [];

        const allIds = [...new Set([...rpcIds, ...emailIds])];
        if (allIds.length === 0) return { users: [] as EndUserProfile[], totalCount: 0 };

        // Phase 2: fetch full profile rows for matching IDs with pagination
        const { data, error, count } = await supabase
          .from('profiles')
          .select(
            'id, display_name, username, email, avatar_url, bio, location, preferred_lang, created_at',
            { count: 'exact' },
          )
          .in('id', allIds)
          .order('created_at', { ascending: false })
          .range(from, to);
        if (error) throw error;

        return {
          users: (data ?? []) as EndUserProfile[],
          totalCount: count ?? 0,
        };
      }

      // No search — regular paginated query with count
      const { data, error, count } = await supabase
        .from('profiles')
        .select(
          'id, display_name, username, email, avatar_url, bio, location, preferred_lang, created_at',
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;

      return {
        users: (data ?? []) as EndUserProfile[],
        totalCount: count ?? 0,
      };
    },
  });
}

// @boundary Calls Next.js /api/manage-user route instead of Supabase directly — needs auth token.
// @coupling: /api/manage-user uses service role to modify auth.users (ban/unban) which is
// NOT accessible via the browser Supabase client (anon key). This indirection is required.
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
