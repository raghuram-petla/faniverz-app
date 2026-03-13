import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { useAuth } from '../providers/AuthProvider';

// @contract: .maybeSingle() returns null when no row exists instead of throwing PGRST116.
// This handles edge cases where handle_new_user trigger fails to create a profile row.
// @nullable: returns null when profile doesn't exist yet (first login before trigger completes).
async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user?.id ?? ''),
    enabled: !!user?.id,
    // @edge: 30-minute staleTime means profile changes made outside the app (admin panel, another device)
    // won't reflect until staleTime expires or a manual invalidation occurs. useUpdateProfile and useSetUsername
    // both call invalidateQueries to force refresh, but direct DB edits (e.g., admin changing a user's role) are invisible.
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}
