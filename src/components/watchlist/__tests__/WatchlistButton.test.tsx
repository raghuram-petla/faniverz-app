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

const mockMutate = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

jest.mock('@/features/watchlist/hooks', () => ({
  useWatchlistStatus: jest.fn(),
  useToggleWatchlist: jest.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
}));

import WatchlistButton from '../WatchlistButton';
import { useWatchlistStatus } from '@/features/watchlist/hooks';

const mockUseWatchlistStatus = useWatchlistStatus as jest.MockedFunction<typeof useWatchlistStatus>;

describe('WatchlistButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWatchlistStatus.mockReturnValue({
      data: false,
      isLoading: false,
      isSuccess: true,
    } as never);
  });

  it('returns null when no userId', () => {
    const { toJSON } = render(<WatchlistButton userId={undefined} movieId={42} />);
    expect(toJSON()).toBeNull();
  });

  it('renders outline heart when not watchlisted', () => {
    render(<WatchlistButton userId="user-1" movieId={42} />);
    expect(screen.getByTestId('watchlist-icon')).toHaveTextContent('♡');
  });

  it('renders filled heart when watchlisted', () => {
    mockUseWatchlistStatus.mockReturnValue({
      data: true,
      isLoading: false,
      isSuccess: true,
    } as never);

    render(<WatchlistButton userId="user-1" movieId={42} />);
    expect(screen.getByTestId('watchlist-icon')).toHaveTextContent('♥');
  });

  it('calls toggle on press to add', () => {
    render(<WatchlistButton userId="user-1" movieId={42} />);
    fireEvent.press(screen.getByTestId('watchlist-button'));
    expect(mockMutate).toHaveBeenCalledWith({
      userId: 'user-1',
      movieId: 42,
      isCurrentlyWatchlisted: false,
    });
  });

  it('calls toggle on press to remove', () => {
    mockUseWatchlistStatus.mockReturnValue({
      data: true,
      isLoading: false,
      isSuccess: true,
    } as never);

    render(<WatchlistButton userId="user-1" movieId={42} />);
    fireEvent.press(screen.getByTestId('watchlist-button'));
    expect(mockMutate).toHaveBeenCalledWith({
      userId: 'user-1',
      movieId: 42,
      isCurrentlyWatchlisted: true,
    });
  });

  it('has correct accessibility label when not watchlisted', () => {
    render(<WatchlistButton userId="user-1" movieId={42} />);
    expect(screen.getByLabelText('Add to watchlist')).toBeTruthy();
  });

  it('has correct accessibility label when watchlisted', () => {
    mockUseWatchlistStatus.mockReturnValue({
      data: true,
      isLoading: false,
      isSuccess: true,
    } as never);

    render(<WatchlistButton userId="user-1" movieId={42} />);
    expect(screen.getByLabelText('Remove from watchlist')).toBeTruthy();
  });
});
