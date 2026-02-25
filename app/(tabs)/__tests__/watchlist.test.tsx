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
  release_type: 'theatrical' as const,
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
  trailer_url: null,
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
      available: [mockEntry('1', 'watchlist', { title: 'Pushpa 2', release_type: 'theatrical' })],
    });

    render(<WatchlistScreen />);

    expect(screen.getByText('Available to Watch')).toBeTruthy();
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders "Upcoming Releases" section', () => {
    setupLoggedIn();
    setupWatchlistMock({
      upcoming: [mockEntry('2', 'watchlist', { title: 'Kalki 2898 AD', release_type: 'upcoming' })],
    });

    render(<WatchlistScreen />);

    expect(screen.getByText('Upcoming Releases')).toBeTruthy();
    expect(screen.getByText('Kalki 2898 AD')).toBeTruthy();
  });

  it('renders "Watched Movies" section', () => {
    setupLoggedIn();
    setupWatchlistMock({
      watched: [mockEntry('3', 'watched', { title: 'RRR', release_type: 'ott' })],
    });

    render(<WatchlistScreen />);

    expect(screen.getByText('Watched Movies')).toBeTruthy();
    expect(screen.getByText('RRR')).toBeTruthy();
  });

  it('shows loading state with ActivityIndicator', () => {
    setupLoggedIn();
    setupWatchlistMock({ isLoading: true });

    render(<WatchlistScreen />);

    expect(screen.getByText('My Watchlist')).toBeTruthy();
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
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('displays movie count text for multiple movies', () => {
    setupLoggedIn();
    setupWatchlistMock({
      available: [
        mockEntry('1', 'watchlist', { title: 'Pushpa 2', release_type: 'theatrical' }),
        mockEntry('2', 'watchlist', { title: 'Salaar', release_type: 'ott' }),
      ],
      upcoming: [mockEntry('3', 'watchlist', { title: 'Kalki 2898 AD', release_type: 'upcoming' })],
    });

    render(<WatchlistScreen />);

    expect(screen.getByText('3 movies saved')).toBeTruthy();
  });

  it('displays "1 movie saved" for a single movie', () => {
    setupLoggedIn();
    setupWatchlistMock({
      available: [mockEntry('1', 'watchlist', { title: 'Pushpa 2', release_type: 'theatrical' })],
    });

    render(<WatchlistScreen />);

    expect(screen.getByText('1 movie saved')).toBeTruthy();
  });

  it('calls remove.mutate when trash icon is pressed in Available section', () => {
    setupLoggedIn();
    setupWatchlistMock({
      available: [mockEntry('1', 'watchlist', { title: 'Pushpa 2', release_type: 'theatrical' })],
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
      available: [mockEntry('1', 'watchlist', { title: 'Pushpa 2', release_type: 'theatrical' })],
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
      available: [mockEntry('1', 'watchlist', { title: 'Pushpa 2', release_type: 'theatrical' })],
    });

    render(<WatchlistScreen />);

    fireEvent.press(screen.getByLabelText('Pushpa 2'));
    expect(mockPush).toHaveBeenCalledWith('/movie/movie-1');
  });

  it('navigates to movie detail when Upcoming card is pressed', () => {
    setupLoggedIn();
    setupWatchlistMock({
      upcoming: [mockEntry('2', 'watchlist', { title: 'Kalki 2898 AD', release_type: 'upcoming' })],
    });

    render(<WatchlistScreen />);

    fireEvent.press(screen.getByLabelText('Kalki 2898 AD'));
    expect(mockPush).toHaveBeenCalledWith('/movie/movie-2');
  });

  it('shows moveBack and remove actions in Watched section', () => {
    setupLoggedIn();
    setupWatchlistMock({
      watched: [mockEntry('3', 'watched', { title: 'RRR', release_type: 'ott' })],
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

    expect(screen.getByText('0 movies saved')).toBeTruthy();
  });

  it('shows footer loader when fetching next page', () => {
    setupLoggedIn();
    setupWatchlistMock({
      available: [mockEntry('1', 'watchlist', { title: 'Pushpa 2', release_type: 'theatrical' })],
      isFetchingNextPage: true,
    });

    render(<WatchlistScreen />);

    expect(screen.getByTestId('footer-loader')).toBeTruthy();
  });

  it('does not show footer loader when not fetching', () => {
    setupLoggedIn();
    setupWatchlistMock({
      available: [mockEntry('1', 'watchlist', { title: 'Pushpa 2', release_type: 'theatrical' })],
      isFetchingNextPage: false,
    });

    render(<WatchlistScreen />);

    expect(screen.queryByTestId('footer-loader')).toBeNull();
  });
});
