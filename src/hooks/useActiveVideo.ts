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
 * which video is most centered in the viewport (with ≥50% visibility).
 */
export function useActiveVideo(): UseActiveVideoReturn {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const layouts = useRef<Map<string, VideoLayout>>(new Map());

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

      // Must be at least 50% visible
      if (layout.height > 0 && visibleHeight / layout.height < 0.5) return;

      const videoCenter = videoTop + layout.height / 2;
      const distance = Math.abs(videoCenter - viewportCenter);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestId = id;
      }
    });

    setActiveVideoId((prev) => (prev === bestId ? prev : bestId));
  }, []);

  return { activeVideoId, registerVideoLayout, handleScrollForVideo };
}
