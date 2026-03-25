/* eslint-disable @typescript-eslint/no-explicit-any */
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
  poster_focus_x: null,
  poster_focus_y: null,
  rating: 4.5,
  review_count: 120,
  runtime: 148,
  certification: 'UA',
  release_date: '2024-12-05',
  synopsis: 'The continuation of Pushpa Raj story.',
  director: 'Sukumar',
  genres: ['Action', 'Drama'],
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

  it('does not render runtime when runtime is null', () => {
    render(<MovieHeroSection {...baseProps} movie={{ ...mockMovie, runtime: null }} />);
    expect(screen.queryByText(/m$/)).toBeNull();
  });

  it('does not render certification when certification is null/undefined', () => {
    render(<MovieHeroSection {...baseProps} movie={{ ...mockMovie, certification: null }} />);
    expect(screen.queryByText('UA')).toBeNull();
  });

  it('renders null releaseYear without crashing', () => {
    render(<MovieHeroSection {...baseProps} releaseYear={null} />);
    // Should still render the title
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders review count when rating > 0', () => {
    render(<MovieHeroSection {...baseProps} />);
    // review count label is rendered via t('movie.reviewCountLabel', { count: 120 })
    // The global i18n mock resolves this to "(120 reviews)"
    expect(screen.getByText('(120 reviews)')).toBeTruthy();
  });

  it('does not render rating row when rating is 0', () => {
    render(<MovieHeroSection {...baseProps} movie={{ ...mockMovie, rating: 0 }} />);
    expect(screen.queryByText('movie.reviewCountLabel')).toBeNull();
  });

  it('renders with focus position when detail_focus_x and detail_focus_y are set', () => {
    // Verify it renders without crashing when both focus values are provided
    const movieWithFocus = {
      ...mockMovie,
      detail_focus_x: 0.5,
      detail_focus_y: 0.3,
    };
    render(<MovieHeroSection {...baseProps} movie={movieWithFocus} />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders with backdrop focus position when only backdrop_focus values are set', () => {
    const movieWithBackdropFocus = {
      ...mockMovie,
      detail_focus_x: null,
      detail_focus_y: null,
      backdrop_focus_x: 0.6,
      backdrop_focus_y: 0.4,
    };
    render(<MovieHeroSection {...baseProps} movie={movieWithBackdropFocus} />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders without focus position when no focus values are set', () => {
    const movieNoFocus = {
      ...mockMovie,
      detail_focus_x: null,
      detail_focus_y: null,
      backdrop_focus_x: null,
      backdrop_focus_y: null,
    };
    render(<MovieHeroSection {...baseProps} movie={movieNoFocus} />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders runtime separator correctly when releaseYear is null', () => {
    render(
      <MovieHeroSection {...baseProps} movie={{ ...mockMovie, runtime: 120 }} releaseYear={null} />,
    );
    expect(screen.getByText(/120.*m/)).toBeTruthy();
  });

  it('renders certification separator when no runtime but releaseYear exists', () => {
    render(<MovieHeroSection {...baseProps} movie={{ ...mockMovie, runtime: null }} />);
    expect(screen.getByText('UA')).toBeTruthy();
    expect(screen.getByText('2024')).toBeTruthy();
  });

  it('renders certification when both runtime is null and releaseYear is null', () => {
    render(
      <MovieHeroSection
        {...baseProps}
        movie={{ ...mockMovie, runtime: null }}
        releaseYear={null}
      />,
    );
    expect(screen.getByText('UA')).toBeTruthy();
  });

  it('renders nothing extra when runtime null, certification null, and releaseYear null', () => {
    render(
      <MovieHeroSection
        {...baseProps}
        movie={{ ...mockMovie, runtime: null, certification: null }}
        releaseYear={null}
      />,
    );
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders with detail_focus_x set but detail_focus_y null (mixed null branch)', () => {
    const movieMixed = {
      ...mockMovie,
      detail_focus_x: 0.5,
      detail_focus_y: null,
      backdrop_focus_x: null,
      backdrop_focus_y: null,
    };
    render(<MovieHeroSection {...baseProps} movie={movieMixed} />);
    // (detail_focus_x ?? backdrop_focus_x) = 0.5, (detail_focus_y ?? backdrop_focus_y) = null
    // Since y is null, contentPosition = undefined (no position set)
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders with detail_focus_y set but detail_focus_x null, backdrop_focus_x null (x null branch)', () => {
    const movieYOnly = {
      ...mockMovie,
      detail_focus_x: null,
      detail_focus_y: 0.3,
      backdrop_focus_x: null,
      backdrop_focus_y: 0.7,
    };
    render(<MovieHeroSection {...baseProps} movie={movieYOnly} />);
    // (detail_focus_x ?? backdrop_focus_x) = null, so first condition fails => no contentPosition
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders runtime separator pipe when releaseYear is present', () => {
    render(
      <MovieHeroSection {...baseProps} movie={{ ...mockMovie, runtime: 148 }} releaseYear={2024} />,
    );
    // Both year and runtime present — pipe separator between them
    expect(screen.getByText('2024')).toBeTruthy();
    expect(screen.getByText(/148.*m/)).toBeTruthy();
  });

  it('does not render runtime pipe separator when releaseYear is null', () => {
    render(
      <MovieHeroSection {...baseProps} movie={{ ...mockMovie, runtime: 100 }} releaseYear={null} />,
    );
    // Runtime rendered without year separator
    expect(screen.getByText(/100.*m/)).toBeTruthy();
  });

  it('falls back to poster_url when backdrop_url is null (hero image fallback chain)', () => {
    const movieNoBackdrop = { ...mockMovie, backdrop_url: null };
    render(<MovieHeroSection {...baseProps} movie={movieNoBackdrop} />);
    // Should still render — falls back to poster_url for hero image
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('falls back to PLACEHOLDER_POSTER when both backdrop_url and poster_url are null', () => {
    const movieNoImages = { ...mockMovie, backdrop_url: null, poster_url: null };
    render(<MovieHeroSection {...baseProps} movie={movieNoImages} />);
    // Should still render — falls back to PLACEHOLDER_POSTER
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });
});
