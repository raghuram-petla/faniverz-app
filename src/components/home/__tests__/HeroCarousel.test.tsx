import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { HeroCarousel } from '../HeroCarousel';
import { Movie } from '@/types';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

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
    is_featured: false,
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
    is_featured: false,
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all movie titles in the FlatList', () => {
    const { getByText } = render(<HeroCarousel movies={mockMovies} />);
    expect(getByText('Pushpa 2')).toBeTruthy();
    expect(getByText('Kalki')).toBeTruthy();
  });

  it('renders Watch Now buttons for each slide', () => {
    const { getAllByText } = render(<HeroCarousel movies={mockMovies} />);
    expect(getAllByText('Watch Now').length).toBe(2);
  });

  it('shows rating when rating > 0', () => {
    const { getByText } = render(<HeroCarousel movies={mockMovies} />);
    expect(getByText('4.5')).toBeTruthy();
    expect(getByText('4')).toBeTruthy();
  });

  it('does not show rating when rating is 0', () => {
    const zeroRatingMovies: Movie[] = [{ ...mockMovies[0], rating: 0 }];
    const { queryByText } = render(<HeroCarousel movies={zeroRatingMovies} />);
    expect(queryByText('0')).toBeNull();
  });

  it('shows "In Theaters" badge for theatrical movies', () => {
    const { getByText } = render(<HeroCarousel movies={mockMovies} />);
    expect(getByText('In Theaters')).toBeTruthy();
  });

  it('shows "Streaming Now" badge for OTT movies', () => {
    const { getByText } = render(<HeroCarousel movies={mockMovies} />);
    expect(getByText('Streaming Now')).toBeTruthy();
  });

  it('renders pagination dots for multiple movies', () => {
    const { UNSAFE_getAllByType } = render(<HeroCarousel movies={mockMovies} />);
    const { TouchableOpacity } = require('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    // 2 slides x (Watch Now + More Info) + 2 pagination dots = 6
    expect(touchables.length).toBe(6);
  });

  it('does not render pagination dots for a single movie', () => {
    const singleMovie: Movie[] = [mockMovies[0]];
    const { UNSAFE_getAllByType } = render(<HeroCarousel movies={singleMovie} />);
    const { TouchableOpacity } = require('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    // 1 slide x (Watch Now + More Info) = 2, no dots
    expect(touchables.length).toBe(2);
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

  it('navigates to movie detail when Watch Now is pressed', () => {
    const { getAllByLabelText } = render(<HeroCarousel movies={mockMovies} />);
    fireEvent.press(getAllByLabelText('Watch Now')[0]);
    expect(mockPush).toHaveBeenCalledWith('/movie/1');
  });

  it('navigates to movie detail when More Info is pressed', () => {
    const { getAllByLabelText } = render(<HeroCarousel movies={mockMovies} />);
    fireEvent.press(getAllByLabelText('More Info')[0]);
    expect(mockPush).toHaveBeenCalledWith('/movie/1');
  });

  it('does not set up auto-play interval when there is only one movie', () => {
    jest.useFakeTimers();
    const singleMovie: Movie[] = [mockMovies[0]];
    const { getByText } = render(<HeroCarousel movies={singleMovie} />);
    expect(getByText('Pushpa 2')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(getByText('Pushpa 2')).toBeTruthy();

    jest.useRealTimers();
  });

  it('sets up auto-play interval for multiple movies', () => {
    jest.useFakeTimers();
    render(<HeroCarousel movies={mockMovies} />);

    // Advance past the auto-play interval — should not crash
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    jest.useRealTimers();
  });

  it('cleans up interval on unmount', () => {
    jest.useFakeTimers();
    const { unmount } = render(<HeroCarousel movies={mockMovies} />);
    unmount();

    // Advancing time after unmount should not cause errors
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    jest.useRealTimers();
  });
});
