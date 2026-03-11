import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReviewsPage from '@/app/(dashboard)/reviews/page';

const mockMutate = vi.fn();

vi.mock('@/hooks/useAdminReviews', () => ({
  useAdminReviews: vi.fn(),
  useDeleteReview: vi.fn(),
}));

import { useAdminReviews, useDeleteReview } from '@/hooks/useAdminReviews';

const mockUseAdminReviews = vi.mocked(useAdminReviews);
const mockUseDeleteReview = vi.mocked(useDeleteReview);

const mockReviews = [
  {
    id: 'rev-1',
    movie_id: 'mov-1',
    user_id: 'usr-1',
    rating: 4,
    title: 'Great Movie',
    body: 'Loved it',
    contains_spoiler: false,
    helpful_count: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    movie: { id: 'mov-1', title: 'Pushpa 2', poster_url: null },
    profile: { id: 'usr-1', display_name: 'Test User', email: 'test@example.com' },
  },
  {
    id: 'rev-2',
    movie_id: 'mov-2',
    user_id: 'usr-2',
    rating: 2,
    title: null,
    body: 'Not great',
    contains_spoiler: true,
    helpful_count: 0,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
    movie: { id: 'mov-2', title: 'Game Changer', poster_url: 'https://img.test/poster.jpg' },
    profile: { id: 'usr-2', display_name: null, email: 'user2@example.com' },
  },
];

beforeEach(() => {
  mockMutate.mockReset();
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  vi.spyOn(window, 'alert').mockImplementation(() => {});

  mockUseDeleteReview.mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteReview>);
});

