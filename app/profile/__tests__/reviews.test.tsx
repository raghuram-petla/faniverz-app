jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: null,
    isLoading: false,
    isGuest: false,
    setIsGuest: jest.fn(),
  }),
}));

const mockRemoveMutate = jest.fn();

const mockReviews = [
  {
    id: 'review-1',
    movie_id: 'movie-1',
    user_id: 'user-1',
    rating: 4,
    title: 'Great film',
    body: 'Really enjoyed the storytelling.',
    contains_spoiler: false,
    helpful_count: 12,
    created_at: '2024-03-15T10:00:00Z',
    updated_at: '2024-03-15T10:00:00Z',
    movie: { id: 'movie-1', title: 'Pushpa 2', poster_url: null },
  },
  {
    id: 'review-2',
    movie_id: 'movie-2',
    user_id: 'user-1',
    rating: 5,
    title: null,
    body: 'A masterpiece.',
    contains_spoiler: false,
    helpful_count: 7,
    created_at: '2024-02-10T10:00:00Z',
    updated_at: '2024-02-10T10:00:00Z',
    movie: { id: 'movie-2', title: 'Kalki 2898 AD', poster_url: null },
  },
];

const mockUseUserReviews = jest.fn((_userId: string) => ({
  data: mockReviews,
  isLoading: false,
}));

jest.mock('@/features/reviews/hooks', () => ({
  useUserReviews: (userId: string) => mockUseUserReviews(userId),
  useReviewMutations: () => ({
    create: { mutate: jest.fn(), isPending: false },
    update: { mutate: jest.fn(), isPending: false },
    remove: { mutate: mockRemoveMutate, isPending: false },
    helpful: { mutate: jest.fn(), isPending: false },
  }),
}));

import MyReviewsScreen from '../reviews';

describe('MyReviewsScreen', () => {
  it('renders "My Reviews" header', () => {
    render(<MyReviewsScreen />);
    expect(screen.getByText('My Reviews')).toBeTruthy();
  });

  it('shows stats grid', () => {
    render(<MyReviewsScreen />);
    // Stats labels
    expect(screen.getByText('Reviews')).toBeTruthy();
    expect(screen.getByText('Avg Rating')).toBeTruthy();
    // "Helpful" appears as a stat label AND as a sort button — assert at least one exists
    expect(screen.getAllByText('Helpful').length).toBeGreaterThanOrEqual(1);
    // Total reviews count
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('shows sort buttons — Recent, Rating, Helpful', () => {
    render(<MyReviewsScreen />);
    expect(screen.getByText('Recent')).toBeTruthy();
    expect(screen.getByText('Rating')).toBeTruthy();
    // "Helpful" appears as both a sort button label and a stat card label
    expect(screen.getAllByText('Helpful').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no reviews', () => {
    // Override the mock to return an empty list for this test only
    mockUseUserReviews.mockReturnValueOnce({ data: [], isLoading: false });

    render(<MyReviewsScreen />);
    expect(screen.getByText('No reviews yet')).toBeTruthy();
    expect(screen.getByText('Your movie reviews will appear here.')).toBeTruthy();
  });
});
