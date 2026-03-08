'use client';
import { useState, useRef } from 'react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Loader2, Upload, X } from 'lucide-react';

export interface AddActorFormProps {
  onSubmit: (data: {
    name: string;
    photo_url: string | null;
    birth_date: string | null;
    person_type: 'actor' | 'technician';
    height_cm: number | null;
  }) => Promise<void>;
  isPending: boolean;
  onCancel: () => void;
}

const EMPTY_FORM = {
  name: '',
  photo_url: '',
  birth_date: '',
  person_type: 'actor' as 'actor' | 'technician',
  height_cm: '',
};

export function AddActorForm({ onSubmit, isPending, onCancel }: AddActorFormProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const { upload, uploading } = useImageUpload('/api/upload/actor-photo');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoUpload(file: File) {
    try {
      const url = await upload(file);
      setForm((p) => ({ ...p, photo_url: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  async function handleAdd() {
    if (!form.name.trim()) return;
    await onSubmit({
      name: form.name,
      photo_url: form.photo_url || null,
      birth_date: form.birth_date || null,
      person_type: form.person_type,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
    });
    setForm(EMPTY_FORM);
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
              if (file) handlePhotoUpload(file);
              e.target.value = '';
            }}
          />
          {form.photo_url ? (
            <div className="flex items-center gap-2 flex-1">
              <img
                src={form.photo_url}
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-outline shrink-0"
              />
              <span className="text-xs text-on-surface-subtle truncate flex-1">Photo uploaded</span>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, photo_url: '' }))}
                className="p-1 text-red-400 hover:text-red-300"
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
              {uploading ? 'Uploading...' : 'Photo (optional)'}
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-on-surface-subtle mb-1">Person Type</label>
          <select
            value={form.person_type}
            onChange={(e) =>
              setForm((p) => ({ ...p, person_type: e.target.value as 'actor' | 'technician' }))
            }
            className="w-full bg-input rounded-lg px-3 py-2 text-on-surface text-sm outline-none focus:ring-2 focus:ring-red-600"
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
            onChange={(e) => setForm((p) => ({ ...p, birth_date: e.target.value }))}
            className="w-full bg-input rounded-lg px-3 py-2 text-on-surface text-sm outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-on-surface-subtle mb-1">Height (cm)</label>
          <input
            type="number"
            placeholder="e.g. 178"
            value={form.height_cm}
            onChange={(e) => setForm((p) => ({ ...p, height_cm: e.target.value }))}
            className="w-full bg-input rounded-lg px-3 py-2 text-on-surface text-sm outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={isPending}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {isPending ? 'Adding...' : 'Add'}
        </button>
        <button
          onClick={onCancel}
          className="text-on-surface-muted px-4 py-2 rounded-lg text-sm hover:bg-input"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
