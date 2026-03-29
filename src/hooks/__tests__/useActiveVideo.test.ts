import { renderHook, act } from '@testing-library/react-native';
import { useActiveVideo } from '../useActiveVideo';

describe('useActiveVideo', () => {
  it('returns null when no videos registered', () => {
    const { result } = renderHook(() => useActiveVideo());
    expect(result.current.activeVideoId).toBeNull();
    expect(result.current.preloadedVideoId).toBeNull();
    expect(result.current.mountedVideoIds).toEqual([]);
  });

  it('returns null after scroll with no registered videos', () => {
    const { result } = renderHook(() => useActiveVideo());
    act(() => {
      result.current.handleScrollForVideo(0, 800);
    });
    expect(result.current.activeVideoId).toBeNull();
    expect(result.current.preloadedVideoId).toBeNull();
    expect(result.current.mountedVideoIds).toEqual([]);
  });

  it('activates the only visible video', () => {
    const { result } = renderHook(() => useActiveVideo());

    act(() => {
      result.current.registerVideoLayout('v1', 200, 200);
    });

    act(() => {
      result.current.handleScrollForVideo(0, 800);
    });

    expect(result.current.activeVideoId).toBe('v1');
    expect(result.current.preloadedVideoId).toBeNull();
    expect(result.current.mountedVideoIds).toEqual(['v1']);
  });

  it('picks the most centered video when multiple are visible', () => {
    const { result } = renderHook(() => useActiveVideo());

    act(() => {
      result.current.registerVideoLayout('v1', 100, 200); // center = 200
      result.current.registerVideoLayout('v2', 350, 200); // center = 450 (closer to viewport center 400)
      result.current.registerVideoLayout('v3', 600, 200); // center = 700
    });

    // viewport: 0-800, center = 400
    act(() => {
      result.current.handleScrollForVideo(0, 800);
    });

    expect(result.current.activeVideoId).toBe('v2');
    expect(result.current.preloadedVideoId).toBe('v1');
    expect(result.current.mountedVideoIds).toEqual(['v1', 'v2', 'v3']);
  });

  it('ignores video with less than 50% visibility', () => {
    const { result } = renderHook(() => useActiveVideo());

    act(() => {
      // Video at y=700, height=200 → bottom=900. Viewport 0-800 sees 100px of 200 = 50%
      result.current.registerVideoLayout('v1', 700, 200);
      // Video at y=710, height=200 → bottom=910. Viewport 0-800 sees 90px of 200 = 45% — too little
      result.current.registerVideoLayout('v2', 710, 200);
    });

    act(() => {
      result.current.handleScrollForVideo(0, 800);
    });

    expect(result.current.activeVideoId).toBe('v1');
    expect(result.current.preloadedVideoId).toBe('v2');
  });

  it('returns null when all videos are off-screen', () => {
    const { result } = renderHook(() => useActiveVideo());

    act(() => {
      result.current.registerVideoLayout('v1', 1000, 200);
    });

    act(() => {
      result.current.handleScrollForVideo(0, 800);
    });

    expect(result.current.activeVideoId).toBeNull();
    expect(result.current.preloadedVideoId).toBeNull();
  });

  it('preloads a nearby non-active video that is just below the viewport', () => {
    const { result } = renderHook(() => useActiveVideo());

    act(() => {
      result.current.registerVideoLayout('active', 250, 200);
      result.current.registerVideoLayout('v1', 880, 200);
    });

    act(() => {
      result.current.handleScrollForVideo(0, 800);
    });

    expect(result.current.activeVideoId).toBe('active');
    expect(result.current.preloadedVideoId).toBe('v1');
    expect(result.current.mountedVideoIds).toEqual(['active', 'v1']);
  });

  it('mounts every nearby visible video so more than one feed card can be ready for a first tap', () => {
    const { result } = renderHook(() => useActiveVideo());

    act(() => {
      result.current.registerVideoLayout('v1', 120, 180);
      result.current.registerVideoLayout('v2', 360, 180);
      result.current.registerVideoLayout('v3', 640, 180);
    });

    act(() => {
      result.current.handleScrollForVideo(0, 800);
    });

    expect(result.current.activeVideoId).toBe('v2');
    expect(result.current.mountedVideoIds).toEqual(['v1', 'v2', 'v3']);
  });

  it('recomputes active video when a visible card registers after viewport metrics are known', () => {
    const { result } = renderHook(() => useActiveVideo());

    act(() => {
      result.current.handleScrollForVideo(0, 800);
    });

    act(() => {
      result.current.registerVideoLayout('v1', 240, 200);
    });

    expect(result.current.activeVideoId).toBe('v1');
    expect(result.current.preloadedVideoId).toBeNull();
  });

  it('updates active video as user scrolls', () => {
    const { result } = renderHook(() => useActiveVideo());

    act(() => {
      result.current.registerVideoLayout('v1', 100, 200);
      result.current.registerVideoLayout('v2', 900, 200);
    });

    // Initially v1 is visible
    act(() => {
      result.current.handleScrollForVideo(0, 800);
    });
    expect(result.current.activeVideoId).toBe('v1');
    expect(result.current.preloadedVideoId).toBe('v2');

    // Scroll down — v2 becomes centered
    act(() => {
      result.current.handleScrollForVideo(600, 800);
    });
    expect(result.current.activeVideoId).toBe('v2');
    expect(result.current.preloadedVideoId).toBeNull();
  });

  it('unregisters a video so it is no longer considered', () => {
    const { result } = renderHook(() => useActiveVideo());

    act(() => {
      result.current.registerVideoLayout('v1', 100, 200);
    });

    act(() => {
      result.current.unregisterVideoLayout('v1');
    });

    act(() => {
      result.current.handleScrollForVideo(0, 800);
    });

    expect(result.current.activeVideoId).toBeNull();
    expect(result.current.preloadedVideoId).toBeNull();
    expect(result.current.mountedVideoIds).toEqual([]);
  });

  it('overwrites layout on re-register', () => {
    const { result } = renderHook(() => useActiveVideo());

    act(() => {
      result.current.registerVideoLayout('v1', 100, 200);
    });

    // Re-register with new position
    act(() => {
      result.current.registerVideoLayout('v1', 2000, 200);
    });

    act(() => {
      result.current.handleScrollForVideo(0, 800);
    });

    // v1 is now off-screen at y=2000
    expect(result.current.activeVideoId).toBeNull();
    expect(result.current.preloadedVideoId).toBeNull();
  });
});
