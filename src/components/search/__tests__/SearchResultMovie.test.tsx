import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SearchResultMovie } from '../SearchResultMovie';
import type { Movie } from '@/types';
import type { OTTPlatform } from '@/types/ott';

jest.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string | null) => url,
}));

jest.mock('@shared/movieStatus', () => ({
  deriveMovieStatus: () => 'theatrical',
}));

jest.mock('@/constants', () => ({
  getMovieStatusLabel: (s: string) => s.toUpperCase(),
  getMovieStatusColor: () => '#ff0000',
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
  id: 'm1',
  tmdb_id: null,
  title: 'Pushpa 2',
  poster_url: 'poster.jpg',
  backdrop_url: null,
  release_date: '2024-12-05',
  runtime: 180,
  genres: ['Action', 'Drama'],
  certification: 'UA',
  trailer_url: null,
  synopsis: '',
  director: 'Sukumar',
  in_theaters: true,
  original_language: 'te',
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  spotlight_focus_x: null,
  spotlight_focus_y: null,
  detail_focus_x: null,
  detail_focus_y: null,
  rating: 8.5,
  review_count: 100,
  is_featured: false,
  tmdb_last_synced_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockPlatforms: OTTPlatform[] = [
  { id: 'p1', name: 'Netflix', logo: 'N', logo_url: null, color: '#E50914', display_order: 1 },
];

describe('SearchResultMovie', () => {
  it('renders movie title', () => {
    render(<SearchResultMovie movie={mockMovie} platforms={[]} onPress={jest.fn()} />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders director name', () => {
    render(<SearchResultMovie movie={mockMovie} platforms={[]} onPress={jest.fn()} />);
    expect(screen.getByText('Sukumar')).toBeTruthy();
  });

  it('renders genres', () => {
    render(<SearchResultMovie movie={mockMovie} platforms={[]} onPress={jest.fn()} />);
    expect(screen.getByText('Action • Drama')).toBeTruthy();
  });

  it('renders rating when > 0', () => {
    render(<SearchResultMovie movie={mockMovie} platforms={[]} onPress={jest.fn()} />);
    expect(screen.getByText('8.5')).toBeTruthy();
  });

  it('hides rating when 0', () => {
    render(
      <SearchResultMovie movie={{ ...mockMovie, rating: 0 }} platforms={[]} onPress={jest.fn()} />,
    );
    expect(screen.queryByText('0')).toBeNull();
  });

  it('renders status badge', () => {
    render(<SearchResultMovie movie={mockMovie} platforms={[]} onPress={jest.fn()} />);
    expect(screen.getByText('THEATRICAL')).toBeTruthy();
  });

  it('renders platform badge when platforms exist', () => {
    render(<SearchResultMovie movie={mockMovie} platforms={mockPlatforms} onPress={jest.fn()} />);
    expect(screen.getByText('N')).toBeTruthy();
  });

  it('hides platform badge when no platforms', () => {
    render(<SearchResultMovie movie={mockMovie} platforms={[]} onPress={jest.fn()} />);
    expect(screen.queryByText('N')).toBeNull();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<SearchResultMovie movie={mockMovie} platforms={[]} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('Pushpa 2'));
    expect(onPress).toHaveBeenCalled();
  });

  it('hides director when null', () => {
    render(
      <SearchResultMovie
        movie={{ ...mockMovie, director: null }}
        platforms={[]}
        onPress={jest.fn()}
      />,
    );
    expect(screen.queryByText('Sukumar')).toBeNull();
  });

  it('hides genres when empty', () => {
    render(
      <SearchResultMovie movie={{ ...mockMovie, genres: [] }} platforms={[]} onPress={jest.fn()} />,
    );
    expect(screen.queryByText('Action • Drama')).toBeNull();
  });

  it('renders action button on poster', () => {
    render(<SearchResultMovie movie={mockMovie} platforms={[]} onPress={jest.fn()} />);
    expect(screen.getByLabelText('Follow Pushpa 2')).toBeTruthy();
  });
});
