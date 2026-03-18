import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DiscoverResults, ImportProgressList } from '@/components/sync/DiscoverResults';

// ExistingMovieSync uses useSync hooks — mock them so the component can render
vi.mock('@/hooks/useSync', () => ({
  useTmdbLookup: () => ({ mutate: vi.fn(), isPending: false, isError: false, data: undefined }),
  useFillFields: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

const makeMovie = (id: number, title: string, poster_path: string | null = null) => ({
  id,
  title,
  poster_path,
  release_date: '2024-01-01',
});

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

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('DiscoverResults', () => {
  const defaultProps = {
    results: [makeMovie(1, 'Movie A'), makeMovie(2, 'Movie B')],
    existingMovies: [],
    existingSet: new Set<number>(),
    newMovies: [makeMovie(1, 'Movie A'), makeMovie(2, 'Movie B')],
    selected: new Set<number>(),
    isImporting: false,
    gapCount: 0,
    onToggleSelect: vi.fn(),
    onSelectAllNew: vi.fn(),
    onImport: vi.fn(),
    onImportAllNew: vi.fn(),
  };

  it('renders found count and new/imported counts', () => {
    wrap(
      <DiscoverResults
        {...defaultProps}
        existingMovies={[makeExisting(1, 'Movie A')]}
        existingSet={new Set([1])}
        newMovies={[makeMovie(2, 'Movie B')]}
      />,
    );
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1 imported')).toBeInTheDocument();
    expect(screen.getByText('1 new')).toBeInTheDocument();
  });

  it('renders new movie titles in the grid', () => {
    wrap(<DiscoverResults {...defaultProps} />);
    expect(screen.getByText('Movie A')).toBeInTheDocument();
    expect(screen.getByText('Movie B')).toBeInTheDocument();
  });

  it('does not render existing movies in the new-movies grid', () => {
    // Movie A is existing — it should only appear in the ExistingMovieSync section,
    // not as a clickable grid card
    wrap(
      <DiscoverResults
        {...defaultProps}
        results={[makeMovie(1, 'Movie A'), makeMovie(2, 'Movie B')]}
        existingMovies={[makeExisting(1, 'Movie A')]}
        existingSet={new Set([1])}
        newMovies={[makeMovie(2, 'Movie B')]}
      />,
    );
    // Movie B (new) is in the grid
    expect(screen.getByText('Movie B')).toBeInTheDocument();
  });

  it('shows ExistingMovieSync section when existingMovies is non-empty', () => {
    wrap(
      <DiscoverResults
        {...defaultProps}
        existingMovies={[makeExisting(1, 'Movie A')]}
        existingSet={new Set([1])}
      />,
    );
    expect(screen.getByText('Existing movies — fill missing fields')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });

  it('does not render ExistingMovieSync when existingMovies is empty', () => {
    wrap(<DiscoverResults {...defaultProps} />);
    expect(screen.queryByText('Existing movies — fill missing fields')).not.toBeInTheDocument();
  });

  it('shows "Selected" badge for selected movies', () => {
    wrap(<DiscoverResults {...defaultProps} selected={new Set([2])} />);
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('calls onToggleSelect when a new movie is clicked', () => {
    const onToggleSelect = vi.fn();
    wrap(<DiscoverResults {...defaultProps} onToggleSelect={onToggleSelect} />);
    fireEvent.click(screen.getByText('Movie A'));
    expect(onToggleSelect).toHaveBeenCalledWith(1);
  });

  it('shows "Select all new" button', () => {
    wrap(<DiscoverResults {...defaultProps} />);
    expect(screen.getByText('Select all new (2)')).toBeInTheDocument();
  });

  it('calls onSelectAllNew when clicked', () => {
    const onSelectAllNew = vi.fn();
    wrap(<DiscoverResults {...defaultProps} onSelectAllNew={onSelectAllNew} />);
    fireEvent.click(screen.getByText('Select all new (2)'));
    expect(onSelectAllNew).toHaveBeenCalled();
  });

  it('shows import button when items are selected', () => {
    wrap(<DiscoverResults {...defaultProps} selected={new Set([1])} />);
    expect(screen.getByText('Import 1 selected')).toBeInTheDocument();
  });

  it('calls onImport when import button is clicked', () => {
    const onImport = vi.fn();
    wrap(<DiscoverResults {...defaultProps} selected={new Set([1])} onImport={onImport} />);
    fireEvent.click(screen.getByText('Import 1 selected'));
    expect(onImport).toHaveBeenCalled();
  });

  it('renders poster image when poster_path exists', () => {
    wrap(
      <DiscoverResults
        {...defaultProps}
        results={[makeMovie(1, 'With Poster', '/abc.jpg')]}
        newMovies={[makeMovie(1, 'With Poster', '/abc.jpg')]}
      />,
    );
    const img = screen.getByAltText('With Poster') as HTMLImageElement;
    expect(img.src).toContain('https://image.tmdb.org/t/p/w200/abc.jpg');
  });

  it('shows "No date" for empty release dates', () => {
    const movie = { id: 1, title: 'No Date', poster_path: null, release_date: '' };
    wrap(<DiscoverResults {...defaultProps} results={[movie]} newMovies={[movie]} />);
    expect(screen.getByText('No date')).toBeInTheDocument();
  });

  it('shows gap count when gapCount > 0', () => {
    wrap(<DiscoverResults {...defaultProps} gapCount={3} />);
    expect(screen.getByText('3 with gaps')).toBeInTheDocument();
  });

  it('does not show gap count when gapCount is 0', () => {
    wrap(<DiscoverResults {...defaultProps} gapCount={0} />);
    expect(screen.queryByText(/with gaps/)).not.toBeInTheDocument();
  });

  it('shows "Import all new" button when there are new movies', () => {
    wrap(<DiscoverResults {...defaultProps} />);
    expect(screen.getByText('Import all new (2)')).toBeInTheDocument();
  });

  it('calls onImportAllNew when Import all new is clicked', () => {
    const onImportAllNew = vi.fn();
    wrap(<DiscoverResults {...defaultProps} onImportAllNew={onImportAllNew} />);
    fireEvent.click(screen.getByText('Import all new (2)'));
    expect(onImportAllNew).toHaveBeenCalled();
  });

  it('hides Import all new button when isImporting', () => {
    wrap(<DiscoverResults {...defaultProps} isImporting={true} />);
    expect(screen.queryByText(/Import all new/)).not.toBeInTheDocument();
  });
});

describe('ImportProgressList', () => {
  it('renders progress items with title', () => {
    render(<ImportProgressList items={[{ tmdbId: 1, title: 'Movie A', status: 'pending' }]} />);
    expect(screen.getByText('Import Progress')).toBeInTheDocument();
    expect(screen.getByText('Movie A')).toBeInTheDocument();
  });

  it('shows done status text', () => {
    render(<ImportProgressList items={[{ tmdbId: 1, title: 'Done Movie', status: 'done' }]} />);
    expect(screen.getByText('Done Movie')).toBeInTheDocument();
  });

  it('shows failed status with error', () => {
    render(
      <ImportProgressList
        items={[{ tmdbId: 1, title: 'Bad Movie', status: 'failed', error: 'API timeout' }]}
      />,
    );
    expect(screen.getByText('Bad Movie')).toBeInTheDocument();
    expect(screen.getByText('API timeout')).toBeInTheDocument();
  });

  it('shows result details for done items', () => {
    render(
      <ImportProgressList
        items={[
          {
            tmdbId: 1,
            title: 'Rich Movie',
            status: 'done',
            result: {
              tmdbId: 1,
              movieId: 'x',
              title: 'Rich Movie',
              isNew: true,
              castCount: 5,
              crewCount: 3,
            },
          },
        ]}
      />,
    );
    expect(screen.getByText('(5 cast, 3 crew)')).toBeInTheDocument();
  });
});
