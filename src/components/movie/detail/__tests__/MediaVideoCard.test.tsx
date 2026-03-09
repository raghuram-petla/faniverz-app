import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { MediaVideoCard } from '../MediaVideoCard';

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: (props: any) => <View testID="webview" {...props} /> };
});

const mockTheme = new Proxy({}, { get: () => '#111' }) as any;

const mockVideo = {
  id: 'v1',
  movie_id: 'm1',
  youtube_id: 'abc123',
  title: 'Official Trailer',
  description: null,
  video_type: 'trailer' as const,
  video_date: null,
  duration: '2:30',
  display_order: 1,
  created_at: '2024-01-01',
};

describe('MediaVideoCard', () => {
  it('renders thumbnail when not playing', () => {
    render(
      <MediaVideoCard video={mockVideo} isPlaying={false} onPlay={jest.fn()} theme={mockTheme} />,
    );
    expect(screen.getByLabelText('Play Official Trailer')).toBeTruthy();
  });

  it('displays video duration', () => {
    render(
      <MediaVideoCard video={mockVideo} isPlaying={false} onPlay={jest.fn()} theme={mockTheme} />,
    );
    expect(screen.getByText('2:30')).toBeTruthy();
  });

  it('displays video title', () => {
    render(
      <MediaVideoCard video={mockVideo} isPlaying={false} onPlay={jest.fn()} theme={mockTheme} />,
    );
    expect(screen.getByText('Official Trailer')).toBeTruthy();
  });

  it('calls onPlay when thumbnail is pressed', () => {
    const onPlay = jest.fn();
    render(
      <MediaVideoCard video={mockVideo} isPlaying={false} onPlay={onPlay} theme={mockTheme} />,
    );
    fireEvent.press(screen.getByLabelText('Play Official Trailer'));
    expect(onPlay).toHaveBeenCalledWith('v1');
  });

  it('renders WebView when playing', () => {
    render(
      <MediaVideoCard video={mockVideo} isPlaying={true} onPlay={jest.fn()} theme={mockTheme} />,
    );
    expect(screen.getByTestId('webview')).toBeTruthy();
  });

  it('does not show duration when null', () => {
    const videoNoDuration = { ...mockVideo, duration: null };
    render(
      <MediaVideoCard
        video={videoNoDuration}
        isPlaying={false}
        onPlay={jest.fn()}
        theme={mockTheme}
      />,
    );
    expect(screen.queryByText('2:30')).toBeNull();
  });

  it('still shows title when playing', () => {
    render(
      <MediaVideoCard video={mockVideo} isPlaying={true} onPlay={jest.fn()} theme={mockTheme} />,
    );
    expect(screen.getByText('Official Trailer')).toBeTruthy();
  });
});
