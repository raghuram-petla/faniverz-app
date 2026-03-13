import { useState, useRef, useCallback } from 'react';

interface VideoLayout {
  y: number;
  height: number;
}

export interface UseActiveVideoReturn {
  activeVideoId: string | null;
  registerVideoLayout: (id: string, y: number, height: number) => void;
  handleScrollForVideo: (scrollY: number, viewportHeight: number) => void;
}

/**
 * Tracks registered video card positions within a ScrollView and determines
 * which video is most centered in the viewport (with >=50% visibility).
 */
// @contract only one video is active at a time; null when no video meets the 50% visibility threshold
export function useActiveVideo(): UseActiveVideoReturn {
  // @nullable null when no video card is sufficiently visible in the viewport
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  // @sync layouts ref is mutated imperatively during render-time onLayout callbacks — not tied to React state
  // @edge stale entries accumulate if feed items are removed without unmounting — Map is never pruned
  const layouts = useRef<Map<string, VideoLayout>>(new Map());

  // @sideeffect mutates layouts ref; callers must provide absolute y relative to ScrollView content, not screen
  const registerVideoLayout = useCallback((id: string, y: number, height: number) => {
    layouts.current.set(id, { y, height });
  }, []);

  const handleScrollForVideo = useCallback((scrollY: number, viewportHeight: number) => {
    const viewportTop = scrollY;
    const viewportBottom = scrollY + viewportHeight;
    const viewportCenter = scrollY + viewportHeight / 2;

    let bestId: string | null = null;
    let bestDistance = Infinity;

    layouts.current.forEach((layout, id) => {
      const videoTop = layout.y;
      const videoBottom = layout.y + layout.height;

      // Visible portion of the video
      const visibleTop = Math.max(videoTop, viewportTop);
      const visibleBottom = Math.min(videoBottom, viewportBottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);

      // @invariant 50% visibility gate — prevents autoplay for barely-visible cards
      if (layout.height > 0 && visibleHeight / layout.height < 0.5) return;

      const videoCenter = videoTop + layout.height / 2;
      const distance = Math.abs(videoCenter - viewportCenter);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestId = id;
      }
    });

    // @edge avoids unnecessary re-renders by skipping setState when activeVideoId hasn't changed
    setActiveVideoId((prev) => (prev === bestId ? prev : bestId));
  }, []);

  return { activeVideoId, registerVideoLayout, handleScrollForVideo };
}
