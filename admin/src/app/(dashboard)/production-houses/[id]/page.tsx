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
import { ArrowLeft, Loader2, Trash2, Upload, X } from 'lucide-react';
import { ImageVariantsPanel } from '@/components/common/ImageVariantsPanel';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if (!initialFormRef.current) return;
    setForm((prev) => ({ ...prev, [key]: initialFormRef.current![key as keyof typeof prev] }));
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
        </div>

        <div>
          <label className="block text-sm text-on-surface-muted mb-1">Logo</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLogoUpload(file);
              e.target.value = '';
            }}
          />
          {form.logo_url ? (
            <div className="flex items-center gap-4">
              <img
                src={form.logo_url}
                alt="Logo preview"
                className="w-20 h-20 rounded-lg object-cover border border-outline"
              />
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-sm text-on-surface-muted hover:text-on-surface px-3 py-1.5 bg-input rounded-lg disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, logo_url: '' }))}
                  className="flex items-center gap-2 text-sm text-status-red hover:text-status-red-hover px-3 py-1.5 bg-surface-elevated rounded-lg"
                >
                  <X className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 bg-input rounded-xl px-4 py-3 text-sm text-on-surface-muted hover:bg-input-hover hover:text-on-surface transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? 'Uploading...' : 'Upload Logo'}
            </button>
          )}
          <ImageVariantsPanel originalUrl={form.logo_url} variantType="photo" />
        </div>

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
