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
    original_language: null,
    backdrop_focus_x: null,
    backdrop_focus_y: null,
    spotlight_focus_x: null,
    spotlight_focus_y: null,
    detail_focus_x: null,
    detail_focus_y: null,
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
    original_language: null,
    backdrop_focus_x: null,
    backdrop_focus_y: null,
    spotlight_focus_x: null,
    spotlight_focus_y: null,
    detail_focus_x: null,
    detail_focus_y: null,
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

  it('renders context-aware CTA buttons per release type', () => {
    const { getByText } = render(<HeroCarousel movies={mockMovies} />);
    // theatrical → Get Tickets, ott → Watch Now
    expect(getByText('Get Tickets')).toBeTruthy();
    expect(getByText('Watch Now')).toBeTruthy();
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

  it('shows "Streaming" badge for OTT movies', () => {
    const { getByText } = render(<HeroCarousel movies={mockMovies} />);
    expect(getByText('Streaming')).toBeTruthy();
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

  it('navigates to movie detail when Get Tickets is pressed (theatrical)', () => {
    const { getByLabelText } = render(<HeroCarousel movies={mockMovies} />);
    fireEvent.press(getByLabelText('Get Tickets'));
    expect(mockPush).toHaveBeenCalledWith('/movie/1');
  });

  it('navigates to movie detail when Watch Now is pressed (ott)', () => {
    const { getByLabelText } = render(<HeroCarousel movies={mockMovies} />);
    fireEvent.press(getByLabelText('Watch Now'));
    expect(mockPush).toHaveBeenCalledWith('/movie/2');
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

  it('pressing a pagination dot does not throw and covers scrollToDot', () => {
    const { UNSAFE_getAllByType } = render(<HeroCarousel movies={mockMovies} />);
    const { TouchableOpacity } = require('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    // Last 2 touchables are the pagination dots
    const secondDot = touchables[touchables.length - 1];
    expect(() => fireEvent.press(secondDot)).not.toThrow();
  });

  it('does not render cert badge when certification is null', () => {
    const noCertMovies = [{ ...mockMovies[0], certification: null }];
    const { queryByText } = render(<HeroCarousel movies={noCertMovies} />);
    expect(queryByText('UA')).toBeNull();
  });

  it('does not render runtime when runtime is null', () => {
    const noRuntimeMovies = [{ ...mockMovies[0], runtime: null }];
    const { queryByText } = render(<HeroCarousel movies={noRuntimeMovies} />);
    expect(queryByText('180m')).toBeNull();
  });

  it('calls onScrollBeginDrag handler without throwing', () => {
    const { UNSAFE_getByType } = render(<HeroCarousel movies={mockMovies} />);
    const { FlatList } = require('react-native');
    const flatList = UNSAFE_getByType(FlatList);
    expect(() => flatList.props.onScrollBeginDrag?.()).not.toThrow();
  });

  it('calls onScrollEndDrag handler without throwing', () => {
    const { UNSAFE_getByType } = render(<HeroCarousel movies={mockMovies} />);
    const { FlatList } = require('react-native');
    const flatList = UNSAFE_getByType(FlatList);
    expect(() => flatList.props.onScrollEndDrag?.()).not.toThrow();
  });

  it('uses spotlight_focus_x/y when available', () => {
    const moviesWithSpotlightFocus: Movie[] = [
      {
        ...mockMovies[0],
        backdrop_url: 'https://example.com/backdrop.jpg',
        backdrop_focus_x: 0.1,
        backdrop_focus_y: 0.2,
        spotlight_focus_x: 0.8,
        spotlight_focus_y: 0.9,
      },
    ];
    const { UNSAFE_getAllByType } = render(<HeroCarousel movies={moviesWithSpotlightFocus} />);
    const { Image } = require('expo-image');
    const images = UNSAFE_getAllByType(Image);
    const imageWithPosition = images.find(
      (img: { props: { contentPosition?: unknown } }) => img.props.contentPosition,
    );
    expect(imageWithPosition?.props.contentPosition).toEqual({ left: '80%', top: '90%' });
  });

  it('falls back to backdrop_focus_x/y when spotlight values are null', () => {
    const moviesWithBackdropOnly: Movie[] = [
      {
        ...mockMovies[0],
        backdrop_url: 'https://example.com/backdrop.jpg',
        backdrop_focus_x: 0.3,
        backdrop_focus_y: 0.7,
        spotlight_focus_x: null,
        spotlight_focus_y: null,
      },
    ];
    const { UNSAFE_getAllByType } = render(<HeroCarousel movies={moviesWithBackdropOnly} />);
    const { Image } = require('expo-image');
    const images = UNSAFE_getAllByType(Image);
    const imageWithPosition = images.find(
      (img: { props: { contentPosition?: unknown } }) => img.props.contentPosition,
    );
    expect(imageWithPosition?.props.contentPosition).toEqual({ left: '30%', top: '70%' });
  });
});
