jest.mock('@/components/youtube/CustomYouTubePlayer', () => {
  const { View } = require('react-native');
  return {
    CustomYouTubePlayer: (props: Record<string, unknown>) => (
      <View testID="youtube-player" {...props} />
    ),
  };
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { FeedVideoPlayer } from '../FeedVideoPlayer';

describe('FeedVideoPlayer', () => {
  const defaultProps = {
    youtubeId: 'abc123',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    isActive: false,
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
    render(<FeedVideoPlayer {...defaultProps} isActive={false} />);
    const player = screen.getByTestId('youtube-player');
    expect(player.props.isActive).toBe(false);
    expect(player.props.autoPlay).toBe(false);
  });

  it('passes isActive=true and autoPlay=true when active', () => {
    render(<FeedVideoPlayer {...defaultProps} isActive={true} />);
    const player = screen.getByTestId('youtube-player');
    expect(player.props.isActive).toBe(true);
    expect(player.props.autoPlay).toBe(true);
  });

  it('always passes autoMute=true (feed videos are muted)', () => {
    render(<FeedVideoPlayer {...defaultProps} isActive={false} />);
    expect(screen.getByTestId('youtube-player').props.autoMute).toBe(true);
  });

  it('passes null thumbnailUrl when provided', () => {
    render(<FeedVideoPlayer {...defaultProps} thumbnailUrl={null} />);
    const player = screen.getByTestId('youtube-player');
    expect(player.props.thumbnailUrl).toBeNull();
  });
});
