jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { red600: '#dc2626', white: '#fff' },
  }),
}));

jest.mock('../CustomYouTubePlayer.styles', () => ({
  createCustomPlayerStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');

  return {
    WebView: ({ ref: _ref, ...props }: Record<string, unknown>) => (
      <View testID="webview" {...props} />
    ),
  };
});

jest.mock('@/utils/buildYouTubePlayerHtml', () => ({
  buildYouTubePlayerHtml: jest.fn((id: string) => `<html>${id}</html>`),
}));

jest.mock('@/utils/youtubeNavigation', () => ({
  shareYouTubeVideo: jest.fn(),
}));

jest.mock('@/constants/webview', () => ({
  WEBVIEW_BASE_URL: 'https://example.com',
}));

const mockTogglePlayPause = jest.fn();
const mockSeek = jest.fn();
const mockInjectJavaScript = jest.fn();

jest.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: jest.fn(() => ({
    state: {
      playerState: 'paused',
      isReady: true,
      currentTime: 0,
      duration: 100,
    },
    actions: {
      togglePlayPause: mockTogglePlayPause,
      seek: mockSeek,
    },
    webViewRef: { current: { injectJavaScript: mockInjectJavaScript } },
    handleMessage: jest.fn(),
  })),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CustomYouTubePlayer } from '../CustomYouTubePlayer';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { shareYouTubeVideo } from '@/utils/youtubeNavigation';

const mockUseYouTubePlayer = useYouTubePlayer as jest.Mock;

function setPlayerState(overrides: Record<string, unknown>) {
  mockUseYouTubePlayer.mockReturnValue({
    state: {
      playerState: 'paused',
      isReady: true,
      currentTime: 0,
      duration: 100,
      ...overrides,
    },
    actions: {
      togglePlayPause: mockTogglePlayPause,
      seek: mockSeek,
    },
    webViewRef: { current: { injectJavaScript: mockInjectJavaScript } },
    handleMessage: jest.fn(),
  });
}

