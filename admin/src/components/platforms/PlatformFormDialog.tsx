'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { ImageUploadField } from '@/components/movie-edit/ImageUploadField';
import { useImageUpload } from '@/hooks/useImageUpload';

export interface PlatformFormData {
  name: string;
  logo_url: string;
  tmdb_alias_ids: string;
}

export interface PlatformFormDialogProps {
  editingId: string | null;
  initialData: PlatformFormData;
  isSaving: boolean;
  isError: boolean;
  onSubmit: (data: PlatformFormData) => void;
  onClose: () => void;
}

export function PlatformFormDialog({
  editingId,
  initialData,
  isSaving,
  isError,
  onSubmit,
  onClose,
}: PlatformFormDialogProps) {
  const [form, setForm] = useState<PlatformFormData>(initialData);
  const { upload, uploading } = useImageUpload('/api/upload/platform-logo');

  async function handleLogoUpload(file: File) {
    try {
      const url = await upload(file);
      setForm((prev) => ({ ...prev, logo_url: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-card border border-outline rounded-xl p-6 w-full max-w-md mx-4 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-on-surface">
            {editingId ? 'Edit Platform' : 'Add Platform'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-on-surface-subtle hover:text-on-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-on-surface-muted">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g. Netflix"
              className="w-full bg-input border border-outline rounded-lg px-4 py-2.5 text-on-surface placeholder:text-on-surface-disabled focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
            />
          </div>

          <ImageUploadField
            label="Logo"
            url={form.logo_url}
            bucket="PLATFORMS"
            uploading={uploading}
            uploadEndpoint="/api/upload/platform-logo"
            previewAlt="Platform logo"
            previewClassName="w-20 h-20"
            showUrlCaption={false}
            onUpload={(file) => handleLogoUpload(file)}
            onRemove={() => setForm((prev) => ({ ...prev, logo_url: '' }))}
          />

          <div className="space-y-2">
            <label
              htmlFor="tmdb_alias_ids"
              className="block text-sm font-medium text-on-surface-muted"
            >
              TMDB Alias IDs
            </label>
            <input
              id="tmdb_alias_ids"
              type="text"
              value={form.tmdb_alias_ids}
              onChange={(e) => setForm({ ...form, tmdb_alias_ids: e.target.value })}
              placeholder="e.g. 1796, 2100"
              className="w-full bg-input border border-outline rounded-lg px-4 py-2.5 text-on-surface placeholder:text-on-surface-disabled focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
            />
            <p className="text-xs text-on-surface-disabled">
              Comma-separated TMDB provider IDs that should map to this platform (e.g. &quot;with
              Ads&quot; variants).
            </p>
          </div>

          {isError && (
            <p className="text-status-red text-sm">Failed to save platform. Please try again.</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-on-surface-muted hover:text-on-surface transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
