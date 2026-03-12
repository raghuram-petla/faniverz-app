import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FavoritesPage from '@/app/(dashboard)/favorites/page';

const mockMutate = vi.fn();
const mockSetSearch = vi.fn();

vi.mock('@/hooks/useAdminFavorites', () => ({
  useAdminFavorites: vi.fn(),
  useDeleteFavorite: vi.fn(),
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

import { useAdminFavorites, useDeleteFavorite } from '@/hooks/useAdminFavorites';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';

const mockUseAdminFavorites = vi.mocked(useAdminFavorites);
const mockUseDeleteFavorite = vi.mocked(useDeleteFavorite);
const mockUseDebouncedSearch = vi.mocked(useDebouncedSearch);

const mockFavorites = [
  {
    id: 'fav-1',
    user_id: 'usr-1',
    actor_id: 'act-1',
    created_at: '2024-01-01T00:00:00Z',
    actor: { id: 'act-1', name: 'Mahesh Babu', photo_url: 'https://example.com/mb.jpg' },
    profile: { id: 'usr-1', display_name: 'Test User', email: 'test@example.com' },
  },
  {
    id: 'fav-2',
    user_id: 'usr-2',
    actor_id: 'act-2',
    created_at: '2024-01-02T00:00:00Z',
    actor: { id: 'act-2', name: 'Prabhas', photo_url: null },
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

  mockUseDeleteFavorite.mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteFavorite>);
});

describe('FavoritesPage', () => {
  describe('search UI', () => {
    beforeEach(() => {
      mockUseAdminFavorites.mockReturnValue({
        data: mockFavorites,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFavorites>);
    });

    it('renders search input with correct placeholder', () => {
      renderWithProviders(<FavoritesPage />);
      expect(
        screen.getByPlaceholderText('Search by actor name or user name...'),
      ).toBeInTheDocument();
    });

    it('calls setSearch when typing in search input', () => {
      renderWithProviders(<FavoritesPage />);
      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'Mahesh' } });
      expect(mockSetSearch).toHaveBeenCalledWith('Mahesh');
    });

    it('passes debouncedSearch to useAdminFavorites', () => {
      mockUseDebouncedSearch.mockReturnValue({
        search: 'test',
        setSearch: mockSetSearch,
        debouncedSearch: 'test',
      });

      renderWithProviders(<FavoritesPage />);
      expect(mockUseAdminFavorites).toHaveBeenCalledWith('test');
    });

    it('shows "Type at least 2 characters" hint when search has 1 character', () => {
      mockUseDebouncedSearch.mockReturnValue({
        search: 'a',
        setSearch: mockSetSearch,
        debouncedSearch: '',
      });

      renderWithProviders(<FavoritesPage />);
      expect(screen.getByText('Type at least 2 characters to search')).toBeInTheDocument();
    });

    it('does not show hint when search is empty', () => {
      renderWithProviders(<FavoritesPage />);
      expect(screen.queryByText('Type at least 2 characters to search')).not.toBeInTheDocument();
    });

    it('shows result count summary when favorites are loaded', () => {
      renderWithProviders(<FavoritesPage />);
      expect(screen.getByText('Showing 2 favorites')).toBeInTheDocument();
    });

    it('shows search term in result summary when searching', () => {
      mockUseDebouncedSearch.mockReturnValue({
        search: 'Mahesh',
        setSearch: mockSetSearch,
        debouncedSearch: 'Mahesh',
      });

      renderWithProviders(<FavoritesPage />);
      expect(screen.getByText(/matching "Mahesh"/)).toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('renders "Favorite Actors" heading', () => {
      mockUseAdminFavorites.mockReturnValue({
        data: mockFavorites,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFavorites>);

      renderWithProviders(<FavoritesPage />);

      expect(screen.getByText('Favorite Actors')).toBeInTheDocument();
    });

    it('shows favorite count when data is loaded', () => {
      mockUseAdminFavorites.mockReturnValue({
        data: mockFavorites,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFavorites>);

      renderWithProviders(<FavoritesPage />);

      expect(screen.getByText('(2)')).toBeInTheDocument();
    });

    it('does not show count when data is undefined', () => {
      mockUseAdminFavorites.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      } as unknown as ReturnType<typeof useAdminFavorites>);

      renderWithProviders(<FavoritesPage />);

      expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when isLoading is true', () => {
      mockUseAdminFavorites.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      } as unknown as ReturnType<typeof useAdminFavorites>);

      const { container } = renderWithProviders(<FavoritesPage />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('does not show table when loading', () => {
      mockUseAdminFavorites.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
      } as unknown as ReturnType<typeof useAdminFavorites>);

      renderWithProviders(<FavoritesPage />);

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows "No favorite actors found." when favorites array is empty', () => {
      mockUseAdminFavorites.mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFavorites>);

      renderWithProviders(<FavoritesPage />);

      expect(screen.getByText('No favorite actors found.')).toBeInTheDocument();
    });

    it('does not show table when no favorites', () => {
      mockUseAdminFavorites.mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFavorites>);

      renderWithProviders(<FavoritesPage />);

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when isError is true', () => {
      mockUseAdminFavorites.mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: true,
        error: new Error('Network failure'),
      } as unknown as ReturnType<typeof useAdminFavorites>);

      renderWithProviders(<FavoritesPage />);

      expect(screen.getByText(/Error loading favorites/)).toBeInTheDocument();
      expect(screen.getByText(/Network failure/)).toBeInTheDocument();
    });
  });

  describe('data rendering', () => {
    beforeEach(() => {
      mockUseAdminFavorites.mockReturnValue({
        data: mockFavorites,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFavorites>);
    });

    it('renders table with correct column headers', () => {
      renderWithProviders(<FavoritesPage />);

      expect(screen.getByText('Actor')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('Added')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('renders actor names', () => {
      renderWithProviders(<FavoritesPage />);

      expect(screen.getByText('Mahesh Babu')).toBeInTheDocument();
      expect(screen.getByText('Prabhas')).toBeInTheDocument();
    });

    it('renders user display_name', () => {
      renderWithProviders(<FavoritesPage />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('falls back to email when display_name is null', () => {
      renderWithProviders(<FavoritesPage />);

      expect(screen.getByText('another@example.com')).toBeInTheDocument();
    });

    it('shows "Unknown actor" when actor is undefined', () => {
      mockUseAdminFavorites.mockReturnValue({
        data: [
          {
            ...mockFavorites[0],
            actor: undefined,
          },
        ],
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFavorites>);

      renderWithProviders(<FavoritesPage />);

      expect(screen.getByText('Unknown actor')).toBeInTheDocument();
    });

    it('shows "Unknown" when profile is undefined', () => {
      mockUseAdminFavorites.mockReturnValue({
        data: [
          {
            ...mockFavorites[0],
            profile: undefined,
          },
        ],
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFavorites>);

      renderWithProviders(<FavoritesPage />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('renders formatted date', () => {
      renderWithProviders(<FavoritesPage />);

      const dateCells = screen.getAllByText(new Date('2024-01-01T00:00:00Z').toLocaleDateString());
      expect(dateCells.length).toBeGreaterThanOrEqual(1);
    });

    it('renders a delete button for each favorite', () => {
      renderWithProviders(<FavoritesPage />);

      const deleteButtons = screen.getAllByTitle('Remove favorite');
      expect(deleteButtons).toHaveLength(2);
    });
  });

  describe('delete confirmation', () => {
    beforeEach(() => {
      mockUseAdminFavorites.mockReturnValue({
        data: mockFavorites,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFavorites>);
    });

    it('calls confirm() when delete button is clicked', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<FavoritesPage />);

      const deleteButtons = screen.getAllByTitle('Remove favorite');
      fireEvent.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalledWith('Remove this favorite? This cannot be undone.');
    });

    it('calls mutate with favorite id when confirm returns true', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<FavoritesPage />);

      const deleteButtons = screen.getAllByTitle('Remove favorite');
      fireEvent.click(deleteButtons[0]);

      expect(mockMutate).toHaveBeenCalledWith(
        'fav-1',
        expect.objectContaining({
          onError: expect.any(Function),
        }),
      );
    });

    it('does not call mutate when confirm returns false', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderWithProviders(<FavoritesPage />);

      const deleteButtons = screen.getAllByTitle('Remove favorite');
      fireEvent.click(deleteButtons[0]);

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('deletes the correct favorite when second button is clicked', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<FavoritesPage />);

      const deleteButtons = screen.getAllByTitle('Remove favorite');
      fireEvent.click(deleteButtons[1]);

      expect(mockMutate).toHaveBeenCalledWith(
        'fav-2',
        expect.objectContaining({
          onError: expect.any(Function),
        }),
      );
    });
  });

  describe('delete error handling', () => {
    beforeEach(() => {
      mockUseAdminFavorites.mockReturnValue({
        data: mockFavorites,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFavorites>);
    });

    it('calls alert with error message on delete failure', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      renderWithProviders(<FavoritesPage />);

      const deleteButtons = screen.getAllByTitle('Remove favorite');
      fireEvent.click(deleteButtons[0]);

      const onError = mockMutate.mock.calls[0][1].onError;
      onError(new Error('Network failure'));

      expect(alertSpy).toHaveBeenCalledWith('Error: Network failure');
    });
  });

  describe('pending state', () => {
    it('disables delete buttons when mutation is pending', () => {
      mockUseAdminFavorites.mockReturnValue({
        data: mockFavorites,
        isLoading: false,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminFavorites>);

      mockUseDeleteFavorite.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      } as unknown as ReturnType<typeof useDeleteFavorite>);

      renderWithProviders(<FavoritesPage />);

      const deleteButtons = screen.getAllByTitle('Remove favorite');
      deleteButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });
});
