'use client';
import type { MovieForm } from '@/hooks/useMovieEditState';
import { FormInput, FormSelect, FormTextarea, FormField } from '@/components/common/FormField';
import { Button } from '@/components/common/Button';
import { ImageUploadField } from './ImageUploadField';
import { ImageVariantsPanel } from '@/components/common/ImageVariantsPanel';
import { BackdropFocalPicker } from './BackdropFocalPicker';

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

const LANGUAGE_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'te', label: 'Telugu' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'en', label: 'English' },
];

const CERTIFICATION_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'U', label: 'U' },
  { value: 'UA', label: 'UA' },
  { value: 'A', label: 'A' },
];

// @contract largest movie-edit section — title, dates, images, genres, synopsis, focal point
interface BasicInfoSectionProps {
  form: MovieForm;
  setForm: React.Dispatch<React.SetStateAction<MovieForm>>;
  // @boundary updateField accepts string | string[] | boolean to handle text, genres array, and toggles
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
  setUploadingPoster,
  setUploadingBackdrop,
  onSubmit,
}: BasicInfoSectionProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormInput
        label="Title"
        required
        type="text"
        value={form.title}
        onValueChange={(v) => updateField('title', v)}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="Release Date"
          type="date"
          value={form.release_date}
          onValueChange={(v) => updateField('release_date', v)}
        />
        <FormField label="Currently In Theaters">
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
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormSelect
          label="Original Language"
          value={form.original_language}
          options={LANGUAGE_OPTIONS}
          onValueChange={(v) => updateField('original_language', v)}
        />
        <FormField label="Featured Movie">
          <label className="flex items-center gap-3 bg-input rounded-xl px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm((prev) => ({ ...prev, is_featured: e.target.checked }))}
              className="w-5 h-5 rounded accent-red-600"
            />
            <span className="text-on-surface text-sm">
              {form.is_featured ? 'Yes — Featured on home screen' : 'No'}
            </span>
          </label>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="Runtime (min)"
          type="number"
          value={form.runtime}
          onValueChange={(v) => updateField('runtime', v)}
        />
        <FormSelect
          label="Certification"
          value={form.certification}
          options={CERTIFICATION_OPTIONS}
          onValueChange={(v) => updateField('certification', v)}
        />
      </div>
      {/* @coupling poster + backdrop each use ImageUploadField + ImageVariantsPanel for CDN pipeline visibility */}
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
        <p className="text-xs text-on-surface-subtle truncate">{form.backdrop_url}</p>
      )}
      <ImageVariantsPanel originalUrl={form.backdrop_url} variantType="backdrop" />

      {/* @sync focal point picker output feeds into the preview panel via form.backdrop_focus_x/y */}
      <BackdropFocalPicker
        backdropUrl={form.backdrop_url}
        focusX={form.backdrop_focus_x}
        focusY={form.backdrop_focus_y}
        onChange={(x, y) => setForm((p) => ({ ...p, backdrop_focus_x: x, backdrop_focus_y: y }))}
        onClear={() => setForm((p) => ({ ...p, backdrop_focus_x: null, backdrop_focus_y: null }))}
      />

      {/* Synopsis */}
      <FormTextarea
        label="Synopsis"
        rows={4}
        value={form.synopsis}
        onValueChange={(v) => updateField('synopsis', v)}
      />

      {/* @invariant genre list is hardcoded — must match the genres recognized by the mobile app */}
      <div>
        <label className="block text-sm text-on-surface-muted mb-2">Genres</label>
        <div className="flex flex-wrap gap-2">
          {genres.map((genre) => (
            <Button
              key={genre}
              type="button"
              variant={form.genres.includes(genre) ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => toggleGenre(genre)}
              className={form.genres.includes(genre) ? '' : 'hover:bg-input-active'}
            >
              {genre}
            </Button>
          ))}
        </div>
      </div>
    </form>
  );
}
