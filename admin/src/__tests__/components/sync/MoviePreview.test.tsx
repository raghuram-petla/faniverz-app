import { render, screen, fireEvent } from '@testing-library/react';
import { MoviePreview } from '@/components/sync/MoviePreview';

const makeMovieResult = (overrides: Record<string, unknown> = {}) => ({
  type: 'movie' as const,
  existsInDb: false,
  existingId: null,
  data: {
    tmdbId: 100,
    title: 'Test Movie',
    overview: 'A great test movie',
    releaseDate: '2024-06-15',
    runtime: 150,
    genres: ['Action', 'Thriller'],
    posterUrl: null as string | null,
    backdropUrl: null,
    director: 'Test Director',
    castCount: 20,
    crewCount: 10,
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
    originalLanguage: 'te',
    dbPosterCount: 0,
    dbBackdropCount: 0,
    dbVideoCount: 0,
    dbKeywordCount: 0,
    dbProductionHouseCount: 0,
    dbPlatformNames: [],
  },
  ...overrides,
});

describe('MoviePreview', () => {
  it('renders movie title, release date, runtime, director, genres, cast count, overview', () => {
    const result = makeMovieResult();
    render(<MoviePreview result={result} isPending={false} onImport={vi.fn()} />);
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('2024-06-15')).toBeInTheDocument();
    expect(screen.getByText('150 min')).toBeInTheDocument();
    expect(screen.getByText('Test Director')).toBeInTheDocument();
    expect(screen.getByText('Action, Thriller')).toBeInTheDocument();
    expect(screen.getByText('20 members')).toBeInTheDocument();
    expect(screen.getByText('A great test movie')).toBeInTheDocument();
  });

  it('shows "Not in database" and "Import Movie" when existsInDb=false', () => {
    const result = makeMovieResult({ existsInDb: false });
    render(<MoviePreview result={result} isPending={false} onImport={vi.fn()} />);
    expect(screen.getByText('Not in database')).toBeInTheDocument();
    expect(screen.getByText('Import Movie')).toBeInTheDocument();
  });

  it('shows "Already in database" and "Review gaps & sync" link when existsInDb=true', () => {
    const result = makeMovieResult({ existsInDb: true, existingId: 'abc' });
    render(<MoviePreview result={result} isPending={false} onImport={vi.fn()} />);
    expect(screen.getByText('Already in database')).toBeInTheDocument();
    const link = screen.getByText('Review gaps & sync');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/movies/abc?tab=tmdb-sync');
  });

  it('calls onImport when button is clicked', () => {
    const onImport = vi.fn();
    const result = makeMovieResult();
    render(<MoviePreview result={result} isPending={false} onImport={onImport} />);
    fireEvent.click(screen.getByText('Import Movie'));
    expect(onImport).toHaveBeenCalledTimes(1);
  });

  it('disables button when isPending=true', () => {
    const result = makeMovieResult();
    render(<MoviePreview result={result} isPending={true} onImport={vi.fn()} />);
    expect(screen.getByText('Import Movie')).toBeDisabled();
  });

  it('shows poster image when posterUrl is provided', () => {
    const result = makeMovieResult();
    result.data.posterUrl = 'https://example.com/poster.jpg';
    render(<MoviePreview result={result} isPending={false} onImport={vi.fn()} />);
    const img = screen.getByAltText('Test Movie') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/poster.jpg');
  });

  it('shows placeholder when posterUrl is null', () => {
    const result = makeMovieResult();
    render(<MoviePreview result={result} isPending={false} onImport={vi.fn()} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows dashes for missing optional fields', () => {
    const result = makeMovieResult();
    result.data.releaseDate = '';
    result.data.runtime = null as unknown as number;
    result.data.director = null as unknown as string;
    result.data.genres = [];
    render(<MoviePreview result={result} isPending={false} onImport={vi.fn()} />);
    const dashes = screen.getAllByText('\u2014');
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  it('shows dash for null genres (uses ?? [] fallback)', () => {
    const result = makeMovieResult();
    result.data.genres = null as unknown as string[];
    render(<MoviePreview result={result} isPending={false} onImport={vi.fn()} />);
    const dashes = screen.getAllByText('\u2014');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});
