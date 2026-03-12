'use client';
import { useQuery } from '@tanstack/react-query';
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
