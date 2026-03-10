jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: (props: any) => <View testID="webview" {...props} /> };
});

jest.mock('@/styles/movieMedia.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MediaVideosTab } from '../MediaVideosTab';
import type { MovieVideo } from '@/types';

const makeVideo = (overrides: Partial<MovieVideo> = {}): MovieVideo => ({
  id: 'v1',
  movie_id: 'm1',
  youtube_id: 'abc123',
  title: 'Test Video',
  description: null,
  video_type: 'trailer',
  video_date: null,
  duration: '3:20',
  display_order: 0,
  created_at: '',
  ...overrides,
});

const videosByType = [
  {
    label: 'Trailer',
    videos: [
      makeVideo({ id: 'v1', title: 'Official Trailer', video_type: 'trailer' }),
      makeVideo({ id: 'v2', title: 'Trailer 2', video_type: 'trailer' }),
    ],
  },
  {
    label: 'Song',
    videos: [makeVideo({ id: 'v3', title: 'Title Song', video_type: 'song', youtube_id: 'song1' })],
  },
];

describe('MediaVideosTab', () => {
  it('shows all video groups when activeCategory is All', () => {
    render(<MediaVideosTab videosByType={videosByType} activeCategory="All" />);
    expect(screen.getByText('Official Trailer')).toBeTruthy();
    expect(screen.getByText('Title Song')).toBeTruthy();
  });

  it('shows section headers when All is selected', () => {
    render(<MediaVideosTab videosByType={videosByType} activeCategory="All" />);
    expect(screen.getByText('Trailers')).toBeTruthy();
    expect(screen.getByText('Songs')).toBeTruthy();
  });

  it('filters to single category and hides section header', () => {
    render(<MediaVideosTab videosByType={videosByType} activeCategory="Song" />);
    expect(screen.getByText('Title Song')).toBeTruthy();
    expect(screen.queryByText('Official Trailer')).toBeNull();
    expect(screen.queryByText('Songs')).toBeNull();
  });

  it('plays video when tapped', () => {
    render(<MediaVideosTab videosByType={videosByType} activeCategory="All" />);
    fireEvent.press(screen.getByLabelText('Play Official Trailer'));
    expect(screen.getByTestId('webview')).toBeTruthy();
  });

  it('stops playing video when activeCategory changes', () => {
    const { rerender } = render(
      <MediaVideosTab videosByType={videosByType} activeCategory="All" />,
    );
    fireEvent.press(screen.getByLabelText('Play Official Trailer'));
    expect(screen.getByTestId('webview')).toBeTruthy();
    rerender(<MediaVideosTab videosByType={videosByType} activeCategory="Song" />);
    expect(screen.queryByTestId('webview')).toBeNull();
  });
});
