import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MovieHeroSection } from '../MovieHeroSection';

jest.mock('@/styles/movieDetail.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/constants', () => ({
  getMovieStatusLabel: jest.fn(() => 'In Theaters'),
  getMovieStatusColor: jest.fn(() => '#dc2626'),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

const mockMovie = {
  id: 'movie-1',
  title: 'Pushpa 2',
  poster_url: 'https://example.com/poster.jpg',
  backdrop_url: 'https://example.com/backdrop.jpg',
  detail_focus_x: null,
  detail_focus_y: null,
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  rating: 4.5,
  review_count: 120,
  runtime: 148,
  certification: 'UA',
  release_date: '2024-12-05',
  synopsis: 'The continuation of Pushpa Raj story.',
  director: 'Sukumar',
  genres: ['Action', 'Drama'],
  trailer_url: 'https://youtube.com/watch?v=123',
  videos: [],
  posters: [],
  cast: [],
  crew: [],
  productionHouses: [],
  platforms: [],
  in_theaters: true,
  premiere_date: null,
} as any;

const baseProps = { movie: mockMovie, movieStatus: 'in_theaters' as any, releaseYear: 2024 };

describe('MovieHeroSection', () => {
  it('renders movie title', () => {
    render(<MovieHeroSection {...baseProps} />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders status badge text', () => {
    render(<MovieHeroSection {...baseProps} />);
    expect(screen.getByText('In Theaters')).toBeTruthy();
  });

  it('renders rating when greater than 0', () => {
    render(<MovieHeroSection {...baseProps} />);
    expect(screen.getByText('4.5')).toBeTruthy();
  });

  it('does not render rating when 0', () => {
    render(<MovieHeroSection {...baseProps} movie={{ ...mockMovie, rating: 0 }} />);
    expect(screen.queryByText('0')).toBeNull();
  });

  it('renders runtime with m suffix', () => {
    render(<MovieHeroSection {...baseProps} />);
    expect(screen.getByText(/148.*m/)).toBeTruthy();
  });

  it('renders certification', () => {
    render(<MovieHeroSection {...baseProps} />);
    expect(screen.getByText('UA')).toBeTruthy();
  });

  it('renders release year', () => {
    render(<MovieHeroSection {...baseProps} />);
    expect(screen.getByText('2024')).toBeTruthy();
  });
});
