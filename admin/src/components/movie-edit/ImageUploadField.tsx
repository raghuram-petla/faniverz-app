'use client';
import { useRef, useState } from 'react';
import { Loader2, Upload, X, ImageOff, RotateCcw } from 'lucide-react';
import { getImageUrl, type ImageBucket } from '@shared/imageUrl';

// @contract image upload with preview, change, remove, and optional reset actions
interface ImageUploadFieldProps {
  label: string;
  /** Relative key (e.g. "abc123.jpg") or full URL stored in form state */
  url: string;
  /** Bucket used to construct the full display URL from a relative key */
  bucket?: ImageBucket;
  uploading: boolean;
  uploadEndpoint: string;
  /** Alt text for the preview image */
  previewAlt: string;
  /** Tailwind classes for the preview image — controls width/height */
  previewClassName: string;
  /** Whether to render the URL caption below the preview */
  showUrlCaption?: boolean;
  onUpload: (file: File, endpoint: string) => Promise<void>;
  onRemove: () => void;
  /** Optional callback to reset to a default image (e.g. Google avatar) */
  onReset?: () => void;
  /** Label for the reset button */
  resetLabel?: string;
  /** Hide the label text (useful when a parent subheading already provides it) */
  hideLabel?: boolean;
}

export function ImageUploadField({
  label,
  url,
  bucket,
  uploading,
  uploadEndpoint,
  previewAlt,
  previewClassName,
  showUrlCaption = true,
  onUpload,
  onRemove,
  onReset,
  resetLabel = 'Reset',
  hideLabel = false,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imgError, setImgError] = useState(false);
  // @contract: constructs full display URL from relative key; falls back to url as-is
  // (handles both new relative keys after migration and legacy full URLs)
  // @edge: if url looks like a relative key but bucket is missing, the raw key is used as src
  // which renders a broken image — callers should always pass bucket for post-migration records
  if (url && !url.startsWith('http') && !bucket) {
    console.warn(
      `ImageUploadField: url "${url}" looks like a relative key but no bucket was provided. Pass bucket to construct the correct display URL.`,
    );
  }
  const displayUrl = bucket ? (getImageUrl(url, 'original', bucket) ?? url) : url;

  // @sideeffect delegates upload to parent; resets input value to allow re-selecting same file
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void onUpload(file, uploadEndpoint);
    e.target.value = '';
  }

  return (
    <div>
      {!hideLabel && <label className="block text-sm text-on-surface-muted mb-1">{label}</label>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
      {/* @edge url present: show preview + change/remove; url absent: show upload button */}
      {url ? (
        <div className="flex items-center gap-4">
          {/* @edge broken image URL shows ImageOff placeholder instead of broken img tag */}
          {imgError ? (
            <div
              className={`rounded-lg border border-outline bg-input flex items-center justify-center ${previewClassName}`}
            >
              <ImageOff className="w-8 h-8 text-on-surface-muted" />
            </div>
          ) : (
            <img
              src={displayUrl}
              alt={previewAlt}
              className={`rounded-lg object-cover border border-outline ${previewClassName}`}
              onError={() => setImgError(true)}
            />
          )}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-2 text-sm text-on-surface-muted hover:text-on-surface px-3 py-1.5 bg-input rounded-lg disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              Change
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-2 text-sm text-status-red hover:text-status-red-hover px-3 py-1.5 bg-surface-elevated rounded-lg"
            >
              <X className="w-3.5 h-3.5" /> Remove
            </button>
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="flex items-center gap-2 text-sm text-on-surface-muted hover:text-on-surface px-3 py-1.5 bg-surface-elevated rounded-lg"
              >
                <RotateCcw className="w-3.5 h-3.5" /> {resetLabel}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 bg-input rounded-xl px-4 py-3 text-sm text-on-surface-muted hover:bg-input-hover hover:text-on-surface transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? 'Uploading...' : `Upload ${label}`}
          </button>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="w-full flex items-center justify-center gap-2 bg-surface-elevated rounded-xl px-4 py-3 text-sm text-on-surface-muted hover:text-on-surface transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> {resetLabel}
            </button>
          )}
        </div>
      )}
      {showUrlCaption && url && (
        <p className="mt-2 text-xs text-on-surface-subtle truncate">{url}</p>
      )}
    </div>
  );
}