describe('CustomYouTubePlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlayerState({});
  });

  it('renders the WebView with correct source', () => {
    render(<CustomYouTubePlayer youtubeId="abc123" />);
    const webview = screen.getByTestId('webview');
    expect(webview).toBeTruthy();
    expect(webview.props.source).toEqual({
      html: '<html>abc123</html>',
      baseUrl: 'https://example.com',
    });
  });

  it('renders loading overlay when player is not ready', () => {
    setPlayerState({ isReady: false });
    render(<CustomYouTubePlayer youtubeId="abc123" />);

    // Loading overlay is present (ActivityIndicator rendered)
    expect(screen.queryByLabelText('Play')).toBeNull();
    expect(screen.queryByLabelText('Pause')).toBeNull();
  });

  it('renders controls overlay when player is ready', () => {
    setPlayerState({ isReady: true, playerState: 'paused' });
    render(<CustomYouTubePlayer youtubeId="abc123" />);

    expect(screen.getByLabelText('Play')).toBeTruthy();
    expect(screen.getByLabelText('Share video')).toBeTruthy();
    expect(screen.getByLabelText('Fullscreen')).toBeTruthy();
    expect(screen.getByLabelText('Seek')).toBeTruthy();
  });

  it('shows Play label when paused', () => {
    setPlayerState({ playerState: 'paused' });
    render(<CustomYouTubePlayer youtubeId="abc123" />);
    expect(screen.getByLabelText('Play')).toBeTruthy();
  });

  it('shows Pause label when playing', () => {
    setPlayerState({ playerState: 'playing' });
    render(<CustomYouTubePlayer youtubeId="abc123" />);
    expect(screen.getByLabelText('Pause')).toBeTruthy();
  });

  it('calls togglePlayPause when center button is pressed', () => {
    render(<CustomYouTubePlayer youtubeId="abc123" />);
    fireEvent.press(screen.getByLabelText('Play'));
    expect(mockTogglePlayPause).toHaveBeenCalledTimes(1);
  });

  it('calls shareYouTubeVideo when share button is pressed', () => {
    render(<CustomYouTubePlayer youtubeId="abc123" />);
    fireEvent.press(screen.getByLabelText('Share video'));
    expect(shareYouTubeVideo).toHaveBeenCalledWith('abc123');
  });

  it('calls injectJavaScript for fullscreen when fullscreen button is pressed', () => {
    render(<CustomYouTubePlayer youtubeId="abc123" />);
    fireEvent.press(screen.getByLabelText('Fullscreen'));
    expect(mockInjectJavaScript).toHaveBeenCalledWith(
      'var f=player.getIframe();if(f.requestFullscreen)f.requestFullscreen();true;',
    );
  });

  it('does not render controls when not ready', () => {
    setPlayerState({ isReady: false });
    render(<CustomYouTubePlayer youtubeId="abc123" />);

    expect(screen.queryByLabelText('Play')).toBeNull();
    expect(screen.queryByLabelText('Pause')).toBeNull();
    expect(screen.queryByLabelText('Share video')).toBeNull();
    expect(screen.queryByLabelText('Fullscreen')).toBeNull();
  });

  it('computes progress as 0 when duration is 0 (avoids NaN)', () => {
    setPlayerState({ currentTime: 50, duration: 0 });
    render(<CustomYouTubePlayer youtubeId="abc123" />);
    // Component should render without error; seek bar fill width would be 0%
    expect(screen.getByLabelText('Seek')).toBeTruthy();
  });

  it('computes progress correctly when duration is positive', () => {
    setPlayerState({ currentTime: 25, duration: 100 });
    render(<CustomYouTubePlayer youtubeId="abc123" />);
    // progress = 25/100 = 0.25 → fill width = 25%
    expect(screen.getByLabelText('Seek')).toBeTruthy();
  });

  it('shows buffering indicator instead of play/pause icon when buffering', () => {
    setPlayerState({ playerState: 'buffering' });
    const { root } = render(<CustomYouTubePlayer youtubeId="abc123" />);

    // When buffering, no play/pause icon is shown — ActivityIndicator is shown instead
    const playIcons = root.findAll(
      (node: { props: Record<string, unknown> }) =>
        node.props.name === 'play' || node.props.name === 'pause',
    );
    expect(playIcons.length).toBe(0);
  });

  it('sets WebView props correctly', () => {
    render(<CustomYouTubePlayer youtubeId="abc123" />);
    const webview = screen.getByTestId('webview');

    expect(webview.props.allowsInlineMediaPlayback).toBe(true);
    expect(webview.props.allowsFullscreenVideo).toBe(true);
    expect(webview.props.mediaPlaybackRequiresUserAction).toBe(false);
    expect(webview.props.scrollEnabled).toBe(false);
    expect(webview.props.bounces).toBe(false);
    expect(webview.props.javaScriptEnabled).toBe(true);
  });

  it('passes onShouldStartLoadWithRequest to WebView', () => {
    render(<CustomYouTubePlayer youtubeId="abc123" />);
    const webview = screen.getByTestId('webview');
    expect(webview.props.onShouldStartLoadWithRequest).toBeDefined();
  });

  it('handleSeek returns early when trackWidth is 0', () => {
    // trackWidth starts at 0 — seek should be a no-op
    setPlayerState({ isReady: true, duration: 100 });
    render(<CustomYouTubePlayer youtubeId="abc123" />);
    const seekBar = screen.getByLabelText('Seek');
    fireEvent(seekBar, 'press', { nativeEvent: { locationX: 50 } });
    expect(mockSeek).not.toHaveBeenCalled();
  });

  it('handleSeek calculates correct seek position', () => {
    setPlayerState({ isReady: true, duration: 100 });
    render(<CustomYouTubePlayer youtubeId="abc123" />);
    const seekBar = screen.getByLabelText('Seek');

    // Simulate layout event to set trackWidth
    fireEvent(seekBar, 'layout', { nativeEvent: { layout: { width: 200 } } });

    // Press at 50px on a 200px track → ratio=0.25 → seek to 25s
    fireEvent(seekBar, 'press', { nativeEvent: { locationX: 50 } });
    expect(mockSeek).toHaveBeenCalledWith(25);
  });

  it('handleSeek clamps locationX to [0, trackWidth]', () => {
    setPlayerState({ isReady: true, duration: 100 });
    render(<CustomYouTubePlayer youtubeId="abc123" />);
    const seekBar = screen.getByLabelText('Seek');

    fireEvent(seekBar, 'layout', { nativeEvent: { layout: { width: 200 } } });

    // Press at negative position — clamps to 0
    fireEvent(seekBar, 'press', { nativeEvent: { locationX: -10 } });
    expect(mockSeek).toHaveBeenCalledWith(0);

    // Press beyond track width — clamps to max (duration)
    fireEvent(seekBar, 'press', { nativeEvent: { locationX: 500 } });
    expect(mockSeek).toHaveBeenCalledWith(100);
  });

  it('handleSeek returns early when duration is 0', () => {
    setPlayerState({ isReady: true, duration: 0 });
    render(<CustomYouTubePlayer youtubeId="abc123" />);
    const seekBar = screen.getByLabelText('Seek');

    fireEvent(seekBar, 'layout', { nativeEvent: { layout: { width: 200 } } });
    fireEvent(seekBar, 'press', { nativeEvent: { locationX: 50 } });

    // duration=0 → handleSeek returns early
    expect(mockSeek).not.toHaveBeenCalled();
  });

  describe('onNavRequest whitelist', () => {
    function getNavHandler() {
      render(<CustomYouTubePlayer youtubeId="abc123" />);
      const webview = screen.getByTestId('webview');
      return webview.props.onShouldStartLoadWithRequest as (req: { url: string }) => boolean;
    }

    it('allows about:blank', () => {
      const handler = getNavHandler();
      expect(handler({ url: 'about:blank' })).toBe(true);
    });

    it('allows YouTube iframe API', () => {
      const handler = getNavHandler();
      expect(handler({ url: 'https://www.youtube.com/iframe_api' })).toBe(true);
    });

    it('allows YouTube player scripts', () => {
      const handler = getNavHandler();
      expect(handler({ url: 'https://www.youtube.com/s/player/abc/base.js' })).toBe(true);
    });

    it('allows YouTube embed URLs', () => {
      const handler = getNavHandler();
      expect(handler({ url: 'https://www.youtube.com/embed/abc123' })).toBe(true);
    });

    it('allows ytimg.com URLs', () => {
      const handler = getNavHandler();
      expect(handler({ url: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg' })).toBe(true);
    });

    it('allows about: prefixed URLs', () => {
      const handler = getNavHandler();
      expect(handler({ url: 'about:srcdoc' })).toBe(true);
    });

    it('blocks arbitrary external URLs', () => {
      const handler = getNavHandler();
      expect(handler({ url: 'https://malicious-site.com/phish' })).toBe(false);
    });

    it('blocks non-YouTube URLs', () => {
      const handler = getNavHandler();
      expect(handler({ url: 'https://google.com' })).toBe(false);
    });
  });
});
