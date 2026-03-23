'use client';
import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { useImageUpload } from '@/hooks/useImageUpload';
import { ImageUploadField } from '@/components/movie-edit/ImageUploadField';
import { ADMIN_ROLE_LABELS } from '@/lib/types';
import { supabase } from '@/lib/supabase-browser';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// @contract This page has NO useUnsavedChangesWarning because avatar changes are saved
// immediately on upload/remove — there's no "dirty" form state to protect.
// @coupling refreshUser() must be called after every profile mutation to update the
// AuthProvider context (which feeds the Header avatar display).
export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '');
  const { upload, uploading } = useImageUpload('/api/upload/profile-avatar');

  // @sideeffect Uploads file, persists URL to profile, and refreshes auth context
  // @sync Three sequential async steps — upload, DB update, context refresh
  async function handleUpload(file: File) {
    try {
      const url = await upload(file);
      setAvatarUrl(url);
      await updateProfile.mutateAsync({ avatar_url: url });
      await refreshUser();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  // @edge Rolls back local avatarUrl on failure to keep UI consistent with DB
  async function handleRemove() {
    try {
      setAvatarUrl('');
      await updateProfile.mutateAsync({ avatar_url: null });
      await refreshUser();
    } catch (err) {
      setAvatarUrl(user?.avatar_url ?? '');
      alert(err instanceof Error ? err.message : 'Failed to remove avatar');
    }
  }

  // @boundary Fetches Google avatar from /api/profile, which reads from Supabase auth metadata
  // @assumes Session is valid when this function is called (user is on authenticated page)
  async function handleResetToGoogle() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch('/api/profile', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch Google avatar');

      const { google_avatar_url } = await res.json();
      if (!google_avatar_url) {
        alert('No Google avatar found');
        return;
      }

      setAvatarUrl(google_avatar_url);
      await updateProfile.mutateAsync({ avatar_url: google_avatar_url });
      await refreshUser();
    } catch (err) {
      setAvatarUrl(user?.avatar_url ?? '');
      alert(err instanceof Error ? err.message : 'Failed to reset avatar');
    }
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-on-surface-muted hover:text-on-surface mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="bg-surface-card border border-outline rounded-xl p-6 space-y-6">
        <ImageUploadField
          label="Avatar"
          url={avatarUrl}
          bucket="AVATARS"
          uploading={uploading}
          uploadEndpoint="/api/upload/profile-avatar"
          previewAlt="Profile avatar"
          previewClassName="w-24 h-24 rounded-full"
          showUrlCaption={false}
          onUpload={handleUpload}
          onRemove={handleRemove}
          onReset={handleResetToGoogle}
          resetLabel="Reset to Google avatar"
        />

        <div>
          <label className="block text-sm text-on-surface-muted mb-1">Email</label>
          <p className="text-sm text-on-surface">{user?.email ?? '—'}</p>
        </div>

        {user?.role && (
          <div>
            <label className="block text-sm text-on-surface-muted mb-1">Role</label>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-600/10 text-status-red font-medium">
              {ADMIN_ROLE_LABELS[user.role]}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
