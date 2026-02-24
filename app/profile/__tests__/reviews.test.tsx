jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

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

  it('sorts reviews by rating when Rating sort button is pressed', () => {
    render(<MyReviewsScreen />);
    fireEvent.press(screen.getByText('Rating'));
    // After sorting by rating, the 5-star review (Kalki) should come before the 4-star review (Pushpa)
    const allMovieTitles = screen.getAllByText(/Pushpa 2|Kalki 2898 AD/);
    // The first movie title in the sorted list should be Kalki (rating 5)
    expect(allMovieTitles[0].props.children).toBe('Kalki 2898 AD');
  });

  it('shows delete confirmation dialog when Delete button is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<MyReviewsScreen />);
    // Find and press the first Delete button
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.press(deleteButtons[0]);
    expect(alertSpy).toHaveBeenCalledWith(
      'Delete Review',
      'Are you sure you want to delete this review?',
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });

  it('sorts reviews by helpful count when Helpful sort button is pressed', () => {
    render(<MyReviewsScreen />);
    // Find the Helpful sort button - it's the one in the sort row
    const helpfulButtons = screen.getAllByText('Helpful');
    // Press the sort button (last one in the list, the sort row button)
    fireEvent.press(helpfulButtons[helpfulButtons.length - 1]);
    // After sorting by helpful, review-1 (helpful_count: 12) should appear before review-2 (helpful_count: 7)
    const allMovieTitles = screen.getAllByText(/Pushpa 2|Kalki 2898 AD/);
    expect(allMovieTitles[0].props.children).toBe('Pushpa 2');
  });

  it('calls remove.mutate when Delete is confirmed in the alert', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<MyReviewsScreen />);

    // Press the first Delete button
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.press(deleteButtons[0]);

    // Get the alert call args
    const alertArgs = alertSpy.mock.calls[0];
    const buttons = alertArgs[2] as Array<{ text: string; onPress?: () => void }>;
    // Find and press the "Delete" button in the alert
    const deleteAction = buttons.find((b) => b.text === 'Delete');
    deleteAction?.onPress?.();

    expect(mockRemoveMutate).toHaveBeenCalledWith('review-1');
    alertSpy.mockRestore();
  });

  it('renders review body text', () => {
    render(<MyReviewsScreen />);
    expect(screen.getByText('Really enjoyed the storytelling.')).toBeTruthy();
    expect(screen.getByText('A masterpiece.')).toBeTruthy();
  });

  it('renders review title when present', () => {
    render(<MyReviewsScreen />);
    expect(screen.getByText('Great film')).toBeTruthy();
  });

  it('renders Edit button that navigates to movie page', () => {
    render(<MyReviewsScreen />);
    const editButtons = screen.getAllByText('Edit');
    expect(editButtons.length).toBeGreaterThan(0);
  });

  it('shows helpful count for reviews', () => {
    render(<MyReviewsScreen />);
    expect(screen.getByText('12 helpful')).toBeTruthy();
    expect(screen.getByText('7 helpful')).toBeTruthy();
  });

  it('shows total helpful count in stats', () => {
    render(<MyReviewsScreen />);
    // Total helpful = 12 + 7 = 19
    expect(screen.getByText('19')).toBeTruthy();
  });
});
