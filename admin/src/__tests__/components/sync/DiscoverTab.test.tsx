import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockSearchMutate = vi.hoisted(() => vi.fn());
const mockDiscoverMutate = vi.hoisted(() => vi.fn());
const mockLookupMutate = vi.hoisted(() => vi.fn());
const mockSearchState = vi.hoisted(() => ({
  isPending: false,
  isError: false,
  error: null as Error | null,
  data: undefined as unknown,
}));
const mockDiscoverState = vi.hoisted(() => ({
  isPending: false,
  isError: false,
  error: null as Error | null,
  data: undefined as unknown,
}));
const mockLookupState = vi.hoisted(() => ({
  isPending: false,
  isError: false,
  error: null as Error | null,
  data: undefined as unknown,
}));

vi.mock('@/hooks/useSync', () => ({
  useTmdbSearch: () => ({
    mutate: mockSearchMutate,
    isPending: mockSearchState.isPending,
    isError: mockSearchState.isError,
    error: mockSearchState.error,
    data: mockSearchState.data,
  }),
  useDiscoverMovies: () => ({
    mutate: mockDiscoverMutate,
    reset: vi.fn(),
    isPending: mockDiscoverState.isPending,
    isError: mockDiscoverState.isError,
    error: mockDiscoverState.error,
    data: mockDiscoverState.data,
  }),
  useTmdbLookup: () => ({
    mutate: mockLookupMutate,
    reset: vi.fn(),
    isPending: mockLookupState.isPending,
    isError: mockLookupState.isError,
    error: mockLookupState.error,
    data: mockLookupState.data,
  }),
  useImportMovies: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isSuccess: false,
  }),
  useLinkTmdbId: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useImportActor: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isSuccess: false,
    data: null,
  }),
  useRefreshActor: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isSuccess: false,
    data: null,
  }),
  useFillFields: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useBulkFillMissing', () => ({
  useBulkFillMissing: () => ({
    run: vi.fn(),
    reset: vi.fn(),
    state: { total: 0, done: 0, failed: 0, isRunning: false, error: null },
  }),
}));

