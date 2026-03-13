import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../providers/AuthProvider';

// @sideeffect: delete_user_account RPC cascades through ALL user data (follows, reviews, watchlist, favorites, feed votes, comments, push_tokens). Non-reversible — no soft-delete.
// @edge: signOut runs after RPC success — if signOut fails (network), user is authenticated with a deleted account. AuthProvider's onAuthStateChange won't fire, leaving stale session in UI until app restart.
export function useDeleteAccount() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.rpc('delete_user_account', {
        target_user_id: user.id,
      });
      if (error) throw error;
      // Sign out after deletion
      await supabase.auth.signOut();
    },
  });
}
