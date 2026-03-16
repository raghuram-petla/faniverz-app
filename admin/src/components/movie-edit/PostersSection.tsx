'use client';
import { useState, useRef, useMemo, useEffect } from 'react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Image, Plus, Upload, Loader2, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/common/Button';
import type { MoviePoster } from '@/lib/types';
import type { MovieForm, PendingPosterAdd } from '@/hooks/useMovieEditTypes';
import { ImageUploadField } from './ImageUploadField';
import { ImageVariantsPanel } from '@/components/common/ImageVariantsPanel';
import { BackdropFocalPicker } from './BackdropFocalPicker';
import { getImageUrl } from '@shared/imageUrl';
import { SectionHeading, PosterGalleryCard } from './PosterGalleryCard';

const emptyPosterForm = () => ({
  title: '',
  description: '',
  // @contract default to today so the user rarely needs to change the date
  poster_date: new Date().toISOString().slice(0, 10),
});

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
  const [posterForm, setPosterForm] = useState(emptyPosterForm());
  // @contract uploadedUrl holds the image key after upload — separate from form fields so
  //           title/date remain editable after image is chosen; null = no image yet
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  // @contract setAsMain defaults true when no posters exist (first poster is always main)
  const [setAsMain, setSetAsMain] = useState(false);
  const { upload, uploading } = useImageUpload('/api/upload/movie-poster');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // @contract notify parent whenever the pending-main preview URL changes
  // fires when: image uploaded + setAsMain checked, first poster uploaded, or form closed
  useEffect(() => {
    const previewUrl = (hasNoPosters || setAsMain) && uploadedUrl ? uploadedUrl : null;
    onPendingMainChange?.(previewUrl);
  }, [uploadedUrl, setAsMain, hasNoPosters, onPendingMainChange]);

  // @contract only uploads and stores the URL — does not add to gallery yet
  async function handleUpload(file: File) {
    try {
      const url = await upload(file);
      setUploadedUrl(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  // @contract adds the poster to the pending gallery and resets the add form
  // @assumes uploadedUrl and posterForm.title are non-empty (button is disabled otherwise)
  // @invariant if isMain, also calls onSetMain so pendingMainPosterId is explicit —
  //            prevents multiple pending adds with is_main:true from reaching the save handler
  function handleConfirmAdd() {
    if (!uploadedUrl) return;
    const pendingId = `pending-poster-${crypto.randomUUID()}`;
    const isMain = hasNoPosters || setAsMain;
    onAdd({
      _id: pendingId,
      image_url: uploadedUrl,
      title: posterForm.title || 'Poster',
      description: posterForm.description || null,
      poster_date: posterForm.poster_date || null,
      is_main: isMain,
      display_order: visiblePosters.length,
    });
    // @contract set explicit pendingMainPosterId so the save handler uses the id-based guard,
    //           ensuring exactly one poster has is_main:true even if multiple are added as main
    if (isMain) onSetMain(pendingId);
    setPosterForm(emptyPosterForm());
    setUploadedUrl(null);
    setSetAsMain(false);
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
          <div className="bg-surface-elevated rounded-xl p-4 space-y-3 mb-4">
            {/* ── Image area ── */}
            <div className="flex gap-4 items-start">
              {uploadedUrl ? (
                <div className="shrink-0 relative">
                  <img
                    src={getImageUrl(uploadedUrl, 'sm', 'POSTERS') ?? uploadedUrl}
                    alt="Poster preview"
                    className="w-20 h-[120px] rounded-lg object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-[120px] shrink-0 rounded-lg border-2 border-dashed border-outline flex items-center justify-center">
                  <Image className="w-6 h-6 text-on-surface-subtle" />
                </div>
              )}

              <div className="flex-1 space-y-3">
                {/* Title + Date */}
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
                      onChange={(e) =>
                        setPosterForm((p) => ({ ...p, poster_date: e.target.value }))
                      }
                      className="w-full bg-input rounded-lg px-3 py-2 text-on-surface text-sm outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </div>
                </div>

                {/* Upload / Change button + Set as main checkbox on same row */}
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
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-outline text-on-surface-muted text-sm hover:bg-input disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : uploadedUrl ? (
                      <RefreshCw className="w-3.5 h-3.5" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    {uploading ? 'Uploading…' : uploadedUrl ? 'Change Image' : 'Upload Image'}
                  </button>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasNoPosters || setAsMain}
                      disabled={hasNoPosters}
                      onChange={(e) => setSetAsMain(e.target.checked)}
                      className="w-4 h-4 rounded accent-red-600"
                    />
                    <span className="text-sm text-on-surface-muted">Set as main poster</span>
                  </label>
                </div>
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="flex items-center gap-2 pt-1 border-t border-outline-subtle">
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={!uploadedUrl || !posterForm.title}
                icon={<Check className="w-4 h-4" />}
                onClick={handleConfirmAdd}
              >
                Add to Gallery
              </Button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setPosterForm(emptyPosterForm());
                  setUploadedUrl(null);
                  setSetAsMain(false);
                }}
                className="text-on-surface-muted px-4 py-2 rounded-lg text-sm hover:bg-input"
              >
                Cancel
              </button>
            </div>
          </div>
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
