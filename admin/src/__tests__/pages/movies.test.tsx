import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MoviesPage from '@/app/(dashboard)/movies/page';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      gte: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/movies',
  useParams: () => ({}),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Controlled hook mocks
let mockIsPHAdmin = false;
let mockCanDelete = true;
let mockIsReadOnly = false;

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    isPHAdmin: mockIsPHAdmin,
    productionHouseIds: mockIsPHAdmin ? ['ph-1'] : undefined,
    canDeleteTopLevel: () => mockCanDelete,
    isReadOnly: mockIsReadOnly,
  }),
}));

vi.mock('@/hooks/useLanguageContext', () => ({
  useLanguageContext: () => ({ selectedLanguageCode: 'te' }),
}));

const mockDeleteMutate = vi.fn();

vi.mock('@/hooks/useAdminMovies', () => ({
  useAdminMovies: vi.fn(),
  useDeleteMovie: () => ({ mutate: mockDeleteMutate, isPending: false }),
}));

vi.mock('@/hooks/useMovieFilters', () => ({
  useMovieFilters: () => ({
    filters: {},
    setFilter: vi.fn(),
    toggleGenre: vi.fn(),
    clearAll: vi.fn(),
    activeFilterCount: 0,
    hasActiveFilters: false,
    debouncedActorSearch: '',
    debouncedDirectorSearch: '',
  }),
}));

vi.mock('@/hooks/useDebouncedSearch', () => ({
  useDebouncedSearch: () => ({
    search: '',
    setSearch: vi.fn(),
    debouncedSearch: '',
  }),
}));

vi.mock('@/components/common/LoadMoreButton', () => ({
  LoadMoreButton: ({
    hasNextPage,
    fetchNextPage,
  }: {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
  }) =>
    hasNextPage ? (
      <button onClick={fetchNextPage} data-testid="load-more">
        Load More
      </button>
    ) : null,
}));

vi.mock('@/components/movies/MovieListToolbar', () => ({
  MovieListToolbar: ({
    search,
    setSearch,
    isReadOnly,
    movieCount,
  }: {
    search: string;
    setSearch: (v: string) => void;
    statusFilter: string;
    setStatusFilter: (v: string) => void;
    filters: unknown;
    setFilter: unknown;
    toggleGenre: unknown;
    clearAll: unknown;
    activeFilterCount: number;
    hasActiveFilters: boolean;
    isFetching: boolean;
    isReadOnly: boolean;
    movieCount: number;
    debouncedSearch: string;
  }) => (
    <div data-testid="movie-toolbar">
      <input
        placeholder="Search movies..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {!isReadOnly && <a href="/movies/new">Add Movie</a>}
      <span data-testid="movie-count">{movieCount}</span>
    </div>
  ),
}));

import { useAdminMovies } from '@/hooks/useAdminMovies';

const mockUseAdminMovies = vi.mocked(useAdminMovies);

const makeMockMovie = (id: string, overrides = {}) => ({
  id,
  title: `Movie ${id}`,
  poster_url: null,
  original_language: 'te',
  release_date: '2025-03-15',
  rating: 8.5,
  in_theaters: false,
  premiere_date: null,
  poster_image_type: 'poster',
  ...overrides,
});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsPHAdmin = false;
  mockCanDelete = true;
  mockIsReadOnly = false;

  mockUseAdminMovies.mockReturnValue({
    data: { pages: [] },
    isLoading: false,
    isFetching: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
  } as unknown as ReturnType<typeof useAdminMovies>);
});

