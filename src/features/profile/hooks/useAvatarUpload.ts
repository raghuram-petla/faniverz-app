import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useUpdateProfile } from '@/features/auth/hooks/useUpdateProfile';

export function useAvatarUpload() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const [isUploading, setIsUploading] = useState(false);

  const pickAndUpload = async () => {
    if (!user) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    setIsUploading(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const filePath = `${user.id}/avatar.${ext}`;

      // Read file as blob
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true, contentType: `image/${ext}` });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      // Append cache-bust to force re-render
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await updateProfile.mutateAsync({ avatar_url: publicUrl });
    } finally {
      setIsUploading(false);
    }
  };

  return { pickAndUpload, isUploading };
}
