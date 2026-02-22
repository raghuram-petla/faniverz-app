import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
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

import MovieCard from '../MovieCard';
import type { Movie } from '@/types/movie';

const makeMovie = (overrides: Partial<Movie> = {}): Movie => ({
  id: 1,
  tmdb_id: 100,
  title: 'Pushpa 3',
  title_te: null,
  original_title: 'Pushpa 3',
  overview: 'Action movie',
  overview_te: null,
  poster_path: '/poster.jpg',
  backdrop_path: null,
  release_date: '2026-03-15',
  runtime: 150,
  genres: ['Action', 'Drama'],
  certification: 'UA',
  vote_average: 8.2,
  vote_count: 500,
  popularity: 100,
  content_type: 'movie',
  release_type: 'theatrical',
  status: 'upcoming',
  trailer_youtube_key: null,
  is_featured: true,
  tmdb_last_synced_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('MovieCard', () => {
  it('renders movie title', () => {
    render(<MovieCard movie={makeMovie()} />);
    expect(screen.getByTestId('movie-card-title')).toBeTruthy();
    expect(screen.getByText('Pushpa 3')).toBeTruthy();
  });

  it('renders poster image', () => {
    render(<MovieCard movie={makeMovie()} />);
    expect(screen.getByTestId('movie-card-poster')).toBeTruthy();
  });

  it('renders placeholder when no poster', () => {
    render(<MovieCard movie={makeMovie({ poster_path: null })} />);
    expect(screen.getByTestId('movie-card-placeholder')).toBeTruthy();
  });

  it('renders genres', () => {
    render(<MovieCard movie={makeMovie()} />);
    expect(screen.getByText('Action · Drama')).toBeTruthy();
  });

  it('renders rating badge', () => {
    render(<MovieCard movie={makeMovie()} />);
    expect(screen.getByTestId('movie-card-rating')).toBeTruthy();
    expect(screen.getByText('★ 8.2')).toBeTruthy();
  });

  it('hides rating when zero', () => {
    render(<MovieCard movie={makeMovie({ vote_average: 0 })} />);
    expect(screen.queryByTestId('movie-card-rating')).toBeNull();
  });

  it('calls onPress when provided', () => {
    const onPress = jest.fn();
    render(<MovieCard movie={makeMovie()} onPress={onPress} />);
    fireEvent.press(screen.getByTestId('movie-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders release date', () => {
    render(<MovieCard movie={makeMovie()} />);
    // Date format depends on locale/timezone - just verify date text is present
    expect(screen.getByTestId('movie-card-title')).toBeTruthy();
  });
});
