'use client';
import { useRef, useCallback, useState } from 'react';
import { DETAIL_HERO_HEIGHT, DEVICES, SPOTLIGHT_GRADIENT } from '@shared/constants';

// @assumes widest device gives the most conservative (smallest) frame for portrait images.
// Whatever the picker shows as "visible" will be visible on ALL devices.
const HERO_WIDTH = Math.max(...DEVICES.map((d) => d.width));
// @coupling DETAIL_HERO_HEIGHT from shared constants must match the mobile detail backdrop height
const HERO_ASPECT = HERO_WIDTH / DETAIL_HERO_HEIGHT;

// Pre-compute the spotlight gradient CSS (same gradient used in the mobile hero)
const GRADIENT_CSS = `linear-gradient(to bottom, ${SPOTLIGHT_GRADIENT.join(', ')})`;

interface BackdropFocalPickerProps {
  backdropUrl: string;
  focusX: number | null;
  focusY: number | null;
  onChange: (x: number, y: number) => void;
  onClear: () => void;
  /** @contract override target aspect ratio for the visible frame.
   * Defaults to HERO_ASPECT (landscape hero). Use 2/3 for poster focal points. */
  targetAspect?: number;
  /** @contract hide the gradient preview overlay (not relevant for poster focal points) */
  hideGradient?: boolean;
}

export function BackdropFocalPicker({
  backdropUrl,
  focusX,
  focusY,
  onChange,
  onClear,
  targetAspect,
  hideGradient,
}: BackdropFocalPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [imageAspect, setImageAspect] = useState<number | null>(null);

  const cx = focusX ?? 0.5;
  const cy = focusY ?? 0.5;

  // @contract use targetAspect if provided, otherwise default to HERO_ASPECT (landscape hero)
  const effectiveAspect = targetAspect ?? HERO_ASPECT;

  // @contract panDir determines if user drags horizontally, vertically, or not at all
  // @edge tolerance of 0.05 prevents jittery panning when aspect ratios nearly match
  const panDir =
    imageAspect == null
      ? null
      : Math.abs(imageAspect - effectiveAspect) < 0.05
        ? 'none'
        : imageAspect > effectiveAspect
          ? 'horizontal'
          : 'vertical';

  // Frame size as fraction of picker dimensions
  const frameW = panDir === 'horizontal' ? effectiveAspect / imageAspect! : 1;
  const frameH = panDir === 'vertical' ? imageAspect! / effectiveAspect : 1;
  const overflowW = 1 - frameW;
  const overflowH = 1 - frameH;

  // @sync frame position mirrors CSS objectPosition semantics:
  // objectPosition X% distributes X% of the overflow to the left (cropped).
  // frameLeft = focusX * overflow keeps picker in sync with PreviewPanel.
  const frameLeft = panDir === 'horizontal' ? cx * overflowW : 0;
  const frameTop = panDir === 'vertical' ? cy * overflowH : 0;

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setImageAspect(img.naturalWidth / img.naturalHeight);
    }
  }, []);

  // @boundary clamps focus values to [0, 1] range; no-op when panDir is 'none'
  const positionFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      /* v8 ignore start */
      if (!el || !panDir || panDir === 'none') return;
      /* v8 ignore stop */
      const rect = el.getBoundingClientRect();

      let newX = cx;
      let newY = cy;

      if (panDir === 'horizontal') {
        // User clicks a point → center frame there → derive objectPosition value
        const mouseX = (clientX - rect.left) / rect.width;
        const desiredLeft = Math.max(0, Math.min(overflowW, mouseX - frameW / 2));
        /* v8 ignore start */
        newX = overflowW > 0 ? desiredLeft / overflowW : 0.5;
        /* v8 ignore stop */
      } else {
        const mouseY = (clientY - rect.top) / rect.height;
        const desiredTop = Math.max(0, Math.min(overflowH, mouseY - frameH / 2));
        /* v8 ignore start */
        newY = overflowH > 0 ? desiredTop / overflowH : 0.5;
        /* v8 ignore stop */
      }

      onChange(newX, newY);
    },
    [onChange, frameW, frameH, overflowW, overflowH, cx, cy, panDir],
  );

  // @sideeffect captures pointer to continue tracking outside the container bounds
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      positionFromEvent(e.clientX, e.clientY);
    },
    [positionFromEvent],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      positionFromEvent(e.clientX, e.clientY);
    },
    [positionFromEvent],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // @edge no backdrop uploaded — render nothing
  if (!backdropUrl) return null;

  const containerAspectRatio = imageAspect != null ? `${imageAspect}` : '16 / 9';
  const directionHint =
    panDir === 'horizontal'
      ? 'drag left / right'
      : panDir === 'vertical'
        ? 'drag up / down'
        : panDir === 'none'
          ? 'image fits perfectly'
          : 'loading…';

  return (
    <div>
      <label className="block text-sm text-on-surface-muted mb-1">
        Focal Point <span className="text-on-surface-disabled font-normal">— {directionHint}</span>
      </label>

      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl select-none"
        style={{
          aspectRatio: containerAspectRatio,
          cursor: panDir && panDir !== 'none' ? 'grab' : 'default',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Backdrop image */}
        <img
          src={backdropUrl}
          alt="Backdrop"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
          onLoad={handleImageLoad}
        />

        {/* Dark overlays — horizontal mode (left/right) */}
        {panDir === 'horizontal' && (
          <>
            <div
              className="absolute top-0 bottom-0 left-0 bg-black/60 pointer-events-none"
              style={{ width: `${frameLeft * 100}%` }}
            />
            <div
              className="absolute top-0 bottom-0 right-0 bg-black/60 pointer-events-none"
              style={{ width: `${(1 - frameLeft - frameW) * 100}%` }}
            />
          </>
        )}

        {/* Dark overlays — vertical mode (top/bottom) */}
        {panDir === 'vertical' && (
          <>
            <div
              className="absolute top-0 left-0 right-0 bg-black/60 pointer-events-none"
              style={{ height: `${frameTop * 100}%` }}
            />
            <div
              className="absolute bottom-0 left-0 right-0 bg-black/60 pointer-events-none"
              style={{ height: `${(1 - frameTop - frameH) * 100}%` }}
            />
          </>
        )}

        {/* Spotlight gradient preview — shows what the hero actually looks like */}
        {panDir && panDir !== 'none' && !hideGradient && (
          <div
            className="absolute pointer-events-none rounded-lg"
            style={{
              left: `${frameLeft * 100}%`,
              top: `${frameTop * 100}%`,
              width: `${frameW * 100}%`,
              height: `${frameH * 100}%`,
              background: GRADIENT_CSS,
            }}
          />
        )}

        {/* Viewport frame border */}
        {panDir && panDir !== 'none' && (
          <div
            className="absolute border-2 border-white/80 rounded-lg pointer-events-none"
            style={{
              left: `${frameLeft * 100}%`,
              top: `${frameTop * 100}%`,
              width: `${frameW * 100}%`,
              height: `${frameH * 100}%`,
            }}
          />
        )}
      </div>

      {focusX != null && (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-status-red hover:text-status-red-hover"
          >
            Reset to Center
          </button>
        </div>
      )}
    </div>
  );
}
