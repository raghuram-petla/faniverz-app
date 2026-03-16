'use client';

import { useState } from 'react';
import {
  useAdminPlatforms,
  useCreatePlatform,
  useUpdatePlatform,
  useDeletePlatform,
} from '@/hooks/useAdminPlatforms';
import { ImageUploadField } from '@/components/movie-edit/ImageUploadField';
import { usePermissions } from '@/hooks/usePermissions';
import { useImageUpload } from '@/hooks/useImageUpload';
import type { OTTPlatform } from '@/lib/types';
import { Monitor, Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { getImageUrl } from '@shared/imageUrl';
import { colors } from '@shared/colors';

interface PlatformFormData {
  name: string;
  logo_url: string;
}

// @contract emptyForm resets dialog state for both "add" and "cancel" flows
const emptyForm: PlatformFormData = { name: '', logo_url: '' };

export default function PlatformsPage() {
  const { isReadOnly } = usePermissions();
  const { data: platforms, isLoading } = useAdminPlatforms();
  const createPlatform = useCreatePlatform();
  const updatePlatform = useUpdatePlatform();
  const deletePlatform = useDeletePlatform();

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlatformFormData>(emptyForm);
  const { upload, uploading } = useImageUpload('/api/upload/platform-logo');

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (platform: OTTPlatform) => {
    setEditingId(platform.id);
    setForm({
      name: platform.name,
      logo_url: platform.logo_url ?? '',
    });
    setShowDialog(true);
  };

  const handleClose = () => {
    setShowDialog(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  // @contract Dual-purpose handler: creates or updates based on editingId presence
  // @sideeffect Closes dialog on success via onSuccess callback
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // @nullable Empty logo_url string is normalized to null for DB storage
    const payload = { name: form.name, logo_url: form.logo_url || null };
    if (editingId) {
      updatePlatform.mutate({ id: editingId, ...payload }, { onSuccess: handleClose });
    } else {
      // @edge New platforms get auto-generated logo (first char) and default color/order
      createPlatform.mutate(
        {
          ...payload,
          logo: form.name.charAt(0).toUpperCase() || '?',
          color: colors.zinc900,
          display_order: 0,
        },
        { onSuccess: handleClose },
      );
    }
  };

  // @sideeffect Cascade: DB foreign key ON DELETE CASCADE removes all ott_releases rows referencing this platform
  const handleDelete = (id: string) => {
    if (!confirm('Delete this platform? This will also remove all related OTT releases.')) return;
    deletePlatform.mutate(id);
  };

  async function handleLogoUpload(file: File) {
    try {
      const url = await upload(file);
      setForm((prev) => ({ ...prev, logo_url: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  const isSaving = createPlatform.isPending || updatePlatform.isPending;

  return (
    <div className="space-y-6">
      <div className="flex">
        {!isReadOnly && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium ml-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Platform
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-on-surface-subtle animate-spin" />
        </div>
      ) : !platforms?.length ? (
        <div className="text-center py-20 text-on-surface-subtle">
          No platforms found. Add one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((platform) => (
            <div
              key={platform.id}
              className="bg-surface-card border border-outline rounded-xl p-5 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {platform.logo_url ? (
                    <img
                      src={getImageUrl(platform.logo_url, 'sm', 'PLATFORMS') ?? platform.logo_url}
                      alt={platform.name}
                      className="w-12 h-12 rounded-lg object-contain border border-outline"
                    />
                  ) : (
                    <span className="w-12 h-12 rounded-lg flex items-center justify-center bg-zinc-700">
                      <Monitor className="w-5 h-5 text-on-surface-subtle" />
                    </span>
                  )}
                  <h3 className="text-on-surface font-semibold text-lg truncate max-w-[180px]">
                    {platform.name}
                  </h3>
                </div>
                {!isReadOnly && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(platform)}
                      className="p-2 text-on-surface-subtle hover:text-status-blue transition-colors"
                      title="Edit platform"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(platform.id)}
                      disabled={deletePlatform.isPending}
                      className="p-2 text-on-surface-subtle hover:text-status-red transition-colors disabled:opacity-50"
                      title="Delete platform"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog overlay */}
      {/* @assumes Only one dialog instance exists — controlled by showDialog boolean */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border border-outline rounded-xl p-6 w-full max-w-md mx-4 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-on-surface">
                {editingId ? 'Edit Platform' : 'Add Platform'}
              </h2>
              <button
                onClick={handleClose}
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

              {(createPlatform.isError || updatePlatform.isError) && (
                <p className="text-status-red text-sm">
                  Failed to save platform. Please try again.
                </p>
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
                  onClick={handleClose}
                  className="px-6 py-2.5 text-on-surface-muted hover:text-on-surface transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
