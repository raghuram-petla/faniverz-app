import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../providers/AuthProvider';

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
