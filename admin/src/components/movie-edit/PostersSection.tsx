'use client';
import { useState, useMemo } from 'react';
import { Image, Plus } from 'lucide-react';
import { Button } from '@/components/common/Button';
import type { MoviePoster } from '@/lib/types';
import type { MovieForm, PendingPosterAdd } from '@/hooks/useMovieEditTypes';
import { ImageUploadField } from './ImageUploadField';
import { ImageVariantsPanel } from '@/components/common/ImageVariantsPanel';
import { BackdropFocalPicker } from './BackdropFocalPicker';
import { getImageUrl } from '@shared/imageUrl';
import { SectionHeading, PosterGalleryCard } from './PosterGalleryCard';
import { PosterAddForm } from './PosterAddForm';

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
  savedMainPosterId: string | null;
  // @contract called with image URL when a pending poster is eligible to be the preview main,
  //           or null when the add form is closed / unchecked
  onPendingMainChange?: (url: string | null) => void;
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
  savedMainPosterId,
  onPendingMainChange,
  form,
  setForm,
  updateField,
  uploadingBackdrop,
  handleImageUpload,
  setUploadingBackdrop,
}: PostersSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  // @contract sort by savedMainPosterId (DB-persisted) so order never changes during editing;
  // only reorders after save when postersData is refetched
  const displayPosters = useMemo(
    () =>
      [...visiblePosters].sort((a, b) => {
        if (a.id === savedMainPosterId && b.id !== savedMainPosterId) return -1;
        if (a.id !== savedMainPosterId && b.id === savedMainPosterId) return 1;
        return b.created_at.localeCompare(a.created_at);
      }),
    [visiblePosters, savedMainPosterId],
  );
  const hasNoPosters = visiblePosters.length === 0;

  // @contract handles confirm from PosterAddForm — adds poster and optionally sets as main
  function handleConfirmAdd(poster: PendingPosterAdd, pendingId: string) {
    onAdd(poster);
    if (poster.is_main) onSetMain(pendingId);
    setShowAddForm(false);
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
            bucket="BACKDROPS"
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
          <ImageVariantsPanel
            originalUrl={form.backdrop_url}
            variantType="backdrop"
            bucket="BACKDROPS"
          />
          <BackdropFocalPicker
            backdropUrl={
              getImageUrl(form.backdrop_url, 'original', 'BACKDROPS') ?? form.backdrop_url
            }
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
          <PosterAddForm
            hasNoPosters={hasNoPosters}
            posterCount={visiblePosters.length}
            onConfirm={handleConfirmAdd}
            onCancel={() => setShowAddForm(false)}
            onPendingMainChange={onPendingMainChange}
          />
        )}

        {displayPosters.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
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
