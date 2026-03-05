import { render, screen, fireEvent } from '@testing-library/react';
import { DiscoverResults, ImportProgressList } from '@/components/sync/DiscoverResults';

const makeMovie = (id: number, title: string, poster_path: string | null = null) => ({
  id,
  title,
  poster_path,
  release_date: '2024-01-01',
});

describe('DiscoverResults', () => {
  const defaultProps = {
    results: [makeMovie(1, 'Movie A'), makeMovie(2, 'Movie B')],
    existingSet: new Set<number>(),
    newMovies: [makeMovie(1, 'Movie A'), makeMovie(2, 'Movie B')],
    selected: new Set<number>(),
    isImporting: false,
    onToggleSelect: vi.fn(),
    onSelectAllNew: vi.fn(),
    onImport: vi.fn(),
  };

  it('renders found count and new/imported counts', () => {
    render(
      <DiscoverResults
        {...defaultProps}
        existingSet={new Set([1])}
        newMovies={[makeMovie(2, 'Movie B')]}
      />,
    );
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1 imported')).toBeInTheDocument();
    expect(screen.getByText('1 new')).toBeInTheDocument();
  });

  it('renders movie titles', () => {
    render(<DiscoverResults {...defaultProps} />);
    expect(screen.getByText('Movie A')).toBeInTheDocument();
    expect(screen.getByText('Movie B')).toBeInTheDocument();
  });

  it('shows "Imported" badge for existing movies', () => {
    render(<DiscoverResults {...defaultProps} existingSet={new Set([1])} />);
    expect(screen.getByText('Imported')).toBeInTheDocument();
  });

  it('shows "Selected" badge for selected movies', () => {
    render(<DiscoverResults {...defaultProps} selected={new Set([2])} />);
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('calls onToggleSelect when a new movie is clicked', () => {
    const onToggleSelect = vi.fn();
    render(<DiscoverResults {...defaultProps} onToggleSelect={onToggleSelect} />);
    fireEvent.click(screen.getByText('Movie A'));
    expect(onToggleSelect).toHaveBeenCalledWith(1);
  });

  it('does not call onToggleSelect for existing movies', () => {
    const onToggleSelect = vi.fn();
    render(
      <DiscoverResults
        {...defaultProps}
        existingSet={new Set([1])}
        onToggleSelect={onToggleSelect}
      />,
    );
    fireEvent.click(screen.getByText('Movie A'));
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it('shows "Select all new" button', () => {
    render(<DiscoverResults {...defaultProps} />);
    expect(screen.getByText('Select all new (2)')).toBeInTheDocument();
  });

  it('calls onSelectAllNew when clicked', () => {
    const onSelectAllNew = vi.fn();
    render(<DiscoverResults {...defaultProps} onSelectAllNew={onSelectAllNew} />);
    fireEvent.click(screen.getByText('Select all new (2)'));
    expect(onSelectAllNew).toHaveBeenCalled();
  });

  it('shows import button when items are selected', () => {
    render(<DiscoverResults {...defaultProps} selected={new Set([1])} />);
    expect(screen.getByText('Import 1 selected')).toBeInTheDocument();
  });

  it('calls onImport when import button is clicked', () => {
    const onImport = vi.fn();
    render(<DiscoverResults {...defaultProps} selected={new Set([1])} onImport={onImport} />);
    fireEvent.click(screen.getByText('Import 1 selected'));
    expect(onImport).toHaveBeenCalled();
  });

  it('renders poster image when poster_path exists', () => {
    render(
      <DiscoverResults {...defaultProps} results={[makeMovie(1, 'With Poster', '/abc.jpg')]} />,
    );
    const img = screen.getByAltText('With Poster') as HTMLImageElement;
    expect(img.src).toContain('https://image.tmdb.org/t/p/w200/abc.jpg');
  });

  it('shows "No date" for empty release dates', () => {
    const movie = { id: 1, title: 'No Date', poster_path: null, release_date: '' };
    render(<DiscoverResults {...defaultProps} results={[movie]} newMovies={[movie]} />);
    expect(screen.getByText('No date')).toBeInTheDocument();
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