vi.mock('@/hooks/useDebouncedSearch', () => ({
  useDebouncedSearch: () => ({ search: '', setSearch: vi.fn(), debouncedSearch: '' }),
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
      ilike: vi.fn().mockReturnThis(),
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

function renderWithProvider(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchState.isPending = false;
  mockSearchState.isError = false;
  mockSearchState.error = null;
  mockSearchState.data = undefined;
  mockDiscoverState.isPending = false;
  mockDiscoverState.isError = false;
  mockDiscoverState.error = null;
  mockDiscoverState.data = undefined;
  mockLookupState.isPending = false;
  mockLookupState.isError = false;
  mockLookupState.error = null;
  mockLookupState.data = undefined;
});

describe('DiscoverTab', () => {
  it('renders search input and discover controls', () => {
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByPlaceholderText('Search movies, actors, or TMDB ID...')).toBeInTheDocument();
    expect(screen.getByText('All months')).toBeInTheDocument();
    expect(screen.getByText('Discover')).toBeInTheDocument();
  });

  it('shows "Search" button when input is text', () => {
    renderWithProvider(<DiscoverTab />);
    const input = screen.getByPlaceholderText('Search movies, actors, or TMDB ID...');
    fireEvent.change(input, { target: { value: 'Pushpa' } });
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('shows "Lookup" button when input is numeric', () => {
    renderWithProvider(<DiscoverTab />);
    const input = screen.getByPlaceholderText('Search movies, actors, or TMDB ID...');
    fireEvent.change(input, { target: { value: '12345' } });
    expect(screen.getByText('Lookup')).toBeInTheDocument();
  });

  it('calls useTmdbSearch when text query is submitted', () => {
    renderWithProvider(<DiscoverTab />);
    const input = screen.getByPlaceholderText('Search movies, actors, or TMDB ID...');
    fireEvent.change(input, { target: { value: 'Pushpa' } });
    fireEvent.click(screen.getByText('Search'));
    expect(mockSearchMutate).toHaveBeenCalledWith('Pushpa');
  });

  it('calls useTmdbLookup when numeric ID is submitted', () => {
    renderWithProvider(<DiscoverTab />);
    const input = screen.getByPlaceholderText('Search movies, actors, or TMDB ID...');
    fireEvent.change(input, { target: { value: '12345' } });
    fireEvent.click(screen.getByText('Lookup'));
    expect(mockLookupMutate).toHaveBeenCalledWith({ tmdbId: 12345, type: 'movie' });
  });

  it('calls useDiscoverMovies when Discover is clicked', () => {
    renderWithProvider(<DiscoverTab />);
    fireEvent.click(screen.getByText('Discover'));
    expect(mockDiscoverMutate).toHaveBeenCalledWith(
      expect.objectContaining({ year: expect.any(Number) }),
    );
  });

  it('shows error when search fails', () => {
    mockSearchState.isError = true;
    mockSearchState.error = new Error('TMDB API timeout');
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('TMDB API timeout')).toBeInTheDocument();
  });

  it('shows error when discover fails', () => {
    mockDiscoverState.isError = true;
    mockDiscoverState.error = new Error('Discover failed');
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('Discover failed')).toBeInTheDocument();
  });

  it('shows error when lookup fails', () => {
    mockLookupState.isError = true;
    mockLookupState.error = new Error('Lookup timeout');
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('Lookup timeout')).toBeInTheDocument();
  });

  it('shows generic error when error is not an Error instance', () => {
    mockSearchState.isError = true;
    mockSearchState.error = null;
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('Operation failed')).toBeInTheDocument();
  });

  it('shows SearchResultsPanel when search has data', () => {
    mockSearchState.data = {
      movies: {
        results: [{ id: 1, title: 'Movie A', poster_path: null, release_date: '2024-01-01' }],
        existingTmdbIds: [],
      },
      actors: { results: [], existingTmdbPersonIds: [] },
    };
    renderWithProvider(<DiscoverTab />);
    // Need to trigger search first to set resultMode
    const input = screen.getByPlaceholderText('Search movies, actors, or TMDB ID...');
    fireEvent.change(input, { target: { value: 'Movie' } });
    fireEvent.click(screen.getByText('Search'));
    // SearchResultsPanel renders movie heading
    expect(screen.getByText('Movies (1)')).toBeInTheDocument();
  });

  it('shows DiscoverByYear when discover has data', () => {
    mockDiscoverState.data = {
      results: [{ id: 10, title: 'Discovered', poster_path: null, release_date: '2024-05-01' }],
      existingMovies: [],
    };
    renderWithProvider(<DiscoverTab />);
    fireEvent.click(screen.getByText('Discover'));
    // DiscoverByYear renders summary — the "1 new" text
    expect(screen.getByText('1 new')).toBeInTheDocument();
  });

  it('shows MoviePreview when lookup returns movie data', () => {
    mockLookupState.data = {
      type: 'movie',
      existsInDb: false,
      existingId: null,
      data: {
        tmdbId: 999,
        title: 'Looked Up Movie',
        overview: 'desc',
        releaseDate: '2024-01-01',
        runtime: 120,
        genres: ['Action'],
        posterUrl: null,
        backdropUrl: null,
        director: 'Dir',
        trailerUrl: null,
        castCount: 5,
        crewCount: 10,
      },
    };
    renderWithProvider(<DiscoverTab />);
    const input = screen.getByPlaceholderText('Search movies, actors, or TMDB ID...');
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.click(screen.getByText('Lookup'));
    expect(screen.getByText('Looked Up Movie')).toBeInTheDocument();
  });

  it('shows PersonPreview when lookup returns person data', () => {
    mockLookupState.data = {
      type: 'person',
      existsInDb: true,
      existingId: 'actor-uuid',
      data: {
        tmdbPersonId: 888,
        name: 'Famous Actor',
        biography: 'Bio',
        birthday: '1990-01-01',
        placeOfBirth: 'India',
        photoUrl: null,
        gender: 2,
      },
    };
    renderWithProvider(<DiscoverTab />);
    const input = screen.getByPlaceholderText('Search movies, actors, or TMDB ID...');
    fireEvent.change(input, { target: { value: '888' } });
    fireEvent.click(screen.getByText('Lookup'));
    expect(screen.getByText('Famous Actor')).toBeInTheDocument();
  });

  it('submits search on Enter key', () => {
    renderWithProvider(<DiscoverTab />);
    const input = screen.getByPlaceholderText('Search movies, actors, or TMDB ID...');
    fireEvent.change(input, { target: { value: 'Pushpa' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockSearchMutate).toHaveBeenCalledWith('Pushpa');
  });
});
