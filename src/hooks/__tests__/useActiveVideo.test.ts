import { renderHook, act } from '@testing-library/react-native';
import { useActiveVideo } from '../useActiveVideo';

describe('useActiveVideo', () => {
  it('returns null when no videos registered', () => {
    const { result } = renderHook(() => useActiveVideo());
    expect(result.current.activeVideoId).toBeNull();
  });

  it('returns null after scroll with no registered videos', () => {
    const { result } = renderHook(() => useActiveVideo());
    act(() => {
      result.current.handleScrollForVideo(0, 800);
    });
    expect(result.current.activeVideoId).toBeNull();
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

    // Scroll down — v2 becomes centered
    act(() => {
      result.current.handleScrollForVideo(600, 800);
    });
    expect(result.current.activeVideoId).toBe('v2');
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
  });
});
