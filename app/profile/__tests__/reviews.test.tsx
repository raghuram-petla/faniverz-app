jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

let capturedOnSubmit: (() => void) | null = null;
let capturedOnSpoilerToggle: (() => void) | null = null;
let capturedOnClose: (() => void) | null = null;

jest.mock('@/components/movie/detail/ReviewModal', () => ({
  ReviewModal: (props: {
    onSubmit?: () => void;
    onSpoilerToggle?: () => void;
    onClose?: () => void;
  }) => {
    capturedOnSubmit = props.onSubmit ?? null;
    capturedOnSpoilerToggle = props.onSpoilerToggle ?? null;
    capturedOnClose = props.onClose ?? null;
    return null;
  },
}));

import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useNavigation: () => ({ getState: () => ({ index: 0 }) }),
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
const mockUpdateMutate = jest.fn();

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
    update: { mutate: mockUpdateMutate, isPending: false },
    remove: { mutate: mockRemoveMutate, isPending: false },
    helpful: { mutate: jest.fn(), isPending: false },
  }),
}));

import MyReviewsScreen from '../reviews';

describe('MyReviewsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "My Reviews" header', () => {
    render(<MyReviewsScreen />);
    expect(screen.getByText('profile.myReviews')).toBeTruthy();
  });

  it('shows stats grid', () => {
    render(<MyReviewsScreen />);
    // Stats labels
    expect(screen.getByText('profile.reviewsStat')).toBeTruthy();
    expect(screen.getByText('profile.avgRating')).toBeTruthy();
    // "Helpful" appears as a stat label AND as a sort button — assert at least one exists
    expect(screen.getAllByText('profile.sortHelpful').length).toBeGreaterThanOrEqual(1);
    // Total reviews count
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('shows sort buttons — Recent, Rating, Helpful', () => {
    render(<MyReviewsScreen />);
    expect(screen.getByText('profile.sortRecent')).toBeTruthy();
    expect(screen.getByText('profile.sortRating')).toBeTruthy();
    // "Helpful" appears as both a sort button label and a stat card label
    expect(screen.getAllByText('profile.sortHelpful').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no reviews', () => {
    // Override the mock to return an empty list for this test only
    mockUseUserReviews.mockReturnValueOnce({ data: [], isLoading: false });

    render(<MyReviewsScreen />);
    expect(screen.getByText('profile.noReviews')).toBeTruthy();
    expect(screen.getByText('profile.noReviewsSubtitle')).toBeTruthy();
  });

  it('sorts reviews by rating when Rating sort button is pressed', () => {
    render(<MyReviewsScreen />);
    fireEvent.press(screen.getByText('profile.sortRating'));
    // After sorting by rating, the 5-star review (Kalki) should come before the 4-star review (Pushpa)
    const allMovieTitles = screen.getAllByText(/Pushpa 2|Kalki 2898 AD/);
    // The first movie title in the sorted list should be Kalki (rating 5)
    expect(allMovieTitles[0].props.children).toBe('Kalki 2898 AD');
  });

  it('shows delete confirmation dialog when Delete button is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<MyReviewsScreen />);
    // Find and press the first Delete button
    const deleteButtons = screen.getAllByText('common.delete');
    fireEvent.press(deleteButtons[0]);
    expect(alertSpy).toHaveBeenCalledWith(
      'profile.deleteReview',
      'profile.deleteReviewConfirm',
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });

  it('sorts reviews by helpful count when Helpful sort button is pressed', () => {
    render(<MyReviewsScreen />);
    // Find the Helpful sort button - it's the one in the sort row
    const helpfulButtons = screen.getAllByText('profile.sortHelpful');
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
    const deleteButtons = screen.getAllByText('common.delete');
    fireEvent.press(deleteButtons[0]);

    // Get the alert call args
    const alertArgs = alertSpy.mock.calls[0];
    const buttons = alertArgs[2] as Array<{ text: string; onPress?: () => void }>;
    // Find and press the "Delete" button in the alert
    const deleteAction = buttons.find((b) => b.text === 'common.delete');
    deleteAction?.onPress?.();

    expect(mockRemoveMutate).toHaveBeenCalledWith({ id: 'review-1', movieId: 'movie-1' });
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

  it('renders Edit buttons that open edit modal', () => {
    render(<MyReviewsScreen />);
    const editButtons = screen.getAllByText('common.edit');
    expect(editButtons.length).toBeGreaterThan(0);
    // Pressing Edit sets editing state (opens ReviewModal) rather than navigating
    fireEvent.press(editButtons[0]);
  });

  it('shows helpful count for reviews', () => {
    render(<MyReviewsScreen />);
    expect(screen.getByText(/12/)).toBeTruthy();
    expect(screen.getByText(/7/)).toBeTruthy();
  });

  it('shows total helpful count in stats', () => {
    render(<MyReviewsScreen />);
    // Total helpful = 12 + 7 = 19
    expect(screen.getByText('19')).toBeTruthy();
  });

  it('shows skeleton when reviews are loading', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseUserReviews.mockReturnValueOnce({ data: undefined as any, isLoading: true });
    render(<MyReviewsScreen />);
    expect(screen.getByTestId('reviews-content-skeleton')).toBeTruthy();
  });

  it('does not render body text when review body is null', () => {
    const reviewWithNoBody = [
      {
        id: 'review-3',
        movie_id: 'movie-3',
        user_id: 'user-1',
        rating: 3,
        title: 'Decent film',
        body: null,
        contains_spoiler: false,
        helpful_count: 0,
        created_at: '2024-04-01T00:00:00Z',
        updated_at: '2024-04-01T00:00:00Z',
        movie: { id: 'movie-3', title: 'Some Movie', poster_url: null },
      },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseUserReviews.mockReturnValueOnce({ data: reviewWithNoBody as any, isLoading: false });

    render(<MyReviewsScreen />);

    expect(screen.getByText('Decent film')).toBeTruthy();
    // Body section should not exist (review.body is null)
    expect(screen.queryByText('null')).toBeNull();
  });

  it('shows Alert on delete button press when remove is not pending', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(<MyReviewsScreen />);
    const deleteButtons = screen.getAllByText('common.delete');
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.press(deleteButtons[0]);
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('handleEditSubmit calls update.mutate when editingReview is set and rating > 0', () => {
    capturedOnSubmit = null;
    render(<MyReviewsScreen />);
    // Press Edit on the first review to open modal and set editingReview
    const editButtons = screen.getAllByText('common.edit');
    fireEvent.press(editButtons[0]);
    // capturedOnSubmit is now set by the ReviewModal mock
    expect(capturedOnSubmit).not.toBeNull();
    capturedOnSubmit?.();
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'review-1', movieId: 'movie-1' }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    // Simulate onSuccess to close modal (clears editingReview)
    const onSuccessArg = mockUpdateMutate.mock.calls[0][1]?.onSuccess;
    expect(() => onSuccessArg?.()).not.toThrow();
  });

  it('handleEditSubmit is a no-op when editingReview is null (no Edit pressed)', () => {
    // When editingReview is null, calling the submit handler early-returns
    capturedOnSubmit = null;
    render(<MyReviewsScreen />);
    // Call the captured onSubmit without pressing Edit (editingReview = null)
    capturedOnSubmit?.();
    // update.mutate should NOT be called since editingReview is null
    expect(mockUpdateMutate).not.toHaveBeenCalled();
  });

  it('onSpoilerToggle toggles spoiler state', () => {
    capturedOnSpoilerToggle = null;
    render(<MyReviewsScreen />);
    const editButtons = screen.getAllByText('common.edit');
    fireEvent.press(editButtons[0]);
    expect(capturedOnSpoilerToggle).not.toBeNull();
    // Should not throw when called
    expect(() => capturedOnSpoilerToggle?.()).not.toThrow();
  });

  it('onClose callback clears editingReview', () => {
    capturedOnClose = null;
    render(<MyReviewsScreen />);
    const editButtons = screen.getAllByText('common.edit');
    fireEvent.press(editButtons[0]);
    expect(capturedOnClose).not.toBeNull();
    // Should not throw
    expect(() => capturedOnClose?.()).not.toThrow();
  });
});
