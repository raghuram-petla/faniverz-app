import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';

interface ProfileUpdate {
  avatar_url?: string | null;
  display_name?: string | null;
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Update failed');
      }

      return res.json();
    },
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : 'Profile update failed');
    },
  });
}
