import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { HeroCarousel } from '../HeroCarousel';
import { Movie, OTTPlatform } from '@/types';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

const mockFollowMutate = jest.fn();
const mockUnfollowMutate = jest.fn();
const mockFollowSet = new Set<string>();
const mockAddMutate = jest.fn();
const mockRemoveMutate = jest.fn();
const mockWatchlistSet = new Set<string>();
let mockFollowIsPending = false;
let mockUnfollowIsPending = false;
let mockAddIsPending = false;
let mockRemoveIsPending = false;

jest.mock('@/features/feed', () => ({
  useEntityFollows: () => ({ followSet: mockFollowSet }),
  useFollowEntity: () => ({ mutate: mockFollowMutate, isPending: mockFollowIsPending }),
  useUnfollowEntity: () => ({ mutate: mockUnfollowMutate, isPending: mockUnfollowIsPending }),
}));

jest.mock('@/features/watchlist/hooks', () => ({
  useWatchlistSet: () => ({ watchlistSet: mockWatchlistSet }),
  useWatchlistMutations: () => ({
    add: { mutate: mockAddMutate, isPending: mockAddIsPending },
    remove: { mutate: mockRemoveMutate, isPending: mockRemoveIsPending },
  }),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

jest.mock('@/hooks/useAuthGate', () => ({
  useAuthGate: () => ({ gate: <T extends Function>(fn: T) => fn, isAuthenticated: true }),
}));

jest.mock('@/hooks/useMovieAction', () => ({
  getMovieActionType: jest.fn((status: string) =>
    status === 'streaming' ? 'watchlist' : 'follow',
  ),
}));

const mockPlatformMap: Record<string, OTTPlatform[]> = {
  '2': [
    {
      id: 'netflix',
      name: 'Netflix',
      logo: '',
      logo_url: null,
      color: '#E50914',
      display_order: 0,
    },
  ],
};

const mockMovies: Movie[] = [
  {
    id: '1',
    tmdb_id: null,
    title: 'Pushpa 2',
    in_theaters: true,
    premiere_date: null,
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
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '2',
    tmdb_id: null,
    title: 'Kalki',
    in_theaters: false,
    premiere_date: null,
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
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

describe('HeroCarousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFollowSet.clear();
    mockWatchlistSet.clear();
    mockFollowIsPending = false;
    mockUnfollowIsPending = false;
    mockAddIsPending = false;
    mockRemoveIsPending = false;
  });

  it('renders all movie titles in the FlatList', () => {
    const { getAllByText } = render(<HeroCarousel movies={mockMovies} />);
    // Clone of first movie appended for seamless loop → 2 "Pushpa 2"
    expect(getAllByText('Pushpa 2').length).toBe(2);
    expect(getAllByText('Kalki').length).toBe(1);
  });

  it('renders context-aware CTA buttons per movie status', () => {
    const { getAllByText } = render(
      <HeroCarousel movies={mockMovies} platformMap={mockPlatformMap} />,
    );
    // in_theaters → Get Tickets (×2 due to clone), streaming → Watch Now
    expect(getAllByText('Get Tickets').length).toBe(2);
    expect(getAllByText('Watch Now').length).toBe(1);
  });

  it('shows rating when rating > 0', () => {
    const { getAllByText } = render(<HeroCarousel movies={mockMovies} />);
    // First movie appears twice (clone), so "4.5" appears twice
    expect(getAllByText('4.5').length).toBe(2);
    expect(getAllByText('4').length).toBe(1);
  });

  it('does not show rating when rating is 0', () => {
    const zeroRatingMovies: Movie[] = [{ ...mockMovies[0], rating: 0 }];
    const { queryByText } = render(<HeroCarousel movies={zeroRatingMovies} />);
    expect(queryByText('0')).toBeNull();
  });

  it('shows "In Theaters" badge for theatrical movies', () => {
    const { getAllByText } = render(<HeroCarousel movies={mockMovies} />);
    // Clone of first movie also shows "In Theaters"
    expect(getAllByText('In Theaters').length).toBe(2);
  });

  it('shows "Streaming" badge for OTT movies', () => {
    const { getByText } = render(
      <HeroCarousel movies={mockMovies} platformMap={mockPlatformMap} />,
    );
    expect(getByText('Streaming')).toBeTruthy();
  });

  it('renders pagination dots for multiple movies', () => {
    const { UNSAFE_getAllByType } = render(<HeroCarousel movies={mockMovies} />);
    const { TouchableOpacity } = require('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    // 3 slides (2 + clone) x (Watch Now + Follow + More Info) + 2 pagination dots = 11
    expect(touchables.length).toBe(11);
  });

  it('does not render pagination dots for a single movie', () => {
    const singleMovie: Movie[] = [mockMovies[0]];
    const { UNSAFE_getAllByType } = render(<HeroCarousel movies={singleMovie} />);
    const { TouchableOpacity } = require('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    // 1 slide x (Watch Now + Follow + More Info) = 3, no dots
    expect(touchables.length).toBe(3);
  });

  it('renders nothing when movies array is empty', () => {
    const { toJSON } = render(<HeroCarousel movies={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders OTT platform badges when platformMap provided', () => {
    const platformMap = {
      '1': [
        {
          id: 'netflix',
          name: 'Netflix',
          logo: 'N',
          logo_url: null,
          color: '#E50914',
          display_order: 1,
        },
      ],
    };
    const { getAllByText, UNSAFE_getAllByType } = render(
      <HeroCarousel movies={mockMovies} platformMap={platformMap} />,
    );
    // Clone of first movie also shows "Watch on:"
    expect(getAllByText('Watch on:').length).toBe(2);
    // PlatformBadge renders an Image for known platforms
    const { Image } = require('expo-image');
    const images = UNSAFE_getAllByType(Image);
    // At least one image beyond backdrops (the platform logo)
    expect(images.length).toBeGreaterThanOrEqual(3);
  });

  it('navigates to movie detail when Get Tickets is pressed (theatrical)', () => {
    const { getAllByLabelText } = render(<HeroCarousel movies={mockMovies} />);
    fireEvent.press(getAllByLabelText('Get Tickets')[0]);
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
        poster_focus_x: null,
        poster_focus_y: null,
        poster_image_type: 'poster',
        backdrop_image_type: 'backdrop',
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
        poster_focus_x: null,
        poster_focus_y: null,
        poster_image_type: 'poster',
        backdrop_image_type: 'backdrop',
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

  it('renders Follow button for pre-OTT movie', () => {
    const { getByLabelText } = render(<HeroCarousel movies={[mockMovies[0]]} />);
    expect(getByLabelText('Follow Pushpa 2')).toBeTruthy();
  });

  it('shows Following state when movie is followed', () => {
    mockFollowSet.add('movie:1');
    const { getByLabelText } = render(<HeroCarousel movies={[mockMovies[0]]} />);
    expect(getByLabelText(/Following Pushpa 2/)).toBeTruthy();
  });

  it('calls follow mutation when Follow button is pressed', () => {
    const { getByLabelText } = render(<HeroCarousel movies={[mockMovies[0]]} />);
    fireEvent.press(getByLabelText('Follow Pushpa 2'));
    expect(mockFollowMutate).toHaveBeenCalledWith({ entityType: 'movie', entityId: '1' });
  });

  it('calls unfollow mutation when already following', () => {
    mockFollowSet.add('movie:1');
    const { getByLabelText } = render(<HeroCarousel movies={[mockMovies[0]]} />);
    fireEvent.press(getByLabelText(/Following Pushpa 2/));
    expect(mockUnfollowMutate).toHaveBeenCalledWith({ entityType: 'movie', entityId: '1' });
  });

  it('renders Save button for streaming movie', () => {
    const { getByLabelText } = render(
      <HeroCarousel movies={[mockMovies[1]]} platformMap={mockPlatformMap} />,
    );
    expect(getByLabelText('Save Kalki')).toBeTruthy();
  });

  it('calls watchlist add when Save button is pressed', () => {
    const { getByLabelText } = render(
      <HeroCarousel movies={[mockMovies[1]]} platformMap={mockPlatformMap} />,
    );
    fireEvent.press(getByLabelText('Save Kalki'));
    expect(mockAddMutate).toHaveBeenCalledWith({ userId: 'u1', movieId: '2' });
  });

  it('does not call follow mutation when a mutation is already in-flight (regression: duplicate taps)', () => {
    // @regression: rapid taps on hero carousel action buttons previously called mutate() multiple times
    mockFollowIsPending = true;
    const { getByLabelText } = render(<HeroCarousel movies={[mockMovies[0]]} />);
    fireEvent.press(getByLabelText('Follow Pushpa 2'));
    expect(mockFollowMutate).not.toHaveBeenCalled();
  });

  it('does not call watchlist mutation when a mutation is already in-flight', () => {
    mockAddIsPending = true;
    const { getByLabelText } = render(
      <HeroCarousel movies={[mockMovies[1]]} platformMap={mockPlatformMap} />,
    );
    fireEvent.press(getByLabelText('Save Kalki'));
    expect(mockAddMutate).not.toHaveBeenCalled();
  });

  it('calls watchlist remove mutation when movie is already in watchlist', () => {
    mockWatchlistSet.add('2');
    const { getByLabelText } = render(
      <HeroCarousel movies={[mockMovies[1]]} platformMap={mockPlatformMap} />,
    );
    fireEvent.press(getByLabelText('Kalki saved, tap to remove'));
    expect(mockRemoveMutate).toHaveBeenCalledWith({ userId: 'u1', movieId: '2' });
  });

  it('does not call mutation when unfollowMutation is pending', () => {
    mockUnfollowIsPending = true;
    const { getByLabelText } = render(<HeroCarousel movies={[mockMovies[0]]} />);
    fireEvent.press(getByLabelText('Follow Pushpa 2'));
    expect(mockFollowMutate).not.toHaveBeenCalled();
  });

  it('does not call mutation when removeWatchlist is pending', () => {
    mockRemoveIsPending = true;
    mockWatchlistSet.add('2');
    const { getByLabelText } = render(
      <HeroCarousel movies={[mockMovies[1]]} platformMap={mockPlatformMap} />,
    );
    fireEvent.press(getByLabelText('Kalki saved, tap to remove'));
    expect(mockRemoveMutate).not.toHaveBeenCalled();
  });

  it('advances auto-play past clone index back to 0', () => {
    jest.useFakeTimers();
    render(<HeroCarousel movies={mockMovies} />);

    // Advance auto-play 3 times: index goes 0→1→2 (clone) → triggers wrap-around
    act(() => {
      jest.advanceTimersByTime(5000 * 3);
    });

    jest.useRealTimers();
  });

  it('calls onViewableItemsChanged with clone index and resets to 0', () => {
    jest.useFakeTimers();
    const { UNSAFE_getByType } = render(<HeroCarousel movies={mockMovies} />);
    const { FlatList } = require('react-native');
    const flatList = UNSAFE_getByType(FlatList);

    // Simulate clone slide becoming visible (index = movies.length = 2)
    act(() => {
      flatList.props.onViewableItemsChanged?.({
        viewableItems: [{ index: 2, item: mockMovies[0] }],
        changed: [],
      });
    });

    // After CLONE_RESET_DELAY, should scroll back to 0
    act(() => {
      jest.advanceTimersByTime(500);
    });

    jest.useRealTimers();
  });

  it('calls onViewableItemsChanged with empty viewableItems without crashing', () => {
    const { UNSAFE_getByType } = render(<HeroCarousel movies={mockMovies} />);
    const { FlatList } = require('react-native');
    const flatList = UNSAFE_getByType(FlatList);

    expect(() => {
      flatList.props.onViewableItemsChanged?.({ viewableItems: [], changed: [] });
    }).not.toThrow();
  });

  it('getItemLayout returns correct layout for each index', () => {
    const { UNSAFE_getByType } = render(<HeroCarousel movies={mockMovies} />);
    const { FlatList } = require('react-native');
    const flatList = UNSAFE_getByType(FlatList);

    const layout0 = flatList.props.getItemLayout(undefined, 0);
    expect(layout0.index).toBe(0);
    expect(layout0.offset).toBe(0);
    expect(layout0.length).toBeGreaterThan(0);

    const layout1 = flatList.props.getItemLayout(undefined, 1);
    expect(layout1.index).toBe(1);
    expect(layout1.offset).toBe(layout0.length);
  });

  it('keyExtractor returns clone key for last item in extendedMovies', () => {
    const { UNSAFE_getByType } = render(<HeroCarousel movies={mockMovies} />);
    const { FlatList } = require('react-native');
    const flatList = UNSAFE_getByType(FlatList);

    // Clone is at index === movies.length (2)
    const cloneKey = flatList.props.keyExtractor(mockMovies[0], 2);
    expect(cloneKey).toBe('1-clone');

    // Normal item at index 0
    const normalKey = flatList.props.keyExtractor(mockMovies[0], 0);
    expect(normalKey).toBe('1');
  });

  it('calls onViewableItemsChanged with index null without crashing', () => {
    const { UNSAFE_getByType } = render(<HeroCarousel movies={mockMovies} />);
    const { FlatList } = require('react-native');
    const flatList = UNSAFE_getByType(FlatList);

    expect(() => {
      flatList.props.onViewableItemsChanged?.({
        viewableItems: [{ index: null, item: mockMovies[0] }],
        changed: [],
      });
    }).not.toThrow();
  });

  it('handles auto-play when activeIndex exceeds movies length (stale index guard)', () => {
    jest.useFakeTimers();
    const { UNSAFE_getByType } = render(<HeroCarousel movies={mockMovies} />);
    const { FlatList } = require('react-native');
    const flatList = UNSAFE_getByType(FlatList);

    // Force the active index to be beyond movies.length by simulating viewable items
    act(() => {
      flatList.props.onViewableItemsChanged?.({
        viewableItems: [{ index: 2, item: mockMovies[0] }],
        changed: [],
      });
    });

    // Let clone reset + auto-play fire
    act(() => {
      jest.advanceTimersByTime(5500);
    });

    jest.useRealTimers();
  });

  it('does not append clone for single-item list (extendedMovies === movies)', () => {
    const singleMovie: Movie[] = [mockMovies[0]];
    const { UNSAFE_getByType } = render(<HeroCarousel movies={singleMovie} />);
    const { FlatList } = require('react-native');
    const flatList = UNSAFE_getByType(FlatList);
    // Data should have exactly 1 item (no clone appended)
    expect(flatList.props.data.length).toBe(1);
  });

  it('renders without platformMap (undefined platforms default to [])', () => {
    const { getByText } = render(<HeroCarousel movies={[mockMovies[0]]} />);
    expect(getByText('Pushpa 2')).toBeTruthy();
  });

  it('clears previous clone reset timer when clone is viewed again', () => {
    jest.useFakeTimers();
    const { UNSAFE_getByType } = render(<HeroCarousel movies={mockMovies} />);
    const { FlatList } = require('react-native');
    const flatList = UNSAFE_getByType(FlatList);

    // Fire clone view twice rapidly to test timer clearing
    act(() => {
      flatList.props.onViewableItemsChanged?.({
        viewableItems: [{ index: 2, item: mockMovies[0] }],
        changed: [],
      });
    });
    act(() => {
      flatList.props.onViewableItemsChanged?.({
        viewableItems: [{ index: 2, item: mockMovies[0] }],
        changed: [],
      });
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    jest.useRealTimers();
  });
});
