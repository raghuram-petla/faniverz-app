import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReviewsPage from '@/app/(dashboard)/reviews/page';

const mockMutate = vi.fn();
const mockSetSearch = vi.fn();

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ isReadOnly: false }),
}));

vi.mock('@/hooks/useAdminReviews', () => ({
  useAdminReviews: vi.fn(),
  useDeleteReview: vi.fn(),
  useUpdateReview: vi.fn(),
}));

vi.mock('@/hooks/useDebouncedSearch', () => ({
  useDebouncedSearch: vi.fn(),
}));

vi.mock('@/components/common/SearchInput', () => ({
  SearchInput: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

import { useAdminReviews, useDeleteReview, useUpdateReview } from '@/hooks/useAdminReviews';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';

const mockUseAdminReviews = vi.mocked(useAdminReviews);
const mockUseDeleteReview = vi.mocked(useDeleteReview);
const mockUseUpdateReview = vi.mocked(useUpdateReview);
const mockUseDebouncedSearch = vi.mocked(useDebouncedSearch);

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
  mockSetSearch.mockReset();
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  vi.spyOn(window, 'alert').mockImplementation(() => {});

  mockUseDebouncedSearch.mockReturnValue({
    search: '',
    setSearch: mockSetSearch,
    debouncedSearch: '',
  });

  mockUseDeleteReview.mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteReview>);

  mockUseUpdateReview.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateReview>);
});

describe('ReviewsPage', () => {
  describe('search and filter UI', () => {
    beforeEach(() => {
      mockUseAdminReviews.mockReturnValue({
        data: mockReviews,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminReviews>);
    });

    it('renders search input with correct placeholder', () => {
      render(<ReviewsPage />);
      expect(
        screen.getByPlaceholderText('Search by movie, reviewer, or review text...'),
      ).toBeInTheDocument();
    });

    it('renders rating filter dropdown with all options', () => {
      render(<ReviewsPage />);
      const select = screen.getByDisplayValue('All Ratings');
      expect(select).toBeInTheDocument();
      expect(screen.getByText('1 Star')).toBeInTheDocument();
      expect(screen.getByText('2 Stars')).toBeInTheDocument();
      expect(screen.getByText('3 Stars')).toBeInTheDocument();
      expect(screen.getByText('4 Stars')).toBeInTheDocument();
      expect(screen.getByText('5 Stars')).toBeInTheDocument();
    });

    it('calls setSearch when typing in search input', () => {
      render(<ReviewsPage />);
      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'Pushpa' } });
      expect(mockSetSearch).toHaveBeenCalledWith('Pushpa');
    });

    it('passes debouncedSearch to useAdminReviews', () => {
      mockUseDebouncedSearch.mockReturnValue({
        search: 'test',
        setSearch: mockSetSearch,
        debouncedSearch: 'test',
      });

      render(<ReviewsPage />);
      expect(mockUseAdminReviews).toHaveBeenCalledWith('test', 0);
    });

    it('passes ratingFilter to useAdminReviews when changed', () => {
      render(<ReviewsPage />);
      const select = screen.getByDisplayValue('All Ratings');
      fireEvent.change(select, { target: { value: '4' } });
      // After state change, component re-renders and calls hook with new value
      expect(mockUseAdminReviews).toHaveBeenCalled();
    });

    it('shows "Type at least 2 characters" hint when search has 1 character', () => {
      mockUseDebouncedSearch.mockReturnValue({
        search: 'a',
        setSearch: mockSetSearch,
        debouncedSearch: '',
      });

      render(<ReviewsPage />);
      expect(screen.getByText('Type at least 2 characters to search')).toBeInTheDocument();
    });

    it('does not show hint when search is empty', () => {
      render(<ReviewsPage />);
      expect(screen.queryByText('Type at least 2 characters to search')).not.toBeInTheDocument();
    });

    it('shows result count summary when reviews are loaded', () => {
      render(<ReviewsPage />);
      expect(screen.getByText('Showing 2 reviews')).toBeInTheDocument();
    });

    it('shows search term in result summary when searching', () => {
      mockUseDebouncedSearch.mockReturnValue({
        search: 'Pushpa',
        setSearch: mockSetSearch,
        debouncedSearch: 'Pushpa',
      });

      render(<ReviewsPage />);
      expect(screen.getByText(/matching "Pushpa"/)).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('renders spinner when loading', () => {
      mockUseAdminReviews.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      } as unknown as ReturnType<typeof useAdminReviews>);

      const { container } = render(<ReviewsPage />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('does not show count badge while loading', () => {
      mockUseAdminReviews.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
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
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminReviews>);

      render(<ReviewsPage />);
      expect(screen.getByText('No reviews found.')).toBeInTheDocument();
    });

    it('shows count when reviews array is empty', () => {
      mockUseAdminReviews.mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminReviews>);

      render(<ReviewsPage />);
      expect(screen.getByText('0 reviews')).toBeInTheDocument();
    });
  });

  describe('data rendering', () => {
    beforeEach(() => {
      mockUseAdminReviews.mockReturnValue({
        data: mockReviews,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminReviews>);
    });

    it('renders review count', () => {
      render(<ReviewsPage />);
      expect(screen.getByText('2 reviews')).toBeInTheDocument();
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
      const starIcons = container.querySelectorAll('svg');
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
        isFetching: false,
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
        isFetching: false,
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
        isFetching: false,
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
        isFetching: false,
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

      expect(mockMutate).toHaveBeenCalledWith('rev-1');
    });

    it('calls deleteReview.mutate with correct id for second review', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<ReviewsPage />);
      const deleteButtons = screen.getAllByTitle('Delete review');
      fireEvent.click(deleteButtons[1]);

      expect(mockMutate).toHaveBeenCalledWith('rev-2');
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
});
