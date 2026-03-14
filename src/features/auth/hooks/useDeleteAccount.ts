import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../providers/AuthProvider';

// @sideeffect: delete_user_account RPC cascades through ALL user data. Non-reversible — no soft-delete.
export function useDeleteAccount() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.rpc('delete_user_account', {
        target_user_id: user.id,
      });
      if (error) throw error;
      // @contract: signOut failure after successful deletion is caught and ignored —
      // the account is already gone, so a stale session will fail on next API call anyway.
      try {
        await supabase.auth.signOut();
      } catch {
        // Account deleted successfully; signOut failure is non-critical
      }
    },
  });
}
