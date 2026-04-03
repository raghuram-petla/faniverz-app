import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CommentsPage from '@/app/(dashboard)/comments/page';

const mockMutate = vi.fn();
const mockSetSearch = vi.fn();

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ isReadOnly: false, canDeleteTopLevel: () => true }),
}));

vi.mock('@/hooks/useAdminComments', () => ({
  useAdminComments: vi.fn(),
  useDeleteComment: vi.fn(),
  useUpdateComment: vi.fn(),
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

import { useAdminComments, useDeleteComment, useUpdateComment } from '@/hooks/useAdminComments';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';

const mockUseAdminComments = vi.mocked(useAdminComments);
const mockUseDeleteComment = vi.mocked(useDeleteComment);
const mockUseUpdateComment = vi.mocked(useUpdateComment);
const mockUseDebouncedSearch = vi.mocked(useDebouncedSearch);

const mockComments = [
  {
    id: 'com-1',
    feed_item_id: 'feed-1',
    user_id: 'usr-1',
    body: 'Great post!',
    created_at: '2024-01-01T00:00:00Z',
    feed_item: { id: 'feed-1', title: 'Breaking News' },
    profile: { id: 'usr-1', display_name: 'Test User', email: 'test@example.com' },
  },
  {
    id: 'com-2',
    feed_item_id: 'feed-2',
    user_id: 'usr-2',
    body: 'Nice analysis!',
    created_at: '2024-01-02T00:00:00Z',
    feed_item: { id: 'feed-2', title: 'Movie Review' },
    profile: { id: 'usr-2', display_name: null, email: 'another@example.com' },
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

  mockUseDeleteComment.mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteComment>);

  mockUseUpdateComment.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateComment>);
});

describe('CommentsPage', () => {
  describe('search UI', () => {
    beforeEach(() => {
      mockUseAdminComments.mockReturnValue({
        data: mockComments,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminComments>);
    });

    it('renders search input with correct placeholder', () => {
      renderWithProviders(<CommentsPage />);
      expect(
        screen.getByPlaceholderText('Search by comment text or commenter name...'),
      ).toBeInTheDocument();
    });

    it('calls setSearch when typing in search input', () => {
      renderWithProviders(<CommentsPage />);
      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'hello' } });
      expect(mockSetSearch).toHaveBeenCalledWith('hello');
    });

    it('passes debouncedSearch to useAdminComments', () => {
      mockUseDebouncedSearch.mockReturnValue({
        search: 'test',
        setSearch: mockSetSearch,
        debouncedSearch: 'test',
      });

      renderWithProviders(<CommentsPage />);
      expect(mockUseAdminComments).toHaveBeenCalledWith('test');
    });

    it('shows "Type at least 2 characters" hint when search has 1 character', () => {
      mockUseDebouncedSearch.mockReturnValue({
        search: 'a',
        setSearch: mockSetSearch,
        debouncedSearch: '',
      });

      renderWithProviders(<CommentsPage />);
      expect(screen.getByText('Type at least 2 characters to search')).toBeInTheDocument();
    });

    it('does not show hint when search is empty', () => {
      renderWithProviders(<CommentsPage />);
      expect(screen.queryByText('Type at least 2 characters to search')).not.toBeInTheDocument();
    });

    it('shows result count summary when comments are loaded', () => {
      renderWithProviders(<CommentsPage />);
      expect(screen.getByText('Showing 2 comments')).toBeInTheDocument();
    });

    it('shows search term in result summary when searching', () => {
      mockUseDebouncedSearch.mockReturnValue({
        search: 'Great',
        setSearch: mockSetSearch,
        debouncedSearch: 'Great',
      });

      renderWithProviders(<CommentsPage />);
      expect(screen.getByText(/matching "Great"/)).toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('shows comment count when data is loaded', () => {
      mockUseAdminComments.mockReturnValue({
        data: mockComments,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminComments>);

      renderWithProviders(<CommentsPage />);

      expect(screen.getByText('2 comments')).toBeInTheDocument();
    });

    it('does not show count when data is undefined', () => {
      mockUseAdminComments.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      } as unknown as ReturnType<typeof useAdminComments>);

      renderWithProviders(<CommentsPage />);

      expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when isLoading is true', () => {
      mockUseAdminComments.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      } as unknown as ReturnType<typeof useAdminComments>);

      const { container } = renderWithProviders(<CommentsPage />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('does not show table when loading', () => {
      mockUseAdminComments.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      } as unknown as ReturnType<typeof useAdminComments>);

      renderWithProviders(<CommentsPage />);

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows "No comments found." when comments array is empty', () => {
      mockUseAdminComments.mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminComments>);

      renderWithProviders(<CommentsPage />);

      expect(screen.getByText('No comments found.')).toBeInTheDocument();
    });

    it('does not show table when no comments', () => {
      mockUseAdminComments.mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminComments>);

      renderWithProviders(<CommentsPage />);

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('data rendering', () => {
    beforeEach(() => {
      mockUseAdminComments.mockReturnValue({
        data: mockComments,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminComments>);
    });

    it('renders table with correct column headers', () => {
      renderWithProviders(<CommentsPage />);

      expect(screen.getByText('Post')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('Comment')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('renders comment body text', () => {
      renderWithProviders(<CommentsPage />);

      expect(screen.getByText('Great post!')).toBeInTheDocument();
      expect(screen.getByText('Nice analysis!')).toBeInTheDocument();
    });

    it('renders post titles from feed_item', () => {
      renderWithProviders(<CommentsPage />);

      expect(screen.getByText('Breaking News')).toBeInTheDocument();
      expect(screen.getByText('Movie Review')).toBeInTheDocument();
    });

    it('renders user display_name', () => {
      renderWithProviders(<CommentsPage />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('falls back to email when display_name is null', () => {
      renderWithProviders(<CommentsPage />);

      expect(screen.getByText('another@example.com')).toBeInTheDocument();
    });

    it('shows "Untitled post" when feed_item title is null', () => {
      mockUseAdminComments.mockReturnValue({
        data: [
          {
            ...mockComments[0],
            feed_item: { id: 'feed-1', title: null },
          },
        ],
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminComments>);

      renderWithProviders(<CommentsPage />);

      expect(screen.getByText('Untitled post')).toBeInTheDocument();
    });

    it('shows "Untitled post" when feed_item is undefined', () => {
      mockUseAdminComments.mockReturnValue({
        data: [
          {
            ...mockComments[0],
            feed_item: undefined,
          },
        ],
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminComments>);

      renderWithProviders(<CommentsPage />);

      expect(screen.getByText('Untitled post')).toBeInTheDocument();
    });

    it('shows "Unknown" when profile is undefined', () => {
      mockUseAdminComments.mockReturnValue({
        data: [
          {
            ...mockComments[0],
            profile: undefined,
          },
        ],
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminComments>);

      renderWithProviders(<CommentsPage />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('renders formatted date', () => {
      renderWithProviders(<CommentsPage />);

      const dateCells = screen.getAllByText(new Date('2024-01-01T00:00:00Z').toLocaleDateString());
      expect(dateCells.length).toBeGreaterThanOrEqual(1);
    });

    it('renders a delete button for each comment', () => {
      renderWithProviders(<CommentsPage />);

      const deleteButtons = screen.getAllByTitle('Delete comment');
      expect(deleteButtons).toHaveLength(2);
    });
  });

  describe('delete confirmation', () => {
    beforeEach(() => {
      mockUseAdminComments.mockReturnValue({
        data: mockComments,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminComments>);
    });

    it('calls confirm() when delete button is clicked', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<CommentsPage />);

      const deleteButtons = screen.getAllByTitle('Delete comment');
      fireEvent.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalledWith('Delete this comment? This cannot be undone.');
    });

    it('calls mutate with comment id when confirm returns true', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<CommentsPage />);

      const deleteButtons = screen.getAllByTitle('Delete comment');
      fireEvent.click(deleteButtons[0]);

      expect(mockMutate).toHaveBeenCalledWith(
        'com-1',
        expect.objectContaining({ onError: expect.any(Function) }),
      );
    });

    it('does not call mutate when confirm returns false', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderWithProviders(<CommentsPage />);

      const deleteButtons = screen.getAllByTitle('Delete comment');
      fireEvent.click(deleteButtons[0]);

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('deletes the correct comment when second button is clicked', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<CommentsPage />);

      const deleteButtons = screen.getAllByTitle('Delete comment');
      fireEvent.click(deleteButtons[1]);

      expect(mockMutate).toHaveBeenCalledWith(
        'com-2',
        expect.objectContaining({ onError: expect.any(Function) }),
      );
    });
  });

  describe('pending state', () => {
    it('disables delete buttons when mutation is pending', () => {
      mockUseAdminComments.mockReturnValue({
        data: mockComments,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminComments>);

      mockUseDeleteComment.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      } as unknown as ReturnType<typeof useDeleteComment>);

      renderWithProviders(<CommentsPage />);

      const deleteButtons = screen.getAllByTitle('Delete comment');
      deleteButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });
});
