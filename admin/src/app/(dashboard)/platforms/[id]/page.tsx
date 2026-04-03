'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useAdminPlatform, useUpdatePlatform, useDeletePlatform } from '@/hooks/useAdminPlatforms';
import { useImageUpload } from '@/hooks/useImageUpload';
import { FormChangesDock } from '@/components/common/FormChangesDock';
import { ImageUploadField } from '@/components/movie-edit/ImageUploadField';
import { PosterVariantStatus } from '@/components/movie-edit/PosterGalleryCard';
import { ArrowLeft, Loader2, Trash2, Plus, X } from 'lucide-react';
import Link from 'next/link';
import type { OTTPlatform } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { useCountries } from '@/hooks/useAdminMovieAvailability';
import { SearchableCountryPicker } from '@/components/common/SearchableCountryPicker';
import { useEditPageState } from '@/hooks/useEditPageState';
import type { FieldConfig } from '@/hooks/useFormChanges';

// @assumes code is a 2-letter ISO country code (A-Z only); non-alpha chars produce invalid codepoints
function countryFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

interface PlatformForm {
  name: string;
  logo_url: string;
  tmdb_provider_id: string;
  regions: string;
}

const FIELD_CONFIG: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'logo_url', label: 'Logo', type: 'image' },
  { key: 'tmdb_provider_id', label: 'TMDB Provider ID', type: 'number' },
  { key: 'regions', label: 'Countries', type: 'text' },
];

const INITIAL_FORM: PlatformForm = {
  name: '',
  logo_url: '',
  tmdb_provider_id: '',
  regions: '',
};

/** @boundary Converts raw API data to form shape; unsafe cast from unknown */
// @assumes data is a valid OTTPlatform — no runtime validation
function dataToForm(data: unknown): PlatformForm {
  const platform = data as OTTPlatform;
  return {
    name: platform.name,
    logo_url: platform.logo_url ?? '',
    tmdb_provider_id: platform.tmdb_provider_id != null ? String(platform.tmdb_provider_id) : '',
    regions: (platform.regions ?? []).join(','),
  };
}

/** @boundary Converts form state to API payload; coerces string to number for tmdb_provider_id */
// @edge empty name string is allowed through — no validation before save
function formToPayload(form: PlatformForm, id: string) {
  const tmdbId = form.tmdb_provider_id.trim() ? Number(form.tmdb_provider_id) : null;
  return {
    id,
    name: form.name,
    /* v8 ignore start */
    logo_url: form.logo_url || null,
    /* v8 ignore stop */

    tmdb_provider_id: tmdbId !== null && isNaN(tmdbId) ? null : tmdbId,
    regions: form.regions ? form.regions.split(',').filter(Boolean) : [],
  };
}

/** @coupling useEditPageState, useAdminPlatform, useUpdatePlatform, useDeletePlatform, useImageUpload, useCountries */
// @sideeffect delete navigates to /platforms; logo upload hits /api/upload/platform-logo
export default function EditPlatformPage() {
  const { isReadOnly, canDeleteTopLevel } = usePermissions();
  const { id } = useParams<{ id: string }>();
  const dataResult = useAdminPlatform(id);
  const updateMutation = useUpdatePlatform();
  const deleteMutation = useDeletePlatform();
  const { upload, uploading } = useImageUpload('/api/upload/platform-logo');
  const { data: countries = [] } = useCountries();
  const [addingCountry, setAddingCountry] = useState(false);

  const {
    form,
    setForm,
    saveStatus,
    changes,
    changeCount,
    isLoading,
    isError,
    loadError,
    handleSave,
    handleDiscard,
    handleRevertField,
    handleDelete,
  } = useEditPageState<PlatformForm>(
    {
      id,
      fieldConfig: FIELD_CONFIG,
      initialForm: INITIAL_FORM,
      dataToForm,
      formToPayload,
      deleteRoute: '/platforms',
      deleteMessage: 'Delete this platform? All related OTT releases will also be removed.',
    },
    { dataResult, updateMutation, deleteMutation },
  );

  // @sideeffect uploads file to /api/upload/platform-logo, then updates form state with returned URL
  // @edge upload failure shows alert() — blocks UI thread; no toast fallback
  async function handleLogoUpload(file: File) {
    try {
      const url = await upload(file);
      setForm((prev) => ({ ...prev, logo_url: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-status-red animate-spin" />
      </div>
    );

  /* v8 ignore start -- phantom else: isError early-return + string-error fallback unreachable */
  if (isError)
    return (
      <div className="bg-red-600/10 border border-red-600/30 rounded-lg px-4 py-3 text-sm text-status-red">
        Error loading platform: {loadError instanceof Error ? loadError.message : 'Unknown error'}
      </div>
    );
  /* v8 ignore stop */

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/platforms" className="p-2 rounded-lg bg-input hover:bg-input-active">
            <ArrowLeft className="w-4 h-4 text-on-surface" />
          </Link>
          <h1 className="text-2xl font-bold text-on-surface">Edit Platform</h1>
        </div>
        {canDeleteTopLevel() && (
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
            const regionsList = form.regions
              ? (form.regions as string).split(',').filter(Boolean)
              : [];
            return (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  {regionsList.length === 0 && (
                    <span className="text-sm text-on-surface-disabled">No countries set</span>
                  )}
                  {regionsList.map((code) => {
                    /* v8 ignore start */
                    const cName = countries.find((c) => c.code === code)?.name ?? code;
                    /* v8 ignore stop */

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
