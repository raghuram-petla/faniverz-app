import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FollowsPage from '@/app/(dashboard)/follows/page';

const mockMutate = vi.fn();
const mockSetSearch = vi.fn();

vi.mock('@/hooks/useAdminFollows', () => ({
  useAdminFollows: vi.fn(),
  useDeleteFollow: vi.fn(),
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

import { useAdminFollows, useDeleteFollow } from '@/hooks/useAdminFollows';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';

const mockUseAdminFollows = vi.mocked(useAdminFollows);
const mockUseDeleteFollow = vi.mocked(useDeleteFollow);
const mockUseDebouncedSearch = vi.mocked(useDebouncedSearch);

const mockFollows = [
  {
    id: 'fol-1',
    user_id: 'usr-1',
    entity_type: 'movie' as const,
    entity_id: 'mov-1',
    created_at: '2024-01-01T00:00:00Z',
    profile: { id: 'usr-1', display_name: 'Test User', email: 'test@example.com' },
  },
  {
    id: 'fol-2',
    user_id: 'usr-2',
    entity_type: 'actor' as const,
    entity_id: 'act-1',
    created_at: '2024-01-02T00:00:00Z',
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

  mockUseDeleteFollow.mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteFollow>);
});

describe('FollowsPage', () => {
  describe('search UI', () => {
    beforeEach(() => {
      mockUseAdminFollows.mockReturnValue({
        data: mockFollows,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFollows>);
    });

    it('renders search input with correct placeholder', () => {
      renderWithProviders(<FollowsPage />);
      expect(
        screen.getByPlaceholderText('Search by user name or entity type...'),
      ).toBeInTheDocument();
    });

    it('calls setSearch when typing in search input', () => {
      renderWithProviders(<FollowsPage />);
      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'hello' } });
      expect(mockSetSearch).toHaveBeenCalledWith('hello');
    });

    it('passes debouncedSearch to useAdminFollows', () => {
      mockUseDebouncedSearch.mockReturnValue({
        search: 'movie',
        setSearch: mockSetSearch,
        debouncedSearch: 'movie',
      });

      renderWithProviders(<FollowsPage />);
      expect(mockUseAdminFollows).toHaveBeenCalledWith('movie');
    });

    it('shows "Type at least 2 characters" hint when search has 1 character', () => {
      mockUseDebouncedSearch.mockReturnValue({
        search: 'a',
        setSearch: mockSetSearch,
        debouncedSearch: '',
      });

      renderWithProviders(<FollowsPage />);
      expect(screen.getByText('Type at least 2 characters to search')).toBeInTheDocument();
    });

    it('does not show hint when search is empty', () => {
      renderWithProviders(<FollowsPage />);
      expect(screen.queryByText('Type at least 2 characters to search')).not.toBeInTheDocument();
    });

    it('shows result count summary when follows are loaded', () => {
      renderWithProviders(<FollowsPage />);
      expect(screen.getByText('Showing 2 follows')).toBeInTheDocument();
    });

    it('shows search term in result summary when searching', () => {
      mockUseDebouncedSearch.mockReturnValue({
        search: 'movie',
        setSearch: mockSetSearch,
        debouncedSearch: 'movie',
      });

      renderWithProviders(<FollowsPage />);
      expect(screen.getByText(/matching "movie"/)).toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('renders "Follows" heading', () => {
      mockUseAdminFollows.mockReturnValue({
        data: mockFollows,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFollows>);

      renderWithProviders(<FollowsPage />);

      expect(screen.getByText('Follows')).toBeInTheDocument();
    });

    it('shows follow count when data is loaded', () => {
      mockUseAdminFollows.mockReturnValue({
        data: mockFollows,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFollows>);

      renderWithProviders(<FollowsPage />);

      expect(screen.getByText('(2)')).toBeInTheDocument();
    });

    it('does not show count when data is undefined', () => {
      mockUseAdminFollows.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      } as unknown as ReturnType<typeof useAdminFollows>);

      renderWithProviders(<FollowsPage />);

      expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when isLoading is true', () => {
      mockUseAdminFollows.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      } as unknown as ReturnType<typeof useAdminFollows>);

      const { container } = renderWithProviders(<FollowsPage />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('does not show table when loading', () => {
      mockUseAdminFollows.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      } as unknown as ReturnType<typeof useAdminFollows>);

      renderWithProviders(<FollowsPage />);

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows "No follows found." when follows array is empty', () => {
      mockUseAdminFollows.mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFollows>);

      renderWithProviders(<FollowsPage />);

      expect(screen.getByText('No follows found.')).toBeInTheDocument();
    });

    it('does not show table when no follows', () => {
      mockUseAdminFollows.mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFollows>);

      renderWithProviders(<FollowsPage />);

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when isError is true', () => {
      mockUseAdminFollows.mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: true,
        error: new Error('Something went wrong'),
      } as unknown as ReturnType<typeof useAdminFollows>);

      renderWithProviders(<FollowsPage />);

      expect(screen.getByText(/Error loading follows/)).toBeInTheDocument();
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    });
  });

  describe('data rendering', () => {
    beforeEach(() => {
      mockUseAdminFollows.mockReturnValue({
        data: mockFollows,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFollows>);
    });

    it('renders table with correct column headers', () => {
      renderWithProviders(<FollowsPage />);

      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('Entity Type')).toBeInTheDocument();
      expect(screen.getByText('Entity ID')).toBeInTheDocument();
      expect(screen.getByText('Followed On')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('renders user display_name', () => {
      renderWithProviders(<FollowsPage />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('falls back to email when display_name is null', () => {
      renderWithProviders(<FollowsPage />);

      expect(screen.getByText('another@example.com')).toBeInTheDocument();
    });

    it('shows "Unknown" when profile is undefined', () => {
      mockUseAdminFollows.mockReturnValue({
        data: [
          {
            ...mockFollows[0],
            profile: undefined,
          },
        ],
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFollows>);

      renderWithProviders(<FollowsPage />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('renders capitalized entity type', () => {
      renderWithProviders(<FollowsPage />);

      expect(screen.getByText('Movie')).toBeInTheDocument();
      expect(screen.getByText('Actor')).toBeInTheDocument();
    });

    it('renders entity IDs', () => {
      renderWithProviders(<FollowsPage />);

      expect(screen.getByText('mov-1')).toBeInTheDocument();
      expect(screen.getByText('act-1')).toBeInTheDocument();
    });

    it('renders formatted date', () => {
      renderWithProviders(<FollowsPage />);

      const dateCells = screen.getAllByText(new Date('2024-01-01T00:00:00Z').toLocaleDateString());
      expect(dateCells.length).toBeGreaterThanOrEqual(1);
    });

    it('renders a delete button for each follow', () => {
      renderWithProviders(<FollowsPage />);

      const deleteButtons = screen.getAllByTitle('Delete follow');
      expect(deleteButtons).toHaveLength(2);
    });
  });

  describe('delete confirmation', () => {
    beforeEach(() => {
      mockUseAdminFollows.mockReturnValue({
        data: mockFollows,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFollows>);
    });

    it('calls confirm() when delete button is clicked', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<FollowsPage />);

      const deleteButtons = screen.getAllByTitle('Delete follow');
      fireEvent.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalledWith('Delete this follow? This cannot be undone.');
    });

    it('calls mutate with follow id when confirm returns true', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<FollowsPage />);

      const deleteButtons = screen.getAllByTitle('Delete follow');
      fireEvent.click(deleteButtons[0]);

      expect(mockMutate).toHaveBeenCalledWith(
        'fol-1',
        expect.objectContaining({
          onError: expect.any(Function),
        }),
      );
    });

    it('does not call mutate when confirm returns false', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderWithProviders(<FollowsPage />);

      const deleteButtons = screen.getAllByTitle('Delete follow');
      fireEvent.click(deleteButtons[0]);

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('deletes the correct follow when second button is clicked', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<FollowsPage />);

      const deleteButtons = screen.getAllByTitle('Delete follow');
      fireEvent.click(deleteButtons[1]);

      expect(mockMutate).toHaveBeenCalledWith(
        'fol-2',
        expect.objectContaining({
          onError: expect.any(Function),
        }),
      );
    });
  });

  describe('delete error handling', () => {
    beforeEach(() => {
      mockUseAdminFollows.mockReturnValue({
        data: mockFollows,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFollows>);
    });

    it('calls alert with error message on delete failure', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      renderWithProviders(<FollowsPage />);

      const deleteButtons = screen.getAllByTitle('Delete follow');
      fireEvent.click(deleteButtons[0]);

      const onError = mockMutate.mock.calls[0][1].onError;
      onError(new Error('Network failure'));

      expect(alertSpy).toHaveBeenCalledWith('Error: Network failure');
    });
  });

  describe('pending state', () => {
    it('disables delete buttons when mutation is pending', () => {
      mockUseAdminFollows.mockReturnValue({
        data: mockFollows,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFollows>);

      mockUseDeleteFollow.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      } as unknown as ReturnType<typeof useDeleteFollow>);

      renderWithProviders(<FollowsPage />);

      const deleteButtons = screen.getAllByTitle('Delete follow');
      deleteButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });
});
