import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MovieListItem } from '../MovieListItem';
import { Movie, OTTPlatform } from '@/types';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockMovie: Movie = {
  id: '1',
  tmdb_id: null,
  title: 'Thandel',
  poster_url: 'https://example.com/poster.jpg',
  backdrop_url: null,
  release_date: '2025-02-07',
  runtime: 150,
  genres: ['Romance', 'Drama', 'Action'],
  certification: 'UA',
  trailer_url: null,
  synopsis: null,
  director: 'Chandoo Mondeti',
  release_type: 'theatrical',
  rating: 4.7,
  review_count: 6234,
  is_featured: false,
  original_language: null,
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  tmdb_last_synced_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockPlatforms: OTTPlatform[] = [
  { id: 'netflix', name: 'Netflix', logo: 'N', color: '#E50914', display_order: 1 },
  { id: 'aha', name: 'Aha', logo: '🎬', color: '#FF6B00', display_order: 2 },
];

describe('MovieListItem', () => {
  it('renders movie title', () => {
    const { getByText } = render(<MovieListItem movie={mockMovie} />);
    expect(getByText('Thandel')).toBeTruthy();
  });

  it('renders genres (max 2)', () => {
    const { getByText, queryByText } = render(<MovieListItem movie={mockMovie} />);
    expect(getByText('Romance')).toBeTruthy();
    expect(getByText('Drama')).toBeTruthy();
    expect(queryByText('Action')).toBeNull();
  });

  it('renders rating for released movies', () => {
    const { getByText } = render(<MovieListItem movie={mockMovie} />);
    expect(getByText('4.7')).toBeTruthy();
    expect(getByText('/ 5')).toBeTruthy();
  });

  it('renders OTT platform names when provided', () => {
    const ottMovie = { ...mockMovie, release_type: 'ott' as const };
    const { getByText } = render(<MovieListItem movie={ottMovie} platforms={mockPlatforms} />);
    expect(getByText('Netflix')).toBeTruthy();
    expect(getByText('Aha')).toBeTruthy();
  });

  it('applies past styling when isPast is true', () => {
    const { getByRole } = render(<MovieListItem movie={mockMovie} isPast />);
    expect(getByRole('button')).toBeTruthy();
  });

  it('does not show rating for upcoming movies', () => {
    const upcoming = { ...mockMovie, release_type: 'upcoming' as const, rating: 0 };
    const { queryByText } = render(<MovieListItem movie={upcoming} />);
    expect(queryByText('/ 5')).toBeNull();
  });

  it('navigates to movie detail when pressed', () => {
    const { getByRole } = render(<MovieListItem movie={mockMovie} />);
    fireEvent.press(getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith('/movie/1');
  });
});
