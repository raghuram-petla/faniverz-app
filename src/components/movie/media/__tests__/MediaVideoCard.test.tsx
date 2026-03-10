jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: (props: any) => <View testID="webview" {...props} /> };
});

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
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
  duration: '3:20',
  display_order: 0,
  created_at: '',
  ...overrides,
});

const mockTheme = new Proxy({}, { get: () => '#000' }) as any;

describe('MediaVideoCard', () => {
  const onPlay = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders video title in collapsed state', () => {
    render(
      <MediaVideoCard video={makeVideo()} isPlaying={false} onPlay={onPlay} theme={mockTheme} />,
    );
    expect(screen.getByText('Official Trailer')).toBeTruthy();
  });

  it('shows duration badge when duration exists', () => {
    render(
      <MediaVideoCard
        video={makeVideo({ duration: '2:45' })}
        isPlaying={false}
        onPlay={onPlay}
        theme={mockTheme}
      />,
    );
    expect(screen.getByText('2:45')).toBeTruthy();
  });

  it('hides duration badge when duration is null', () => {
    render(
      <MediaVideoCard
        video={makeVideo({ duration: null })}
        isPlaying={false}
        onPlay={onPlay}
        theme={mockTheme}
      />,
    );
    expect(screen.queryByText('3:20')).toBeNull();
  });

  it('calls onPlay with video id when pressed', () => {
    render(
      <MediaVideoCard
        video={makeVideo({ id: 'v42' })}
        isPlaying={false}
        onPlay={onPlay}
        theme={mockTheme}
      />,
    );
    fireEvent.press(screen.getByLabelText('Play Official Trailer'));
    expect(onPlay).toHaveBeenCalledWith('v42');
  });

  it('renders WebView when playing', () => {
    render(
      <MediaVideoCard video={makeVideo()} isPlaying={true} onPlay={onPlay} theme={mockTheme} />,
    );
    expect(screen.getByTestId('webview')).toBeTruthy();
  });

  it('shows share button when playing', () => {
    render(
      <MediaVideoCard video={makeVideo()} isPlaying={true} onPlay={onPlay} theme={mockTheme} />,
    );
    expect(screen.getByLabelText('Share video')).toBeTruthy();
  });

  it('has correct accessibility label for play', () => {
    render(
      <MediaVideoCard
        video={makeVideo({ title: 'Title Song' })}
        isPlaying={false}
        onPlay={onPlay}
        theme={mockTheme}
      />,
    );
    expect(screen.getByLabelText('Play Title Song')).toBeTruthy();
  });
});
