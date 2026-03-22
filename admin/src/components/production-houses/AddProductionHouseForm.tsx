'use client';
import { useState, useRef } from 'react';
import { useCreateProductionHouse } from '@/hooks/useAdminProductionHouses';
import { useCountries } from '@/hooks/useAdminMovieAvailability';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Loader2, Upload, X } from 'lucide-react';
import { CountryDropdown } from '@/components/common/CountryDropdown';
import { getImageUrl } from '@shared/imageUrl';

export interface AddProductionHouseFormProps {
  onClose: () => void;
}

const EMPTY_FORM = { name: '', logo_url: '', description: '', origin_country: '' };

// @contract: inline form for creating a new production house with optional logo upload and country
export function AddProductionHouseForm({ onClose }: AddProductionHouseFormProps) {
  const createHouse = useCreateProductionHouse();
  const { data: countries = [] } = useCountries();
  const [form, setForm] = useState(EMPTY_FORM);
  const { upload, uploading } = useImageUpload('/api/upload/production-house-logo');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // @sideeffect: uploads to Supabase Storage via /api/upload/production-house-logo, returns public URL
  async function handleLogoUpload(file: File) {
    try {
      const url = await upload(file);
      setForm((p) => ({ ...p, logo_url: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  // @sideeffect: inserts into production_houses table, resets inline form on success
  // @edge: empty logo_url/description coerced to null
  async function handleAdd() {
    if (!form.name.trim()) return;
    try {
      await createHouse.mutateAsync({
        name: form.name,
        logo_url: form.logo_url || null,
        description: form.description || null,
        origin_country: form.origin_country || null,
      });
      setForm(EMPTY_FORM);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      alert(`Failed to add production house: ${msg}`);
    }
  }

  return (
    <div className="bg-surface-card border border-outline rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Name *"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="w-full bg-input rounded-lg px-4 py-2 text-on-surface outline-none focus:ring-2 focus:ring-red-600 text-sm"
        />
        <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2 flex-1">
              <img
                src={getImageUrl(form.logo_url, 'sm', 'PRODUCTION_HOUSES') ?? form.logo_url}
                alt=""
                className="w-9 h-9 rounded object-cover border border-outline shrink-0"
              />
              <span className="text-xs text-on-surface-subtle truncate flex-1">Logo uploaded</span>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, logo_url: '' }))}
                className="p-1 text-status-red hover:text-status-red-hover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 bg-input rounded-lg px-4 py-2 text-sm text-on-surface-muted hover:bg-input-hover disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? 'Uploading...' : 'Logo (optional)'}
            </button>
          )}
        </div>
      </div>
      <div>
        <textarea
          placeholder="Description (optional)"
          rows={2}
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          className="w-full bg-input rounded-lg px-4 py-2 text-on-surface outline-none focus:ring-2 focus:ring-red-600 text-sm resize-none"
        />
      </div>
      {/* @contract: optional country selection for manually created production houses */}
      <div>
        <label className="block text-xs text-on-surface-muted mb-1">Country (optional)</label>
        <CountryDropdown
          countries={countries}
          value={form.origin_country}
          onChange={(code) => setForm((p) => ({ ...p, origin_country: code }))}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={createHouse.isPending}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {createHouse.isPending ? 'Adding...' : 'Add'}
        </button>
        <button
          onClick={onClose}
          className="text-on-surface-muted px-4 py-2 rounded-lg text-sm hover:bg-input"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
