'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useAdminProductionHouse,
  useUpdateProductionHouse,
  useDeleteProductionHouse,
} from '@/hooks/useAdminProductionHouses';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { useFormChanges } from '@/hooks/useFormChanges';
import { FormChangesDock } from '@/components/common/FormChangesDock';
import { ImageUploadField } from '@/components/movie-edit/ImageUploadField';
import { ArrowLeft, Loader2, Trash2, Link2, Globe } from 'lucide-react';
import { PosterVariantStatus } from '@/components/movie-edit/PosterGalleryCard';
import Link from 'next/link';
import { usePermissions } from '@/hooks/usePermissions';
import type { FieldConfig } from '@/hooks/useFormChanges';

const FIELD_CONFIG: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'logo_url', label: 'Logo', type: 'image' },
  { key: 'description', label: 'Description', type: 'text' },
];

export default function EditProductionHousePage() {
  const { isReadOnly } = usePermissions();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: house, isLoading } = useAdminProductionHouse(id);
  const updateHouse = useUpdateProductionHouse();
  const deleteHouse = useDeleteProductionHouse();
  const { upload, uploading } = useImageUpload('/api/upload/production-house-logo');
  const [form, setForm] = useState({ name: '', logo_url: '', description: '' });
  const initialFormRef = useRef<typeof form | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  useEffect(() => {
    if (house) {
      const loaded = {
        name: house.name,
        logo_url: house.logo_url ?? '',
        description: house.description ?? '',
      };
      setForm(loaded);
      initialFormRef.current = loaded;
    }
  }, [house]);

  const { changes, isDirty, changeCount } = useFormChanges(
    FIELD_CONFIG,
    initialFormRef.current,
    form,
  );

  useUnsavedChangesWarning(isDirty);

  async function handleLogoUpload(file: File) {
    try {
      const url = await upload(file);
      setForm((prev) => ({ ...prev, logo_url: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  async function handleSave() {
    setSaveStatus('saving');
    try {
      await updateHouse.mutateAsync({
        id,
        name: form.name,
        logo_url: form.logo_url || null,
        description: form.description || null,
      });
      initialFormRef.current = { ...form };
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: unknown) {
      setSaveStatus('idle');
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      alert(`Save failed: ${msg}`);
    }
  }

  const handleDiscard = useCallback(() => {
    if (initialFormRef.current) setForm(initialFormRef.current);
  }, []);

  const handleRevertField = useCallback((key: string) => {
    const initial = initialFormRef.current;
    if (!initial) return;
    setForm((prev) => ({ ...prev, [key]: initial[key as keyof typeof prev] }));
  }, []);

  async function handleDelete() {
    if (confirm('Are you sure? This cannot be undone.')) {
      try {
        await deleteHouse.mutateAsync(id);
        router.push('/production-houses');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : JSON.stringify(err);
        alert(`Delete failed: ${msg}`);
      }
    }
  }

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-status-red animate-spin" />
      </div>
    );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/production-houses" className="p-2 rounded-lg bg-input hover:bg-input-active">
            <ArrowLeft className="w-4 h-4 text-on-surface" />
          </Link>
          <h1 className="text-2xl font-bold text-on-surface">Edit Production House</h1>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 text-status-red hover:bg-red-600/30 text-sm"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        )}
      </div>

      <div className={`space-y-4${isReadOnly ? ' pointer-events-none opacity-70' : ''}`}>
        <div>
          <label className="block text-sm text-on-surface-muted mb-1">Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full bg-input rounded-xl px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          />
          {/* TMDB metadata — inline below name */}
          {(house?.tmdb_company_id || house?.origin_country) && (
            <div className="flex items-center gap-4 text-sm text-on-surface-subtle mt-2">
              {house.tmdb_company_id && (
                <span className="flex items-center gap-1.5 bg-surface-elevated px-2.5 py-1 rounded-lg">
                  <Link2 className="w-3.5 h-3.5" />
                  TMDB #{house.tmdb_company_id}
                </span>
              )}
              {house.origin_country && (
                <span className="flex items-center gap-1.5 bg-surface-elevated px-2.5 py-1 rounded-lg">
                  <Globe className="w-3.5 h-3.5" />
                  {house.origin_country}
                </span>
              )}
            </div>
          )}
        </div>

        <ImageUploadField
          label="Logo"
          url={form.logo_url}
          bucket="PRODUCTION_HOUSES"
          uploading={uploading}
          uploadEndpoint="/api/upload/production-house-logo"
          previewAlt="Production house logo"
          previewClassName="w-20 h-20"
          showUrlCaption={false}
          onUpload={(file) => handleLogoUpload(file)}
          onRemove={() => setForm((prev) => ({ ...prev, logo_url: '' }))}
        />
        {form.logo_url && (
          <PosterVariantStatus
            imageUrl={form.logo_url}
            bucket="PRODUCTION_HOUSES"
            variantType="photo"
          />
        )}

        <div>
          <label className="block text-sm text-on-surface-muted mb-1">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className="w-full bg-input rounded-xl px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600 resize-none"
          />
        </div>
      </div>

      <FormChangesDock
        changes={changes}
        changeCount={changeCount}
        saveStatus={saveStatus}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onRevertField={handleRevertField}
      />
    </div>
  );
}
