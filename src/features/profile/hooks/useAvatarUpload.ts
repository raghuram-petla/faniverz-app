import { useState, useRef, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useUpdateProfile } from '@/features/auth/hooks/useUpdateProfile';

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export function useAvatarUpload() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const [isUploading, setIsUploading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
      // @edge: extension is extracted from the local file URI, which may not match the actual image format
      // (e.g., iOS can return .HEIC images with a .jpg URI after allowsEditing). contentType falls back to
      // 'image/jpeg' for unknown extensions, so HEIC files get uploaded with wrong MIME type — still works
      // because browsers/apps detect format from magic bytes, but Supabase storage metadata will be incorrect.
      const ext = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase();
      // @invariant: filePath uses a fixed name `avatar.{ext}` with upsert:true, so each upload overwrites the previous.
      // If a user uploads a .png then a .jpg, the old .png file remains as orphaned storage (different filePath).
      // Over time this accumulates ~1 orphaned file per format change per user.
      const filePath = `${user.id}/avatar.${ext}`;
      const contentType = MIME_MAP[ext] ?? 'image/jpeg';

      // Read file as blob
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true, contentType });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      // @sideeffect: cache-bust timestamp is persisted in profiles.avatar_url — every avatar upload writes a new
      // unique URL to the DB even though the actual image path hasn't changed. This means avatar_url comparisons
      // (e.g., checking if avatar changed) will always show "changed" even if the same image was re-uploaded.
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await updateProfile.mutateAsync({ avatar_url: publicUrl });
    } finally {
      if (mountedRef.current) {
        setIsUploading(false);
      }
    }
  };

  return { pickAndUpload, isUploading };
}
