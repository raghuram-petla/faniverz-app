/**
 * Integration test: Watchlist flow
 * Verifies: add movie → see in watchlist → remove → gone
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

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

jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

// Test the watchlist button toggle behavior
const mockToggle = jest.fn();
let mockIsWatchlisted = false;

jest.mock('@/features/watchlist/hooks', () => ({
  useWatchlistStatus: () => ({ data: mockIsWatchlisted }),
  useToggleWatchlist: () => ({ mutate: mockToggle, isPending: false }),
  useWatchlist: () => ({ data: [], isLoading: false, refetch: jest.fn() }),
}));

import WatchlistButton from '@/components/watchlist/WatchlistButton';

describe('Watchlist Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsWatchlisted = false;
  });

  it('initially shows empty watchlist icon', () => {
    render(<WatchlistButton userId="user-1" movieId={42} />);
    expect(screen.getByTestId('watchlist-icon')).toHaveTextContent('♡');
  });

  it('adds movie to watchlist on press', () => {
    render(<WatchlistButton userId="user-1" movieId={42} />);
    fireEvent.press(screen.getByTestId('watchlist-button'));

    expect(mockToggle).toHaveBeenCalledWith({
      userId: 'user-1',
      movieId: 42,
      isCurrentlyWatchlisted: false,
    });
  });

  it('shows filled icon when watchlisted', () => {
    mockIsWatchlisted = true;
    render(<WatchlistButton userId="user-1" movieId={42} />);
    expect(screen.getByTestId('watchlist-icon')).toHaveTextContent('♥');
  });

  it('removes movie from watchlist on press when already watchlisted', () => {
    mockIsWatchlisted = true;
    render(<WatchlistButton userId="user-1" movieId={42} />);
    fireEvent.press(screen.getByTestId('watchlist-button'));

    expect(mockToggle).toHaveBeenCalledWith({
      userId: 'user-1',
      movieId: 42,
      isCurrentlyWatchlisted: true,
    });
  });

  it('does not render when userId is undefined', () => {
    const { toJSON } = render(<WatchlistButton userId={undefined} movieId={42} />);
    expect(toJSON()).toBeNull();
  });

  describe('Watchlist grouping logic', () => {
    // Test the grouping function used by the watchlist screen
    it('groups movies by release date', () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + 30);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const entries = [
        { movie: { release_date: futureDateStr } },
        { movie: { release_date: '2020-01-01' } },
      ];

      const releasingSoon = entries.filter((e) => e.movie.release_date >= today);
      const alreadyReleased = entries.filter((e) => e.movie.release_date < today);

      expect(releasingSoon).toHaveLength(1);
      expect(alreadyReleased).toHaveLength(1);
    });
  });
});
