'use client';
import type { MovieForm } from '@/hooks/useMovieEditState';
import { ImageUploadField } from './ImageUploadField';
import { ImageVariantsPanel } from '@/components/common/ImageVariantsPanel';

const genres = [
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

interface BasicInfoSectionProps {
  form: MovieForm;
  setForm: React.Dispatch<React.SetStateAction<MovieForm>>;
  updateField: (field: string, value: string | string[] | boolean) => void;
  toggleGenre: (genre: string) => void;
  uploadingPoster: boolean;
  uploadingBackdrop: boolean;
  posterInputRef: React.RefObject<HTMLInputElement | null>;
  backdropInputRef: React.RefObject<HTMLInputElement | null>;
  handleImageUpload: (
    file: File,
    endpoint: string,
    field: 'poster_url' | 'backdrop_url',
    setUploading: (v: boolean) => void,
  ) => Promise<void>;
  handleBackdropClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  setUploadingPoster: (v: boolean) => void;
  setUploadingBackdrop: (v: boolean) => void;
  onSubmit: (e?: React.FormEvent) => Promise<void>;
}

export function BasicInfoSection({
  form,
  setForm,
  updateField,
  toggleGenre,
  uploadingPoster,
  uploadingBackdrop,
  handleImageUpload,
  handleBackdropClick,
  setUploadingPoster,
  setUploadingBackdrop,
  onSubmit,
}: BasicInfoSectionProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
      <ImageVariantsPanel originalUrl={form.poster_url} variantType="poster" />

      {/* Backdrop */}
      <ImageUploadField
        label="Backdrop"
        url={form.backdrop_url}
        uploading={uploadingBackdrop}
        uploadEndpoint="/api/upload/movie-backdrop"
        previewAlt="Backdrop preview"
        previewClassName="w-40 h-[90px]"
        showUrlCaption={false}
        onUpload={(file, endpoint) =>
          handleImageUpload(file, endpoint, 'backdrop_url', setUploadingBackdrop)
        }
        onRemove={() => updateField('backdrop_url', '')}
      />
      {form.backdrop_url && (
        <p className="text-xs text-on-surface-disabled truncate">{form.backdrop_url}</p>
      )}
      <ImageVariantsPanel originalUrl={form.backdrop_url} variantType="backdrop" />

      {/* Backdrop Focal Point */}
      {form.backdrop_url && (
        <div>
          <label className="block text-sm text-on-surface-muted mb-1">
            Backdrop Focal Point{' '}
            <span className="text-on-surface-disabled font-normal">— click image to set</span>
          </label>
          <div
            className="relative w-full overflow-hidden rounded-xl cursor-crosshair"
            style={{ aspectRatio: '16/9' }}
            onClick={handleBackdropClick}
          >
            <img
              src={form.backdrop_url}
              alt="Backdrop preview"
              className="w-full h-full object-cover pointer-events-none select-none"
            />
            {form.backdrop_focus_x != null && form.backdrop_focus_y != null && (
              <div
                className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-white bg-red-500/60 pointer-events-none"
                style={{
                  left: `${form.backdrop_focus_x * 100}%`,
                  top: `${form.backdrop_focus_y * 100}%`,
                }}
              />
            )}
          </div>
          {form.backdrop_focus_x != null && form.backdrop_focus_y != null && (
            <div className="flex items-center gap-4 mt-1.5">
              <span className="text-xs text-on-surface-subtle">
                Focus: ({Math.round(form.backdrop_focus_x * 100)}%,{' '}
                {Math.round(form.backdrop_focus_y * 100)}%)
              </span>
              <button
                type="button"
                onClick={() =>
                  setForm((p) => ({ ...p, backdrop_focus_x: null, backdrop_focus_y: null }))
                }
                className="text-xs text-red-400 hover:text-red-300"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

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
          {genres.map((genre) => (
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
    </form>
  );
}
