'use client';
import { useRef } from 'react';
import { Loader2, Upload, X } from 'lucide-react';

export interface ActorFormState {
  name: string;
  photo_url: string;
  person_type: 'actor' | 'technician';
  birth_date: string;
  gender: string;
  biography: string;
  place_of_birth: string;
  height_cm: string;
}

interface ActorFormFieldsProps {
  form: ActorFormState;
  uploading: boolean;
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
    <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 space-y-4">
      {/* Name */}
      <div>
        <label className="block text-xs text-white/40 mb-1">Name *</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => onFieldChange('name', e.target.value)}
          className="w-full bg-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-red-600 text-sm"
        />
      </div>

      {/* Photo */}
      <div>
        <label className="block text-xs text-white/40 mb-1">Photo</label>
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
              src={form.photo_url}
              alt="Photo preview"
              className="w-20 h-20 rounded-full object-cover border border-white/10"
            />
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-sm text-white/60 hover:text-white px-3 py-1.5 bg-white/10 rounded-lg disabled:opacity-50"
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
                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 px-3 py-1.5 bg-white/5 rounded-lg"
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
            className="w-full flex items-center justify-center gap-2 bg-white/10 rounded-lg px-4 py-3 text-sm text-white/60 hover:bg-white/15 hover:text-white transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </button>
        )}
        {form.photo_url && <p className="mt-2 text-xs text-white/20 truncate">{form.photo_url}</p>}
      </div>

      {/* Person Type + DOB */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-white/40 mb-1">Person Type</label>
          <select
            value={form.person_type}
            onChange={(e) => onFieldChange('person_type', e.target.value)}
            className="w-full bg-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-red-600 text-sm"
          >
            <option value="actor">Actor</option>
            <option value="technician">Technician</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1">Date of Birth</label>
          <input
            type="date"
            value={form.birth_date}
            onChange={(e) => onFieldChange('birth_date', e.target.value)}
            className="w-full bg-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-red-600 text-sm"
          />
        </div>
      </div>

      {/* Gender + Height */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-white/40 mb-1">Gender</label>
          <select
            value={form.gender}
            onChange={(e) => onFieldChange('gender', e.target.value)}
            className="w-full bg-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-red-600 text-sm"
          >
            <option value="0">Not set</option>
            <option value="1">Female</option>
            <option value="2">Male</option>
            <option value="3">Non-binary</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1">Height (cm)</label>
          <input
            type="number"
            value={form.height_cm}
            onChange={(e) => onFieldChange('height_cm', e.target.value)}
            className="w-full bg-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-red-600 text-sm"
          />
        </div>
      </div>

      {/* Place of Birth */}
      <div>
        <label className="block text-xs text-white/40 mb-1">Place of Birth</label>
        <input
          type="text"
          value={form.place_of_birth}
          onChange={(e) => onFieldChange('place_of_birth', e.target.value)}
          className="w-full bg-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-red-600 text-sm"
        />
      </div>

      {/* Biography */}
      <div>
        <label className="block text-xs text-white/40 mb-1">Biography</label>
        <textarea
          rows={4}
          value={form.biography}
          onChange={(e) => onFieldChange('biography', e.target.value)}
          className="w-full bg-white/10 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-red-600 text-sm resize-none"
        />
      </div>
    </div>
  );
}
