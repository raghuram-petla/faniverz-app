import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { QUERY_KEYS, STALE_TIMES } from '@/lib/constants';
import type { Profile } from '@/types/user';

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PROFILE, userId],
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) throw error;
      return data as Profile;
    },
    staleTime: STALE_TIMES.PROFILE,
    enabled: !!userId,
  });
}
