import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';

interface ProfileUpdate {
  avatar_url?: string | null;
  display_name?: string | null;
}

// @boundary: calls /api/profile REST endpoint, not Supabase directly
// @assumes: active Supabase session exists; throws if unauthenticated
// @sideeffect: window.alert on error — blocks UI thread
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
        // @edge: .catch() guards against non-JSON error responses (e.g. HTML 502 from proxy)
        const data = await res.json().catch(() => ({ error: 'Update failed' }));
        throw new Error(data.error ?? 'Update failed');
      }

      return res.json();
    },
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : 'Profile update failed');
    },
  });
}
