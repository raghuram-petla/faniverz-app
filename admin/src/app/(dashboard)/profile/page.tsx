'use client';
import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { ImageUploadField } from '@/components/movie-edit/ImageUploadField';
import { ADMIN_ROLE_LABELS } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '');
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5 MB.');
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/upload/profile-avatar', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');

      setAvatarUrl(data.url);
      await updateProfile.mutateAsync({ avatar_url: data.url });
      await refreshUser();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

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

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-on-surface-muted hover:text-on-surface mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-on-surface mb-8">Profile</h1>

      <div className="bg-surface-card border border-outline rounded-xl p-6 space-y-6">
        <ImageUploadField
          label="Avatar"
          url={avatarUrl}
          uploading={uploading}
          uploadEndpoint="/api/upload/profile-avatar"
          previewAlt="Profile avatar"
          previewClassName="w-24 h-24 rounded-full"
          showUrlCaption={false}
          onUpload={handleUpload}
          onRemove={handleRemove}
        />

        <div>
          <label className="block text-sm text-on-surface-muted mb-1">Email</label>
          <p className="text-sm text-on-surface">{user?.email ?? '—'}</p>
        </div>

        {user?.role && (
          <div>
            <label className="block text-sm text-on-surface-muted mb-1">Role</label>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-600/10 text-red-500 font-medium">
              {ADMIN_ROLE_LABELS[user.role]}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
