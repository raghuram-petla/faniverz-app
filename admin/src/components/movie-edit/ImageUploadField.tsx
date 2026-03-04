'use client';
import { useRef } from 'react';
import { Loader2, Upload, X } from 'lucide-react';

interface ImageUploadFieldProps {
  label: string;
  url: string;
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
}

export function ImageUploadField({
  label,
  url,
  uploading,
  uploadEndpoint,
  previewAlt,
  previewClassName,
  showUrlCaption = true,
  onUpload,
  onRemove,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void onUpload(file, uploadEndpoint);
    e.target.value = '';
  }

  return (
    <div>
      <label className="block text-sm text-white/60 mb-1">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
      {url ? (
        <div className="flex items-center gap-4">
          <img
            src={url}
            alt={previewAlt}
            className={`rounded-lg object-cover border border-white/10 ${previewClassName}`}
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-2 text-sm text-white/60 hover:text-white px-3 py-1.5 bg-white/10 rounded-lg disabled:opacity-50"
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
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 px-3 py-1.5 bg-white/5 rounded-lg"
            >
              <X className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 bg-white/10 rounded-xl px-4 py-3 text-sm text-white/60 hover:bg-white/15 hover:text-white transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {uploading ? 'Uploading...' : `Upload ${label}`}
        </button>
      )}
      {showUrlCaption && url && <p className="mt-2 text-xs text-white/20 truncate">{url}</p>}
    </div>
  );
}
