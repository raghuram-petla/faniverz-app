import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

jest.mock('@/theme/ThemeProvider', () => {
  const { lightColors } = require('@/theme/colors');
  return {
    useTheme: () => ({ colors: lightColors, isDark: false }),
  };
});

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) => <View {...props} />,
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

const mockUseAuth = jest.fn();
jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseWatchlist = jest.fn();
const mockToggle = jest.fn();
jest.mock('@/features/watchlist/hooks', () => ({
  useWatchlist: () => mockUseWatchlist(),
  useToggleWatchlist: () => ({ mutate: mockToggle, isPending: false }),
}));

import WatchlistScreen from '../watchlist';

const makeMovie = (overrides = {}) => ({
  id: 1,
  tmdb_id: 100,
  title: 'Test Movie',
  title_te: null,
  original_title: 'Test Movie',
  overview: 'A test movie',
  overview_te: null,
  poster_path: '/poster.jpg',
  backdrop_path: null,
  release_date: '2026-06-15',
  runtime: 120,
  genres: ['Drama'],
  certification: 'U',
  vote_average: 7.5,
  vote_count: 100,
  popularity: 50,
  content_type: 'movie' as const,
  release_type: 'theatrical' as const,
  status: 'upcoming' as const,
  trailer_youtube_key: null,
  is_featured: false,
  tmdb_last_synced_at: null,
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
  ...overrides,
});

describe('WatchlistScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows login prompt when no user', () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockUseWatchlist.mockReturnValue({ data: [], isLoading: false, refetch: jest.fn() });

    render(<WatchlistScreen />);
    expect(screen.getByTestId('watchlist-login-prompt')).toBeTruthy();
  });

  it('shows empty state when watchlist is empty', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockUseWatchlist.mockReturnValue({ data: [], isLoading: false, refetch: jest.fn() });

    render(<WatchlistScreen />);
    expect(screen.getByTestId('watchlist-empty')).toBeTruthy();
    expect(screen.getByText('Your watchlist is empty')).toBeTruthy();
  });

  it('renders watchlist entries grouped by release status', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockUseWatchlist.mockReturnValue({
      data: [
        {
          id: 1,
          user_id: 'user-1',
          movie_id: 1,
          created_at: '2025-01-01',
          movie: makeMovie({ id: 1, title: 'Upcoming Movie', release_date: '2027-12-25' }),
        },
        {
          id: 2,
          user_id: 'user-1',
          movie_id: 2,
          created_at: '2025-01-02',
          movie: makeMovie({ id: 2, title: 'Old Movie', release_date: '2020-01-01' }),
        },
      ],
      isLoading: false,
      refetch: jest.fn(),
    });

    render(<WatchlistScreen />);
    expect(screen.getByTestId('watchlist-screen')).toBeTruthy();
    expect(screen.getByText('Releasing Soon')).toBeTruthy();
    expect(screen.getByText('Already Released')).toBeTruthy();
    expect(screen.getByText('Upcoming Movie')).toBeTruthy();
    expect(screen.getByText('Old Movie')).toBeTruthy();
  });
});
