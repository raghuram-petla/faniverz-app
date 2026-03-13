import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FeedVotesPage from '@/app/(dashboard)/feed-votes/page';

const mockMutate = vi.fn();
const mockSetSearch = vi.fn();

vi.mock('@/hooks/useAdminFeedVotes', () => ({
  useAdminFeedVotes: vi.fn(),
  useDeleteFeedVote: vi.fn(),
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

import { useAdminFeedVotes, useDeleteFeedVote } from '@/hooks/useAdminFeedVotes';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';

const mockUseAdminFeedVotes = vi.mocked(useAdminFeedVotes);
const mockUseDeleteFeedVote = vi.mocked(useDeleteFeedVote);
const mockUseDebouncedSearch = vi.mocked(useDebouncedSearch);

const mockVotes = [
  {
    id: 'vote-1',
    feed_item_id: 'fi-1',
    user_id: 'usr-1',
    vote_type: 'up' as const,
    created_at: '2024-01-01T00:00:00Z',
    profile: { id: 'usr-1', display_name: 'Test User', email: 'test@example.com' },
    feed_item: { id: 'fi-1', title: 'Pushpa 2 Trailer' },
  },
  {
    id: 'vote-2',
    feed_item_id: 'fi-2',
    user_id: 'usr-2',
    vote_type: 'down' as const,
    created_at: '2024-01-02T00:00:00Z',
    profile: { id: 'usr-2', display_name: null, email: 'another@example.com' },
    feed_item: { id: 'fi-2', title: 'Song Release' },
  },
];

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.restoreAllMocks();

  mockMutate.mockReset();
  mockSetSearch.mockReset();

  mockUseDebouncedSearch.mockReturnValue({
    search: '',
    setSearch: mockSetSearch,
    debouncedSearch: '',
  });

  mockUseDeleteFeedVote.mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteFeedVote>);
});

describe('FeedVotesPage', () => {
  describe('header', () => {
    it('renders "Feed Votes" heading', () => {
      mockUseAdminFeedVotes.mockReturnValue({
        data: mockVotes,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFeedVotes>);

      renderWithProviders(<FeedVotesPage />);

      expect(screen.getByText('Feed Votes')).toBeInTheDocument();
    });

    it('shows vote count when data is loaded', () => {
      mockUseAdminFeedVotes.mockReturnValue({
        data: mockVotes,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFeedVotes>);

      renderWithProviders(<FeedVotesPage />);

      expect(screen.getByText('(2)')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when isLoading is true', () => {
      mockUseAdminFeedVotes.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      } as unknown as ReturnType<typeof useAdminFeedVotes>);

      const { container } = renderWithProviders(<FeedVotesPage />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows "No votes found." when votes array is empty', () => {
      mockUseAdminFeedVotes.mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFeedVotes>);

      renderWithProviders(<FeedVotesPage />);

      expect(screen.getByText('No votes found.')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when isError is true', () => {
      mockUseAdminFeedVotes.mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: true,
        error: new Error('Something went wrong'),
      } as unknown as ReturnType<typeof useAdminFeedVotes>);

      renderWithProviders(<FeedVotesPage />);

      expect(screen.getByText(/Error loading votes/)).toBeInTheDocument();
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    });
  });

  describe('data rendering', () => {
    beforeEach(() => {
      mockUseAdminFeedVotes.mockReturnValue({
        data: mockVotes,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFeedVotes>);
    });

    it('renders table with correct column headers', () => {
      renderWithProviders(<FeedVotesPage />);

      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('Feed Item')).toBeInTheDocument();
      expect(screen.getByText('Vote')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('renders user display_name', () => {
      renderWithProviders(<FeedVotesPage />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('falls back to email when display_name is null', () => {
      renderWithProviders(<FeedVotesPage />);

      expect(screen.getByText('another@example.com')).toBeInTheDocument();
    });

    it('renders feed item title', () => {
      renderWithProviders(<FeedVotesPage />);

      expect(screen.getByText('Pushpa 2 Trailer')).toBeInTheDocument();
      expect(screen.getByText('Song Release')).toBeInTheDocument();
    });

    it('renders vote type badges', () => {
      renderWithProviders(<FeedVotesPage />);

      expect(screen.getByText(/Upvote/)).toBeInTheDocument();
      expect(screen.getByText(/Downvote/)).toBeInTheDocument();
    });

    it('renders a delete button for each vote', () => {
      renderWithProviders(<FeedVotesPage />);

      const deleteButtons = screen.getAllByTitle('Delete vote');
      expect(deleteButtons).toHaveLength(2);
    });
  });

  describe('search UI', () => {
    beforeEach(() => {
      mockUseAdminFeedVotes.mockReturnValue({
        data: mockVotes,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFeedVotes>);
    });

    it('renders search input with correct placeholder', () => {
      renderWithProviders(<FeedVotesPage />);
      expect(
        screen.getByPlaceholderText('Search by user name, feed title, or vote type...'),
      ).toBeInTheDocument();
    });

    it('shows "Type at least 2 characters" hint when search has 1 character', () => {
      mockUseDebouncedSearch.mockReturnValue({
        search: 'a',
        setSearch: mockSetSearch,
        debouncedSearch: '',
      });

      renderWithProviders(<FeedVotesPage />);
      expect(screen.getByText('Type at least 2 characters to search')).toBeInTheDocument();
    });
  });

  describe('delete confirmation', () => {
    beforeEach(() => {
      mockUseAdminFeedVotes.mockReturnValue({
        data: mockVotes,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFeedVotes>);
    });

    it('calls mutate with vote id when confirm returns true', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<FeedVotesPage />);

      const deleteButtons = screen.getAllByTitle('Delete vote');
      fireEvent.click(deleteButtons[0]);

      expect(mockMutate).toHaveBeenCalledWith('vote-1');
    });

    it('does not call mutate when confirm returns false', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderWithProviders(<FeedVotesPage />);

      const deleteButtons = screen.getAllByTitle('Delete vote');
      fireEvent.click(deleteButtons[0]);

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe('pending state', () => {
    it('disables delete buttons when mutation is pending', () => {
      mockUseAdminFeedVotes.mockReturnValue({
        data: mockVotes,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFeedVotes>);

      mockUseDeleteFeedVote.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      } as unknown as ReturnType<typeof useDeleteFeedVote>);

      renderWithProviders(<FeedVotesPage />);

      const deleteButtons = screen.getAllByTitle('Delete vote');
      deleteButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });
});
