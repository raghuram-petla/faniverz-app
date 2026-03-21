import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockImportMutateAsync = vi.hoisted(() => vi.fn());

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

import { DiscoverByYear } from '@/components/sync/DiscoverByYear';

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
  imdb_id: null,
  title_te: null,
  synopsis_te: null,
});

const makeData = (
  results: Array<{
    id: number;
    title: string;
    poster_path: string | null;
    release_date: string;
    original_language: string;
  }>,
  existingMovies: ReturnType<typeof makeExisting>[] = [],
) => ({ results, existingMovies });

function renderWithProvider(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DiscoverByYear', () => {
  it('renders results summary when data has results', () => {
    const data = makeData(
      [
        {
          id: 1,
          title: 'Movie A',
          poster_path: null,
          release_date: '2024-01-01',
          original_language: 'te',
        },
        {
          id: 2,
          title: 'Movie B',
          poster_path: null,
          release_date: '2024-02-01',
          original_language: 'te',
        },
        {
          id: 3,
          title: 'Movie C',
          poster_path: '/poster.jpg',
          release_date: '2024-03-01',
          original_language: 'te',
        },
      ],
      [makeExisting(1, 'Movie A')],
    );
    renderWithProvider(<DiscoverByYear data={data} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1 imported')).toBeInTheDocument();
    expect(screen.getByText('2 new')).toBeInTheDocument();
  });

  it('shows "Import all new" button for new movies', () => {
    const data = makeData([
      {
        id: 1,
        title: 'New Movie',
        poster_path: null,
        release_date: '2024-01-01',
        original_language: 'te',
      },
    ]);
    renderWithProvider(<DiscoverByYear data={data} />);
    expect(screen.getByText('Import all new (1)')).toBeInTheDocument();
  });

  it('triggers batch import when "Import all new" is clicked', async () => {
    mockImportMutateAsync.mockResolvedValue({ syncLogId: 'log-1', results: [], errors: [] });
    const data = makeData([
      {
        id: 1,
        title: 'New Movie',
        poster_path: null,
        release_date: '2024-01-01',
        original_language: 'te',
      },
    ]);
    const { act } = await import('@testing-library/react');
    renderWithProvider(<DiscoverByYear data={data} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Import all new (1)'));
    });
    expect(mockImportMutateAsync).toHaveBeenCalledWith([1]);
  });

  it('renders movie cards for new results', () => {
    const data = makeData([
      {
        id: 100,
        title: 'Pushpa 2',
        poster_path: null,
        release_date: '2024-12-05',
        original_language: 'te',
      },
    ]);
    renderWithProvider(<DiscoverByYear data={data} />);
    expect(screen.getByText('Pushpa 2')).toBeInTheDocument();
    expect(screen.getByText('2024-12-05')).toBeInTheDocument();
  });

  it('shows ExistingMovieSync section for existing movies', () => {
    const data = makeData(
      [
        {
          id: 100,
          title: 'Already Here',
          poster_path: null,
          release_date: '2024-01-01',
          original_language: 'te',
        },
      ],
      [makeExisting(100, 'Already Here')],
    );
    renderWithProvider(<DiscoverByYear data={data} />);
    expect(screen.getByText('Existing movies')).toBeInTheDocument();
  });

  it('shows "Select all new" button when there are new movies', () => {
    const data = makeData([
      {
        id: 1,
        title: 'New Movie',
        poster_path: null,
        release_date: '2024-01-01',
        original_language: 'te',
      },
    ]);
    renderWithProvider(<DiscoverByYear data={data} />);
    expect(screen.getByText('Select all new (1)')).toBeInTheDocument();
  });

  it('selects a new movie when clicked and shows "Selected" badge', () => {
    const data = makeData([
      {
        id: 200,
        title: 'Selectable',
        poster_path: null,
        release_date: '2024-06-01',
        original_language: 'te',
      },
    ]);
    renderWithProvider(<DiscoverByYear data={data} />);
    fireEvent.click(screen.getByText('Selectable'));
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('shows import button after selecting movies', () => {
    const data = makeData([
      {
        id: 300,
        title: 'To Import',
        poster_path: null,
        release_date: '2024-07-01',
        original_language: 'te',
      },
    ]);
    renderWithProvider(<DiscoverByYear data={data} />);
    fireEvent.click(screen.getByText('To Import'));
    expect(screen.getByText('Import 1 selected')).toBeInTheDocument();
  });

  it('deselects a movie when clicked again', () => {
    const data = makeData([
      {
        id: 400,
        title: 'Toggle Me',
        poster_path: null,
        release_date: '2024-08-01',
        original_language: 'te',
      },
    ]);
    renderWithProvider(<DiscoverByYear data={data} />);
    fireEvent.click(screen.getByText('Toggle Me'));
    expect(screen.getByText('Selected')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Toggle Me'));
    expect(screen.queryByText('Selected')).not.toBeInTheDocument();
  });

  it('select all new excludes existing movies', () => {
    const data = makeData(
      [
        {
          id: 500,
          title: 'New One',
          poster_path: null,
          release_date: '2024-01-01',
          original_language: 'te',
        },
        {
          id: 501,
          title: 'New Two',
          poster_path: null,
          release_date: '2024-02-01',
          original_language: 'te',
        },
        {
          id: 502,
          title: 'Existing',
          poster_path: null,
          release_date: '2024-03-01',
          original_language: 'te',
        },
      ],
      [makeExisting(502, 'Existing')],
    );
    renderWithProvider(<DiscoverByYear data={data} />);
    fireEvent.click(screen.getByText('Select all new (2)'));
    expect(screen.getByText('Import 2 selected')).toBeInTheDocument();
  });

  it('renders poster image when poster_path is provided', () => {
    const data = makeData([
      {
        id: 600,
        title: 'Poster Movie',
        poster_path: '/abc.jpg',
        release_date: '2024-01-01',
        original_language: 'te',
      },
    ]);
    renderWithProvider(<DiscoverByYear data={data} />);
    const img = screen.getByAltText('Poster Movie') as HTMLImageElement;
    expect(img.src).toContain('https://image.tmdb.org/t/p/w200/abc.jpg');
  });

  it('shows "No date" when release_date is empty', () => {
    const data = makeData([
      {
        id: 700,
        title: 'No Date Movie',
        poster_path: null,
        release_date: '',
        original_language: 'te',
      },
    ]);
    renderWithProvider(<DiscoverByYear data={data} />);
    expect(screen.getByText('No date')).toBeInTheDocument();
  });

  it('does not render year/month form controls', () => {
    const data = makeData([]);
    renderWithProvider(<DiscoverByYear data={data} />);
    expect(screen.queryByText('Year')).not.toBeInTheDocument();
    expect(screen.queryByText('Month')).not.toBeInTheDocument();
    expect(screen.queryByText('Discover Movies by Year')).not.toBeInTheDocument();
  });

  it('excludes duplicate suspects from new movies count', () => {
    const data = {
      ...makeData([
        {
          id: 1,
          title: 'New Movie',
          poster_path: null,
          release_date: '2024-01-01',
          original_language: 'te',
        },
        {
          id: 2,
          title: 'Suspect Movie',
          poster_path: null,
          release_date: '2024-02-01',
          original_language: 'te',
        },
      ]),
      duplicateSuspects: { 2: { id: 'uuid-local', title: 'Suspect Movie' } },
    };
    renderWithProvider(<DiscoverByYear data={data} />);
    // Only 1 new (not 2), because suspect is excluded
    expect(screen.getByText('1 new')).toBeInTheDocument();
    expect(screen.getByText('Select all new (1)')).toBeInTheDocument();
  });

  it('shows "Link to TMDB" button for duplicate suspect cards', () => {
    const data = {
      ...makeData([
        {
          id: 5,
          title: 'Duplicate',
          poster_path: null,
          release_date: '2024-01-01',
          original_language: 'te',
        },
      ]),
      duplicateSuspects: { 5: { id: 'uuid-local', title: 'Duplicate' } },
    };
    renderWithProvider(<DiscoverByYear data={data} />);
    expect(screen.getByText('Link to TMDB')).toBeInTheDocument();
  });

  it('links suspect to TMDB and moves it to existing section', async () => {
    mockLinkMutateAsync.mockResolvedValue({ id: 'uuid-local' });
    const data = {
      ...makeData([
        {
          id: 5,
          title: 'Duplicate',
          poster_path: null,
          release_date: '2024-01-01',
          original_language: 'te',
        },
      ]),
      duplicateSuspects: { 5: { id: 'uuid-local', title: 'Duplicate' } },
    };
    const { act } = await import('@testing-library/react');
    renderWithProvider(<DiscoverByYear data={data} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Link to TMDB'));
    });
    expect(mockLinkMutateAsync).toHaveBeenCalledWith({ movieId: 'uuid-local', tmdbId: 5 });
    // After linking, the movie should appear in existing section
    expect(screen.getByText('Existing movies')).toBeInTheDocument();
  });
});
