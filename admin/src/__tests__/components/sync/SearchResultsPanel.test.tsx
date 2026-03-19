import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockImportMutateAsync = vi.hoisted(() => vi.fn());
const mockLookupMutate = vi.hoisted(() => vi.fn());
const mockLookupState = vi.hoisted(() => ({
  isPending: false,
  isError: false,
  data: undefined as unknown,
}));

const mockLinkMutateAsync = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useSync', () => ({
  useImportMovies: () => ({
    mutateAsync: mockImportMutateAsync,
    isPending: false,
    isSuccess: false,
  }),
  useLinkTmdbId: () => ({
    mutateAsync: mockLinkMutateAsync,
    isPending: false,
  }),
  useTmdbLookup: () => ({
    mutate: mockLookupMutate,
    isPending: mockLookupState.isPending,
    isError: mockLookupState.isError,
    data: mockLookupState.data,
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

import { SearchResultsPanel } from '@/components/sync/SearchResultsPanel';

function renderWithProvider(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const makeMovieData = (
  results: Array<{ id: number; title: string; poster_path: string | null; release_date: string }>,
  existingTmdbIds: number[] = [],
) => ({ results, existingTmdbIds });

const makeActorData = (
  results: Array<{
    id: number;
    name: string;
    profile_path: string | null;
    known_for_department: string | null;
  }>,
  existingTmdbPersonIds: number[] = [],
) => ({ results, existingTmdbPersonIds });

beforeEach(() => {
  vi.clearAllMocks();
  mockLookupState.isPending = false;
  mockLookupState.isError = false;
  mockLookupState.data = undefined;
});

describe('SearchResultsPanel', () => {
  it('shows "Movies (N)" heading when movie results exist', () => {
    const data = {
      movies: makeMovieData([
        { id: 1, title: 'Movie A', poster_path: null, release_date: '2024-01-01' },
        { id: 2, title: 'Movie B', poster_path: null, release_date: '2024-02-01' },
      ]),
      actors: makeActorData([]),
    };
    renderWithProvider(<SearchResultsPanel data={data} />);
    expect(screen.getByText('Movies (2)')).toBeInTheDocument();
  });

  it('shows "Actors (N)" heading when actor results exist', () => {
    const data = {
      movies: makeMovieData([]),
      actors: makeActorData([
        { id: 10, name: 'Actor A', profile_path: null, known_for_department: 'Acting' },
      ]),
    };
    renderWithProvider(<SearchResultsPanel data={data} />);
    expect(screen.getByText('Actors (1)')).toBeInTheDocument();
  });

  it('shows "No results found." when both arrays are empty', () => {
    const data = {
      movies: makeMovieData([]),
      actors: makeActorData([]),
    };
    renderWithProvider(<SearchResultsPanel data={data} />);
    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('shows movie poster cards with "In DB" badge for existing movies', () => {
    const data = {
      movies: makeMovieData(
        [
          {
            id: 100,
            title: 'Existing Movie',
            poster_path: '/poster.jpg',
            release_date: '2024-01-01',
          },
        ],
        [100],
      ),
      actors: makeActorData([]),
    };
    renderWithProvider(<SearchResultsPanel data={data} />);
    expect(screen.getByText('Existing Movie')).toBeInTheDocument();
    expect(screen.getByText('In DB')).toBeInTheDocument();
    const img = screen.getByAltText('Existing Movie') as HTMLImageElement;
    expect(img.src).toContain('https://image.tmdb.org/t/p/w200/poster.jpg');
  });

  it('shows "Selected" badge when a new movie card is clicked', () => {
    const data = {
      movies: makeMovieData([
        { id: 200, title: 'New Movie', poster_path: null, release_date: '2024-05-01' },
      ]),
      actors: makeActorData([]),
    };
    renderWithProvider(<SearchResultsPanel data={data} />);
    fireEvent.click(screen.getByText('New Movie'));
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('shows "Import N selected" button when movies are selected', () => {
    const data = {
      movies: makeMovieData([
        { id: 300, title: 'Select Me', poster_path: null, release_date: '2024-06-01' },
      ]),
      actors: makeActorData([]),
    };
    renderWithProvider(<SearchResultsPanel data={data} />);
    fireEvent.click(screen.getByText('Select Me'));
    expect(screen.getByText('Import 1 selected')).toBeInTheDocument();
  });

  it('shows actor cards with name, department, and "In DB" badge', () => {
    const data = {
      movies: makeMovieData([]),
      actors: makeActorData(
        [{ id: 50, name: 'Star Actor', profile_path: null, known_for_department: 'Acting' }],
        [50],
      ),
    };
    renderWithProvider(<SearchResultsPanel data={data} />);
    expect(screen.getByText('Star Actor')).toBeInTheDocument();
    expect(screen.getByText('Acting')).toBeInTheDocument();
    expect(screen.getByText('In DB')).toBeInTheDocument();
  });

  it('shows "Not in DB" badge for actors not in database', () => {
    const data = {
      movies: makeMovieData([]),
      actors: makeActorData(
        [{ id: 60, name: 'Unknown Actor', profile_path: null, known_for_department: 'Acting' }],
        [],
      ),
    };
    renderWithProvider(<SearchResultsPanel data={data} />);
    expect(screen.getByText('Unknown Actor')).toBeInTheDocument();
    expect(screen.getByText('Not in DB')).toBeInTheDocument();
  });

  it('shows "Details" button on actor cards', () => {
    const data = {
      movies: makeMovieData([]),
      actors: makeActorData(
        [{ id: 70, name: 'Detail Actor', profile_path: null, known_for_department: 'Acting' }],
        [],
      ),
    };
    renderWithProvider(<SearchResultsPanel data={data} />);
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('calls lookup when "Details" button is clicked', () => {
    const data = {
      movies: makeMovieData([]),
      actors: makeActorData(
        [{ id: 80, name: 'Lookup Actor', profile_path: null, known_for_department: 'Acting' }],
        [],
      ),
    };
    renderWithProvider(<SearchResultsPanel data={data} />);
    fireEvent.click(screen.getByText('Details'));
    expect(mockLookupMutate).toHaveBeenCalledWith({ tmdbId: 80, type: 'person' });
  });

  it('shows both movies and actors when both exist', () => {
    const data = {
      movies: makeMovieData([
        { id: 1, title: 'Movie X', poster_path: null, release_date: '2024-01-01' },
      ]),
      actors: makeActorData([
        { id: 10, name: 'Actor Y', profile_path: null, known_for_department: 'Acting' },
      ]),
    };
    renderWithProvider(<SearchResultsPanel data={data} />);
    expect(screen.getByText('Movies (1)')).toBeInTheDocument();
    expect(screen.getByText('Actors (1)')).toBeInTheDocument();
  });

  it('shows "Select all new" button when there are new movies', () => {
    const data = {
      movies: makeMovieData([
        { id: 400, title: 'New A', poster_path: null, release_date: '2024-01-01' },
        { id: 401, title: 'New B', poster_path: null, release_date: '2024-02-01' },
      ]),
      actors: makeActorData([]),
    };
    renderWithProvider(<SearchResultsPanel data={data} />);
    expect(screen.getByText('Select all new (2)')).toBeInTheDocument();
  });

  it('shows "Link to TMDB" button for duplicate suspects', () => {
    const data = {
      movies: {
        ...makeMovieData([
          { id: 500, title: 'Suspect', poster_path: null, release_date: '2024-01-01' },
        ]),
        duplicateSuspects: { 500: { id: 'uuid-local', title: 'Suspect' } },
      },
      actors: makeActorData([]),
    };
    renderWithProvider(<SearchResultsPanel data={data} />);
    expect(screen.getByText('Link to TMDB')).toBeInTheDocument();
    expect(screen.getByText('Edit instead')).toBeInTheDocument();
  });

  it('shows "In DB" badge after linking a duplicate suspect', async () => {
    mockLinkMutateAsync.mockResolvedValue({ id: 'uuid-local' });
    const data = {
      movies: {
        ...makeMovieData([
          { id: 600, title: 'Link Me', poster_path: null, release_date: '2024-01-01' },
        ]),
        duplicateSuspects: { 600: { id: 'uuid-local', title: 'Link Me' } },
      },
      actors: makeActorData([]),
    };
    const { act } = await import('@testing-library/react');
    renderWithProvider(<SearchResultsPanel data={data} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Link to TMDB'));
    });
    expect(mockLinkMutateAsync).toHaveBeenCalledWith({ movieId: 'uuid-local', tmdbId: 600 });
    expect(screen.getByText('In DB')).toBeInTheDocument();
  });

  it('excludes suspects from "Select all new" count', () => {
    const data = {
      movies: {
        ...makeMovieData([
          { id: 700, title: 'Real New', poster_path: null, release_date: '2024-01-01' },
          { id: 701, title: 'Suspect', poster_path: null, release_date: '2024-02-01' },
        ]),
        duplicateSuspects: { 701: { id: 'uuid-local', title: 'Suspect' } },
      },
      actors: makeActorData([]),
    };
    renderWithProvider(<SearchResultsPanel data={data} />);
    expect(screen.getByText('Select all new (1)')).toBeInTheDocument();
  });
});
