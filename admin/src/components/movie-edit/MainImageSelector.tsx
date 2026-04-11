'use client';

/**
 * Selector for choosing the main poster or main backdrop from the image gallery.
 * Shows a thumbnail of the current selection, a dropdown to change it, and a focal point picker.
 *
 * @contract: Calls onSelect(imageId) when the user picks a different image.
 * The parent is responsible for calling the setMainPoster/setMainBackdrop mutation.
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Crosshair } from 'lucide-react';
import { getImageUrl } from '@shared/imageUrl';
import type { MovieImage } from '@/lib/types';
import { BackdropFocalPicker } from './BackdropFocalPicker';

export interface MainImageSelectorProps {
  label: string;
  /** Current main image URL (relative key or full URL) */
  currentImageUrl: string | null;
  /** All gallery images to pick from */
  images: MovieImage[];
  /** Called when user selects a different image */
  onSelect: (imageId: string) => void;
  /** Focal point X (0–1) */
  focusX: number | null;
  /** Focal point Y (0–1) */
  focusY: number | null;
  /** Called when focal point changes */
  onFocusChange: (x: number, y: number) => void;
  /** Called to clear focal point */
  onFocusClear: () => void;
  /** R2 bucket for image URLs */
  bucket: 'POSTERS' | 'BACKDROPS';
  /** Aspect class for thumbnail (e.g. 'aspect-[2/3]' for portrait, 'aspect-video' for landscape) */
  aspectClass?: string;
  /** Width class for thumbnail — should be wider for landscape images */
  widthClass?: string;
  /** Target aspect ratio for focal point picker frame (e.g. 2/3 for poster, undefined for hero) */
  focalTargetAspect?: number;
  /** Hide the gradient overlay in the focal picker (not relevant for posters) */
  focalHideGradient?: boolean;
}

export function MainImageSelector({
  label,
  currentImageUrl,
  images,
  onSelect,
  focusX,
  focusY,
  onFocusChange,
  onFocusClear,
  bucket,
  aspectClass = 'aspect-[2/3]',
  widthClass = 'w-28',
  focalTargetAspect,
  focalHideGradient,
}: MainImageSelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showFocalPicker, setShowFocalPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // @contract determine actual bucket from the selected image's image_type, not the static prop.
  // This handles cross-type selection (e.g., backdrop image chosen as main poster).
  const currentImage = images.find((img) => img.image_url === currentImageUrl);
  const effectiveBucket: 'POSTERS' | 'BACKDROPS' =
    currentImage?.image_type === 'backdrop'
      ? 'BACKDROPS'
      : currentImage?.image_type === 'poster'
        ? 'POSTERS'
        : bucket;

  // @contract thumbnail shape adapts to the actual selected image's type, not the selector's role.
  // A poster image selected as main backdrop still shows as portrait; vice versa.
  const isSelectedLandscape = currentImage?.image_type === 'backdrop';
  const isSelectedPortrait = currentImage?.image_type === 'poster';
  const thumbAspect = isSelectedLandscape
    ? 'aspect-video'
    : isSelectedPortrait
      ? 'aspect-[2/3]'
      : aspectClass;
  const thumbWidth = isSelectedLandscape ? 'w-56' : isSelectedPortrait ? 'w-28' : widthClass;

  // @contract focal picker target aspect: when focalTargetAspect is explicitly set (poster context),
  // use it. When not set (backdrop context), always use picker default (hero aspect) so the frame
  // shows the actual crop — even portrait images get cropped in the landscape-ish detail hero.
  const effectiveFocalAspect = focalTargetAspect != null ? focalTargetAspect : undefined;
  // @contract hide gradient when a poster is used as backdrop (gradient is hero-specific)
  const effectiveHideGradient = isSelectedPortrait ? true : focalHideGradient;

  const displayUrl = currentImageUrl
    ? (getImageUrl(currentImageUrl, 'md', effectiveBucket) ?? currentImageUrl)
    : null;

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-on-surface-muted uppercase tracking-wide">
        {label}
      </label>

      <div className="flex gap-3">
        {/* Thumbnail */}
        {displayUrl ? (
          <div
            className={`${thumbAspect} ${thumbWidth} shrink-0 rounded-lg overflow-hidden bg-surface-elevated relative`}
          >
            <img src={displayUrl} alt={label} className="w-full h-full object-contain" />
          </div>
        ) : (
          <div
            className={`${aspectClass} ${widthClass} shrink-0 rounded-lg bg-surface-elevated flex items-center justify-center`}
          >
            <span className="text-xs text-on-surface-subtle">None</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-1.5 min-w-0">
          {/* Dropdown selector */}
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              disabled={images.length === 0}
              className="flex items-center gap-1.5 bg-surface-elevated hover:bg-input px-3 py-1.5 rounded-lg text-xs text-on-surface transition-colors disabled:opacity-50"
            >
              <ChevronDown className="w-3 h-3" />
              {currentImageUrl ? 'Change' : 'Select'}
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-surface border border-outline rounded-lg shadow-xl p-3 max-h-80 overflow-y-auto min-w-[280px]">
                {/* v8 ignore start */}
                {images.length === 0 ? (
                  /* v8 ignore stop */
                  <p className="text-xs text-on-surface-subtle p-2">No images in gallery</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img) => {
                      const imgBucket = img.image_type === 'backdrop' ? 'BACKDROPS' : 'POSTERS';
                      const isSelected = img.image_url === currentImageUrl;
                      return (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => {
                            onSelect(img.id);
                            setDropdownOpen(false);
                          }}
                          className={`rounded-md overflow-hidden border-2 transition-colors ${
                            isSelected
                              ? 'border-red-600'
                              : 'border-transparent hover:border-on-surface-subtle'
                          }`}
                        >
                          <img
                            src={getImageUrl(img.image_url, 'sm', imgBucket) ?? img.image_url}
                            alt={img.title || 'Image'}
                            className={`w-full ${img.image_type === 'backdrop' ? 'aspect-video' : 'aspect-[2/3]'} object-cover`}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
                {}
              </div>
            )}
          </div>

          {/* Focal point toggle */}
          {currentImageUrl && (
            <button
              type="button"
              onClick={() => setShowFocalPicker((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-on-surface-muted hover:text-on-surface transition-colors"
            >
              <Crosshair className="w-3 h-3" />
              {showFocalPicker ? 'Hide' : 'Adjust'} focal point
            </button>
          )}
        </div>
      </div>

      {/* Focal point picker — reuses BackdropFocalPicker with frame-based pan interaction */}
      {showFocalPicker && currentImageUrl && (
        <BackdropFocalPicker
          backdropUrl={displayUrl!}
          focusX={focusX}
          focusY={focusY}
          onChange={onFocusChange}
          onClear={onFocusClear}
          targetAspect={effectiveFocalAspect}
          hideGradient={effectiveHideGradient}
        />
      )}
    </div>
  );
}