describe('ReviewsPage', () => {
  describe('loading state', () => {
    it('renders spinner when loading', () => {
      mockUseAdminReviews.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown as ReturnType<typeof useAdminReviews>);

      const { container } = render(<ReviewsPage />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('renders "Reviews" heading while loading', () => {
      mockUseAdminReviews.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown as ReturnType<typeof useAdminReviews>);

      render(<ReviewsPage />);
      expect(screen.getByText('Reviews')).toBeInTheDocument();
    });

    it('does not show count badge while loading', () => {
      mockUseAdminReviews.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown as ReturnType<typeof useAdminReviews>);

      render(<ReviewsPage />);
      expect(screen.queryByText('(0)')).not.toBeInTheDocument();
      expect(screen.queryByText('(2)')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders "No reviews found." when reviews list is empty', () => {
      mockUseAdminReviews.mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminReviews>);

      render(<ReviewsPage />);
      expect(screen.getByText('No reviews found.')).toBeInTheDocument();
    });

    it('renders "Reviews" heading in empty state', () => {
      mockUseAdminReviews.mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminReviews>);

      render(<ReviewsPage />);
      expect(screen.getByText('Reviews')).toBeInTheDocument();
    });

    it('shows count (0) when reviews array is empty', () => {
      mockUseAdminReviews.mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminReviews>);

      render(<ReviewsPage />);
      expect(screen.getByText('(0)')).toBeInTheDocument();
    });
  });

  describe('data rendering', () => {
    beforeEach(() => {
      mockUseAdminReviews.mockReturnValue({
        data: mockReviews,
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminReviews>);
    });

    it('renders "Reviews" heading with count', () => {
      render(<ReviewsPage />);
      expect(screen.getByText('Reviews')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument();
    });

    it('renders table headers: Movie, User, Rating, Review, Date, Actions', () => {
      render(<ReviewsPage />);
      expect(screen.getByText('Movie', { selector: 'th' })).toBeInTheDocument();
      expect(screen.getByText('User', { selector: 'th' })).toBeInTheDocument();
      expect(screen.getByText('Rating', { selector: 'th' })).toBeInTheDocument();
      expect(screen.getByText('Review', { selector: 'th' })).toBeInTheDocument();
      expect(screen.getByText('Date', { selector: 'th' })).toBeInTheDocument();
      expect(screen.getByText('Actions', { selector: 'th' })).toBeInTheDocument();
    });

    it('renders movie titles', () => {
      render(<ReviewsPage />);
      expect(screen.getByText('Pushpa 2')).toBeInTheDocument();
      expect(screen.getByText('Game Changer')).toBeInTheDocument();
    });

    it('renders user display name when available', () => {
      render(<ReviewsPage />);
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('falls back to email when display_name is null', () => {
      render(<ReviewsPage />);
      expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    });

    it('renders review title or body text', () => {
      render(<ReviewsPage />);
      expect(screen.getByText('Great Movie')).toBeInTheDocument();
      expect(screen.getByText('Not great')).toBeInTheDocument();
    });

    it('shows spoiler badge for spoiler reviews', () => {
      render(<ReviewsPage />);
      expect(screen.getByText('Spoiler')).toBeInTheDocument();
    });

    it('renders formatted dates', () => {
      render(<ReviewsPage />);
      const date1 = new Date('2024-01-01T00:00:00Z').toLocaleDateString();
      const date2 = new Date('2024-02-01T00:00:00Z').toLocaleDateString();
      expect(screen.getByText(date1)).toBeInTheDocument();
      expect(screen.getByText(date2)).toBeInTheDocument();
    });

    it('renders a delete button for each review', () => {
      render(<ReviewsPage />);
      const deleteButtons = screen.getAllByTitle('Delete review');
      expect(deleteButtons).toHaveLength(2);
    });

    it('renders star rating icons (5 stars per review row)', () => {
      const { container } = render(<ReviewsPage />);
      // Each review row has 5 star icons = 10 total for 2 reviews
      const starIcons = container.querySelectorAll('svg');
      // 2 header stars (icon in heading area) + 10 review stars + 2 trash icons = 14
      // But we can count rows: 2 table rows, each with 5 stars
      expect(starIcons.length).toBeGreaterThanOrEqual(10);
    });

    it('shows "Unknown" when movie title is missing', () => {
      mockUseAdminReviews.mockReturnValue({
        data: [
          {
            ...mockReviews[0],
            id: 'rev-no-movie',
            movie: undefined,
          },
        ],
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminReviews>);

      render(<ReviewsPage />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('shows "Unknown" when profile is missing', () => {
      mockUseAdminReviews.mockReturnValue({
        data: [
          {
            ...mockReviews[0],
            id: 'rev-no-profile',
            profile: undefined,
          },
        ],
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminReviews>);

      render(<ReviewsPage />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('shows "--" when review has no title and no body', () => {
      mockUseAdminReviews.mockReturnValue({
        data: [
          {
            ...mockReviews[0],
            id: 'rev-no-text',
            title: null,
            body: null,
          },
        ],
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminReviews>);

      render(<ReviewsPage />);
      expect(screen.getByText('--')).toBeInTheDocument();
    });
  });

  describe('delete confirmation', () => {
    beforeEach(() => {
      mockUseAdminReviews.mockReturnValue({
        data: mockReviews,
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminReviews>);
    });

    it('calls window.confirm when delete button is clicked', () => {
      render(<ReviewsPage />);
      const deleteButtons = screen.getAllByTitle('Delete review');
      fireEvent.click(deleteButtons[0]);
      expect(window.confirm).toHaveBeenCalledWith('Delete this review? This cannot be undone.');
    });

    it('does not call mutate when confirm is cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<ReviewsPage />);
      const deleteButtons = screen.getAllByTitle('Delete review');
      fireEvent.click(deleteButtons[0]);

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('calls deleteReview.mutate with review id when confirmed', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<ReviewsPage />);
      const deleteButtons = screen.getAllByTitle('Delete review');
      fireEvent.click(deleteButtons[0]);

      expect(mockMutate).toHaveBeenCalledWith(
        'rev-1',
        expect.objectContaining({
          onError: expect.any(Function),
        }),
      );
    });

    it('calls deleteReview.mutate with correct id for second review', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<ReviewsPage />);
      const deleteButtons = screen.getAllByTitle('Delete review');
      fireEvent.click(deleteButtons[1]);

      expect(mockMutate).toHaveBeenCalledWith(
        'rev-2',
        expect.objectContaining({
          onError: expect.any(Function),
        }),
      );
    });

    it('disables delete buttons when mutation is pending', () => {
      mockUseDeleteReview.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      } as unknown as ReturnType<typeof useDeleteReview>);

      render(<ReviewsPage />);
      const deleteButtons = screen.getAllByTitle('Delete review');
      deleteButtons.forEach((btn) => {
        expect(btn).toBeDisabled();
      });
    });
  });

  describe('delete error handling', () => {
    beforeEach(() => {
      mockUseAdminReviews.mockReturnValue({
        data: mockReviews,
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminReviews>);
    });

    it('calls alert with error message when delete fails', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<ReviewsPage />);
      const deleteButtons = screen.getAllByTitle('Delete review');
      fireEvent.click(deleteButtons[0]);

      // Extract the onError callback passed to mutate
      const mutateCall = mockMutate.mock.calls[0];
      const options = mutateCall[1];
      const onError = options.onError;

      // Simulate the error callback
      onError(new Error('Permission denied'));

      expect(window.alert).toHaveBeenCalledWith('Error: Permission denied');
    });

    it('calls alert with correct message for different errors', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<ReviewsPage />);
      const deleteButtons = screen.getAllByTitle('Delete review');
      fireEvent.click(deleteButtons[0]);

      const mutateCall = mockMutate.mock.calls[0];
      const onError = mutateCall[1].onError;

      onError(new Error('Network error'));

      expect(window.alert).toHaveBeenCalledWith('Error: Network error');
    });
  });
});
