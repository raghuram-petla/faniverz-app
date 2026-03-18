import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExistingMovieSync } from '@/components/sync/ExistingMovieSync';
import type { ExistingMovieData } from '@/hooks/useSync';

const mockLookupMutate = vi.hoisted(() => vi.fn());
const mockFillMutateAsync = vi.hoisted(() => vi.fn());
const mockLookupData = vi.hoisted(() => ({ current: undefined as unknown }));
const mockLookupPending = vi.hoisted(() => ({ current: false }));
const mockLookupError = vi.hoisted(() => ({ current: false }));
const mockFillError = vi.hoisted(() => ({ current: false }));
const mockBulkRun = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useSync', () => ({
  useTmdbLookup: () => ({
    mutate: mockLookupMutate,
    mutateAsync: vi.fn(),
    isPending: mockLookupPending.current,
    isError: mockLookupError.current,
    error: mockLookupError.current ? new Error('TMDB error') : null,
    data: mockLookupData.current,
  }),
  useFillFields: () => ({
    mutateAsync: mockFillMutateAsync,
    isPending: false,
    isError: mockFillError.current,
    error: mockFillError.current ? new Error('Apply failed') : null,
  }),
}));

vi.mock('@/hooks/useBulkFillMissing', () => ({
  useBulkFillMissing: () => ({
    run: mockBulkRun,
    reset: vi.fn(),
    state: { total: 0, done: 0, failed: 0, isRunning: false, error: null },
  }),
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const makeExisting = (overrides: Partial<ExistingMovieData> = {}): ExistingMovieData => ({
  id: 'uuid-1',
  tmdb_id: 101,
  title: 'Baahubali',
  synopsis: null,
  poster_url: null,
  backdrop_url: null,
  trailer_url: null,
  director: null,
  runtime: null,
  genres: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockLookupData.current = undefined;
  mockLookupPending.current = false;
  mockLookupError.current = false;
  mockFillError.current = false;
});

describe('ExistingMovieSync', () => {
  it('renders collapsed section header with movie count', () => {
    wrap(<ExistingMovieSync movies={[makeExisting()]} />);
    expect(screen.getByText('Existing movies — fill missing fields')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });

  it('shows how many movies have gaps', () => {
    const movies = [
      makeExisting(),
      makeExisting({
        id: 'uuid-2',
        tmdb_id: 102,
        title: 'RRR',
        synopsis: 'Some text',
        poster_url: '/p.jpg',
        backdrop_url: '/b.jpg',
        trailer_url: 'yt',
        director: 'SS',
        runtime: 180,
        genres: ['Action'],
      }),
    ];
    wrap(<ExistingMovieSync movies={movies} />);
    expect(screen.getByText('1 have gaps')).toBeInTheDocument();
  });

  it('expands to show movie rows when header is clicked', () => {
    wrap(<ExistingMovieSync movies={[makeExisting()]} />);
    fireEvent.click(screen.getByText('Existing movies — fill missing fields'));
    expect(screen.getByText('Baahubali')).toBeInTheDocument();
  });

  it('collapses back when header is clicked again', () => {
    wrap(<ExistingMovieSync movies={[makeExisting()]} />);
    const header = screen.getByText('Existing movies — fill missing fields');
    fireEvent.click(header);
    expect(screen.getByText('Baahubali')).toBeInTheDocument();
    fireEvent.click(header);
    expect(screen.queryByText('Baahubali')).not.toBeInTheDocument();
  });

  it('shows missing fields count for a movie with no data', () => {
    // makeExisting() has title='Baahubali' set, so 7 of 8 fillable fields are missing
    wrap(<ExistingMovieSync movies={[makeExisting()]} />);
    fireEvent.click(screen.getByText('Existing movies — fill missing fields'));
    expect(screen.getByText('7 fields missing')).toBeInTheDocument();
  });

  it('shows "All fields filled" when movie has all data', () => {
    const full = makeExisting({
      title: 'Full Movie',
      synopsis: 'A synopsis',
      poster_url: '/poster.jpg',
      backdrop_url: '/backdrop.jpg',
      trailer_url: 'https://youtu.be/xxx',
      director: 'Jane',
      runtime: 120,
      genres: ['Drama'],
    });
    wrap(<ExistingMovieSync movies={[full]} />);
    fireEvent.click(screen.getByText('Existing movies — fill missing fields'));
    expect(screen.getByText('All fields filled')).toBeInTheDocument();
  });

  it('calls useTmdbLookup with the movie tmdb_id when Review is clicked', () => {
    wrap(<ExistingMovieSync movies={[makeExisting()]} />);
    fireEvent.click(screen.getByText('Existing movies — fill missing fields'));
    // Click the movie row to expand it
    fireEvent.click(screen.getByText('Baahubali'));
    expect(mockLookupMutate).toHaveBeenCalledWith({ tmdbId: 101, type: 'movie' });
  });

  it('shows loading spinner while TMDB lookup is pending', () => {
    mockLookupPending.current = true;
    wrap(<ExistingMovieSync movies={[makeExisting()]} />);
    fireEvent.click(screen.getByText('Existing movies — fill missing fields'));
    fireEvent.click(screen.getByText('Baahubali'));
    expect(screen.getByText('Fetching from TMDB…')).toBeInTheDocument();
  });

  it('shows error when TMDB lookup fails', () => {
    mockLookupError.current = true;
    wrap(<ExistingMovieSync movies={[makeExisting()]} />);
    fireEvent.click(screen.getByText('Existing movies — fill missing fields'));
    fireEvent.click(screen.getByText('Baahubali'));
    expect(screen.getByText('TMDB error')).toBeInTheDocument();
  });

  it('calls bulk.run with all movies when "Fill all missing" is clicked', () => {
    // @sideeffect: clicking "Fill all missing" triggers useBulkFillMissing.run()
    const movie = makeExisting(); // has 7 missing fields
    wrap(<ExistingMovieSync movies={[movie]} />);
    // "Fill all missing (1)" button should be visible (gapped.length > 0, not running)
    const fillBtn = screen.getByText('Fill all missing (1)');
    fireEvent.click(fillBtn);
    expect(mockBulkRun).toHaveBeenCalledWith([movie]);
  });

  it('shows apply error message when fillFields fails', () => {
    // @contract: fillFields.isError surfaces the error in the row so admin sees feedback
    mockFillError.current = true;
    mockLookupData.current = {
      type: 'movie',
      existsInDb: true,
      existingId: 'uuid-1',
      data: {
        tmdbId: 101,
        title: 'Baahubali: The Beginning',
        overview: 'An epic tale',
        releaseDate: '2015-07-10',
        runtime: 159,
        genres: ['Action'],
        posterUrl: null,
        backdropUrl: null,
        director: null,
        castCount: 0,
        crewCount: 0,
      },
    };
    wrap(<ExistingMovieSync movies={[makeExisting()]} />);
    fireEvent.click(screen.getByText('Existing movies — fill missing fields'));
    fireEvent.click(screen.getByText('Baahubali'));
    expect(screen.getByText('Apply failed')).toBeInTheDocument();
  });

  it('shows field comparison panel when TMDB data is available', () => {
    mockLookupData.current = {
      type: 'movie',
      existsInDb: true,
      existingId: 'uuid-1',
      data: {
        tmdbId: 101,
        title: 'Baahubali: The Beginning',
        overview: 'An epic tale',
        releaseDate: '2015-07-10',
        runtime: 159,
        genres: ['Action', 'Drama'],
        posterUrl: '/p.jpg',
        backdropUrl: '/b.jpg',
        director: 'S. S. Rajamouli',
        castCount: 15,
        crewCount: 5,
      },
    };
    wrap(<ExistingMovieSync movies={[makeExisting()]} />);
    fireEvent.click(screen.getByText('Existing movies — fill missing fields'));
    fireEvent.click(screen.getByText('Baahubali'));
    // Field comparison table headers
    expect(screen.getByText('Field')).toBeInTheDocument();
    expect(screen.getByText('In DB')).toBeInTheDocument();
    expect(screen.getByText('From TMDB')).toBeInTheDocument();
    // Director row shows TMDB value
    expect(screen.getByText('S. S. Rajamouli')).toBeInTheDocument();
    // Apply button
    expect(screen.getByRole('button', { name: /Apply .* selected field/i })).toBeInTheDocument();
  });
});
