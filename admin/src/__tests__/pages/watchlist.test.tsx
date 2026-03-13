import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WatchlistPage from '@/app/(dashboard)/watchlist/page';

const mockMutate = vi.fn();
const mockSetSearch = vi.fn();

vi.mock('@/hooks/useAdminWatchlist', () => ({
  useAdminWatchlist: vi.fn(),
  useDeleteWatchlistEntry: vi.fn(),
  useToggleWatchlistStatus: vi.fn(),
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

import {
  useAdminWatchlist,
  useDeleteWatchlistEntry,
  useToggleWatchlistStatus,
} from '@/hooks/useAdminWatchlist';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';

const mockUseAdminWatchlist = vi.mocked(useAdminWatchlist);
const mockUseDeleteWatchlistEntry = vi.mocked(useDeleteWatchlistEntry);
const mockUseToggleWatchlistStatus = vi.mocked(useToggleWatchlistStatus);
const mockUseDebouncedSearch = vi.mocked(useDebouncedSearch);

const mockEntries = [
  {
    id: 'wl-1',
    user_id: 'usr-1',
    movie_id: 'mov-1',
    status: 'watchlist' as const,
    added_at: '2024-01-01T00:00:00Z',
    watched_at: null,
    movie: { id: 'mov-1', title: 'Pushpa 2', poster_url: null },
    profile: { id: 'usr-1', display_name: 'Test User', email: 'test@example.com' },
  },
  {
    id: 'wl-2',
    user_id: 'usr-2',
    movie_id: 'mov-2',
    status: 'watched' as const,
    added_at: '2024-01-02T00:00:00Z',
    watched_at: '2024-01-05T00:00:00Z',
    movie: { id: 'mov-2', title: 'Salaar', poster_url: null },
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

  mockUseDeleteWatchlistEntry.mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteWatchlistEntry>);

  mockUseToggleWatchlistStatus.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useToggleWatchlistStatus>);
});

describe('WatchlistPage', () => {
  describe('search UI', () => {
    beforeEach(() => {
      mockUseAdminWatchlist.mockReturnValue({
        data: mockEntries,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminWatchlist>);
    });

    it('renders search input with correct placeholder', () => {
      renderWithProviders(<WatchlistPage />);
      expect(
        screen.getByPlaceholderText('Search by movie title or user name...'),
      ).toBeInTheDocument();
    });

    it('calls setSearch when typing in search input', () => {
      renderWithProviders(<WatchlistPage />);
      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'hello' } });
      expect(mockSetSearch).toHaveBeenCalledWith('hello');
    });

    it('passes debouncedSearch to useAdminWatchlist', () => {
      mockUseDebouncedSearch.mockReturnValue({
        search: 'test',
        setSearch: mockSetSearch,
        debouncedSearch: 'test',
      });

      renderWithProviders(<WatchlistPage />);
      expect(mockUseAdminWatchlist).toHaveBeenCalledWith('test');
    });

    it('shows "Type at least 2 characters" hint when search has 1 character', () => {
      mockUseDebouncedSearch.mockReturnValue({
        search: 'a',
        setSearch: mockSetSearch,
        debouncedSearch: '',
      });

      renderWithProviders(<WatchlistPage />);
      expect(screen.getByText('Type at least 2 characters to search')).toBeInTheDocument();
    });

    it('does not show hint when search is empty', () => {
      renderWithProviders(<WatchlistPage />);
      expect(screen.queryByText('Type at least 2 characters to search')).not.toBeInTheDocument();
    });

    it('shows result count summary when entries are loaded', () => {
      renderWithProviders(<WatchlistPage />);
      expect(screen.getByText('Showing 2 entries')).toBeInTheDocument();
    });

    it('shows search term in result summary when searching', () => {
      mockUseDebouncedSearch.mockReturnValue({
        search: 'Pushpa',
        setSearch: mockSetSearch,
        debouncedSearch: 'Pushpa',
      });

      renderWithProviders(<WatchlistPage />);
      expect(screen.getByText(/matching "Pushpa"/)).toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('renders "Watchlist" heading', () => {
      mockUseAdminWatchlist.mockReturnValue({
        data: mockEntries,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminWatchlist>);

      renderWithProviders(<WatchlistPage />);

      expect(screen.getByText('Watchlist')).toBeInTheDocument();
    });

    it('shows entry count when data is loaded', () => {
      mockUseAdminWatchlist.mockReturnValue({
        data: mockEntries,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminWatchlist>);

      renderWithProviders(<WatchlistPage />);

      expect(screen.getByText('(2)')).toBeInTheDocument();
    });

    it('does not show count when data is undefined', () => {
      mockUseAdminWatchlist.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      } as unknown as ReturnType<typeof useAdminWatchlist>);

      renderWithProviders(<WatchlistPage />);

      expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when isLoading is true', () => {
      mockUseAdminWatchlist.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      } as unknown as ReturnType<typeof useAdminWatchlist>);

      const { container } = renderWithProviders(<WatchlistPage />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('does not show table when loading', () => {
      mockUseAdminWatchlist.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      } as unknown as ReturnType<typeof useAdminWatchlist>);

      renderWithProviders(<WatchlistPage />);

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows "No watchlist entries found." when array is empty', () => {
      mockUseAdminWatchlist.mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminWatchlist>);

      renderWithProviders(<WatchlistPage />);

      expect(screen.getByText('No watchlist entries found.')).toBeInTheDocument();
    });

    it('does not show table when no entries', () => {
      mockUseAdminWatchlist.mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminWatchlist>);

      renderWithProviders(<WatchlistPage />);

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when isError is true', () => {
      mockUseAdminWatchlist.mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: true,
        error: new Error('Network error'),
      } as unknown as ReturnType<typeof useAdminWatchlist>);

      renderWithProviders(<WatchlistPage />);

      expect(screen.getByText(/Error loading watchlist/)).toBeInTheDocument();
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  describe('data rendering', () => {
    beforeEach(() => {
      mockUseAdminWatchlist.mockReturnValue({
        data: mockEntries,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminWatchlist>);
    });

    it('renders table with correct column headers', () => {
      renderWithProviders(<WatchlistPage />);

      expect(screen.getByText('Movie')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Added')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('renders movie titles', () => {
      renderWithProviders(<WatchlistPage />);

      expect(screen.getByText('Pushpa 2')).toBeInTheDocument();
      expect(screen.getByText('Salaar')).toBeInTheDocument();
    });

    it('renders user display_name', () => {
      renderWithProviders(<WatchlistPage />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('falls back to email when display_name is null', () => {
      renderWithProviders(<WatchlistPage />);

      expect(screen.getByText('another@example.com')).toBeInTheDocument();
    });

    it('shows "To Watch" for watchlist status', () => {
      renderWithProviders(<WatchlistPage />);

      expect(screen.getByText('To Watch')).toBeInTheDocument();
    });

    it('shows "Watched" for watched status', () => {
      renderWithProviders(<WatchlistPage />);

      expect(screen.getByText('Watched')).toBeInTheDocument();
    });

    it('shows "Unknown movie" when movie is undefined', () => {
      mockUseAdminWatchlist.mockReturnValue({
        data: [
          {
            ...mockEntries[0],
            movie: undefined,
          },
        ],
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminWatchlist>);

      renderWithProviders(<WatchlistPage />);

      expect(screen.getByText('Unknown movie')).toBeInTheDocument();
    });

    it('shows "Unknown" when profile is undefined', () => {
      mockUseAdminWatchlist.mockReturnValue({
        data: [
          {
            ...mockEntries[0],
            profile: undefined,
          },
        ],
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminWatchlist>);

      renderWithProviders(<WatchlistPage />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('renders formatted date', () => {
      renderWithProviders(<WatchlistPage />);

      const dateCells = screen.getAllByText(new Date('2024-01-01T00:00:00Z').toLocaleDateString());
      expect(dateCells.length).toBeGreaterThanOrEqual(1);
    });

    it('renders a delete button for each entry', () => {
      renderWithProviders(<WatchlistPage />);

      const deleteButtons = screen.getAllByTitle('Delete watchlist entry');
      expect(deleteButtons).toHaveLength(2);
    });
  });

  describe('delete confirmation', () => {
    beforeEach(() => {
      mockUseAdminWatchlist.mockReturnValue({
        data: mockEntries,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminWatchlist>);
    });

    it('calls confirm() when delete button is clicked', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<WatchlistPage />);

      const deleteButtons = screen.getAllByTitle('Delete watchlist entry');
      fireEvent.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalledWith(
        'Delete this watchlist entry? This cannot be undone.',
      );
    });

    it('calls mutate with entry id when confirm returns true', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<WatchlistPage />);

      const deleteButtons = screen.getAllByTitle('Delete watchlist entry');
      fireEvent.click(deleteButtons[0]);

      expect(mockMutate).toHaveBeenCalledWith('wl-1');
    });

    it('does not call mutate when confirm returns false', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderWithProviders(<WatchlistPage />);

      const deleteButtons = screen.getAllByTitle('Delete watchlist entry');
      fireEvent.click(deleteButtons[0]);

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('deletes the correct entry when second button is clicked', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<WatchlistPage />);

      const deleteButtons = screen.getAllByTitle('Delete watchlist entry');
      fireEvent.click(deleteButtons[1]);

      expect(mockMutate).toHaveBeenCalledWith('wl-2');
    });
  });

  describe('pending state', () => {
    it('disables delete buttons when mutation is pending', () => {
      mockUseAdminWatchlist.mockReturnValue({
        data: mockEntries,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminWatchlist>);

      mockUseDeleteWatchlistEntry.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      } as unknown as ReturnType<typeof useDeleteWatchlistEntry>);

      renderWithProviders(<WatchlistPage />);

      const deleteButtons = screen.getAllByTitle('Delete watchlist entry');
      deleteButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });
});
