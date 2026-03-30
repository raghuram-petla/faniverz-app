jest.mock('@/components/youtube/CustomYouTubePlayer', () => {
  const { View } = require('react-native');
  return {
    CustomYouTubePlayer: (props: Record<string, unknown>) => (
      <View testID="youtube-player" {...props} />
    ),
  };
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { FeedVideoPlayer } from '../FeedVideoPlayer';

describe('FeedVideoPlayer', () => {
  const defaultProps = {
    youtubeId: 'abc123',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    isActive: false,
    shouldMount: false,
  };

  it('passes youtubeId to CustomYouTubePlayer', () => {
    render(<FeedVideoPlayer {...defaultProps} />);
    const player = screen.getByTestId('youtube-player');
    expect(player.props.youtubeId).toBe('abc123');
  });

  it('passes thumbnailUrl to CustomYouTubePlayer', () => {
    render(<FeedVideoPlayer {...defaultProps} />);
    const player = screen.getByTestId('youtube-player');
    expect(player.props.thumbnailUrl).toBe('https://example.com/thumb.jpg');
  });

  it('passes isActive=false to CustomYouTubePlayer when inactive', () => {
    render(<FeedVideoPlayer {...defaultProps} isActive={false} shouldMount={false} />);
    const player = screen.getByTestId('youtube-player');
    expect(player.props.isActive).toBe(false);
    expect(player.props.autoPlay).toBe(false);
    expect(player.props.mountShellWhenIdle).toBe(false);
  });

  it('mounts the interactive shell without autoplay when preloading a nearby video', () => {
    render(<FeedVideoPlayer {...defaultProps} isActive={false} shouldMount={true} />);
    const player = screen.getByTestId('youtube-player');
    expect(player.props.isActive).toBe(false);
    expect(player.props.autoPlay).toBe(false);
    expect(player.props.mountShellWhenIdle).toBe(true);
  });

  it('keeps active feed cards mounted without autoplay until the user taps', () => {
    render(<FeedVideoPlayer {...defaultProps} isActive={true} />);
    const player = screen.getByTestId('youtube-player');
    expect(player.props.isActive).toBe(false);
    expect(player.props.autoPlay).toBe(false);
    expect(player.props.mountShellWhenIdle).toBe(true);
  });

  it('keeps feed videos unmuted until manual playback starts', () => {
    render(<FeedVideoPlayer {...defaultProps} isActive={true} />);
    expect(screen.getByTestId('youtube-player').props.autoMute).toBe(false);
  });

  it('passes autoMute=false when inactive (player not mounted anyway)', () => {
    render(<FeedVideoPlayer {...defaultProps} isActive={false} />);
    expect(screen.getByTestId('youtube-player').props.autoMute).toBe(false);
  });

  it('passes null thumbnailUrl when provided', () => {
    render(<FeedVideoPlayer {...defaultProps} thumbnailUrl={null} />);
    const player = screen.getByTestId('youtube-player');
    expect(player.props.thumbnailUrl).toBeNull();
  });

  it('passes onPlay handler to CustomYouTubePlayer', () => {
    render(<FeedVideoPlayer {...defaultProps} />);
    const player = screen.getByTestId('youtube-player');
    expect(typeof player.props.onPlay).toBe('function');
  });

  it('activates player when onPlay is called (manual tap)', () => {
    render(<FeedVideoPlayer {...defaultProps} isActive={false} shouldMount={false} />);
    const player = screen.getByTestId('youtube-player');

    // Simulate the onPlay callback being invoked by CustomYouTubePlayer
    React.act(() => {
      player.props.onPlay();
    });

    const updated = screen.getByTestId('youtube-player');
    expect(updated.props.isActive).toBe(true);
    expect(updated.props.autoPlay).toBe(true);
    expect(updated.props.autoMute).toBe(false);
    expect(updated.props.mountShellWhenIdle).toBe(true);
  });

  it('resets manual playback when FlashList recycles the cell for a new video id', async () => {
    const { rerender } = render(
      <FeedVideoPlayer {...defaultProps} youtubeId="abc123" isActive={false} shouldMount={false} />,
    );

    React.act(() => {
      screen.getByTestId('youtube-player').props.onPlay();
    });
    expect(screen.getByTestId('youtube-player').props.autoPlay).toBe(true);

    rerender(
      <FeedVideoPlayer {...defaultProps} youtubeId="xyz789" isActive={false} shouldMount={false} />,
    );

    await waitFor(() => {
      const recycledPlayer = screen.getByTestId('youtube-player');
      expect(recycledPlayer.props.youtubeId).toBe('xyz789');
      expect(recycledPlayer.props.isActive).toBe(false);
      expect(recycledPlayer.props.autoPlay).toBe(false);
    });
  });

  it('passes borderRadius=0 for edge-to-edge feed layout', () => {
    render(<FeedVideoPlayer {...defaultProps} />);
    expect(screen.getByTestId('youtube-player').props.borderRadius).toBe(0);
  });

  it('requests idle shell mounting in feed mode when a card should be kept ready', () => {
    render(<FeedVideoPlayer {...defaultProps} shouldMount={true} />);
    expect(screen.getByTestId('youtube-player').props.mountShellWhenIdle).toBe(true);
  });

  it('does not pass the legacy ready-gated overlay prop anymore', () => {
    render(<FeedVideoPlayer {...defaultProps} />);
    expect(screen.getByTestId('youtube-player').props.showLoadingUntilReady).toBeUndefined();
  });

  it('defaults shouldMount to false when prop is omitted', () => {
    render(<FeedVideoPlayer youtubeId="abc123" thumbnailUrl={null} isActive={false} />);
    const player = screen.getByTestId('youtube-player');
    // shouldMount defaults to false, isActive is false, manualPlay is false → mountShellWhenIdle=false
    expect(player.props.mountShellWhenIdle).toBe(false);
  });
});
