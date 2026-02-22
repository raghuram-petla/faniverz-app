import React from 'react';
import { render, screen } from '@testing-library/react-native';

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

import DayMovieList from '../DayMovieList';
import type { CalendarEntry, Movie } from '@/types/movie';

const makeMovie = (overrides: Partial<Movie> = {}): Movie => ({
  id: 1,
  tmdb_id: 100,
  title: 'Test Movie',
  title_te: null,
  original_title: 'Test Movie',
  overview: 'A test movie',
  overview_te: null,
  poster_path: '/poster.jpg',
  backdrop_path: null,
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
  tmdb_last_synced_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('DayMovieList', () => {
  it('returns null when date is null', () => {
    const { toJSON } = render(<DayMovieList date={null} entries={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('shows no releases message for empty entries', () => {
    render(<DayMovieList date={new Date(2026, 2, 15)} entries={[]} />);
    expect(screen.getByTestId('no-movies')).toBeTruthy();
    expect(screen.getByText('No releases on this day')).toBeTruthy();
  });

  it('renders date title', () => {
    render(<DayMovieList date={new Date(2026, 2, 15)} entries={[]} />);
    expect(screen.getByTestId('day-title')).toBeTruthy();
  });

  it('renders movie list items for entries', () => {
    const entries: CalendarEntry[] = [
      { date: '2026-03-15', movie: makeMovie(), dotType: 'theatrical' },
      {
        date: '2026-03-15',
        movie: makeMovie({ id: 2, title: 'Movie 2' }),
        dotType: 'ott_premiere',
      },
    ];
    render(<DayMovieList date={new Date(2026, 2, 15)} entries={entries} />);
    expect(screen.getAllByTestId('movie-list-item')).toHaveLength(2);
  });
});
