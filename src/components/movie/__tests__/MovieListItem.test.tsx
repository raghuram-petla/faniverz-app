import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

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

import MovieListItem from '../MovieListItem';
import type { CalendarEntry, Movie } from '@/types/movie';

const makeMovie = (overrides: Partial<Movie> = {}): Movie => ({
  id: 1,
  tmdb_id: 100,
  title: 'Test Movie',
  title_te: null,
  original_title: 'Test Movie',
  overview: 'Overview',
  overview_te: null,
  poster_path: '/poster.jpg',
  backdrop_path: null,
  release_date: '2026-03-15',
  runtime: 120,
  genres: ['Action', 'Drama', 'Thriller'],
  certification: 'UA',
  vote_average: 7.5,
  vote_count: 100,
  popularity: 50,
  content_type: 'movie',
  release_type: 'theatrical',
  status: 'upcoming',
  trailer_youtube_key: null,
  is_featured: false,
  tmdb_last_synced_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('MovieListItem', () => {
  it('renders movie title', () => {
    const entry: CalendarEntry = {
      date: '2026-03-15',
      movie: makeMovie(),
      dotType: 'theatrical',
    };
    render(<MovieListItem entry={entry} />);
    expect(screen.getByTestId('movie-title')).toBeTruthy();
    expect(screen.getByText('Test Movie')).toBeTruthy();
  });

  it('renders poster image', () => {
    const entry: CalendarEntry = {
      date: '2026-03-15',
      movie: makeMovie(),
      dotType: 'theatrical',
    };
    render(<MovieListItem entry={entry} />);
    expect(screen.getByTestId('movie-poster')).toBeTruthy();
  });

  it('renders placeholder when no poster', () => {
    const entry: CalendarEntry = {
      date: '2026-03-15',
      movie: makeMovie({ poster_path: null }),
      dotType: 'theatrical',
    };
    render(<MovieListItem entry={entry} />);
    expect(screen.getByTestId('poster-placeholder')).toBeTruthy();
  });

  it('renders release type badge', () => {
    const entry: CalendarEntry = {
      date: '2026-03-15',
      movie: makeMovie(),
      dotType: 'theatrical',
    };
    render(<MovieListItem entry={entry} />);
    expect(screen.getByTestId('release-type-badge')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const entry: CalendarEntry = {
      date: '2026-03-15',
      movie: makeMovie(),
      dotType: 'theatrical',
    };
    render(<MovieListItem entry={entry} onPress={onPress} />);
    fireEvent.press(screen.getByTestId('movie-list-item'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows genres', () => {
    const entry: CalendarEntry = {
      date: '2026-03-15',
      movie: makeMovie({ genres: ['Action', 'Drama', 'Thriller'] }),
      dotType: 'theatrical',
    };
    render(<MovieListItem entry={entry} />);
    expect(screen.getByText('Action · Drama · Thriller')).toBeTruthy();
  });
});
