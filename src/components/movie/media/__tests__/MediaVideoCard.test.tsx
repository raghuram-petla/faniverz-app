/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

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
import { MediaVideoCard } from '../MediaVideoCard';
import type { MovieVideo } from '@/types';

const makeVideo = (overrides: Partial<MovieVideo> = {}): MovieVideo => ({
  id: 'v1',
  movie_id: 'm1',
  youtube_id: 'abc123',
  title: 'Official Trailer',
  description: null,
  video_type: 'trailer',
  video_date: null,
  display_order: 0,
  created_at: '',
  ...overrides,
});

const mockTheme = new Proxy({}, { get: () => '#000' }) as any;

describe('MediaVideoCard', () => {
  const onPlay = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    const { toJSON } = render(
      <MediaVideoCard video={makeVideo()} isPlaying={false} onPlay={onPlay} theme={mockTheme} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders video title', () => {
    render(
      <MediaVideoCard video={makeVideo()} isPlaying={false} onPlay={onPlay} theme={mockTheme} />,
    );
    expect(screen.getByText('Official Trailer')).toBeTruthy();
  });

  it('passes isActive=false when not playing', () => {
    render(
      <MediaVideoCard video={makeVideo()} isPlaying={false} onPlay={onPlay} theme={mockTheme} />,
    );
    const player = screen.getByTestId('youtube-player');
    expect(player.props.isActive).toBe(false);
    expect(player.props.autoPlay).toBe(false);
    expect(player.props.mountShellWhenIdle).toBe(true);
  });

  it('passes isActive=true and autoPlay=true when playing', () => {
    render(
      <MediaVideoCard video={makeVideo()} isPlaying={true} onPlay={onPlay} theme={mockTheme} />,
    );
    const player = screen.getByTestId('youtube-player');
    expect(player.props.isActive).toBe(true);
    expect(player.props.autoPlay).toBe(true);
    expect(player.props.mountShellWhenIdle).toBe(true);
  });

  it('passes youtubeId to CustomYouTubePlayer', () => {
    render(
      <MediaVideoCard
        video={makeVideo({ youtube_id: 'xyz789' })}
        isPlaying={false}
        onPlay={onPlay}
        theme={mockTheme}
      />,
    );
    expect(screen.getByTestId('youtube-player').props.youtubeId).toBe('xyz789');
  });

  it('passes onPlay that calls parent onPlay with video id', () => {
    render(
      <MediaVideoCard
        video={makeVideo({ id: 'v42' })}
        isPlaying={false}
        onPlay={onPlay}
        theme={mockTheme}
      />,
    );
    const player = screen.getByTestId('youtube-player');
    // Simulate CustomYouTubePlayer calling onPlay from thumbnail tap
    player.props.onPlay();
    expect(onPlay).toHaveBeenCalledWith('v42');
  });

  it('still shows video title when playing', () => {
    render(
      <MediaVideoCard video={makeVideo()} isPlaying={true} onPlay={onPlay} theme={mockTheme} />,
    );
    expect(screen.getByText('Official Trailer')).toBeTruthy();
  });

  it('renders with different video titles', () => {
    render(
      <MediaVideoCard
        video={makeVideo({ title: 'Title Song' })}
        isPlaying={false}
        onPlay={onPlay}
        theme={mockTheme}
      />,
    );
    expect(screen.getByText('Title Song')).toBeTruthy();
  });
});
