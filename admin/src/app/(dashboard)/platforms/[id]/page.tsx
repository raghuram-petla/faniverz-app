'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminPlatform, useUpdatePlatform, useDeletePlatform } from '@/hooks/useAdminPlatforms';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { useFormChanges } from '@/hooks/useFormChanges';
import { FormChangesDock } from '@/components/common/FormChangesDock';
import { ImageUploadField } from '@/components/movie-edit/ImageUploadField';
import { PosterVariantStatus } from '@/components/movie-edit/PosterGalleryCard';
import { ArrowLeft, Loader2, Trash2, Link2, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { usePermissions } from '@/hooks/usePermissions';
import { useCountries } from '@/hooks/useAdminMovieAvailability';
import { SearchableCountryPicker } from '@/components/common/SearchableCountryPicker';

function countryFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}
import type { FieldConfig } from '@/hooks/useFormChanges';

const FIELD_CONFIG: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'logo_url', label: 'Logo', type: 'image' },
  { key: 'tmdb_provider_id', label: 'TMDB Provider ID', type: 'number' },
  { key: 'regions', label: 'Countries', type: 'text' },
];

export default function EditPlatformPage() {
  const { isReadOnly } = usePermissions();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: platform, isLoading } = useAdminPlatform(id);
  const updatePlatform = useUpdatePlatform();
  const deletePlatform = useDeletePlatform();
  const { upload, uploading } = useImageUpload('/api/upload/platform-logo');
  const { data: countries = [] } = useCountries();
  const [form, setForm] = useState({ name: '', logo_url: '', tmdb_provider_id: '', regions: '' });
  const initialFormRef = useRef<typeof form | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [addingCountry, setAddingCountry] = useState(false);

  useEffect(() => {
    if (platform) {
      const loaded = {
        name: platform.name,
        logo_url: platform.logo_url ?? '',
        tmdb_provider_id:
          platform.tmdb_provider_id != null ? String(platform.tmdb_provider_id) : '',
        regions: (platform.regions ?? []).join(','),
      };
      setForm(loaded);
      initialFormRef.current = loaded;
    }
  }, [platform]);

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
      await updatePlatform.mutateAsync({
        id,
        name: form.name,
        logo_url: form.logo_url || null,
        tmdb_provider_id: form.tmdb_provider_id.trim() ? Number(form.tmdb_provider_id) : null,
        regions: form.regions ? form.regions.split(',').filter(Boolean) : [],
      });
      initialFormRef.current = { ...form };
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: unknown) {
      setSaveStatus('idle');
      alert(`Save failed: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
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
    if (confirm('Delete this platform? All related OTT releases will also be removed.')) {
      try {
        await deletePlatform.mutateAsync(id);
        router.push('/platforms');
      } catch (err: unknown) {
        alert(`Delete failed: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
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
          <Link href="/platforms" className="p-2 rounded-lg bg-input hover:bg-input-active">
            <ArrowLeft className="w-4 h-4 text-on-surface" />
          </Link>
          <h1 className="text-2xl font-bold text-on-surface">Edit Platform</h1>
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
        {form.logo_url && (
          <PosterVariantStatus imageUrl={form.logo_url} bucket="PLATFORMS" variantType="photo" />
        )}

        <div>
          <label className="block text-sm text-on-surface-muted mb-1">TMDB Provider ID</label>
          <input
            type="text"
            inputMode="numeric"
            value={form.tmdb_provider_id}
            onChange={(e) => setForm((p) => ({ ...p, tmdb_provider_id: e.target.value }))}
            placeholder="e.g. 119"
            className="w-full bg-input rounded-xl px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          />
          {!form.tmdb_provider_id && (
            <p className="text-xs text-on-surface-disabled mt-1">
              Not set — links this platform to TMDB for automatic sync.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm text-on-surface-muted mb-1">Countries</label>
          {(() => {
            const regionsList = form.regions ? form.regions.split(',').filter(Boolean) : [];
            return (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  {regionsList.length === 0 && (
                    <span className="text-sm text-on-surface-disabled">No countries set</span>
                  )}
                  {regionsList.map((code) => {
                    const cName = countries.find((c) => c.code === code)?.name ?? code;
                    return (
                      <span
                        key={code}
                        className="flex items-center gap-1.5 bg-input border border-outline px-2.5 py-1 rounded-lg text-sm text-on-surface"
                      >
                        {countryFlag(code)} {cName}
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = regionsList.filter((r) => r !== code);
                              setForm((p) => ({ ...p, regions: updated.join(',') }));
                            }}
                            className="text-on-surface-subtle hover:text-status-red"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                  {!isReadOnly && !addingCountry && (
                    <button
                      type="button"
                      onClick={() => setAddingCountry(true)}
                      className="flex items-center gap-1 text-sm text-on-surface-muted hover:text-on-surface"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  )}
                </div>
                {addingCountry && (
                  <div className="mt-2">
                    <SearchableCountryPicker
                      countries={countries.filter((c) => !regionsList.includes(c.code))}
                      onSelect={(code) => {
                        const updated = [...regionsList, code].sort().join(',');
                        setForm((p) => ({ ...p, regions: updated }));
                        setAddingCountry(false);
                      }}
                      onCancel={() => setAddingCountry(false)}
                    />
                  </div>
                )}
              </>
            );
          })()}
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
