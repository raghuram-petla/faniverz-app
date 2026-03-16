'use client';
import { useState, useRef } from 'react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useMemo } from 'react';
import { Image, Plus, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import type { MoviePoster } from '@/lib/types';
import type { MovieForm, PendingPosterAdd } from '@/hooks/useMovieEditTypes';
import { ImageUploadField } from './ImageUploadField';
import { ImageVariantsPanel } from '@/components/common/ImageVariantsPanel';
import { BackdropFocalPicker } from './BackdropFocalPicker';
import { SectionHeading, PosterGalleryCard } from './PosterGalleryCard';

const EMPTY_POSTER_FORM = {
  title: '',
  description: '',
  poster_date: '',
};

// @contract poster gallery is the single source of truth for posters
// poster_url on the movies table is a derived/synced field (updated by setMainPoster mutation)
export interface PostersSectionProps {
  visiblePosters: (
    | MoviePoster
    | (PendingPosterAdd & { id: string; movie_id: string; created_at: string })
  )[];
  onAdd: (poster: PendingPosterAdd) => void;
  onRemove: (id: string, isPending: boolean) => void;
  onSetMain: (id: string) => void;
  form: MovieForm;
  setForm: React.Dispatch<React.SetStateAction<MovieForm>>;
  updateField: (field: string, value: string | string[] | boolean) => void;
  uploadingBackdrop: boolean;
  handleImageUpload: (
    file: File,
    endpoint: string,
    field: 'poster_url' | 'backdrop_url',
    setUploading: (v: boolean) => void,
  ) => Promise<void>;
  setUploadingBackdrop: (v: boolean) => void;
}

export function PostersSection({
  visiblePosters,
  onAdd,
  onRemove,
  onSetMain,
  form,
  setForm,
  updateField,
  uploadingBackdrop,
  handleImageUpload,
  setUploadingBackdrop,
}: PostersSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [posterForm, setPosterForm] = useState(EMPTY_POSTER_FORM);
  const { upload, uploading } = useImageUpload('/api/upload/movie-poster');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // @contract newest posters appear first
  const displayPosters = useMemo(() => [...visiblePosters].reverse(), [visiblePosters]);
  const hasNoPosters = visiblePosters.length === 0;

  async function handleUpload(file: File) {
    try {
      const url = await upload(file);
      // @contract first poster auto-becomes main — no manual "Set Main" needed
      onAdd({
        _id: `pending-poster-${crypto.randomUUID()}`,
        image_url: url,
        title: posterForm.title || 'Poster',
        description: posterForm.description || null,
        poster_date: posterForm.poster_date || null,
        is_main: hasNoPosters,
        display_order: visiblePosters.length,
      });
      setPosterForm(EMPTY_POSTER_FORM);
      setShowAddForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  return (
    <div className="space-y-8">
      {/* ─── Backdrop ─── */}
      <section>
        <SectionHeading icon={Image} title="Backdrop" />
        <div className="space-y-3">
          <ImageUploadField
            label="Backdrop"
            hideLabel
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
          <BackdropFocalPicker
            backdropUrl={form.backdrop_url}
            focusX={form.backdrop_focus_x}
            focusY={form.backdrop_focus_y}
            onChange={(x, y) =>
              setForm((p) => ({ ...p, backdrop_focus_x: x, backdrop_focus_y: y }))
            }
            onClear={() =>
              setForm((p) => ({ ...p, backdrop_focus_x: null, backdrop_focus_y: null }))
            }
          />
        </div>
      </section>

      {/* ─── Poster Gallery (single source of truth) ─── */}
      <section>
        <SectionHeading
          icon={Image}
          title="Posters"
          action={
            !showAddForm ? (
              <Button
                size="sm"
                variant="primary"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setShowAddForm(true)}
              >
                Add
              </Button>
            ) : undefined
          }
        />

        {showAddForm && (
          <div className="bg-surface-elevated rounded-xl p-4 space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-on-surface-subtle mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. First Look, Hero Birthday Poster"
                  value={posterForm.title}
                  onChange={(e) => setPosterForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full bg-input rounded-lg px-3 py-2 text-on-surface text-sm outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
              <div>
                <label className="block text-xs text-on-surface-subtle mb-1">Date</label>
                <input
                  type="date"
                  value={posterForm.poster_date}
                  onChange={(e) => setPosterForm((p) => ({ ...p, poster_date: e.target.value }))}
                  className="w-full bg-input rounded-lg px-3 py-2 text-on-surface text-sm outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = '';
              }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={uploading || !posterForm.title}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-on-surface text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? 'Uploading...' : 'Upload & Add Poster'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setPosterForm(EMPTY_POSTER_FORM);
                }}
                className="text-on-surface-muted px-4 py-2 rounded-lg text-sm hover:bg-input"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {displayPosters.length > 0 && (
          <div className="space-y-2">
            {displayPosters.map((poster) => (
              <PosterGalleryCard
                key={poster.id}
                poster={poster}
                onSetMain={onSetMain}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
        {visiblePosters.length === 0 && (
          <p className="text-sm text-on-surface-subtle">No posters added yet.</p>
        )}
      </section>
    </div>
  );
}
