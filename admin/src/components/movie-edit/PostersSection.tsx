'use client';
import { useState, useMemo } from 'react';
import { Image, Plus } from 'lucide-react';
import { Button } from '@/components/common/Button';
import type { MoviePoster } from '@/lib/types';
import type { MovieForm, PendingPosterAdd } from '@/hooks/useMovieEditTypes';
import { SectionHeading, PosterGalleryCard } from './PosterGalleryCard';
import { PosterAddForm } from './PosterAddForm';
import { MainImageSelector } from './MainImageSelector';

// @contract image gallery is the single source of truth for posters and backdrops
// Main poster/backdrop selection is handled via MainImageSelector at the top
export interface PostersSectionProps {
  visiblePosters: (
    | MoviePoster
    | (PendingPosterAdd & { id: string; movie_id: string; created_at: string })
  )[];
  onAdd: (poster: PendingPosterAdd, pendingId: string) => void;
  onRemove: (id: string, isPending: boolean) => void;
  onSelectMainPoster: (imageId: string) => void;
  onSelectMainBackdrop: (imageId: string) => void;
  savedMainPosterId: string | null;
  onPendingMainChange: (previewUrl: string | null) => void;
  form: MovieForm;
  setForm: React.Dispatch<React.SetStateAction<MovieForm>>;
  updateField: (field: string, value: string | boolean | string[]) => void;
}

type ImageFilter = 'all' | 'poster' | 'backdrop';

export function PostersSection({
  visiblePosters,
  onAdd,
  onRemove,
  onSelectMainPoster,
  onSelectMainBackdrop,
  savedMainPosterId,
  onPendingMainChange,
  form,
  setForm,
}: PostersSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [imageFilter, setImageFilter] = useState<ImageFilter>('all');

  // @contract sort by savedMainPosterId (DB-persisted) so order never changes during editing;
  // only reorders after save when postersData is refetched
  const displayPosters = useMemo(() => {
    const sorted = [...visiblePosters].sort((a, b) => {
      if (a.id === savedMainPosterId && b.id !== savedMainPosterId) return -1;
      if (a.id !== savedMainPosterId && b.id === savedMainPosterId) return 1;
      return b.created_at.localeCompare(a.created_at);
    });
    if (imageFilter === 'all') return sorted;
    // @contract filter by image_type; pending adds without image_type default to 'poster'
    return sorted.filter((p) => ('image_type' in p ? p.image_type : 'poster') === imageFilter);
  }, [visiblePosters, savedMainPosterId, imageFilter]);

  const hasNoPosters = visiblePosters.length === 0;

  // @contract handles confirm from PosterAddForm — adds image and optionally sets as main
  function handleConfirmAdd(poster: PendingPosterAdd, pendingId: string) {
    onAdd(poster, pendingId);
    if (poster.is_main_poster) onSelectMainPoster(pendingId);
    setShowAddForm(false);
  }

  return (
    <div className="space-y-8">
      {/* ─── Main Image Selectors ─── */}
      <section>
        <SectionHeading icon={Image} title="Main Images" />
        <div className="grid grid-cols-2 gap-6">
          <MainImageSelector
            label="Main Poster"
            currentImageUrl={form.poster_url}
            images={visiblePosters as Parameters<typeof MainImageSelector>[0]['images']}
            onSelect={onSelectMainPoster}
            focusX={form.poster_focus_x}
            focusY={form.poster_focus_y}
            onFocusChange={(x, y) =>
              setForm((p) => ({ ...p, poster_focus_x: x, poster_focus_y: y }))
            }
            onFocusClear={() =>
              setForm((p) => ({ ...p, poster_focus_x: null, poster_focus_y: null }))
            }
            bucket="POSTERS"
            aspectClass="aspect-[2/3]"
            widthClass="w-28"
            focalTargetAspect={2 / 3}
            focalHideGradient
          />
          <MainImageSelector
            label="Main Backdrop"
            currentImageUrl={form.backdrop_url}
            images={visiblePosters as Parameters<typeof MainImageSelector>[0]['images']}
            onSelect={onSelectMainBackdrop}
            focusX={form.backdrop_focus_x}
            focusY={form.backdrop_focus_y}
            onFocusChange={(x, y) =>
              setForm((p) => ({ ...p, backdrop_focus_x: x, backdrop_focus_y: y }))
            }
            onFocusClear={() =>
              setForm((p) => ({ ...p, backdrop_focus_x: null, backdrop_focus_y: null }))
            }
            bucket="BACKDROPS"
            aspectClass="aspect-video"
            widthClass="w-56"
          />
        </div>
      </section>

      {/* ─── Image Gallery ─── */}
      <section>
        <SectionHeading
          icon={Image}
          title="Images"
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

        {/* @contract filter tabs for All / Posters / Backdrops */}
        <div className="flex gap-1 mb-3">
          {(['all', 'poster', 'backdrop'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setImageFilter(tab)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                imageFilter === tab
                  ? 'bg-red-600 text-white'
                  : 'bg-surface-elevated text-on-surface-muted hover:bg-input'
              }`}
            >
              {tab === 'all' ? 'All' : tab === 'poster' ? 'Posters' : 'Backdrops'}
            </button>
          ))}
        </div>

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
              <PosterGalleryCard key={poster.id} poster={poster} onRemove={onRemove} />
            ))}
          </div>
        )}
        {visiblePosters.length === 0 && (
          <p className="text-sm text-on-surface-subtle">No images added yet.</p>
        )}
      </section>
    </div>
  );
}
