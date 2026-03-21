'use client';
import { useMemo } from 'react';
import type { MovieForm } from '@/hooks/useMovieEditState';
import { FormInput, FormSelect, FormTextarea, FormField } from '@/components/common/FormField';
import { Button } from '@/components/common/Button';
import { validateMovieForm, type ValidationError } from '@/lib/movie-validation';
import { GENRES, LANGUAGE_OPTIONS, CERTIFICATION_OPTIONS } from '@/lib/movie-constants';
// @contract movie basic info — title, dates, genres, synopsis, certification, language, toggles
export interface BasicInfoSectionProps {
  form: MovieForm;
  setForm: React.Dispatch<React.SetStateAction<MovieForm>>;
  // @boundary updateField accepts string | string[] | boolean to handle text, genres array, and toggles
  updateField: (field: string, value: string | string[] | boolean) => void;
  toggleGenre: (genre: string) => void;
  onSubmit: (e?: React.FormEvent) => Promise<void>;
}

export function BasicInfoSection({
  form,
  setForm,
  updateField,
  toggleGenre,
  onSubmit,
}: BasicInfoSectionProps) {
  const errors = useMemo(() => validateMovieForm(form), [form]);
  const errorFor = (field: string): ValidationError | undefined =>
    errors.find((e) => e.field === field);

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
        <div>
          {/* @nullable premiere_date — only set when movie has advance premiere shows */}
          <FormInput
            label="Premiere Date (optional)"
            type="date"
            value={form.premiere_date}
            onValueChange={(v) => updateField('premiere_date', v)}
          />
          {errorFor('premiere_date') && (
            <p className="text-xs text-status-red mt-1">{errorFor('premiere_date')!.message}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
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
          {errorFor('in_theaters') && (
            <p className="text-xs text-status-red mt-1">{errorFor('in_theaters')!.message}</p>
          )}
        </FormField>
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
        <FormInput
          label="TMDB ID"
          type="number"
          value={form.tmdb_id}
          onValueChange={(v) => updateField('tmdb_id', v)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FormInput
            label="Runtime (min)"
            type="number"
            value={form.runtime}
            onValueChange={(v) => updateField('runtime', v)}
          />
          {errorFor('runtime') && (
            <p className="text-xs text-status-red mt-1">{errorFor('runtime')!.message}</p>
          )}
        </div>
        <FormSelect
          label="Certification"
          value={form.certification}
          options={CERTIFICATION_OPTIONS}
          onValueChange={(v) => updateField('certification', v)}
        />
      </div>
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
          {GENRES.map((genre) => (
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