describe('MoviesPage', () => {
  it('renders search input', () => {
    renderWithProviders(<MoviesPage />);
    expect(screen.getByPlaceholderText('Search movies...')).toBeInTheDocument();
  });

  it('renders "Add Movie" button', () => {
    renderWithProviders(<MoviesPage />);
    expect(screen.getByText('Add Movie')).toBeInTheDocument();
  });

  describe('loading state', () => {
    it('shows loading spinner when isLoading is true', () => {
      mockUseAdminMovies.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
        isFetchingNextPage: false,
      } as unknown as ReturnType<typeof useAdminMovies>);

      const { container } = renderWithProviders(<MoviesPage />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('does not show table when loading', () => {
      mockUseAdminMovies.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
        isFetchingNextPage: false,
      } as unknown as ReturnType<typeof useAdminMovies>);

      renderWithProviders(<MoviesPage />);
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows "No movies found" when movies list is empty', () => {
      renderWithProviders(<MoviesPage />);
      expect(screen.getByText('No movies found')).toBeInTheDocument();
    });
  });

  describe('movie list', () => {
    it('renders movie titles in table', () => {
      mockUseAdminMovies.mockReturnValue({
        data: { pages: [[makeMockMovie('m1'), makeMockMovie('m2')]] },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
        isFetchingNextPage: false,
      } as unknown as ReturnType<typeof useAdminMovies>);

      renderWithProviders(<MoviesPage />);
      expect(screen.getByText('Movie m1')).toBeInTheDocument();
      expect(screen.getByText('Movie m2')).toBeInTheDocument();
    });

    it('renders table column headers', () => {
      mockUseAdminMovies.mockReturnValue({
        data: { pages: [[makeMockMovie('m1')]] },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
        isFetchingNextPage: false,
      } as unknown as ReturnType<typeof useAdminMovies>);

      renderWithProviders(<MoviesPage />);
      expect(screen.getByText('Movie')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Release Date')).toBeInTheDocument();
      expect(screen.getByText('Rating')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('renders formatted release date', () => {
      mockUseAdminMovies.mockReturnValue({
        data: { pages: [[makeMockMovie('m1', { release_date: '2025-03-15' })]] },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
        isFetchingNextPage: false,
      } as unknown as ReturnType<typeof useAdminMovies>);

      renderWithProviders(<MoviesPage />);
      // Should render formatted date (not raw string)
      expect(screen.queryByText('2025-03-15')).not.toBeInTheDocument();
    });

    it('renders — for missing release date', () => {
      mockUseAdminMovies.mockReturnValue({
        data: { pages: [[makeMockMovie('m1', { release_date: null })]] },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
        isFetchingNextPage: false,
      } as unknown as ReturnType<typeof useAdminMovies>);

      renderWithProviders(<MoviesPage />);
      expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });

    it('renders rating with star symbol when rating > 0', () => {
      mockUseAdminMovies.mockReturnValue({
        data: { pages: [[makeMockMovie('m1', { rating: 7.5 })]] },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
        isFetchingNextPage: false,
      } as unknown as ReturnType<typeof useAdminMovies>);

      renderWithProviders(<MoviesPage />);
      expect(screen.getByText('★ 7.5')).toBeInTheDocument();
    });

    it('renders — for zero rating', () => {
      mockUseAdminMovies.mockReturnValue({
        data: { pages: [[makeMockMovie('m1', { rating: 0 })]] },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
        isFetchingNextPage: false,
      } as unknown as ReturnType<typeof useAdminMovies>);

      renderWithProviders(<MoviesPage />);
      expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });

    it('shows delete button when canDeleteTopLevel is true', () => {
      mockCanDelete = true;
      mockUseAdminMovies.mockReturnValue({
        data: { pages: [[makeMockMovie('m1')]] },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
        isFetchingNextPage: false,
      } as unknown as ReturnType<typeof useAdminMovies>);

      renderWithProviders(<MoviesPage />);
      // Delete button (Trash2 icon button) should be present
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('hides delete button when canDeleteTopLevel is false', () => {
      mockCanDelete = false;
      mockUseAdminMovies.mockReturnValue({
        data: { pages: [[makeMockMovie('m1')]] },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
        isFetchingNextPage: false,
      } as unknown as ReturnType<typeof useAdminMovies>);

      renderWithProviders(<MoviesPage />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('grays out movies with different language from selected', () => {
      mockUseAdminMovies.mockReturnValue({
        data: { pages: [[makeMockMovie('m1', { original_language: 'hi' })]] },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
        isFetchingNextPage: false,
      } as unknown as ReturnType<typeof useAdminMovies>);

      renderWithProviders(<MoviesPage />);
      // Language name should appear for non-matching language
      const row = screen.getByText('Movie m1').closest('tr');
      expect(row?.classList.contains('opacity-40')).toBe(true);
    });

    it('renders Film icon placeholder when no poster_url', () => {
      mockUseAdminMovies.mockReturnValue({
        data: {
          pages: [[makeMockMovie('m1', { poster_url: null, original_language: 'te' })]],
        },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
        isFetchingNextPage: false,
      } as unknown as ReturnType<typeof useAdminMovies>);

      renderWithProviders(<MoviesPage />);
      // When no poster_url, a Film icon div is shown (no img element)
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  describe('delete action', () => {
    it('calls deleteMovie.mutate when confirm returns true', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockCanDelete = true;

      mockUseAdminMovies.mockReturnValue({
        data: { pages: [[makeMockMovie('m1')]] },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
        isFetchingNextPage: false,
      } as unknown as ReturnType<typeof useAdminMovies>);

      renderWithProviders(<MoviesPage />);
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(mockDeleteMutate).toHaveBeenCalled();
      });
    });

    it('does not call deleteMovie.mutate when confirm returns false', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      mockCanDelete = true;

      mockUseAdminMovies.mockReturnValue({
        data: { pages: [[makeMockMovie('m1')]] },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
        isFetchingNextPage: false,
      } as unknown as ReturnType<typeof useAdminMovies>);

      renderWithProviders(<MoviesPage />);
      fireEvent.click(screen.getByRole('button'));
      expect(mockDeleteMutate).not.toHaveBeenCalled();
    });
  });

  describe('load more', () => {
    it('shows load more button when hasNextPage is true', () => {
      mockUseAdminMovies.mockReturnValue({
        data: { pages: [[makeMockMovie('m1')]] },
        isLoading: false,
        isFetching: false,
        hasNextPage: true,
        fetchNextPage: vi.fn(),
        isFetchingNextPage: false,
      } as unknown as ReturnType<typeof useAdminMovies>);

      renderWithProviders(<MoviesPage />);
      expect(screen.getByTestId('load-more')).toBeInTheDocument();
    });
  });
});
