import { useState, useRef, useCallback } from 'react';

interface VideoLayout {
  y: number;
  height: number;
}

// @coupling FeedCard registers the whole card bounds, so the active-window expands by 35% of the viewport to preload the iframe before the visible video area is tapped.
const PRELOAD_VIEWPORT_PADDING_RATIO = 0.35;
const MOUNT_VISIBLE_RATIO = 0.15;

interface UseActiveVideoReturn {
  activeVideoId: string | null;
  preloadedVideoId: string | null;
  mountedVideoIds: string[];
  registerVideoLayout: (id: string, y: number, height: number) => void;
  unregisterVideoLayout: (id: string) => void;
  handleScrollForVideo: (scrollY: number, viewportHeight: number) => void;
}

/**
 * Tracks registered video card positions within a ScrollView and determines
 * which video is most centered in the viewport, with a small preload band so
 * the next candidate can mount before the user taps it.
 */
// @contract only one video is active at a time; null when no video meets the 50% visibility threshold
export function useActiveVideo(): UseActiveVideoReturn {
  // @nullable null when no video card is sufficiently visible in the viewport
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  // @nullable null when there is no nearby non-active video worth prewarming
  const [preloadedVideoId, setPreloadedVideoId] = useState<string | null>(null);
  const [mountedVideoIds, setMountedVideoIds] = useState<string[]>([]);
  // @sync layouts ref is mutated imperatively during render-time onLayout callbacks — not tied to React state
  const layouts = useRef<Map<string, VideoLayout>>(new Map());
  const lastScrollYRef = useRef(0);
  const lastViewportHeightRef = useRef(0);

  const updateSelection = useCallback((scrollY: number, viewportHeight: number) => {
    lastScrollYRef.current = scrollY;
    lastViewportHeightRef.current = viewportHeight;

    if (viewportHeight <= 0) {
      setActiveVideoId((prev) => (prev === null ? prev : null));
      setPreloadedVideoId((prev) => (prev === null ? prev : null));
      setMountedVideoIds((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const viewportTop = scrollY;
    const viewportBottom = scrollY + viewportHeight;
    const viewportCenter = scrollY + viewportHeight / 2;
    const preloadPadding = viewportHeight * PRELOAD_VIEWPORT_PADDING_RATIO;
    const preloadTop = viewportTop - preloadPadding;
    const preloadBottom = viewportBottom + preloadPadding;
    const getVisibilityRatio = (layout: VideoLayout, bandTop: number, bandBottom: number) => {
      const videoTop = layout.y;
      const videoBottom = layout.y + layout.height;
      const visibleTop = Math.max(videoTop, bandTop);
      const visibleBottom = Math.min(videoBottom, bandBottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      return layout.height > 0 ? visibleHeight / layout.height : 0;
    };

    // @contract returns the nearest video whose card is at least 50% visible inside the supplied band.
    const getClosestVideoId = (bandTop: number, bandBottom: number, excludedId?: string | null) => {
      let bestId: string | null = null;
      let bestDistance = Infinity;

      layouts.current.forEach((layout, id) => {
        if (id === excludedId) return;
        const visibleRatio = getVisibilityRatio(layout, bandTop, bandBottom);

        // @invariant 50% visibility gate keeps far-away videos from becoming active/preloaded even though nearby cards can still mount early.
        if (visibleRatio < 0.5) return;

        const videoCenter = layout.y + layout.height / 2;
        const distance = Math.abs(videoCenter - viewportCenter);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = id;
        }
      });

      return bestId;
    };

    const bestActiveId = getClosestVideoId(viewportTop, viewportBottom);
    // @edge preloadedVideoId intentionally excludes the active card so the next likely tap target can finish booting its iframe in advance.
    const bestPreloadedId = getClosestVideoId(preloadTop, preloadBottom, bestActiveId);
    const nextMountedVideoIds = Array.from(layouts.current.entries())
      .filter(
        ([, layout]) =>
          getVisibilityRatio(layout, preloadTop, preloadBottom) >= MOUNT_VISIBLE_RATIO,
      )
      .map(([id]) => id);

    // @edge avoids unnecessary re-renders by skipping setState when activeVideoId hasn't changed
    setActiveVideoId((prev) => (prev === bestActiveId ? prev : bestActiveId));
    setPreloadedVideoId((prev) => (prev === bestPreloadedId ? prev : bestPreloadedId));
    // @edge shallow array comparison is order-sensitive — if the same set of IDs appears in
    // different order (e.g., due to Map iteration order changing after delete+set), this
    // will trigger a re-render even though the mounted set is logically identical
    setMountedVideoIds((prev) =>
      prev.length === nextMountedVideoIds.length &&
      prev.every((id, index) => id === nextMountedVideoIds[index])
        ? prev
        : nextMountedVideoIds,
    );
  }, []);

  // @sideeffect mutates layouts ref; callers must provide absolute y relative to ScrollView content, not screen
  const registerVideoLayout = useCallback(
    (id: string, y: number, height: number) => {
      layouts.current.set(id, { y, height });
      if (lastViewportHeightRef.current > 0) {
        updateSelection(lastScrollYRef.current, lastViewportHeightRef.current);
      }
    },
    [updateSelection],
  );

  // @sideeffect removes entry from layouts ref — call on feed item unmount to prevent memory leak
  const unregisterVideoLayout = useCallback(
    (id: string) => {
      layouts.current.delete(id);
      if (lastViewportHeightRef.current > 0) {
        updateSelection(lastScrollYRef.current, lastViewportHeightRef.current);
      }
    },
    [updateSelection],
  );

  const handleScrollForVideo = useCallback(
    (scrollY: number, viewportHeight: number) => {
      updateSelection(scrollY, viewportHeight);
    },
    [updateSelection],
  );

  return {
    activeVideoId,
    preloadedVideoId,
    mountedVideoIds,
    registerVideoLayout,
    unregisterVideoLayout,
    handleScrollForVideo,
  };
}
