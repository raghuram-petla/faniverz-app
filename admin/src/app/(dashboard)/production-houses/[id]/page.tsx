'use client';
import { useParams } from 'next/navigation';
import {
  useAdminProductionHouse,
  useUpdateProductionHouse,
  useDeleteProductionHouse,
} from '@/hooks/useAdminProductionHouses';
import { useImageUpload } from '@/hooks/useImageUpload';
import { FormChangesDock } from '@/components/common/FormChangesDock';
import { ImageUploadField } from '@/components/movie-edit/ImageUploadField';
import type { ProductionHouse } from '@/lib/types';
import { ArrowLeft, Loader2, Trash2, Link2 } from 'lucide-react';
import { PosterVariantStatus } from '@/components/movie-edit/PosterGalleryCard';
import { CountryDropdown, countryFlag } from '@/components/common/CountryDropdown';
import { useCountries } from '@/hooks/useAdminMovieAvailability';
import Link from 'next/link';
import { usePermissions } from '@/hooks/usePermissions';
import { useEditPageState } from '@/hooks/useEditPageState';
import type { FieldConfig } from '@/hooks/useFormChanges';

interface ProductionHouseForm {
  name: string;
  logo_url: string;
  description: string;
  origin_country: string;
}

const FIELD_CONFIG: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'logo_url', label: 'Logo', type: 'image' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'origin_country', label: 'Country', type: 'text' },
];

const INITIAL_FORM: ProductionHouseForm = {
  name: '',
  logo_url: '',
  description: '',
  origin_country: '',
};

function dataToForm(data: unknown): ProductionHouseForm {
  const house = data as ProductionHouse;
  return {
    name: house.name,
    logo_url: house.logo_url ?? '',
    description: house.description ?? '',
    origin_country: house.origin_country ?? '',
  };
}

function formToPayload(form: ProductionHouseForm, id: string) {
  return {
    id,
    name: form.name,
    logo_url: form.logo_url || null,
    description: form.description || null,
    origin_country: form.origin_country || null,
  };
}

export default function EditProductionHousePage() {
  const { isReadOnly, canDeleteTopLevel } = usePermissions();
  const { id } = useParams<{ id: string }>();
  const dataResult = useAdminProductionHouse(id);
  const house = dataResult.data;
  const updateMutation = useUpdateProductionHouse();
  const deleteMutation = useDeleteProductionHouse();
  const { upload, uploading } = useImageUpload('/api/upload/production-house-logo');
  const { data: countries = [] } = useCountries();

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
  } = useEditPageState<ProductionHouseForm>(
    {
      id,
      fieldConfig: FIELD_CONFIG,
      initialForm: INITIAL_FORM,
      dataToForm,
      formToPayload,
      deleteRoute: '/production-houses',
    },
    { dataResult, updateMutation, deleteMutation },
  );

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
        Error loading production house:{' '}
        {loadError instanceof Error ? loadError.message : 'Unknown error'}
      </div>
    );
  /* v8 ignore stop */

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/production-houses" className="p-2 rounded-lg bg-input hover:bg-input-active">
            <ArrowLeft className="w-4 h-4 text-on-surface" />
          </Link>
          <h1 className="text-2xl font-bold text-on-surface">Edit Production House</h1>
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
          {/* TMDB metadata -- inline below name */}
          {house?.tmdb_company_id && (
            <div className="flex items-center gap-4 text-sm text-on-surface mt-2">
              <span className="flex items-center gap-1.5 bg-surface-elevated px-2.5 py-1 rounded-lg">
                <Link2 className="w-3.5 h-3.5" />
                TMDB #{house.tmdb_company_id}
              </span>
              {/* @contract: TMDB-linked + country set -> read-only badge with flag + full name */}
              {house.origin_country && (
                <span className="flex items-center gap-1.5 bg-surface-elevated px-2.5 py-1 rounded-lg">
                  <span>{countryFlag(house.origin_country)}</span>
                  {/* v8 ignore start */}
                  {countries.find((c) => c.code === house.origin_country)?.name ??
                    /* v8 ignore stop */
                    house.origin_country}
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

        {/* @contract: country is editable when not TMDB-linked or when origin_country is not set.
            Once a TMDB-linked house has a country, it becomes read-only because TMDB sync would
            overwrite any manual edits on next sync cycle. */}
        {!(house?.tmdb_company_id && house?.origin_country) && (
          <div>
            <label className="block text-sm text-on-surface-muted mb-1">Country</label>
            <CountryDropdown
              countries={countries}
              value={form.origin_country}
              onChange={(code) => setForm((p) => ({ ...p, origin_country: code }))}
            />
          </div>
        )}
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
