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

  it('resets all state to null/empty when viewportHeight becomes 0 from a non-null state', () => {
    const { result } = renderHook(() => useActiveVideo());

    // Register a video and establish an active state
    act(() => {
      result.current.registerVideoLayout('v1', 100, 200);
      result.current.handleScrollForVideo(0, 800);
    });
    expect(result.current.activeVideoId).toBe('v1');

    // Now viewport height becomes 0 (e.g. layout not measured yet / off-screen)
    act(() => {
      result.current.handleScrollForVideo(0, 0);
    });
    expect(result.current.activeVideoId).toBeNull();
    expect(result.current.preloadedVideoId).toBeNull();
    expect(result.current.mountedVideoIds).toEqual([]);
  });

  it('stays null/empty without re-render when viewportHeight is 0 and state is already null', () => {
    const { result } = renderHook(() => useActiveVideo());
    // No videos registered — state is already null/empty
    // Trigger the viewportHeight <= 0 guard while already in null state
    act(() => {
      result.current.handleScrollForVideo(0, 0);
    });
    // State should still be null/empty — the no-change branches of setState are exercised
    expect(result.current.activeVideoId).toBeNull();
    expect(result.current.preloadedVideoId).toBeNull();
    expect(result.current.mountedVideoIds).toEqual([]);
  });

  it('stays null/empty on second call with viewportHeight=0 (preloadedVideoId already null branch)', () => {
    const { result } = renderHook(() => useActiveVideo());
    // First call: viewportHeight=0 with no state → no-change paths for all three setState calls
    act(() => {
      result.current.handleScrollForVideo(0, 0);
    });
    // Second call: state still null/empty — same no-change paths hit again (covers remaining branches)
    act(() => {
      result.current.handleScrollForVideo(0, 0);
    });
    expect(result.current.preloadedVideoId).toBeNull();
    expect(result.current.mountedVideoIds).toEqual([]);
  });

  it('stays preloadedVideoId=null without re-render when called with viewportHeight=0 twice consecutively', () => {
    const { result } = renderHook(() => useActiveVideo());
    // Set up a preloadedVideoId first
    act(() => {
      result.current.registerVideoLayout('active', 250, 200);
      result.current.registerVideoLayout('near', 880, 200);
      result.current.handleScrollForVideo(0, 800);
    });
    expect(result.current.preloadedVideoId).toBe('near');

    // Reset with viewport=0 → preloadedVideoId goes to null
    act(() => {
      result.current.handleScrollForVideo(0, 0);
    });
    expect(result.current.preloadedVideoId).toBeNull();

    // Call again with viewport=0 → prev is already null → the `prev === null ? prev` true branch
    act(() => {
      result.current.handleScrollForVideo(0, 0);
    });
    expect(result.current.preloadedVideoId).toBeNull();
  });

  it('handles video with zero height (returns 0 visibility ratio)', () => {
    const { result } = renderHook(() => useActiveVideo());

    // Register a video with height=0 — getVisibilityRatio returns 0 (the layout.height===0 branch)
    act(() => {
      result.current.registerVideoLayout('v1', 100, 0);
      result.current.handleScrollForVideo(0, 800);
    });
    // Zero-height video can never hit 50% visibility — should not become active
    expect(result.current.activeVideoId).toBeNull();
    expect(result.current.preloadedVideoId).toBeNull();
  });

  it('recomputes selection immediately when unregistering after viewport is known', () => {
    const { result } = renderHook(() => useActiveVideo());

    // Register two videos: v1 is centered in viewport (y=300, height=200 → center=400 = vp center)
    // v2 is off to the side (y=100, height=50 → barely visible but at 50% threshold)
    act(() => {
      result.current.registerVideoLayout('v1', 300, 200); // center = 400 (vp center)
      result.current.registerVideoLayout('v2', 100, 200); // center = 200
      result.current.handleScrollForVideo(0, 800);
    });
    // v1 is closer to center (400) so it's active
    expect(result.current.activeVideoId).toBe('v1');

    // Unregister v1 while viewport metrics are known — updateSelection fires immediately
    act(() => {
      result.current.unregisterVideoLayout('v1');
    });
    // v2 is now the only registered video — becomes active
    expect(result.current.activeVideoId).toBe('v2');
  });

  it('skips re-render when mountedVideoIds list is unchanged (same length and same IDs)', () => {
    const { result } = renderHook(() => useActiveVideo());

    act(() => {
      result.current.registerVideoLayout('v1', 100, 200);
      result.current.handleScrollForVideo(0, 800);
    });
    const mountedAfterFirstScroll = result.current.mountedVideoIds;

    // Scroll slightly — same video still mounted, list reference should be stable
    act(() => {
      result.current.handleScrollForVideo(10, 800);
    });
    // Same IDs in same order → prev reference is preserved (no new array)
    expect(result.current.mountedVideoIds).toBe(mountedAfterFirstScroll);
  });
});
