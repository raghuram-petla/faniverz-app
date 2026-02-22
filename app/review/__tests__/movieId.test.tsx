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

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ movieId: '42' }),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

const mockDeleteMutate = jest.fn();

const mockReviews = [
  {
    id: 1,
    user_id: 'user-2',
    movie_id: 42,
    rating: 4,
    title: 'Great',
    body: 'Loved it',
    is_spoiler: false,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    profile: { display_name: 'Alice', avatar_url: null },
  },
  {
    id: 2,
    user_id: 'user-3',
    movie_id: 42,
    rating: 5,
    title: 'Amazing',
    body: 'Best ever',
    is_spoiler: false,
    created_at: '2026-01-02',
    updated_at: '2026-01-02',
    profile: { display_name: 'Bob', avatar_url: null },
  },
];

jest.mock('@/features/reviews/hooks', () => ({
  useReviews: jest.fn(() => ({
    data: { pages: [mockReviews] },
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  })),
  useMyReview: jest.fn(() => ({ data: null })),
  useDeleteReview: () => ({ mutate: mockDeleteMutate }),
}));

import ReviewsListScreen from '../[movieId]';

describe('ReviewsListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders reviews list with summary', () => {
    render(<ReviewsListScreen />);
    expect(screen.getByTestId('reviews-list')).toBeTruthy();
    expect(screen.getByTestId('review-summary')).toBeTruthy();
  });

  it('renders sort selector', () => {
    render(<ReviewsListScreen />);
    expect(screen.getByTestId('sort-selector')).toBeTruthy();
    expect(screen.getByTestId('sort-recent')).toBeTruthy();
    expect(screen.getByTestId('sort-highest')).toBeTruthy();
    expect(screen.getByTestId('sort-lowest')).toBeTruthy();
  });

  it('renders review cards', () => {
    render(<ReviewsListScreen />);
    const cards = screen.getAllByTestId('review-card');
    expect(cards.length).toBe(2);
  });

  it('navigates to write review on FAB press', () => {
    render(<ReviewsListScreen />);
    fireEvent.press(screen.getByTestId('write-review-fab'));
    expect(mockPush).toHaveBeenCalledWith('/review/write/42');
  });

  it('shows empty state when no reviews', () => {
    const { useReviews } = require('@/features/reviews/hooks');
    (useReviews as jest.Mock).mockReturnValueOnce({
      data: { pages: [[]] },
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<ReviewsListScreen />);
    expect(screen.getByTestId('empty-reviews')).toBeTruthy();
  });

  it('pins own review at top', () => {
    const { useMyReview } = require('@/features/reviews/hooks');
    (useMyReview as jest.Mock).mockReturnValueOnce({
      data: {
        id: 99,
        user_id: 'user-1',
        movie_id: 42,
        rating: 5,
        title: 'My Review',
        body: 'My thoughts',
        is_spoiler: false,
        created_at: '2026-01-03',
        updated_at: '2026-01-03',
        profile: { display_name: 'Me', avatar_url: null },
      },
    });

    render(<ReviewsListScreen />);
    const cards = screen.getAllByTestId('review-card');
    expect(cards.length).toBe(3);
  });
});
