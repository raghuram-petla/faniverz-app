'use client';

import { useState, useRef, useEffect } from 'react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Image, Upload, Loader2, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/common/Button';
import type { PendingPosterAdd } from '@/hooks/useMovieEditTypes';
import { getImageUrl } from '@shared/imageUrl';

const emptyPosterForm = () => ({
  title: '',
  description: '',
  // @contract default to today so the user rarely needs to change the date
  poster_date: new Date().toISOString().slice(0, 10),
});

// @contract PosterAddForm handles the upload + metadata entry for a single new poster
// @coupling Parent (PostersSection) owns the gallery list; this component only emits onConfirm/onCancel
export interface PosterAddFormProps {
  hasNoPosters: boolean;
  posterCount: number;
  /** @sideeffect Called with pending poster data when user clicks "Add to Gallery" */
  onConfirm: (poster: PendingPosterAdd, pendingId: string) => void;
  onCancel: () => void;
  /** @contract Called with image URL when a pending poster is eligible to be preview main, or null */
  onPendingMainChange?: (url: string | null) => void;
}

export function PosterAddForm({
  hasNoPosters,
  posterCount,
  onConfirm,
  onCancel,
  onPendingMainChange,
}: PosterAddFormProps) {
  const [posterForm, setPosterForm] = useState(emptyPosterForm());
  // @contract uploadedUrl holds the image key after upload — separate from form fields
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  // @contract setAsMain defaults true when no posters exist (first poster is always main)
  const [setAsMain, setSetAsMain] = useState(false);
  const { upload, uploading } = useImageUpload('/api/upload/movie-poster');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // @contract notify parent whenever the pending-main preview URL changes
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
  function handleConfirmAdd() {
    if (!uploadedUrl) return;
    const pendingId = `pending-poster-${crypto.randomUUID()}`;
    const isMain = hasNoPosters || setAsMain;
    onConfirm(
      {
        _id: pendingId,
        image_url: uploadedUrl,
        title: posterForm.title || 'Poster',
        description: posterForm.description || null,
        poster_date: posterForm.poster_date || null,
        is_main: isMain,
        display_order: posterCount,
      },
      pendingId,
    );
  }

  return (
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
                onChange={(e) => setPosterForm((p) => ({ ...p, poster_date: e.target.value }))}
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
          onClick={onCancel}
          className="text-on-surface-muted px-4 py-2 rounded-lg text-sm hover:bg-input"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
