import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: '1' }),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

jest.mock('@/theme/ThemeProvider', () => {
  const { lightColors } = require('@/theme/colors');
  return {
    useTheme: () => ({ colors: lightColors, isDark: false }),
  };
});

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) => <View {...props} />,
  };
});

jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, session: {} }),
}));

const mockMovie = {
  id: 1,
  title: 'Test Movie',
  title_te: null,
  poster_path: '/poster.jpg',
  backdrop_path: '/bg.jpg',
  release_date: '2026-03-15',
  runtime: 120,
  genres: ['Action', 'Drama'],
  certification: 'UA',
  vote_average: 7.5,
  vote_count: 100,
  popularity: 50,
  content_type: 'movie',
  release_type: 'theatrical',
  status: 'upcoming',
  trailer_youtube_key: null,
  is_featured: false,
  overview: 'A test movie overview',
  overview_te: null,
};

jest.mock('@/features/movies/hooks/useMovieDetail', () => ({
  useMovieDetail: () => ({ data: mockMovie, isLoading: false }),
  useMovieCast: () => ({ data: [] }),
}));

jest.mock('@/features/ott/hooks', () => ({
  useOttReleases: () => ({ data: [] }),
}));

jest.mock('@/features/watchlist/hooks', () => ({
  useWatchlistStatus: () => ({ data: false }),
  useToggleWatchlist: () => ({ mutate: jest.fn(), isPending: false }),
}));

import MovieDetailScreen from '../[id]';

describe('MovieDetailScreen', () => {
  it('renders movie detail screen', () => {
    render(<MovieDetailScreen />);
    expect(screen.getByTestId('movie-detail-screen')).toBeTruthy();
  });

  it('renders movie hero', () => {
    render(<MovieDetailScreen />);
    expect(screen.getByTestId('movie-hero')).toBeTruthy();
  });

  it('renders movie meta', () => {
    render(<MovieDetailScreen />);
    expect(screen.getByTestId('movie-meta')).toBeTruthy();
  });

  it('renders movie title', () => {
    render(<MovieDetailScreen />);
    expect(screen.getByText('Test Movie')).toBeTruthy();
  });

  it('renders watchlist button', () => {
    render(<MovieDetailScreen />);
    expect(screen.getByTestId('watchlist-button')).toBeTruthy();
  });

  it('hides where to watch section when no OTT releases', () => {
    render(<MovieDetailScreen />);
    expect(screen.queryByTestId('where-to-watch-section')).toBeNull();
  });

  it('renders share button', () => {
    render(<MovieDetailScreen />);
    expect(screen.getByTestId('share-button')).toBeTruthy();
  });
});
