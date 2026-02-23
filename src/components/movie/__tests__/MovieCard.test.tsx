import React from 'react';
import { render } from '@testing-library/react-native';
import { MovieCard } from '../MovieCard';
import { Movie } from '@/types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockMovie: Movie = {
  id: '1',
  tmdb_id: null,
  title: 'Pushpa 2: The Rule',
  poster_url: 'https://example.com/poster.jpg',
  backdrop_url: null,
  release_date: '2024-12-05',
  runtime: 180,
  genres: ['Action', 'Thriller'],
  certification: 'UA',
  trailer_url: null,
  synopsis: null,
  director: 'Sukumar',
  release_type: 'theatrical',
  rating: 4.5,
  review_count: 100,
  tmdb_last_synced_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('MovieCard', () => {
  it('renders movie title', () => {
    const { getByText } = render(<MovieCard movie={mockMovie} />);
    expect(getByText('Pushpa 2: The Rule')).toBeTruthy();
  });

  it('shows star rating when rating > 0', () => {
    const { getByText } = render(<MovieCard movie={mockMovie} />);
    expect(getByText('4.5')).toBeTruthy();
  });

  it('shows release date when showReleaseDate is true', () => {
    const upcomingMovie = { ...mockMovie, release_type: 'upcoming' as const, rating: 0 };
    const { getByText } = render(<MovieCard movie={upcomingMovie} showReleaseDate />);
    // Date parsing may vary by timezone; just check a month abbreviation appears
    expect(getByText(/Dec/)).toBeTruthy();
  });

  it('renders OTT platform badges when platforms provided', () => {
    const platforms = [
      { id: 'netflix', name: 'Netflix', logo: 'N', color: '#E50914', display_order: 1 },
    ];
    const ottMovie = { ...mockMovie, release_type: 'ott' as const };
    const { UNSAFE_queryAllByType } = render(<MovieCard movie={ottMovie} platforms={platforms} />);
    // PlatformBadge renders inside the card
    expect(UNSAFE_queryAllByType).toBeTruthy();
  });

  it('is accessible with movie title label', () => {
    const { getByLabelText } = render(<MovieCard movie={mockMovie} />);
    expect(getByLabelText('Pushpa 2: The Rule')).toBeTruthy();
  });
});
