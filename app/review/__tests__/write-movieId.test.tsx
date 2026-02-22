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

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ movieId: '42' }),
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

const mockCreateMutate = jest.fn();
const mockUpdateMutate = jest.fn();

jest.mock('@/features/reviews/hooks', () => ({
  useMyReview: jest.fn(() => ({ data: null })),
  useCreateReview: () => ({ mutate: mockCreateMutate, isPending: false }),
  useUpdateReview: () => ({ mutate: mockUpdateMutate, isPending: false }),
}));

import WriteReviewScreen from '../write/[movieId]';
import { useMyReview } from '@/features/reviews/hooks';

const mockUseMyReview = useMyReview as jest.MockedFunction<typeof useMyReview>;

describe('WriteReviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders in create mode when no existing review', () => {
    render(<WriteReviewScreen />);
    expect(screen.getByTestId('write-review-screen')).toBeTruthy();
    expect(screen.getByTestId('review-form')).toBeTruthy();
  });

  it('calls createReview on submit in create mode', () => {
    render(<WriteReviewScreen />);
    fireEvent.press(screen.getByTestId('star-4'));
    fireEvent.press(screen.getByTestId('submit-review'));
    expect(mockCreateMutate).toHaveBeenCalledWith(
      {
        userId: 'user-1',
        review: { movie_id: 42, rating: 4, title: undefined, body: undefined, is_spoiler: false },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it('renders in edit mode with existing review', () => {
    (mockUseMyReview as jest.Mock).mockReturnValue({
      data: {
        id: 10,
        user_id: 'user-1',
        movie_id: 42,
        rating: 3,
        title: 'Edit me',
        body: 'Body text',
        is_spoiler: false,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        profile: { display_name: 'User', avatar_url: null },
      },
    });

    render(<WriteReviewScreen />);
    expect(screen.getByTestId('review-title-input').props.value).toBe('Edit me');
  });

  it('calls updateReview on submit in edit mode', () => {
    (mockUseMyReview as jest.Mock).mockReturnValue({
      data: {
        id: 10,
        user_id: 'user-1',
        movie_id: 42,
        rating: 3,
        title: 'Edit me',
        body: 'Body text',
        is_spoiler: false,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        profile: { display_name: 'User', avatar_url: null },
      },
    });

    render(<WriteReviewScreen />);
    fireEvent.press(screen.getByTestId('star-5'));
    fireEvent.press(screen.getByTestId('submit-review'));
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      {
        reviewId: 10,
        movieId: 42,
        updates: { rating: 5, title: 'Edit me', body: 'Body text', is_spoiler: false },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });
});
