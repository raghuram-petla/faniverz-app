import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../providers/AuthProvider';

interface UpdateProfileInput {
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  location?: string;
  is_profile_public?: boolean;
  is_watchlist_public?: boolean;
}

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
      Alert.alert('Error', error.message || 'Failed to update profile');
    },
  });
}
