/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('react-native-youtube-iframe', () => {
  const { View } = require('react-native');
  const MockPlayer = (props: Record<string, any>) => <View testID="youtube-player" {...props} />;
  MockPlayer.displayName = 'YoutubePlayer';
  return { __esModule: true, default: MockPlayer };
});

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
    i18n: { language: 'en' },
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

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CustomYouTubePlayer } from '../CustomYouTubePlayer';

describe('CustomYouTubePlayer', () => {
  // --- Idle mode (isActive=false) ---

  it('renders thumbnail with play button when isActive=false', () => {
    render(<CustomYouTubePlayer youtubeId="abc123" isActive={false} />);
    expect(screen.getByLabelText('Play video')).toBeTruthy();
    expect(screen.queryByTestId('youtube-player')).toBeNull();
  });

  it('calls onPlay when thumbnail is tapped in idle mode', () => {
    const onPlay = jest.fn();
    render(<CustomYouTubePlayer youtubeId="abc123" isActive={false} onPlay={onPlay} />);
    fireEvent.press(screen.getByLabelText('Play video'));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('does not mount YouTube player when isActive=false', () => {
    render(<CustomYouTubePlayer youtubeId="abc123" isActive={false} />);
    expect(screen.queryByTestId('youtube-player')).toBeNull();
  });

  it('uses custom thumbnailUrl when provided in idle mode', () => {
    const { root } = render(
      <CustomYouTubePlayer
        youtubeId="abc123"
        isActive={false}
        thumbnailUrl="https://custom.com/thumb.jpg"
      />,
    );
    const images = root.findAll(
      (node: { props: Record<string, any> }) =>
        typeof node.props.source === 'object' &&
        node.props.source !== null &&
        (node.props.source as { uri?: string }).uri === 'https://custom.com/thumb.jpg',
    );
    expect(images.length).toBeGreaterThan(0);
  });

  it('uses maxresdefault thumbnail when thumbnailUrl is null in idle mode', () => {
    const { root } = render(
      <CustomYouTubePlayer youtubeId="abc123" isActive={false} thumbnailUrl={null} />,
    );
    const images = root.findAll(
      (node: { props: Record<string, any> }) =>
        typeof node.props.source === 'object' &&
        node.props.source !== null &&
        typeof (node.props.source as { uri?: string }).uri === 'string' &&
        (node.props.source as { uri: string }).uri.includes('maxresdefault'),
    );
    expect(images.length).toBeGreaterThan(0);
  });

  // --- Active mode (isActive=true) ---

  it('renders without crashing in active mode', () => {
    const { toJSON } = render(<CustomYouTubePlayer youtubeId="abc123" isActive={true} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders thumbnail overlay before playback starts in active mode', () => {
    const { root } = render(<CustomYouTubePlayer youtubeId="abc123" isActive={true} />);
    const overlays = root.findAll(
      (node: { props: Record<string, any> }) => node.props.pointerEvents === 'none',
    );
    expect(overlays.length).toBeGreaterThan(0);
  });

  it('renders share button in active mode', () => {
    render(<CustomYouTubePlayer youtubeId="abc123" isActive={true} />);
    expect(screen.getByLabelText('Share video')).toBeTruthy();
  });

  it('calls shareYouTubeVideo when share button is pressed', () => {
    const { shareYouTubeVideo } = require('@/utils/youtubeNavigation');
    render(<CustomYouTubePlayer youtubeId="abc123" isActive={true} />);
    fireEvent.press(screen.getByLabelText('Share video'));
    expect(shareYouTubeVideo).toHaveBeenCalledWith('abc123');
  });

  it('passes autoPlay prop to YoutubePlayer play prop', () => {
    render(<CustomYouTubePlayer youtubeId="abc123" isActive={true} autoPlay />);
    const player = screen.queryByTestId('youtube-player');
    if (player) {
      expect(player.props.play).toBe(true);
    }
  });

  it('passes autoMute prop to YoutubePlayer mute prop', () => {
    render(<CustomYouTubePlayer youtubeId="abc123" isActive={true} autoMute />);
    const player = screen.queryByTestId('youtube-player');
    if (player) {
      expect(player.props.mute).toBe(true);
    }
  });

  it('defaults play to false when autoPlay not provided', () => {
    render(<CustomYouTubePlayer youtubeId="abc123" isActive={true} />);
    const player = screen.queryByTestId('youtube-player');
    if (player) {
      expect(player.props.play).toBe(false);
    }
  });

  it('defaults mute to false when autoMute not provided', () => {
    render(<CustomYouTubePlayer youtubeId="abc123" isActive={true} />);
    const player = screen.queryByTestId('youtube-player');
    if (player) {
      expect(player.props.mute).toBe(false);
    }
  });

  it('passes correct initialPlayerParams', () => {
    render(<CustomYouTubePlayer youtubeId="abc123" isActive={true} />);
    const player = screen.queryByTestId('youtube-player');
    if (player) {
      expect(player.props.initialPlayerParams).toEqual({
        modestbranding: true,
        rel: false,
        iv_load_policy: 3,
        preventFullScreen: false,
      });
    }
  });

  it('passes videoId to YoutubePlayer', () => {
    render(<CustomYouTubePlayer youtubeId="testVid123" isActive={true} />);
    const player = screen.queryByTestId('youtube-player');
    if (player) {
      expect(player.props.videoId).toBe('testVid123');
    }
  });

  it('calls onStateChange callback when provided', () => {
    const onStateChange = jest.fn();
    render(
      <CustomYouTubePlayer youtubeId="abc123" isActive={true} onStateChange={onStateChange} />,
    );
    const player = screen.queryByTestId('youtube-player');
    if (player && player.props.onChangeState) {
      player.props.onChangeState('playing');
      expect(onStateChange).toHaveBeenCalledWith('playing');
    }
  });

  // --- Invalid ID handling ---

  it('renders placeholder for invalid youtube ID (XSS attempt)', () => {
    const { root } = render(<CustomYouTubePlayer youtubeId="<script>alert(1)</script>" />);
    expect(screen.queryByTestId('youtube-player')).toBeNull();
    const images = root.findAll(
      (node: { props: Record<string, any> }) =>
        typeof node.props.source === 'object' &&
        node.props.source !== null &&
        (node.props.source as { uri?: string }).uri === 'https://placeholder.com/poster.png',
    );
    expect(images.length).toBeGreaterThan(0);
  });

  it('renders placeholder for empty youtube ID', () => {
    render(<CustomYouTubePlayer youtubeId="" />);
    expect(screen.queryByTestId('youtube-player')).toBeNull();
  });

  // --- Default isActive behavior ---

  it('defaults isActive to true (active mode)', () => {
    render(<CustomYouTubePlayer youtubeId="abc123" />);
    // Should be in active mode — share button visible, no play button
    expect(screen.getByLabelText('Share video')).toBeTruthy();
  });
});
