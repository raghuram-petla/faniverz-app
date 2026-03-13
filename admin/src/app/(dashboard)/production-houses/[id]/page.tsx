'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useAdminProductionHouse,
  useUpdateProductionHouse,
  useDeleteProductionHouse,
} from '@/hooks/useAdminProductionHouses';
import { useImageUpload } from '@/hooks/useImageUpload';
import { ArrowLeft, Loader2, Trash2, Upload, X } from 'lucide-react';
import { ImageVariantsPanel } from '@/components/common/ImageVariantsPanel';
import Link from 'next/link';

export default function EditProductionHousePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: house, isLoading } = useAdminProductionHouse(id);
  const updateHouse = useUpdateProductionHouse();
  const deleteHouse = useDeleteProductionHouse();
  // @boundary: uploads go through /api/upload/production-house-logo which stores to Supabase Storage + generates image variants
  const { upload, uploading } = useImageUpload('/api/upload/production-house-logo');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '',
    logo_url: '',
    description: '',
  });

  useEffect(() => {
    if (house) {
      setForm({
        name: house.name,
        logo_url: house.logo_url ?? '',
        description: house.description ?? '',
      });
    }
  }, [house]);

  async function handleLogoUpload(file: File) {
    try {
      const url = await upload(file);
      setForm((prev) => ({ ...prev, logo_url: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  // @sideeffect: updates production_houses row in Supabase, navigates to /production-houses on success
  // @edge: empty logo_url/description coerced to null — avoids blank strings in DB
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateHouse.mutateAsync({
        id,
        name: form.name,
        logo_url: form.logo_url || null,
        description: form.description || null,
      });
      router.push('/production-houses');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      alert(`Save failed: ${msg}`);
    }
  }

  // @sideeffect: hard-deletes production_houses row — cascades to movie_production_houses join records
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
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
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
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 text-sm"
        >
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 px-3 py-1.5 bg-surface-elevated rounded-lg"
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
          {/* @coupling: ImageVariantsPanel shows sm/md/lg variants generated by the upload API route */}
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

        <button
          type="submit"
          disabled={updateHouse.isPending}
          className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50"
        >
          {updateHouse.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
