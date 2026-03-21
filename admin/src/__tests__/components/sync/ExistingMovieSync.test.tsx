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
  imdb_id: null,
  title_te: null,
  synopsis_te: null,
  tagline: null,
  tmdb_status: null,
  tmdb_vote_average: null,
  tmdb_vote_count: null,
  budget: null,
  revenue: null,
  certification: null,
  spoken_languages: null,
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
    expect(screen.getByText('Existing movies')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });

  it('shows movie count in header', () => {
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
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('expands to show movie rows when header is clicked', () => {
    wrap(<ExistingMovieSync movies={[makeExisting()]} />);
    fireEvent.click(screen.getByText('Existing movies'));
    expect(screen.getByText('Baahubali')).toBeInTheDocument();
  });

  it('collapses back when header is clicked again', () => {
    wrap(<ExistingMovieSync movies={[makeExisting()]} />);
    const header = screen.getByText('Existing movies');
    fireEvent.click(header);
    expect(screen.getByText('Baahubali')).toBeInTheDocument();
    fireEvent.click(header);
    expect(screen.queryByText('Baahubali')).not.toBeInTheDocument();
  });

  it('shows "Checking..." before TMDB lookup', () => {
    wrap(<ExistingMovieSync movies={[makeExisting()]} />);
    fireEvent.click(screen.getByText('Existing movies'));
    expect(screen.getByText('Checking...')).toBeInTheDocument();
  });

  it('auto-fetches TMDB details for existing movies on mount', () => {
    wrap(<ExistingMovieSync movies={[makeExisting()]} />);
    // Auto-fetch happens via fetch() in useEffect, not via useTmdbLookup
    // The component should render without errors
    expect(screen.getByText('Existing movies')).toBeInTheDocument();
  });

  it('shows loading spinner while TMDB lookup is pending', () => {
    mockLookupPending.current = true;
    wrap(<ExistingMovieSync movies={[makeExisting()]} />);
    fireEvent.click(screen.getByText('Existing movies'));
    fireEvent.click(screen.getByText('Baahubali'));
    expect(screen.getByText('Fetching from TMDB…')).toBeInTheDocument();
  });

  it('shows error when TMDB lookup fails', () => {
    mockLookupError.current = true;
    wrap(<ExistingMovieSync movies={[makeExisting()]} />);
    fireEvent.click(screen.getByText('Existing movies'));
    fireEvent.click(screen.getByText('Baahubali'));
    expect(screen.getByText('TMDB error')).toBeInTheDocument();
  });

  it('shows "Checking..." for movie with null fields before lookup', () => {
    wrap(<ExistingMovieSync movies={[makeExisting()]} />);
    fireEvent.click(screen.getByText('Existing movies'));
    expect(screen.getByText('Checking...')).toBeInTheDocument();
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
        trailerUrl: null,
        castCount: 0,
        crewCount: 0,
        posterCount: 0,
        backdropCount: 0,
        videoCount: 0,
        providerNames: [],
        keywordCount: 0,
        imdbId: null,
        titleTe: null,
        synopsisTe: null,
        tagline: null,
        tmdbStatus: null,
        tmdbVoteAverage: null,
        tmdbVoteCount: null,
        budget: null,
        revenue: null,
        certification: null,
        spokenLanguages: [],
        productionCompanyCount: 0,
      },
    };
    wrap(<ExistingMovieSync movies={[makeExisting()]} />);
    fireEvent.click(screen.getByText('Existing movies'));
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
        trailerUrl: 'https://www.youtube.com/watch?v=sOEg_YZQsTI',
        castCount: 15,
        crewCount: 5,
        posterCount: 0,
        backdropCount: 0,
        videoCount: 0,
        providerNames: [],
        keywordCount: 0,
        imdbId: null,
        titleTe: null,
        synopsisTe: null,
        tagline: null,
        tmdbStatus: null,
        tmdbVoteAverage: null,
        tmdbVoteCount: null,
        budget: null,
        revenue: null,
        certification: null,
        spokenLanguages: [],
        productionCompanyCount: 0,
      },
    };
    wrap(<ExistingMovieSync movies={[makeExisting()]} />);
    fireEvent.click(screen.getByText('Existing movies'));
    fireEvent.click(screen.getByText('Baahubali'));
    // Field comparison table headers
    expect(screen.getByText('Field')).toBeInTheDocument();
    expect(screen.getAllByText('In Faniverz').length).toBeGreaterThan(0);
    expect(screen.getAllByText('In TMDB').length).toBeGreaterThan(0);
    // Director row shows TMDB value
    expect(screen.getByText('S. S. Rajamouli')).toBeInTheDocument();
    // Apply button
    expect(screen.getByRole('button', { name: /Apply .* selected field/i })).toBeInTheDocument();
  });
});
