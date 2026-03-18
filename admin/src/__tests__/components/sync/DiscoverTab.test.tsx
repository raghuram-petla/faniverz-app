import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockDiscoverMutate = vi.hoisted(() => vi.fn());
const mockImportMutateAsync = vi.hoisted(() => vi.fn());
const mockDiscoverReset = vi.hoisted(() => vi.fn());
const mockDiscoverData = vi.hoisted(() => ({ current: undefined as unknown }));
const mockDiscoverState = vi.hoisted(() => ({
  isPending: false,
  isError: false,
  error: null as Error | null,
}));

vi.mock('@/hooks/useSync', () => ({
  useDiscoverMovies: () => ({
    mutate: mockDiscoverMutate,
    reset: mockDiscoverReset,
    data: mockDiscoverData.current,
    isPending: mockDiscoverState.isPending,
    isError: mockDiscoverState.isError,
    error: mockDiscoverState.error,
  }),
  useImportMovies: () => ({
    mutateAsync: mockImportMutateAsync,
    isPending: false,
  }),
  // ExistingMovieSync hooks — needed when existingMovies is non-empty
  useTmdbLookup: () => ({ mutate: vi.fn(), isPending: false, isError: false, data: undefined }),
  useFillFields: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useBulkFillMissing', () => ({
  useBulkFillMissing: () => ({
    run: vi.fn(),
    reset: vi.fn(),
    state: { total: 0, done: 0, failed: 0, isRunning: false, error: null },
  }),
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: { invoke: vi.fn() },
  },
}));

