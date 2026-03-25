'use client';

/**
 * Form for adding a new image (poster or backdrop) to the gallery.
 * Auto-detects image type based on dimensions (landscape = backdrop, portrait = poster).
 *
 * @contract Emits onConfirm with pending poster data when user clicks "Add to Gallery".
 * Does not fire any DB mutations — parent defers to save.
 */

import { useState, useRef } from 'react';
import { Upload, RefreshCw, Loader2, Check, Image } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useImageUpload } from '@/hooks/useImageUpload';
import type { PendingPosterAdd } from '@/hooks/useMovieEditTypes';
import { getImageUrl } from '@shared/imageUrl';

const emptyPosterForm = () => ({
  title: '',
  description: '',
  poster_date: new Date().toISOString().slice(0, 10),
});

export interface PosterAddFormProps {
  hasNoPosters: boolean;
  posterCount: number;
  onConfirm: (poster: PendingPosterAdd, pendingId: string) => void;
  onCancel: () => void;
  onPendingMainChange?: (previewUrl: string | null) => void;
}

export function PosterAddForm({ posterCount, onConfirm, onCancel }: PosterAddFormProps) {
  const [posterForm, setPosterForm] = useState(emptyPosterForm);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<'poster' | 'backdrop'>('poster');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // @contract two upload hooks — one per bucket. Call the right one after detecting image type.
  const posterUpload = useImageUpload('/api/upload/movie-poster');
  const backdropUpload = useImageUpload('/api/upload/movie-backdrop');
  const uploading = posterUpload.uploading || backdropUpload.uploading;

  // @contract detect image type from file dimensions, then upload to the correct endpoint
  async function handleUpload(file: File) {
    try {
      const type = await detectImageType(file);
      setDetectedType(type);
      const uploader = type === 'backdrop' ? backdropUpload : posterUpload;
      const url = await uploader.upload(file);
      setUploadedUrl(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  function handleConfirmAdd() {
    /* v8 ignore start */
    if (!uploadedUrl) return;
    /* v8 ignore stop */

    const pendingId = `pending-poster-${crypto.randomUUID()}`;
    onConfirm(
      {
        _id: pendingId,
        image_url: uploadedUrl,
        title: posterForm.title || (detectedType === 'backdrop' ? 'Backdrop' : 'Poster'),
        description: posterForm.description || null,
        /* v8 ignore start */
        poster_date: posterForm.poster_date || null,
        /* v8 ignore stop */

        is_main_poster: false,
        is_main_backdrop: false,
        image_type: detectedType,
        display_order: posterCount,
      },
      pendingId,
    );
  }

  const bucket = detectedType === 'backdrop' ? 'BACKDROPS' : 'POSTERS';
  const previewClass = detectedType === 'backdrop' ? 'w-32 h-[72px]' : 'w-20 h-[120px]';

  return (
    <div className="bg-surface-elevated rounded-xl p-4 space-y-3 mb-4">
      <div className="flex gap-4 items-start">
        {uploadedUrl ? (
          <div className="shrink-0 relative">
            <img
              src={getImageUrl(uploadedUrl, 'sm', bucket) ?? uploadedUrl}
              alt="Preview"
              className={`rounded-lg object-cover ${previewClass}`}
            />
            <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1 py-0.5 rounded capitalize">
              {detectedType}
            </span>
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
              <label className="block text-xs text-on-surface-subtle mb-1">Title</label>
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

          {/* Upload button */}
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
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-outline-subtle">
        <Button
          type="button"
          variant="primary"
          size="md"
          disabled={!uploadedUrl}
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

/** @contract detects image type from file by loading it and checking aspect ratio */
function detectImageType(file: File): Promise<'poster' | 'backdrop'> {
  return new Promise((resolve) => {
    const img = new globalThis.Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      // Landscape or square = backdrop; portrait = poster
      resolve(img.naturalWidth >= img.naturalHeight ? 'backdrop' : 'poster');
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve('poster'); // fallback
    };
    img.src = URL.createObjectURL(file);
  });
}
