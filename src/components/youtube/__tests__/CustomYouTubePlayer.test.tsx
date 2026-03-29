/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'common.playVideo': 'Play video',
        'common.shareVideo': 'Share video',
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

jest.mock('@/constants/placeholders', () => ({
  PLACEHOLDER_POSTER: 'https://placeholder.com/poster.png',
}));

jest.mock('@/utils/sanitizeYoutubeId', () => ({
  sanitizeYoutubeId: (id: string) => (/^[a-zA-Z0-9_-]+$/.test(id) ? id : ''),
}));

jest.mock('@/utils/youtubeNavigation', () => ({
  shareYouTubeVideo: jest.fn(),
}));

jest.mock('../CustomYouTubePlayer.styles', () => ({
  styles: new Proxy({}, { get: () => ({}) }),
}));

jest.mock('../InlineYouTubeWebView', () => {
  const { View } = require('react-native');
  return {
    InlineYouTubeWebView: (props: Record<string, unknown>) => (
      <View testID="youtube-inline-webview" {...props} />
    ),
  };
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { CustomYouTubePlayer } from '../CustomYouTubePlayer';

describe('CustomYouTubePlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a native thumbnail button when idle shell mounting is disabled', () => {
    render(<CustomYouTubePlayer youtubeId="abc123" isActive={false} />);
    expect(screen.getByLabelText('Play video')).toBeTruthy();
    expect(screen.queryByTestId('youtube-inline-webview')).toBeNull();
  });

  it('calls onPlay when the native idle thumbnail is tapped', () => {
    const onPlay = jest.fn();
    render(<CustomYouTubePlayer youtubeId="abc123" isActive={false} onPlay={onPlay} />);
    fireEvent.press(screen.getByLabelText('Play video'));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('mounts the inline WebView shell when idle mounting is requested', () => {
    render(
      <CustomYouTubePlayer
        youtubeId="abc123"
        isActive={false}
        mountShellWhenIdle
        thumbnailUrl="https://custom.com/thumb.jpg"
      />,
    );
    const player = screen.getByTestId('youtube-inline-webview');
    expect(player.props.videoId).toBe('abc123');
    expect(player.props.thumbnailUrl).toBe('https://custom.com/thumb.jpg');
    expect(player.props.autoPlay).toBe(false);
  });

  it('passes autoplay and mute settings to the inline WebView when active', () => {
    render(
      <CustomYouTubePlayer youtubeId="abc123" isActive={true} autoPlay={true} autoMute={true} />,
    );
    const player = screen.getByTestId('youtube-inline-webview');
    expect(player.props.autoPlay).toBe(true);
    expect(player.props.muted).toBe(true);
    expect(player.props.pauseToken).toBe(0);
  });

  it('calls onPlay when the inline shell reports a play press', () => {
    const onPlay = jest.fn();
    render(
      <CustomYouTubePlayer
        youtubeId="abc123"
        isActive={false}
        mountShellWhenIdle
        onPlay={onPlay}
      />,
    );

    const player = screen.getByTestId('youtube-inline-webview');
    player.props.onPlayPress();

    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('forwards inline state changes to onStateChange', () => {
    const onStateChange = jest.fn();
    render(
      <CustomYouTubePlayer
        youtubeId="abc123"
        isActive={true}
        mountShellWhenIdle
        onStateChange={onStateChange}
      />,
    );

    const player = screen.getByTestId('youtube-inline-webview');
    player.props.onStateChange('playing');

    expect(onStateChange).toHaveBeenCalledWith('playing');
  });

  it('increments resetToken when an interactive shell leaves active playback', () => {
    const { rerender } = render(
      <CustomYouTubePlayer youtubeId="abc123" isActive={true} mountShellWhenIdle />,
    );
    const player = screen.getByTestId('youtube-inline-webview');
    player.props.onStateChange('playing');

    rerender(<CustomYouTubePlayer youtubeId="abc123" isActive={false} mountShellWhenIdle />);

    expect(screen.getByTestId('youtube-inline-webview').props.resetToken).toBe(1);
  });

  it('pauses an older playing shell when another shell starts playing', async () => {
    render(
      <>
        <CustomYouTubePlayer youtubeId="abc123" isActive={true} mountShellWhenIdle />
        <CustomYouTubePlayer youtubeId="def456" isActive={true} mountShellWhenIdle />
      </>,
    );

    let [firstPlayer, secondPlayer] = screen.getAllByTestId('youtube-inline-webview');
    React.act(() => {
      firstPlayer.props.onPlayPress();
      firstPlayer.props.onStateChange('playing');
    });

    [firstPlayer, secondPlayer] = screen.getAllByTestId('youtube-inline-webview');
    expect(firstPlayer.props.pauseToken).toBe(0);
    expect(secondPlayer.props.pauseToken).toBe(0);

    React.act(() => {
      secondPlayer.props.onPlayPress();
      secondPlayer.props.onStateChange('playing');
    });

    await waitFor(() => {
      [firstPlayer, secondPlayer] = screen.getAllByTestId('youtube-inline-webview');
      expect(firstPlayer.props.pauseToken).toBe(1);
      expect(secondPlayer.props.pauseToken).toBe(0);
    });
  });

  it('renders share button whenever the shell is mounted', () => {
    render(<CustomYouTubePlayer youtubeId="abc123" isActive={true} />);
    expect(screen.getByLabelText('Share video')).toBeTruthy();
  });

  it('calls shareYouTubeVideo when share button is pressed', () => {
    const { shareYouTubeVideo } = require('@/utils/youtubeNavigation');
    render(<CustomYouTubePlayer youtubeId="abc123" isActive={true} />);
    fireEvent.press(screen.getByLabelText('Share video'));
    expect(shareYouTubeVideo).toHaveBeenCalledWith('abc123');
  });

  it('falls back to maxresdefault thumbnail when thumbnailUrl is null', () => {
    render(
      <CustomYouTubePlayer
        youtubeId="abc123"
        isActive={false}
        mountShellWhenIdle
        thumbnailUrl={null}
      />,
    );
    expect(screen.getByTestId('youtube-inline-webview').props.thumbnailUrl).toContain(
      'maxresdefault',
    );
  });

  it('renders placeholder for invalid youtube IDs', () => {
    const { root } = render(<CustomYouTubePlayer youtubeId="<script>alert(1)</script>" />);
    expect(screen.queryByTestId('youtube-inline-webview')).toBeNull();
    const images = root.findAll(
      (node: { props: Record<string, any> }) =>
        typeof node.props.source === 'object' &&
        node.props.source !== null &&
        (node.props.source as { uri?: string }).uri === 'https://placeholder.com/poster.png',
    );
    expect(images.length).toBeGreaterThan(0);
  });

  it('defaults to mounting the interactive shell when isActive is omitted', () => {
    render(<CustomYouTubePlayer youtubeId="abc123" />);
    expect(screen.getByTestId('youtube-inline-webview')).toBeTruthy();
  });
});