import { DiscoverTab } from '@/components/sync/DiscoverTab';

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderWithProvider(ui: React.ReactElement) {
  const qc = createQueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const makeExisting = (tmdb_id: number, title: string) => ({
  id: `uuid-${tmdb_id}`,
  tmdb_id,
  title,
  synopsis: null,
  poster_url: null,
  backdrop_url: null,
  trailer_url: null,
  director: null,
  runtime: null,
  genres: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockDiscoverData.current = undefined;
  mockDiscoverState.isPending = false;
  mockDiscoverState.isError = false;
  mockDiscoverState.error = null;
});

describe('DiscoverTab', () => {
  it('renders the discover form with year and month selects', () => {
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('Discover Movies')).toBeInTheDocument();
    expect(screen.getByText('Year')).toBeInTheDocument();
    expect(screen.getByText('Month')).toBeInTheDocument();
    expect(screen.getByText('Discover')).toBeInTheDocument();
  });

  it('renders the year select with current year selected', () => {
    renderWithProvider(<DiscoverTab />);
    const currentYear = new Date().getFullYear();
    const yearSelect = screen.getByText('Year').nextElementSibling as HTMLSelectElement;
    expect(yearSelect.value).toBe(String(currentYear));
  });

  it('renders the month select with "All months" as default', () => {
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('All months')).toBeInTheDocument();
  });

  it('calls discover mutate when Discover button is clicked', () => {
    renderWithProvider(<DiscoverTab />);
    fireEvent.click(screen.getByText('Discover'));
    expect(mockDiscoverMutate).toHaveBeenCalledTimes(1);
  });

  it('passes year and month to discover mutate', () => {
    renderWithProvider(<DiscoverTab />);
    const currentYear = new Date().getFullYear();
    fireEvent.click(screen.getByText('Discover'));
    expect(mockDiscoverMutate).toHaveBeenCalledWith({
      year: currentYear,
      month: undefined,
    });
  });

  it('passes selected month to discover mutate', () => {
    renderWithProvider(<DiscoverTab />);
    const monthSelect = screen.getByText('Month').nextElementSibling as HTMLSelectElement;
    fireEvent.change(monthSelect, { target: { value: '3' } });
    fireEvent.click(screen.getByText('Discover'));
    expect(mockDiscoverMutate).toHaveBeenCalledWith(expect.objectContaining({ month: 3 }));
  });

  it('shows error message when discover fails', () => {
    mockDiscoverState.isError = true;
    mockDiscoverState.error = new Error('TMDB API timeout');
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('TMDB API timeout')).toBeInTheDocument();
  });

  it('shows generic error when error is not an Error instance', () => {
    mockDiscoverState.isError = true;
    mockDiscoverState.error = null;
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('Discovery failed')).toBeInTheDocument();
  });

  it('shows results summary when data is returned', () => {
    mockDiscoverData.current = {
      results: [
        { id: 1, title: 'Movie A', poster_path: null, release_date: '2024-01-01' },
        { id: 2, title: 'Movie B', poster_path: null, release_date: '2024-02-01' },
        { id: 3, title: 'Movie C', poster_path: '/poster.jpg', release_date: '2024-03-01' },
      ],
      existingMovies: [makeExisting(1, 'Movie A')],
    };
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('3')).toBeInTheDocument(); // total found
    expect(screen.getByText('1 imported')).toBeInTheDocument();
    expect(screen.getByText('2 new')).toBeInTheDocument();
  });

  it('shows "Import all new" button for new movies', () => {
    mockDiscoverData.current = {
      results: [{ id: 1, title: 'New Movie', poster_path: null, release_date: '2024-01-01' }],
      existingMovies: [],
    };
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('Import all new (1)')).toBeInTheDocument();
  });

  it('triggers batch import when "Import all new" is clicked', async () => {
    // @sideeffect: handleImportAllNew calls runBatchImport which calls useImportMovies.mutateAsync
    mockImportMutateAsync.mockResolvedValue({ syncLogId: 'log-1', results: [], errors: [] });
    mockDiscoverData.current = {
      results: [{ id: 1, title: 'New Movie', poster_path: null, release_date: '2024-01-01' }],
      existingMovies: [],
    };
    const { act } = await import('@testing-library/react');
    renderWithProvider(<DiscoverTab />);
    await act(async () => {
      fireEvent.click(screen.getByText('Import all new (1)'));
    });
    expect(mockImportMutateAsync).toHaveBeenCalledWith([1]);
  });

  it('does not show gap count on sync page', () => {
    mockDiscoverData.current = {
      results: [{ id: 100, title: 'Has Gaps', poster_path: null, release_date: '2024-01-01' }],
      existingMovies: [makeExisting(100, 'Has Gaps')],
    };
    renderWithProvider(<DiscoverTab />);
    expect(screen.queryByText(/with gaps/)).not.toBeInTheDocument();
  });

  it('renders movie cards for new results', () => {
    mockDiscoverData.current = {
      results: [{ id: 100, title: 'Pushpa 2', poster_path: null, release_date: '2024-12-05' }],
      existingMovies: [],
    };
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('Pushpa 2')).toBeInTheDocument();
    expect(screen.getByText('2024-12-05')).toBeInTheDocument();
  });

  it('shows ExistingMovieSync section for existing movies', () => {
    mockDiscoverData.current = {
      results: [{ id: 100, title: 'Already Here', poster_path: null, release_date: '2024-01-01' }],
      existingMovies: [makeExisting(100, 'Already Here')],
    };
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('Existing movies')).toBeInTheDocument();
  });

  it('shows "Select all new" button when there are new movies', () => {
    mockDiscoverData.current = {
      results: [{ id: 1, title: 'New Movie', poster_path: null, release_date: '2024-01-01' }],
      existingMovies: [],
    };
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('Select all new (1)')).toBeInTheDocument();
  });

  it('selects a new movie when clicked and shows "Selected" badge', () => {
    mockDiscoverData.current = {
      results: [{ id: 200, title: 'Selectable', poster_path: null, release_date: '2024-06-01' }],
      existingMovies: [],
    };
    renderWithProvider(<DiscoverTab />);
    fireEvent.click(screen.getByText('Selectable'));
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('shows import button after selecting movies', () => {
    mockDiscoverData.current = {
      results: [{ id: 300, title: 'To Import', poster_path: null, release_date: '2024-07-01' }],
      existingMovies: [],
    };
    renderWithProvider(<DiscoverTab />);
    fireEvent.click(screen.getByText('To Import'));
    expect(screen.getByText('Import 1 selected')).toBeInTheDocument();
  });

  it('deselects a movie when clicked again', () => {
    mockDiscoverData.current = {
      results: [{ id: 400, title: 'Toggle Me', poster_path: null, release_date: '2024-08-01' }],
      existingMovies: [],
    };
    renderWithProvider(<DiscoverTab />);
    fireEvent.click(screen.getByText('Toggle Me'));
    expect(screen.getByText('Selected')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Toggle Me'));
    expect(screen.queryByText('Selected')).not.toBeInTheDocument();
  });

  it('select all new excludes existing movies', () => {
    mockDiscoverData.current = {
      results: [
        { id: 500, title: 'New One', poster_path: null, release_date: '2024-01-01' },
        { id: 501, title: 'New Two', poster_path: null, release_date: '2024-02-01' },
        { id: 502, title: 'Existing', poster_path: null, release_date: '2024-03-01' },
      ],
      existingMovies: [makeExisting(502, 'Existing')],
    };
    renderWithProvider(<DiscoverTab />);
    fireEvent.click(screen.getByText('Select all new (2)'));
    expect(screen.getByText('Import 2 selected')).toBeInTheDocument();
  });

  it('renders poster image when poster_path is provided', () => {
    mockDiscoverData.current = {
      results: [
        { id: 600, title: 'Poster Movie', poster_path: '/abc.jpg', release_date: '2024-01-01' },
      ],
      existingMovies: [],
    };
    renderWithProvider(<DiscoverTab />);
    const img = screen.getByAltText('Poster Movie') as HTMLImageElement;
    expect(img.src).toContain('https://image.tmdb.org/t/p/w200/abc.jpg');
  });

  it('shows "No date" when release_date is empty', () => {
    mockDiscoverData.current = {
      results: [{ id: 700, title: 'No Date Movie', poster_path: null, release_date: '' }],
      existingMovies: [],
    };
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('No date')).toBeInTheDocument();
  });
});
