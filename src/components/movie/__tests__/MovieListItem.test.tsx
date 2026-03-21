import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MovieListItem } from '../MovieListItem';
import { Movie, OTTPlatform } from '@/types';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockActionPress = jest.fn();
jest.mock('@/hooks/useMovieAction', () => ({
  useMovieAction: () => ({
    actionType: 'follow',
    isActive: false,
    onPress: mockActionPress,
  }),
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
  in_theaters: true,
  premiere_date: null,
  rating: 4.7,
  review_count: 6234,
  is_featured: false,
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
  tmdb_last_synced_at: null,
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
};

const mockPlatforms: OTTPlatform[] = [
  { id: 'netflix', name: 'Netflix', logo: 'N', logo_url: null, color: '#E50914', display_order: 1 },
  { id: 'aha', name: 'Aha', logo: '🎬', logo_url: null, color: '#FF6B00', display_order: 2 },
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
    const ottMovie = { ...mockMovie, in_theaters: false, premiere_date: null };
    const { getByText } = render(<MovieListItem movie={ottMovie} platforms={mockPlatforms} />);
    expect(getByText('Netflix')).toBeTruthy();
    expect(getByText('Aha')).toBeTruthy();
  });

  it('applies past styling when isPast is true', () => {
    const { getByRole } = render(<MovieListItem movie={mockMovie} isPast />);
    expect(getByRole('button')).toBeTruthy();
  });

  it('does not show rating for upcoming movies', () => {
    const upcoming = {
      ...mockMovie,
      in_theaters: false,
      premiere_date: null,
      release_date: '2099-01-01',
      rating: 0,
    };
    const { queryByText } = render(<MovieListItem movie={upcoming} />);
    expect(queryByText('/ 5')).toBeNull();
  });

  it('navigates to movie detail when pressed', () => {
    const { getByRole } = render(<MovieListItem movie={mockMovie} />);
    fireEvent.press(getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith('/movie/1');
  });

  it('renders action button on poster', () => {
    const { getByLabelText } = render(<MovieListItem movie={mockMovie} />);
    expect(getByLabelText('Follow Thandel')).toBeTruthy();
  });
});
