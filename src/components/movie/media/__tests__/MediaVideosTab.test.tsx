jest.mock('@/styles/movieMedia.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: new Proxy({}, { get: () => '#000' }),
    mode: 'dark',
    setMode: jest.fn(),
  }),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'movieDetail.noVideosYet': 'No videos available yet',
        'movieDetail.noVideosInCategory': 'No videos in this category',
        'common.playVideo': 'Play video',
        'common.shareVideo': 'Share video',
      };
      return map[key] ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

jest.mock('@/components/youtube/CustomYouTubePlayer', () => {
  const { View } = require('react-native');
  return {
    CustomYouTubePlayer: (props: Record<string, unknown>) => {
      // Simulate idle mode: render a pressable play button so tests can tap to play
      if (!props.isActive && typeof props.onPlay === 'function') {
        const { TouchableOpacity } = require('react-native');
        return (
          <TouchableOpacity
            testID="youtube-player-idle"
            onPress={props.onPlay as () => void}
            accessibilityLabel={`Play video`}
          />
        );
      }
      return <View testID="youtube-player-active" {...props} />;
    },
  };
});

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
  it('renders without crashing', () => {
    const { toJSON } = render(<MediaVideosTab videosByType={[]} activeCategory="All" />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows empty state when no videos exist for All category', () => {
    render(<MediaVideosTab videosByType={[]} activeCategory="All" />);
    expect(screen.getByText('No videos available yet')).toBeTruthy();
  });

  it('shows category-specific empty state when filtered category has no videos', () => {
    render(<MediaVideosTab videosByType={[]} activeCategory="Behind the Scenes" />);
    expect(screen.getByText('No videos in this category')).toBeTruthy();
  });

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

  it('plays video when tapped via CustomYouTubePlayer onPlay', () => {
    render(<MediaVideosTab videosByType={videosByType} activeCategory="All" />);
    // All videos start idle
    const idlePlayers = screen.getAllByTestId('youtube-player-idle');
    expect(idlePlayers.length).toBeGreaterThan(0);
    // Tap first video's play button
    fireEvent.press(idlePlayers[0]);
    // Should now have an active player
    expect(screen.getByTestId('youtube-player-active')).toBeTruthy();
  });

  it('stops playing video when activeCategory changes', () => {
    const { rerender } = render(
      <MediaVideosTab videosByType={videosByType} activeCategory="All" />,
    );
    const idlePlayers = screen.getAllByTestId('youtube-player-idle');
    fireEvent.press(idlePlayers[0]);
    expect(screen.getByTestId('youtube-player-active')).toBeTruthy();
    rerender(<MediaVideosTab videosByType={videosByType} activeCategory="Song" />);
    expect(screen.queryByTestId('youtube-player-active')).toBeNull();
  });

  it('renders multiple videos within a group', () => {
    render(<MediaVideosTab videosByType={videosByType} activeCategory="Trailer" />);
    expect(screen.getByText('Official Trailer')).toBeTruthy();
    expect(screen.getByText('Trailer 2')).toBeTruthy();
  });

  it('shows no videos empty state when filtered to non-existent category', () => {
    render(<MediaVideosTab videosByType={videosByType} activeCategory="Featurette" />);
    expect(screen.getByText('No videos in this category')).toBeTruthy();
  });

  it('does not show section headers when a specific category is active', () => {
    render(<MediaVideosTab videosByType={videosByType} activeCategory="Trailer" />);
    expect(screen.queryByText('Trailers')).toBeNull();
    expect(screen.getByText('Official Trailer')).toBeTruthy();
  });

  it('resets playing video when activeCategory changes', () => {
    const { rerender } = render(
      <MediaVideosTab videosByType={videosByType} activeCategory="All" />,
    );
    const idlePlayers = screen.getAllByTestId('youtube-player-idle');
    fireEvent.press(idlePlayers[0]);
    expect(screen.getByTestId('youtube-player-active')).toBeTruthy();
    rerender(<MediaVideosTab videosByType={videosByType} activeCategory="Trailer" />);
    expect(screen.queryByTestId('youtube-player-active')).toBeNull();
  });
});
