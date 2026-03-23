jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/watchlist/hooks', () => ({
  useWatchlistPaginated: jest.fn(),
  useWatchlistMutations: jest.fn(),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import WatchlistScreen from '../watchlist';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useWatchlistPaginated, useWatchlistMutations } from '@/features/watchlist/hooks';

const mockUseAuth = useAuth as jest.Mock;
const mockUseWatchlistPaginated = useWatchlistPaginated as jest.Mock;
const mockUseWatchlistMutations = useWatchlistMutations as jest.Mock;

const mockMutations = {
  add: { mutate: jest.fn() },
  remove: { mutate: jest.fn() },
  markWatched: { mutate: jest.fn() },
  moveBack: { mutate: jest.fn() },
};

const mockMovie = (overrides: object = {}) => ({
  id: 'movie-1',
  title: 'Pushpa 2',
  in_theaters: true,
  premiere_date: null,
  release_date: '2025-03-15',
  poster_url: null,
  backdrop_url: null,
  rating: 4.5,
  review_count: 10,
  is_featured: false,
  genres: ['Action', 'Drama'],
  certification: 'UA' as const,
  runtime: 180,
  synopsis: '',
  director: 'Sukumar',
  tmdb_id: null,
  tmdb_last_synced_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const mockEntry = (id: string, status: 'watchlist' | 'watched', movieOverrides: object = {}) => ({
  id,
  user_id: 'user-1',
  movie_id: `movie-${id}`,
  status,
  added_at: '2024-01-01T00:00:00Z',
  watched_at: null,
  movie: mockMovie({ id: `movie-${id}`, ...movieOverrides }),
});

const mockFetchNextPage = jest.fn();

function setupLoggedIn() {
  mockUseAuth.mockReturnValue({
    user: { id: 'user-1' },
    session: {},
    isLoading: false,
    isGuest: false,
    setIsGuest: jest.fn(),
  });
  mockUseWatchlistMutations.mockReturnValue(mockMutations);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setupWatchlistMock(overrides: Record<string, any> = {}) {
  mockUseWatchlistPaginated.mockReturnValue({
    available: [],
    upcoming: [],
    watched: [],
    isLoading: false,
    hasNextPage: false,
    fetchNextPage: mockFetchNextPage,
    isFetchingNextPage: false,
    ...overrides,
  });
}

describe('WatchlistScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWatchlistMutations.mockReturnValue(mockMutations);
  });

  it('renders "My Watchlist" header', () => {
    setupLoggedIn();
    setupWatchlistMock();

    render(<WatchlistScreen />);

    expect(screen.getByText('My Watchlist')).toBeTruthy();
  });

  it('shows empty state when no movies', () => {
    setupLoggedIn();
    setupWatchlistMock();

    render(<WatchlistScreen />);

    expect(screen.getByText('Your watchlist is empty')).toBeTruthy();
    expect(screen.getByText('Discover Movies')).toBeTruthy();
  });

  it('renders "Available to Watch" section with movies', () => {
    setupLoggedIn();
    setupWatchlistMock({
      available: [
        mockEntry('1', 'watchlist', { title: 'Pushpa 2', in_theaters: true, premiere_date: null }),
      ],
    });

    render(<WatchlistScreen />);

    expect(screen.getByText('Available to Watch')).toBeTruthy();
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders "Upcoming Releases" section', () => {
    setupLoggedIn();
    setupWatchlistMock({
      upcoming: [
        mockEntry('2', 'watchlist', {
          title: 'Kalki 2898 AD',
          in_theaters: false,
          premiere_date: null,
          release_date: '2099-01-01',
        }),
      ],
    });

    render(<WatchlistScreen />);

    expect(screen.getByText('Upcoming Releases')).toBeTruthy();
    expect(screen.getByText('Kalki 2898 AD')).toBeTruthy();
  });

  it('renders "Watched Movies" section', () => {
    setupLoggedIn();
    setupWatchlistMock({
      watched: [
        mockEntry('3', 'watched', { title: 'RRR', in_theaters: false, premiere_date: null }),
      ],
    });

    render(<WatchlistScreen />);

    expect(screen.getByText('Watched Movies')).toBeTruthy();
    expect(screen.getByText('RRR')).toBeTruthy();
  });

  it('shows skeleton when loading', () => {
    setupLoggedIn();
    setupWatchlistMock({ isLoading: true });

    render(<WatchlistScreen />);

    expect(screen.getByTestId('watchlist-skeleton')).toBeTruthy();
    // Should not show empty state or content when loading
    expect(screen.queryByText('Your watchlist is empty')).toBeNull();
  });

  it('shows guest/unauthenticated state when user is null', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      isGuest: true,
      setIsGuest: jest.fn(),
    });
    setupWatchlistMock();
    mockUseWatchlistMutations.mockReturnValue(mockMutations);

    render(<WatchlistScreen />);

    expect(screen.getByText('Sign in to use Watchlist')).toBeTruthy();
    expect(screen.getByText('Sign In / Sign Up')).toBeTruthy();
  });

  it('displays movie count text for multiple movies', () => {
    setupLoggedIn();
    setupWatchlistMock({
      available: [
        mockEntry('1', 'watchlist', { title: 'Pushpa 2', in_theaters: true, premiere_date: null }),
        mockEntry('2', 'watchlist', { title: 'Salaar', in_theaters: false, premiere_date: null }),
      ],
      upcoming: [
        mockEntry('3', 'watchlist', {
          title: 'Kalki 2898 AD',
          in_theaters: false,
          premiere_date: null,
          release_date: '2099-01-01',
        }),
      ],
    });

    render(<WatchlistScreen />);

    expect(screen.getByText(/movies saved/)).toBeTruthy();
  });

  it('displays "1 movie saved" for a single movie', () => {
    setupLoggedIn();
    setupWatchlistMock({
      available: [
        mockEntry('1', 'watchlist', { title: 'Pushpa 2', in_theaters: true, premiere_date: null }),
      ],
    });

    render(<WatchlistScreen />);

    expect(screen.getByText(/movie saved/)).toBeTruthy();
  });

  it('calls remove.mutate when trash icon is pressed in Available section', () => {
    setupLoggedIn();
    setupWatchlistMock({
      available: [
        mockEntry('1', 'watchlist', { title: 'Pushpa 2', in_theaters: true, premiere_date: null }),
      ],
    });

    render(<WatchlistScreen />);

    const removeButton = screen.getByLabelText('Remove from watchlist');
    fireEvent.press(removeButton);
    expect(mockMutations.remove.mutate).toHaveBeenCalledWith({
      userId: 'user-1',
      movieId: 'movie-1',
    });
  });

  it('calls markWatched.mutate when checkmark is pressed in Available section', () => {
    setupLoggedIn();
    setupWatchlistMock({
      available: [
        mockEntry('1', 'watchlist', { title: 'Pushpa 2', in_theaters: true, premiere_date: null }),
      ],
    });

    render(<WatchlistScreen />);

    const watchedButton = screen.getByLabelText('Mark as watched');
    fireEvent.press(watchedButton);
    expect(mockMutations.markWatched.mutate).toHaveBeenCalledWith({
      userId: 'user-1',
      movieId: 'movie-1',
    });
  });

  it('navigates to movie detail when Available card is pressed', () => {
    setupLoggedIn();
    setupWatchlistMock({
      available: [
        mockEntry('1', 'watchlist', { title: 'Pushpa 2', in_theaters: true, premiere_date: null }),
      ],
    });

    render(<WatchlistScreen />);

    fireEvent.press(screen.getByLabelText('Pushpa 2'));
    expect(mockPush).toHaveBeenCalledWith('/movie/movie-1');
  });

  it('navigates to movie detail when Upcoming card is pressed', () => {
    setupLoggedIn();
    setupWatchlistMock({
      upcoming: [
        mockEntry('2', 'watchlist', {
          title: 'Kalki 2898 AD',
          in_theaters: false,
          premiere_date: null,
          release_date: '2099-01-01',
        }),
      ],
    });

    render(<WatchlistScreen />);

    fireEvent.press(screen.getByLabelText('Kalki 2898 AD'));
    expect(mockPush).toHaveBeenCalledWith('/movie/movie-2');
  });

  it('shows moveBack and remove actions in Watched section', () => {
    setupLoggedIn();
    setupWatchlistMock({
      watched: [
        mockEntry('3', 'watched', { title: 'RRR', in_theaters: false, premiere_date: null }),
      ],
    });

    render(<WatchlistScreen />);

    const moveBackButton = screen.getByLabelText('Move back to watchlist');
    fireEvent.press(moveBackButton);
    expect(mockMutations.moveBack.mutate).toHaveBeenCalledWith({
      userId: 'user-1',
      movieId: 'movie-3',
    });

    const removeButton = screen.getByLabelText('Remove from watched');
    fireEvent.press(removeButton);
    expect(mockMutations.remove.mutate).toHaveBeenCalledWith({
      userId: 'user-1',
      movieId: 'movie-3',
    });
  });

  it('shows "0 movies saved" in the empty state header', () => {
    setupLoggedIn();
    setupWatchlistMock();

    render(<WatchlistScreen />);

    expect(screen.getByText(/movies saved/)).toBeTruthy();
  });

  it('shows footer loader when fetching next page', () => {
    setupLoggedIn();
    setupWatchlistMock({
      available: [
        mockEntry('1', 'watchlist', { title: 'Pushpa 2', in_theaters: true, premiere_date: null }),
      ],
      isFetchingNextPage: true,
    });

    render(<WatchlistScreen />);

    expect(screen.getByTestId('footer-loader')).toBeTruthy();
  });

  it('does not show footer loader when not fetching', () => {
    setupLoggedIn();
    setupWatchlistMock({
      available: [
        mockEntry('1', 'watchlist', { title: 'Pushpa 2', in_theaters: true, premiere_date: null }),
      ],
      isFetchingNextPage: false,
    });

    render(<WatchlistScreen />);

    expect(screen.queryByTestId('footer-loader')).toBeNull();
  });

  it('navigates to login when Sign In button is pressed in guest state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      isGuest: true,
      setIsGuest: jest.fn(),
    });
    setupWatchlistMock();
    mockUseWatchlistMutations.mockReturnValue(mockMutations);

    render(<WatchlistScreen />);

    const signInButton = screen.getByText('Sign In / Sign Up');
    fireEvent.press(signInButton);
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });

  it('navigates to discover when Discover Movies button is pressed in empty state', () => {
    setupLoggedIn();
    setupWatchlistMock();

    render(<WatchlistScreen />);

    const discoverButton = screen.getByText('Discover Movies');
    fireEvent.press(discoverButton);
    expect(mockPush).toHaveBeenCalledWith('/discover');
  });

  it('calls fetchNextPage when FlatList reaches end and hasNextPage is true', () => {
    setupLoggedIn();
    setupWatchlistMock({
      available: [
        mockEntry('1', 'watchlist', { title: 'Pushpa 2', in_theaters: true, premiere_date: null }),
      ],
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    render(<WatchlistScreen />);

    const { FlatList } = require('react-native');
    const flatList = screen.UNSAFE_getByType(FlatList);
    fireEvent(flatList, 'endReached');
    expect(mockFetchNextPage).toHaveBeenCalled();
  });

  it('does not call fetchNextPage when hasNextPage is false', () => {
    setupLoggedIn();
    setupWatchlistMock({
      available: [
        mockEntry('1', 'watchlist', { title: 'Pushpa 2', in_theaters: true, premiere_date: null }),
      ],
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<WatchlistScreen />);

    const { FlatList } = require('react-native');
    const flatList = screen.UNSAFE_getByType(FlatList);
    fireEvent(flatList, 'endReached');
    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });

  it('collapses Available section when section header is toggled', () => {
    setupLoggedIn();
    setupWatchlistMock({
      available: [
        mockEntry('1', 'watchlist', { title: 'Pushpa 2', in_theaters: true, premiere_date: null }),
      ],
    });

    render(<WatchlistScreen />);

    // Pushpa 2 should be visible initially
    expect(screen.getByText('Pushpa 2')).toBeTruthy();

    // Press section header text to toggle collapse
    fireEvent.press(screen.getByText('Available to Watch'));

    // Entry should now be hidden (section collapsed)
    expect(screen.queryByText('Pushpa 2')).toBeNull();
  });
});
