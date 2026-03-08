'use client';
import { useState } from 'react';
import { uploadImage } from '@/hooks/useImageUpload';
import { Loader2 } from 'lucide-react';
import { ImageUploadField } from './ImageUploadField';

const GENRES = [
  'Action',
  'Drama',
  'Comedy',
  'Romance',
  'Thriller',
  'Horror',
  'Sci-Fi',
  'Fantasy',
  'Crime',
  'Family',
  'Adventure',
  'Historical',
];

export interface NewMovieFormState {
  title: string;
  poster_url: string;
  backdrop_url: string;
  release_date: string;
  runtime: string;
  genres: string[];
  certification: string;
  synopsis: string;
  director: string;
  trailer_url: string;
  in_theaters: boolean;
}

interface NewMovieFormProps {
  isPending: boolean;
  onSubmit: (data: NewMovieFormState) => Promise<void>;
}

export function NewMovieForm({ isPending, onSubmit }: NewMovieFormProps) {
  const [form, setForm] = useState<NewMovieFormState>({
    title: '',
    poster_url: '',
    backdrop_url: '',
    release_date: '',
    runtime: '',
    genres: [],
    certification: '',
    synopsis: '',
    director: '',
    trailer_url: '',
    in_theaters: false,
  });

  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);

  function updateField(field: string, value: string | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleGenre(genre: string) {
    setForm((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  }

  async function handleImageUpload(
    file: File,
    endpoint: string,
    field: 'poster_url' | 'backdrop_url',
    setUploading: (v: boolean) => void,
  ) {
    setUploading(true);
    try {
      const url = await uploadImage(file, endpoint);
      setForm((prev) => ({ ...prev, [field]: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm text-on-surface-muted mb-1">Title *</label>
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) => updateField('title', e.target.value)}
          className="w-full bg-input rounded-xl px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600"
        />
      </div>

      {/* Release Date + In Theaters */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-on-surface-muted mb-1">Release Date *</label>
          <input
            type="date"
            required
            value={form.release_date}
            onChange={(e) => updateField('release_date', e.target.value)}
            className="w-full bg-input rounded-xl px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>
        <div>
          <label className="block text-sm text-on-surface-muted mb-1">Currently In Theaters</label>
          <label className="flex items-center gap-3 bg-input rounded-xl px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.in_theaters}
              onChange={(e) => setForm((prev) => ({ ...prev, in_theaters: e.target.checked }))}
              className="w-5 h-5 rounded accent-red-600"
            />
            <span className="text-on-surface text-sm">
              {form.in_theaters ? 'Yes — In Theaters' : 'No'}
            </span>
          </label>
        </div>
      </div>

      {/* Runtime + Certification */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-on-surface-muted mb-1">Runtime (min)</label>
          <input
            type="number"
            value={form.runtime}
            onChange={(e) => updateField('runtime', e.target.value)}
            className="w-full bg-input rounded-xl px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>
        <div>
          <label className="block text-sm text-on-surface-muted mb-1">Certification</label>
          <select
            value={form.certification}
            onChange={(e) => updateField('certification', e.target.value)}
            className="w-full bg-input rounded-xl px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value="">None</option>
            <option value="U">U</option>
            <option value="UA">UA</option>
            <option value="A">A</option>
          </select>
        </div>
      </div>

      {/* Director */}
      <div>
        <label className="block text-sm text-on-surface-muted mb-1">Director</label>
        <input
          type="text"
          value={form.director}
          onChange={(e) => updateField('director', e.target.value)}
          className="w-full bg-input rounded-xl px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600"
        />
      </div>

      {/* Poster */}
      <ImageUploadField
        label="Poster"
        url={form.poster_url}
        uploading={uploadingPoster}
        uploadEndpoint="/api/upload/movie-poster"
        previewAlt="Poster preview"
        previewClassName="w-20 h-28"
        onUpload={(file, endpoint) =>
          handleImageUpload(file, endpoint, 'poster_url', setUploadingPoster)
        }
        onRemove={() => updateField('poster_url', '')}
      />

      {/* Backdrop */}
      <ImageUploadField
        label="Backdrop"
        url={form.backdrop_url}
        uploading={uploadingBackdrop}
        uploadEndpoint="/api/upload/movie-backdrop"
        previewAlt="Backdrop preview"
        previewClassName="w-40 h-[90px]"
        onUpload={(file, endpoint) =>
          handleImageUpload(file, endpoint, 'backdrop_url', setUploadingBackdrop)
        }
        onRemove={() => updateField('backdrop_url', '')}
      />

      {/* Trailer URL */}
      <div>
        <label className="block text-sm text-on-surface-muted mb-1">Trailer URL</label>
        <input
          type="url"
          value={form.trailer_url}
          onChange={(e) => updateField('trailer_url', e.target.value)}
          className="w-full bg-input rounded-xl px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600"
        />
      </div>

      {/* Synopsis */}
      <div>
        <label className="block text-sm text-on-surface-muted mb-1">Synopsis</label>
        <textarea
          rows={4}
          value={form.synopsis}
          onChange={(e) => updateField('synopsis', e.target.value)}
          className="w-full bg-input rounded-xl px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600 resize-none"
        />
      </div>

      {/* Genres */}
      <div>
        <label className="block text-sm text-on-surface-muted mb-2">Genres</label>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => toggleGenre(genre)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${form.genres.includes(genre) ? 'bg-red-600 text-white' : 'bg-input text-on-surface-muted hover:bg-input-active'}`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Movie'}
      </button>
    </form>
  );
}
