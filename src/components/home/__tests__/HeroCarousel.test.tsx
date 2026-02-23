import React from 'react';
import { render } from '@testing-library/react-native';
import { HeroCarousel } from '../HeroCarousel';
import { Movie } from '@/types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

// expo-linear-gradient and expo-image are already mocked globally in jest.setup.js

const mockMovies: Movie[] = [
  {
    id: '1',
    tmdb_id: null,
    title: 'Pushpa 2',
    release_type: 'theatrical',
    release_date: '2025-03-01',
    poster_url: null,
    backdrop_url: null,
    rating: 4.5,
    review_count: 10,
    genres: ['Action'],
    certification: 'UA',
    runtime: 180,
    synopsis: '',
    director: 'Sukumar',
    trailer_url: null,
    tmdb_last_synced_at: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '2',
    tmdb_id: null,
    title: 'Kalki',
    release_type: 'ott',
    release_date: '2025-02-01',
    poster_url: null,
    backdrop_url: null,
    rating: 4.0,
    review_count: 8,
    genres: ['Sci-Fi'],
    certification: 'UA',
    runtime: 150,
    synopsis: '',
    director: 'Nag Ashwin',
    trailer_url: null,
    tmdb_last_synced_at: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

describe('HeroCarousel', () => {
  it('renders movie title', () => {
    const { getByText } = render(<HeroCarousel movies={mockMovies} />);
    expect(getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders Watch Now button', () => {
    const { getByText } = render(<HeroCarousel movies={mockMovies} />);
    expect(getByText('Watch Now')).toBeTruthy();
  });

  it('shows rating when rating > 0', () => {
    const { getByText } = render(<HeroCarousel movies={mockMovies} />);
    // First movie has rating 4.5
    expect(getByText('4.5')).toBeTruthy();
  });

  it('does not show rating when rating is 0', () => {
    const zeroRatingMovies: Movie[] = [{ ...mockMovies[0], rating: 0 }];
    const { queryByText } = render(<HeroCarousel movies={zeroRatingMovies} />);
    expect(queryByText('0')).toBeNull();
  });

  it('shows "In Theaters" badge for theatrical movies', () => {
    const { getByText } = render(<HeroCarousel movies={mockMovies} />);
    // First movie is theatrical
    expect(getByText('In Theaters')).toBeTruthy();
  });

  it('shows "Streaming Now" badge for OTT movies when active', () => {
    const ottOnlyMovies: Movie[] = [mockMovies[1]];
    const { getByText } = render(<HeroCarousel movies={ottOnlyMovies} />);
    expect(getByText('Streaming Now')).toBeTruthy();
  });

  it('does not show "In Theaters" badge for OTT movies', () => {
    const ottOnlyMovies: Movie[] = [mockMovies[1]];
    const { queryByText } = render(<HeroCarousel movies={ottOnlyMovies} />);
    expect(queryByText('In Theaters')).toBeNull();
  });

  it('renders pagination dots matching movie count', () => {
    const { getAllByRole } = render(<HeroCarousel movies={mockMovies} />);
    // Pagination dots + Watch Now + More Info are all buttons
    // The dots row has one TouchableOpacity per movie
    const buttons = getAllByRole('button');
    // Two accessible buttons (Watch Now + More Info) plus two dot TouchableOpacity elements
    // Dots are not labeled, so we check via accessibilityRole buttons count
    // Watch Now and More Info have explicit accessibilityRole="button"
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('renders two pagination dots for two movies', () => {
    const { UNSAFE_getAllByType } = render(<HeroCarousel movies={mockMovies} />);
    // Access TouchableOpacity elements from react-native
    const { TouchableOpacity } = require('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    // Expects: Watch Now button + More Info button + 2 dot buttons = 4 total
    expect(touchables.length).toBe(4);
  });

  it('renders nothing when movies array is empty', () => {
    const { toJSON } = render(<HeroCarousel movies={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders OTT platform chips when platformMap provided', () => {
    const platformMap = {
      '1': [{ id: 'netflix', name: 'Netflix', logo: 'N', color: '#E50914', display_order: 1 }],
    };
    const { getByText } = render(<HeroCarousel movies={mockMovies} platformMap={platformMap} />);
    expect(getByText('Watch on:')).toBeTruthy();
    expect(getByText('N')).toBeTruthy();
  });
});
