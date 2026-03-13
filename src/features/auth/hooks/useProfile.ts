import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { useAuth } from '../providers/AuthProvider';

// @contract: .single() throws PGRST116 if no row exists. Unlike productionHouses/api.ts which catches PGRST116
// and returns null, this function lets it propagate — so if the handle_new_user trigger fails to create a
// profile row (e.g., constraint violation), useProfile throws and the query enters error state with no recovery path.
// @nullable: return type says UserProfile | null, but .single() never returns null on success — it either
// returns data or throws. The null in the signature is technically unreachable.
async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

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
