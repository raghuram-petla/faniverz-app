import { renderHook, act } from '@testing-library/react-native';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';

jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
}));

function makeMessageEvent(data: object) {
  return { nativeEvent: { data: JSON.stringify(data) } } as never;
}

describe('useYouTubePlayer', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    expect(result.current.state.playerState).toBe('unstarted');
    expect(result.current.state.isReady).toBe(false);
    expect(result.current.state.currentTime).toBe(0);
    expect(result.current.state.duration).toBe(0);
  });

  it('sets isReady and duration on ready message', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    act(() => {
      result.current.handleMessage(makeMessageEvent({ type: 'ready', duration: 120 }));
    });
    expect(result.current.state.isReady).toBe(true);
    expect(result.current.state.duration).toBe(120);
  });

  it('updates playerState on stateChange message', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    act(() => {
      result.current.handleMessage(
        makeMessageEvent({ type: 'stateChange', playerState: 'playing' }),
      );
    });
    expect(result.current.state.playerState).toBe('playing');
  });

  it('updates currentTime and duration on timeUpdate message', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    act(() => {
      result.current.handleMessage(
        makeMessageEvent({ type: 'timeUpdate', currentTime: 45, duration: 180 }),
      );
    });
    expect(result.current.state.currentTime).toBe(45);
    expect(result.current.state.duration).toBe(180);
  });

  it('ignores malformed messages without throwing', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    expect(() => {
      act(() => {
        result.current.handleMessage({ nativeEvent: { data: 'not json' } } as never);
      });
    }).not.toThrow();
    expect(result.current.state.playerState).toBe('unstarted');
  });

  it('exposes a stable webViewRef', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    expect(result.current.webViewRef).toBeDefined();
    expect(typeof result.current.webViewRef).toBe('object');
  });

  it('exposes togglePlayPause and seek actions', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    expect(typeof result.current.actions.togglePlayPause).toBe('function');
    expect(typeof result.current.actions.seek).toBe('function');
  });

  it('seek does not throw when webViewRef is unattached', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    expect(() => {
      act(() => result.current.actions.seek(30));
    }).not.toThrow();
  });

  it('togglePlayPause does not throw when webViewRef is unattached', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    expect(() => {
      act(() => result.current.actions.togglePlayPause());
    }).not.toThrow();
  });

  it('togglePlayPause sends pause command when playing', () => {
    const mockInjectJS = jest.fn();
    const { result } = renderHook(() => useYouTubePlayer());

    // Set state to playing
    act(() => {
      result.current.handleMessage(
        makeMessageEvent({ type: 'stateChange', playerState: 'playing' }),
      );
    });

    // Attach mock webview ref
    (result.current.webViewRef as any).current = { injectJavaScript: mockInjectJS };

    act(() => {
      result.current.actions.togglePlayPause();
    });

    expect(mockInjectJS).toHaveBeenCalledWith("window.receiveCommand('pause'); true;");
  });

  it('togglePlayPause sends play command when paused', () => {
    const mockInjectJS = jest.fn();
    const { result } = renderHook(() => useYouTubePlayer());

    // Set state to paused
    act(() => {
      result.current.handleMessage(
        makeMessageEvent({ type: 'stateChange', playerState: 'paused' }),
      );
    });

    (result.current.webViewRef as any).current = { injectJavaScript: mockInjectJS };

    act(() => {
      result.current.actions.togglePlayPause();
    });

    expect(mockInjectJS).toHaveBeenCalledWith("window.receiveCommand('play'); true;");
  });

  it('seek sends seek command with time value', () => {
    const mockInjectJS = jest.fn();
    const { result } = renderHook(() => useYouTubePlayer());

    (result.current.webViewRef as any).current = { injectJavaScript: mockInjectJS };

    act(() => {
      result.current.actions.seek(45);
    });

    expect(mockInjectJS).toHaveBeenCalledWith("window.receiveCommand('seek', 45); true;");
  });

  it('handles unknown message type gracefully', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    act(() => {
      result.current.handleMessage(makeMessageEvent({ type: 'unknown', data: 'test' }));
    });
    // State should not change
    expect(result.current.state.playerState).toBe('unstarted');
    expect(result.current.state.isReady).toBe(false);
  });
});
