import React from 'react';
import { render, screen } from '@testing-library/react-native';

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

import MovieMeta from '../MovieMeta';
import type { Movie } from '@/types/movie';

const makeMovie = (overrides: Partial<Movie> = {}): Movie => ({
  id: 1,
  tmdb_id: 100,
  title: 'Pushpa 3',
  title_te: 'పుష్ప 3',
  original_title: 'Pushpa 3',
  overview: 'Action movie',
  overview_te: null,
  poster_path: '/poster.jpg',
  backdrop_path: '/bg.jpg',
  release_date: '2026-03-15',
  runtime: 165,
  genres: ['Action', 'Drama', 'Thriller'],
  certification: 'UA',
  vote_average: 8.2,
  vote_count: 500,
  popularity: 100,
  content_type: 'movie',
  release_type: 'theatrical',
  status: 'upcoming',
  trailer_youtube_key: 'abc123',
  is_featured: true,
  tmdb_last_synced_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('MovieMeta', () => {
  it('renders title', () => {
    render(<MovieMeta movie={makeMovie()} />);
    expect(screen.getByTestId('movie-detail-title')).toBeTruthy();
    expect(screen.getByText('Pushpa 3')).toBeTruthy();
  });

  it('renders Telugu title', () => {
    render(<MovieMeta movie={makeMovie()} />);
    expect(screen.getByTestId('movie-title-te')).toBeTruthy();
  });

  it('hides Telugu title when null', () => {
    render(<MovieMeta movie={makeMovie({ title_te: null })} />);
    expect(screen.queryByTestId('movie-title-te')).toBeNull();
  });

  it('renders genres as chips', () => {
    render(<MovieMeta movie={makeMovie()} />);
    expect(screen.getByText('Action')).toBeTruthy();
    expect(screen.getByText('Drama')).toBeTruthy();
    expect(screen.getByText('Thriller')).toBeTruthy();
  });

  it('renders runtime', () => {
    render(<MovieMeta movie={makeMovie()} />);
    expect(screen.getByText('2h 45m')).toBeTruthy();
  });

  it('renders certification', () => {
    render(<MovieMeta movie={makeMovie()} />);
    expect(screen.getByText('UA')).toBeTruthy();
  });

  it('renders release type badge', () => {
    render(<MovieMeta movie={makeMovie()} />);
    expect(screen.getByTestId('release-type-badge')).toBeTruthy();
  });
});
