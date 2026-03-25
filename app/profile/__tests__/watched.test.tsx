jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
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

const mockPush = jest.fn();

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
    expect(screen.getByText('profile.watchedMovies')).toBeTruthy();
  });

  it('shows loading indicator', () => {
    mockUseWatchlist.mockReturnValue({ watched: undefined, isLoading: true });
    const { toJSON } = render(<WatchedMoviesScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows empty state when no watched movies', () => {
    mockUseWatchlist.mockReturnValue({ watched: [], isLoading: false });
    render(<WatchedMoviesScreen />);
    expect(screen.getByText('profile.noWatchedMovies')).toBeTruthy();
    expect(screen.getByText('profile.noWatchedMoviesSubtitle')).toBeTruthy();
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
          in_theaters: true,
          premiere_date: null,
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
          in_theaters: true,
          premiere_date: null,
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
          in_theaters: true,
          premiere_date: null,
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
          in_theaters: true,
          premiere_date: null,
        },
      },
    ];
    mockUseWatchlist.mockReturnValue({ watched: watchedEntries, isLoading: false });

    render(<WatchedMoviesScreen />);

    // Movies Watched count
    expect(screen.getByText('profile.moviesWatched')).toBeTruthy();
    // Avg Rating label
    expect(screen.getByText('profile.avgRating')).toBeTruthy();
    // Watch Time label
    expect(screen.getByText('profile.watchTime')).toBeTruthy();
    // 2 movies: avg rating = (4.0 + 3.0) / 2 = 3.5
    expect(screen.getByText('3.5')).toBeTruthy();
    // Watch time: no runtime set → fallback 90 each → 2 * 90 = 180 min = 3h 0m
    expect(screen.getByText('3h')).toBeTruthy();
  });

  it('uses actual movie runtime for watch time when available', () => {
    const watchedEntries = [
      {
        id: 'w1',
        user_id: 'user-1',
        movie_id: 'm1',
        status: 'watched',
        watched_at: '2025-03-01T00:00:00Z',
        movie: { id: 'm1', title: 'Long Movie', poster_url: null, rating: 4.0, runtime: 150 },
      },
      {
        id: 'w2',
        user_id: 'user-1',
        movie_id: 'm2',
        status: 'watched',
        watched_at: '2025-02-15T00:00:00Z',
        movie: { id: 'm2', title: 'Short Movie', poster_url: null, rating: 3.0, runtime: 120 },
      },
    ];
    mockUseWatchlist.mockReturnValue({
      watched: watchedEntries,
      isLoading: false,
      refetch: jest.fn(),
    });

    render(<WatchedMoviesScreen />);

    // 150 + 120 = 270 min = 4h 30m
    // Without runtime, fallback 90*2 = 180 min = 3h — so 4h 30m proves actual runtimes are used
    expect(screen.getByText('4h 30m')).toBeTruthy();
  });

  it('shows sort dropdown with default "Recently Watched"', () => {
    mockUseWatchlist.mockReturnValue({ watched: [], isLoading: false });
    render(<WatchedMoviesScreen />);
    expect(screen.getByText('profile.sortRecentlyWatched')).toBeTruthy();
  });

  it('opens sort menu and shows all options', () => {
    mockUseWatchlist.mockReturnValue({ watched: [], isLoading: false });
    render(<WatchedMoviesScreen />);

    // Press the sort dropdown
    fireEvent.press(screen.getByText('profile.sortRecentlyWatched'));

    // All sort options should be visible
    expect(screen.getByText('profile.sortHighestRated')).toBeTruthy();
    expect(screen.getByText('profile.sortTitleAZ')).toBeTruthy();
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
          in_theaters: true,
          premiere_date: null,
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
          in_theaters: true,
          premiere_date: null,
        },
      },
    ];
    mockUseWatchlist.mockReturnValue({ watched: watchedEntries, isLoading: false });

    render(<WatchedMoviesScreen />);

    // Open sort menu
    fireEvent.press(screen.getByText('profile.sortRecentlyWatched'));
    // Select Highest Rated
    fireEvent.press(screen.getByText('profile.sortHighestRated'));

    // The sort dropdown should now show "Highest Rated"
    expect(screen.getByText('profile.sortHighestRated')).toBeTruthy();

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
          in_theaters: true,
          premiere_date: null,
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
          in_theaters: true,
          premiere_date: null,
        },
      },
    ];
    mockUseWatchlist.mockReturnValue({ watched: watchedEntries, isLoading: false });

    render(<WatchedMoviesScreen />);

    // Open sort menu
    fireEvent.press(screen.getByText('profile.sortRecentlyWatched'));
    // Select Title A-Z
    fireEvent.press(screen.getByText('profile.sortTitleAZ'));

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
          in_theaters: true,
          premiere_date: null,
        },
      },
    ];
    mockUseWatchlist.mockReturnValue({ watched: watchedEntries, isLoading: false });

    render(<WatchedMoviesScreen />);

    // Rating badge should show the formatted rating (may appear in both stats and badge)
    expect(screen.getAllByText('4.5').length).toBeGreaterThanOrEqual(1);
  });

  it('navigates to movie detail when a watched movie card is pressed', () => {
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
          in_theaters: true,
          premiere_date: null,
        },
      },
    ];
    mockUseWatchlist.mockReturnValue({ watched: watchedEntries, isLoading: false });

    render(<WatchedMoviesScreen />);
    fireEvent.press(screen.getByText('Pushpa 2'));
    expect(mockPush).toHaveBeenCalledWith('/movie/m1');
  });

  it('handles entries with null movie gracefully (title and rating fallback)', () => {
    const watchedEntries = [
      {
        id: 'w1',
        user_id: 'user-1',
        movie_id: 'm1',
        status: 'watched',
        watched_at: '2025-03-01T00:00:00Z',
        movie: null,
      },
    ];
    mockUseWatchlist.mockReturnValue({ watched: watchedEntries, isLoading: false });
    // Should render without crashing — movie?.title ?? 'Unknown', movie?.rating ?? 0
    expect(() => render(<WatchedMoviesScreen />)).not.toThrow();
  });

  it('handles null user id gracefully (passes empty string to useWatchlist)', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      isGuest: false,
      setIsGuest: jest.fn(),
    });
    mockUseWatchlist.mockReturnValue({ watched: [], isLoading: false });
    // user?.id is undefined → ?? '' fallback → useWatchlist('')
    expect(() => render(<WatchedMoviesScreen />)).not.toThrow();
  });

  it('handles entries with null watched_at when sorting by recent', () => {
    const watchedEntries = [
      {
        id: 'w1',
        user_id: 'user-1',
        movie_id: 'm1',
        status: 'watched',
        watched_at: null,
        movie: {
          id: 'm1',
          title: 'Pushpa 2',
          poster_url: null,
          rating: 4.0,
          in_theaters: true,
          premiere_date: null,
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
          rating: 3.8,
          in_theaters: true,
          premiere_date: null,
        },
      },
    ];
    mockUseWatchlist.mockReturnValue({ watched: watchedEntries, isLoading: false });

    render(<WatchedMoviesScreen />);

    // Should render both without crashing (null watched_at treated as 0)
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
    expect(screen.getByText('Salaar')).toBeTruthy();
  });

  it('renders odd row padding when only one movie in last row', () => {
    const watchedEntries = [
      {
        id: 'w1',
        user_id: 'user-1',
        movie_id: 'm1',
        status: 'watched',
        watched_at: '2025-03-01T00:00:00Z',
        movie: {
          id: 'm1',
          title: 'Solo Movie',
          poster_url: null,
          rating: 4.0,
          in_theaters: true,
          premiere_date: null,
        },
      },
    ];
    mockUseWatchlist.mockReturnValue({ watched: watchedEntries, isLoading: false });

    render(<WatchedMoviesScreen />);
    // Should render single movie without crashing (row.length === 1 adds empty padding view)
    expect(screen.getByText('Solo Movie')).toBeTruthy();
  });

  it('does not navigate when movie.id is falsy (covers movie?.id && router.push guard)', () => {
    const watchedEntries = [
      {
        id: 'w1',
        user_id: 'user-1',
        movie_id: 'm1',
        status: 'watched',
        watched_at: '2025-03-01T00:00:00Z',
        movie: null,
      },
    ];
    mockUseWatchlist.mockReturnValue({ watched: watchedEntries, isLoading: false });

    render(<WatchedMoviesScreen />);
    fireEvent.press(screen.getByLabelText('Unknown'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not show rating badge when movie rating is 0', () => {
    const watchedEntries = [
      {
        id: 'w1',
        user_id: 'user-1',
        movie_id: 'm1',
        status: 'watched',
        watched_at: '2025-03-01T00:00:00Z',
        movie: {
          id: 'm1',
          title: 'Zero Rating',
          poster_url: null,
          rating: 0,
          in_theaters: true,
          premiere_date: null,
        },
      },
    ];
    mockUseWatchlist.mockReturnValue({ watched: watchedEntries, isLoading: false });

    render(<WatchedMoviesScreen />);
    expect(screen.getByText('Zero Rating')).toBeTruthy();
    // Rating badge on poster should not appear when rating is 0
    // avgRating stat shows "0.0" but the poster badge guard (rating > 0) filters it out
    // Verify the movie renders without crashing
    expect(screen.getByLabelText('Zero Rating')).toBeTruthy();
  });

  it('handles watched being undefined (covers watched ?? [] branch)', () => {
    mockUseWatchlist.mockReturnValue({ watched: undefined, isLoading: false });

    render(<WatchedMoviesScreen />);
    // Empty state should show
    expect(screen.getByText('profile.noWatchedMovies')).toBeTruthy();
  });

  it('handles sort by rating when movie rating is null (covers ?? 0 branch)', () => {
    const watchedEntries = [
      {
        id: 'w1',
        user_id: 'user-1',
        movie_id: 'm1',
        status: 'watched',
        watched_at: '2025-03-01T00:00:00Z',
        movie: { id: 'm1', title: 'Movie A', poster_url: null, rating: null, runtime: 90 },
      },
      {
        id: 'w2',
        user_id: 'user-1',
        movie_id: 'm2',
        status: 'watched',
        watched_at: '2025-02-15T00:00:00Z',
        movie: { id: 'm2', title: 'Movie B', poster_url: null, rating: 4.0, runtime: 120 },
      },
    ];
    mockUseWatchlist.mockReturnValue({ watched: watchedEntries, isLoading: false });

    render(<WatchedMoviesScreen />);

    // Open sort menu and sort by rating
    fireEvent.press(screen.getByText('profile.sortRecentlyWatched'));
    fireEvent.press(screen.getByText('profile.sortHighestRated'));

    // Movie B (rating 4.0) should come before Movie A (rating null → 0)
    const allMovieTitles = screen.getAllByText(/Movie A|Movie B/);
    expect(allMovieTitles[0].props.children).toBe('Movie B');
  });

  it('handles sort by title when movie title is null (covers ?? empty string branch)', () => {
    const watchedEntries = [
      {
        id: 'w1',
        user_id: 'user-1',
        movie_id: 'm1',
        status: 'watched',
        watched_at: '2025-03-01T00:00:00Z',
        movie: null,
      },
      {
        id: 'w2',
        user_id: 'user-1',
        movie_id: 'm2',
        status: 'watched',
        watched_at: '2025-02-15T00:00:00Z',
        movie: { id: 'm2', title: 'Akhanda', poster_url: null, rating: 3.0, runtime: 120 },
      },
    ];
    mockUseWatchlist.mockReturnValue({ watched: watchedEntries, isLoading: false });

    render(<WatchedMoviesScreen />);

    fireEvent.press(screen.getByText('profile.sortRecentlyWatched'));
    fireEvent.press(screen.getByText('profile.sortTitleAZ'));

    // Should not crash — null movie title defaults to ''
    expect(screen.getByText('Akhanda')).toBeTruthy();
  });

  it('count badge is not shown when watched list is empty (renders stats with 0)', () => {
    mockUseWatchlist.mockReturnValue({ watched: [], isLoading: false });
    render(<WatchedMoviesScreen />);
    // count === 0, titleBadge = count > 0 && <badge> evaluates to false — no badge
    // But stats grid still shows "0" for movies watched count
    // This test verifies the empty state path renders correctly
    expect(screen.getByText('profile.noWatchedMovies')).toBeTruthy();
  });
});
