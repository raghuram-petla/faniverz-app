import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import i18n from '@/i18n';

interface UpdateProfileInput {
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  location?: string;
  is_profile_public?: boolean;
  is_watchlist_public?: boolean;
}

// @invariant: updated_at is set manually here AND by the moddatetime trigger on profiles (migration 20240101000014).
// The trigger overwrites the client-supplied value with now(), so the explicit updated_at in the spread is effectively dead code.
// Removing it wouldn't change behavior, but if the moddatetime extension is ever disabled, this becomes the only source of truth.
async function updateProfile(userId: string, updates: UpdateProfileInput) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: UpdateProfileInput) => {
      if (!user) throw new Error('Not authenticated');
      return updateProfile(user.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
    onError: (error: Error) => {
      Alert.alert(i18n.t('common.error'), error.message || i18n.t('common.failedToUpdateProfile'));
    },
  });
}
