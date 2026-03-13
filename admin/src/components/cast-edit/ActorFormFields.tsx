'use client';
import { useRef } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import { ImageVariantsPanel } from '@/components/common/ImageVariantsPanel';
import { getImageUrl } from '@shared/imageUrl';

/** @contract all fields are strings for controlled inputs; parent converts on save */
export interface ActorFormState {
  name: string;
  /** @edge empty string means no photo; parent coerces to null for DB */
  photo_url: string;
  person_type: 'actor' | 'technician';
  birth_date: string;
  /** @boundary gender stored as string enum ("0"|"1"|"2"|"3") matching TMDB convention */
  gender: string;
  biography: string;
  place_of_birth: string;
  /** @boundary stored as string for input; parent converts to number | null */
  height_cm: string;
}

/** @coupling parent (ActorEditPage) owns form state; this component is purely presentational */
interface ActorFormFieldsProps {
  form: ActorFormState;
  uploading: boolean;
  /** @assumes field name matches a key in ActorFormState — not type-checked at call site */
  onFieldChange: (field: string, value: string) => void;
  onPhotoUpload: (file: File) => void;
}

export function ActorFormFields({
  form,
  uploading,
  onFieldChange,
  onPhotoUpload,
}: ActorFormFieldsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-surface-card border border-outline rounded-xl p-6 space-y-4">
      {/* Name */}
      <div>
        <label className="block text-xs text-on-surface-subtle mb-1">Name *</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => onFieldChange('name', e.target.value)}
          className="w-full bg-input rounded-lg px-4 py-2 text-on-surface outline-none focus:ring-2 focus:ring-red-600 text-sm"
        />
      </div>

      {/* Photo */}
      <div>
        <label className="block text-xs text-on-surface-subtle mb-1">Photo</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPhotoUpload(file);
            e.target.value = '';
          }}
        />
        {form.photo_url ? (
          <div className="flex items-center gap-4">
            <img
              /** @edge getImageUrl returns null if no variant exists; falls back to raw URL */
              src={getImageUrl(form.photo_url, 'sm') ?? form.photo_url}
              alt="Photo preview"
              className="w-20 h-20 rounded-full object-cover border border-outline"
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
                onClick={() => onFieldChange('photo_url', '')}
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
            className="w-full flex items-center justify-center gap-2 bg-input rounded-lg px-4 py-3 text-sm text-on-surface-muted hover:bg-input-hover hover:text-on-surface transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </button>
        )}
        {form.photo_url && (
          <p className="mt-2 text-xs text-on-surface-disabled truncate">{form.photo_url}</p>
        )}
        {/** @coupling ImageVariantsPanel shows generated size variants (sm/md/lg) for the photo */}
        <ImageVariantsPanel originalUrl={form.photo_url} variantType="photo" />
      </div>

      {/* Person Type + DOB */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-on-surface-subtle mb-1">Person Type</label>
          <select
            value={form.person_type}
            onChange={(e) => onFieldChange('person_type', e.target.value)}
            className="w-full bg-input rounded-lg px-4 py-2 text-on-surface outline-none focus:ring-2 focus:ring-red-600 text-sm"
          >
            <option value="actor">Actor</option>
            <option value="technician">Technician</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-on-surface-subtle mb-1">Date of Birth</label>
          <input
            type="date"
            value={form.birth_date}
            onChange={(e) => onFieldChange('birth_date', e.target.value)}
            className="w-full bg-input rounded-lg px-4 py-2 text-on-surface outline-none focus:ring-2 focus:ring-red-600 text-sm"
          />
        </div>
      </div>

      {/* Gender + Height */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-on-surface-subtle mb-1">Gender</label>
          {/** @sync gender values (0-3) must match TMDB API gender enum and GENDER_LABELS in constants */}
          <select
            value={form.gender}
            onChange={(e) => onFieldChange('gender', e.target.value)}
            className="w-full bg-input rounded-lg px-4 py-2 text-on-surface outline-none focus:ring-2 focus:ring-red-600 text-sm"
          >
            <option value="0">Not set</option>
            <option value="1">Female</option>
            <option value="2">Male</option>
            <option value="3">Non-binary</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-on-surface-subtle mb-1">Height (cm)</label>
          <input
            type="number"
            value={form.height_cm}
            onChange={(e) => onFieldChange('height_cm', e.target.value)}
            className="w-full bg-input rounded-lg px-4 py-2 text-on-surface outline-none focus:ring-2 focus:ring-red-600 text-sm"
          />
        </div>
      </div>

      {/* Place of Birth */}
      <div>
        <label className="block text-xs text-on-surface-subtle mb-1">Place of Birth</label>
        <input
          type="text"
          value={form.place_of_birth}
          onChange={(e) => onFieldChange('place_of_birth', e.target.value)}
          className="w-full bg-input rounded-lg px-4 py-2 text-on-surface outline-none focus:ring-2 focus:ring-red-600 text-sm"
        />
      </div>

      {/* Biography */}
      <div>
        <label className="block text-xs text-on-surface-subtle mb-1">Biography</label>
        <textarea
          rows={4}
          value={form.biography}
          onChange={(e) => onFieldChange('biography', e.target.value)}
          className="w-full bg-input rounded-lg px-4 py-2 text-on-surface outline-none focus:ring-2 focus:ring-red-600 text-sm resize-none"
        />
      </div>
    </div>
  );
}
