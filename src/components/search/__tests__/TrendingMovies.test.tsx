jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#000',
      textPrimary: '#fff',
      textTertiary: '#888',
    },
    colors: { red500: '#ef4444', yellow400: '#facc15' },
  }),
}));

jest.mock('@/styles/search.styles', () => ({
  createStyles: () =>
    new Proxy(
      {},
      {
        get: () => ({}),
      },
    ),
}));

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: (props: Record<string, unknown>) => <View {...props} /> };
});

jest.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string | null) => url ?? 'placeholder',
}));

jest.mock('@/constants/placeholders', () => ({
  PLACEHOLDER_POSTER: 'placeholder-poster',
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TrendingMovies } from '../TrendingMovies';
import type { Movie } from '@/types';

const mockMovie = (id: string, title: string): Movie => ({
  id,
  title,
  poster_url: null,
  backdrop_url: null,
  rating: 4.5,
  review_count: 10,
  genres: ['Action'],
  certification: 'UA' as const,
  runtime: 120,
  synopsis: '',
  director: 'Test',
  in_theaters: true,
  premiere_date: null,
  release_date: '2025-01-01',
  is_featured: false,
  tmdb_id: null,
  tmdb_last_synced_at: null,
  original_language: null,
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  poster_focus_x: null,
  poster_focus_y: null,
  poster_image_type: 'poster',
  backdrop_image_type: 'backdrop',
  spotlight_focus_x: null,
  spotlight_focus_y: null,
  detail_focus_x: null,
  detail_focus_y: null,
  imdb_id: null,
  title_te: null,
  synopsis_te: null,
  tagline: null,
  tmdb_status: null,
  tmdb_vote_average: null,
  tmdb_vote_count: null,
  budget: null,
  revenue: null,
  tmdb_popularity: null,
  spoken_languages: null,
  collection_id: null,
  collection_name: null,
  language_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
});

describe('TrendingMovies', () => {
  it('renders nothing when movies array is empty', () => {
    const { toJSON } = render(<TrendingMovies movies={[]} onMoviePress={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  it('renders movie titles', () => {
    const movies = [mockMovie('1', 'Pushpa 2'), mockMovie('2', 'Salaar')];
    render(<TrendingMovies movies={movies} onMoviePress={jest.fn()} />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
    expect(screen.getByText('Salaar')).toBeTruthy();
  });

  it('renders rank numbers', () => {
    const movies = [mockMovie('1', 'Movie A'), mockMovie('2', 'Movie B')];
    render(<TrendingMovies movies={movies} onMoviePress={jest.fn()} />);
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('calls onMoviePress when a movie is tapped', () => {
    const onPress = jest.fn();
    const movies = [mockMovie('1', 'Pushpa 2')];
    render(<TrendingMovies movies={movies} onMoviePress={onPress} />);
    fireEvent.press(screen.getByText('Pushpa 2'));
    expect(onPress).toHaveBeenCalledWith(movies[0]);
  });

  it('shows rating and review count', () => {
    const movies = [mockMovie('1', 'Movie')];
    render(<TrendingMovies movies={movies} onMoviePress={jest.fn()} />);
    expect(screen.getByText('4.5')).toBeTruthy();
    expect(screen.getByText('10 reviews')).toBeTruthy();
  });

  it('renders trending header', () => {
    const movies = [mockMovie('1', 'Movie')];
    render(<TrendingMovies movies={movies} onMoviePress={jest.fn()} />);
    expect(screen.getByText('Trending Now')).toBeTruthy();
  });
});
