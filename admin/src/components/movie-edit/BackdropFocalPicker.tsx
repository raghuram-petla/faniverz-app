'use client';
import { useRef, useCallback } from 'react';
import { HERO_HEIGHT } from '@shared/constants';

// iPhone 15 width — used to compute viewport frame aspect ratio
const HERO_WIDTH = 393;
const HERO_ASPECT = HERO_WIDTH / HERO_HEIGHT; // ≈ 0.655
const BACKDROP_ASPECT = 16 / 9; // ≈ 1.778

// Frame width as fraction of picker width (how much of the backdrop is visible on mobile)
const FRAME_W_FRAC = HERO_ASPECT / BACKDROP_ASPECT; // ≈ 0.368

interface BackdropFocalPickerProps {
  backdropUrl: string;
  focusX: number | null;
  focusY: number | null;
  onChange: (x: number, y: number) => void;
  onClear: () => void;
}

export function BackdropFocalPicker({
  backdropUrl,
  focusX,
  focusY,
  onChange,
  onClear,
}: BackdropFocalPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const cx = focusX ?? 0.5;
  const cy = focusY ?? 0.5;

  // Frame bounds (clamped so frame stays within image)
  const halfW = FRAME_W_FRAC / 2;
  const frameLeft = Math.max(0, Math.min(1 - FRAME_W_FRAC, cx - halfW));
  const frameRight = frameLeft + FRAME_W_FRAC;

  const positionFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.max(halfW, Math.min(1 - halfW, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      onChange(x, y);
    },
    [onChange, halfW],
  );

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

  if (!backdropUrl) return null;

  return (
    <div>
      <label className="block text-sm text-on-surface-muted mb-1">
        Backdrop Focal Point{' '}
        <span className="text-on-surface-disabled font-normal">— drag the frame to position</span>
      </label>

      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl select-none"
        style={{ aspectRatio: '16/9', cursor: 'grab' }}
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
        />

        {/* Dark overlay — left */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-black/60 pointer-events-none"
          style={{ width: `${frameLeft * 100}%` }}
        />
        {/* Dark overlay — right */}
        <div
          className="absolute top-0 bottom-0 right-0 bg-black/60 pointer-events-none"
          style={{ width: `${(1 - frameRight) * 100}%` }}
        />

        {/* Viewport frame */}
        <div
          className="absolute top-0 bottom-0 border-2 border-white/80 rounded-lg pointer-events-none"
          style={{
            left: `${frameLeft * 100}%`,
            width: `${FRAME_W_FRAC * 100}%`,
          }}
        />
      </div>

      <div className="flex items-center gap-4 mt-1.5">
        <span className="text-xs text-on-surface-subtle">
          Focus: ({Math.round(cx * 100)}%, {Math.round(cy * 100)}%)
        </span>
        {focusX != null && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Reset to Center
          </button>
        )}
      </div>
    </div>
  );
}
