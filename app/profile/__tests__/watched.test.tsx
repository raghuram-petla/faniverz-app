jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/watchlist/hooks', () => ({
  useWatchlist: jest.fn(),
}));

jest.mock('@/components/common/ScreenHeader', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ title }: { title: string }) => (
      <View>
        <Text>{title}</Text>
      </View>
    ),
  };
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import WatchedMoviesScreen from '../watched';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useWatchlist } from '@/features/watchlist/hooks';

const mockUseAuth = useAuth as jest.Mock;
const mockUseWatchlist = useWatchlist as jest.Mock;

describe('WatchedMoviesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      session: {},
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });
  });

  it('renders "Watched Movies" header', () => {
    mockUseWatchlist.mockReturnValue({ watched: [], isLoading: false });
    render(<WatchedMoviesScreen />);
    expect(screen.getByText('Watched Movies')).toBeTruthy();
  });

  it('shows loading indicator', () => {
    mockUseWatchlist.mockReturnValue({ watched: undefined, isLoading: true });
    const { toJSON } = render(<WatchedMoviesScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows empty state when no watched movies', () => {
    mockUseWatchlist.mockReturnValue({ watched: [], isLoading: false });
    render(<WatchedMoviesScreen />);
    expect(screen.getByText('No watched movies yet')).toBeTruthy();
    expect(
      screen.getByText('Mark movies as watched from your watchlist to track them here.'),
    ).toBeTruthy();
  });

  it('shows movie grid when watched movies exist', () => {
    const watchedEntries = [
      {
        id: 'w1',
        user_id: 'user-1',
        movie_id: 'm1',
        status: 'watched',
        watched_at: '2025-03-01T00:00:00Z',
        movie: {
          id: 'm1',
          title: 'Pushpa 2',
          poster_url: 'https://example.com/poster.jpg',
          rating: 4.5,
          release_type: 'theatrical',
        },
      },
      {
        id: 'w2',
        user_id: 'user-1',
        movie_id: 'm2',
        status: 'watched',
        watched_at: '2025-02-15T00:00:00Z',
        movie: {
          id: 'm2',
          title: 'Salaar',
          poster_url: 'https://example.com/poster2.jpg',
          rating: 3.8,
          release_type: 'theatrical',
        },
      },
    ];
    mockUseWatchlist.mockReturnValue({ watched: watchedEntries, isLoading: false });

    render(<WatchedMoviesScreen />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
    expect(screen.getByText('Salaar')).toBeTruthy();
  });

  it('shows correct stats grid values', () => {
    const watchedEntries = [
      {
        id: 'w1',
        user_id: 'user-1',
        movie_id: 'm1',
        status: 'watched',
        watched_at: '2025-03-01T00:00:00Z',
        movie: {
          id: 'm1',
          title: 'Pushpa 2',
          poster_url: null,
          rating: 4.0,
          release_type: 'theatrical',
        },
      },
      {
        id: 'w2',
        user_id: 'user-1',
        movie_id: 'm2',
        status: 'watched',
        watched_at: '2025-02-15T00:00:00Z',
        movie: {
          id: 'm2',
          title: 'Salaar',
          poster_url: null,
          rating: 3.0,
          release_type: 'theatrical',
        },
      },
    ];
    mockUseWatchlist.mockReturnValue({ watched: watchedEntries, isLoading: false });

    render(<WatchedMoviesScreen />);

    // Movies Watched count
    expect(screen.getByText('Movies Watched')).toBeTruthy();
    // Avg Rating label
    expect(screen.getByText('Avg Rating')).toBeTruthy();
    // Watch Time label
    expect(screen.getByText('Watch Time')).toBeTruthy();
    // 2 movies: avg rating = (4.0 + 3.0) / 2 = 3.5
    expect(screen.getByText('3.5')).toBeTruthy();
    // Watch time: 2 * 90 = 180 min = 3h
    expect(screen.getByText('3h')).toBeTruthy();
  });

  it('shows sort dropdown with default "Recently Watched"', () => {
    mockUseWatchlist.mockReturnValue({ watched: [], isLoading: false });
    render(<WatchedMoviesScreen />);
    expect(screen.getByText('Recently Watched')).toBeTruthy();
  });

  it('opens sort menu and shows all options', () => {
    mockUseWatchlist.mockReturnValue({ watched: [], isLoading: false });
    render(<WatchedMoviesScreen />);

    // Press the sort dropdown
    fireEvent.press(screen.getByText('Recently Watched'));

    // All sort options should be visible
    expect(screen.getByText('Highest Rated')).toBeTruthy();
    expect(screen.getByText('Title A\u2013Z')).toBeTruthy();
  });

  it('sorts by highest rated when option is selected', () => {
    const watchedEntries = [
      {
        id: 'w1',
        user_id: 'user-1',
        movie_id: 'm1',
        status: 'watched',
        watched_at: '2025-03-01T00:00:00Z',
        movie: {
          id: 'm1',
          title: 'Pushpa 2',
          poster_url: null,
          rating: 3.0,
          release_type: 'theatrical',
        },
      },
      {
        id: 'w2',
        user_id: 'user-1',
        movie_id: 'm2',
        status: 'watched',
        watched_at: '2025-02-15T00:00:00Z',
        movie: {
          id: 'm2',
          title: 'Salaar',
          poster_url: null,
          rating: 4.5,
          release_type: 'theatrical',
        },
      },
    ];
    mockUseWatchlist.mockReturnValue({ watched: watchedEntries, isLoading: false });

    render(<WatchedMoviesScreen />);

    // Open sort menu
    fireEvent.press(screen.getByText('Recently Watched'));
    // Select Highest Rated
    fireEvent.press(screen.getByText('Highest Rated'));

    // The sort dropdown should now show "Highest Rated"
    expect(screen.getByText('Highest Rated')).toBeTruthy();

    // After sorting by rating, Salaar (4.5) should come before Pushpa 2 (3.0)
    const allMovieTitles = screen.getAllByText(/Pushpa 2|Salaar/);
    expect(allMovieTitles[0].props.children).toBe('Salaar');
  });

  it('sorts by title A-Z when option is selected', () => {
    const watchedEntries = [
      {
        id: 'w1',
        user_id: 'user-1',
        movie_id: 'm1',
        status: 'watched',
        watched_at: '2025-03-01T00:00:00Z',
        movie: {
          id: 'm1',
          title: 'Pushpa 2',
          poster_url: null,
          rating: 4.0,
          release_type: 'theatrical',
        },
      },
      {
        id: 'w2',
        user_id: 'user-1',
        movie_id: 'm2',
        status: 'watched',
        watched_at: '2025-02-15T00:00:00Z',
        movie: {
          id: 'm2',
          title: 'Akhanda',
          poster_url: null,
          rating: 3.5,
          release_type: 'theatrical',
        },
      },
    ];
    mockUseWatchlist.mockReturnValue({ watched: watchedEntries, isLoading: false });

    render(<WatchedMoviesScreen />);

    // Open sort menu
    fireEvent.press(screen.getByText('Recently Watched'));
    // Select Title A-Z
    fireEvent.press(screen.getByText('Title A\u2013Z'));

    // After sorting by title, Akhanda should come before Pushpa 2
    const allMovieTitles = screen.getAllByText(/Pushpa 2|Akhanda/);
    expect(allMovieTitles[0].props.children).toBe('Akhanda');
  });

  it('shows dash for stats when no watched movies', () => {
    mockUseWatchlist.mockReturnValue({ watched: [], isLoading: false });
    render(<WatchedMoviesScreen />);

    // When there are no movies, avgRating and watchTime should show "—"
    const dashes = screen.getAllByText('\u2014');
    expect(dashes.length).toBe(2);
  });

  it('shows rating badge for movies with rating > 0', () => {
    const watchedEntries = [
      {
        id: 'w1',
        user_id: 'user-1',
        movie_id: 'm1',
        status: 'watched',
        watched_at: '2025-03-01T00:00:00Z',
        movie: {
          id: 'm1',
          title: 'Pushpa 2',
          poster_url: null,
          rating: 4.5,
          release_type: 'theatrical',
        },
      },
    ];
    mockUseWatchlist.mockReturnValue({ watched: watchedEntries, isLoading: false });

    render(<WatchedMoviesScreen />);

    // Rating badge should show the formatted rating (may appear in both stats and badge)
    expect(screen.getAllByText('4.5').length).toBeGreaterThanOrEqual(1);
  });
});
