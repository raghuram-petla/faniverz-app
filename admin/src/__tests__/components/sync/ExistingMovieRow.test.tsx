import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExistingMovieRow } from '@/components/sync/ExistingMovieRow';
import type { ExistingMovieData, LookupMovieData } from '@/hooks/useSync';

const mockLookupMutate = vi.hoisted(() => vi.fn());
const mockFillMutateAsync = vi.hoisted(() => vi.fn());
const mockLookupData = vi.hoisted(() => ({ current: undefined as unknown }));
const mockLookupPending = vi.hoisted(() => ({ current: false }));
const mockLookupError = vi.hoisted(() => ({ current: false }));
const mockFillError = vi.hoisted(() => ({ current: false }));
const mockFillPending = vi.hoisted(() => ({ current: false }));

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
    isPending: mockFillPending.current,
    isError: mockFillError.current,
    error: mockFillError.current ? new Error('Apply failed') : null,
  }),
}));

vi.mock('@/lib/syncUtils', () => ({
  FILLABLE_DATA_FIELDS: ['title', 'synopsis', 'poster_url'],
}));

vi.mock('@/components/sync/fieldDiffHelpers', () => ({
  getStatus: () => 'same',
}));

vi.mock('@/components/sync/FieldDiffPanel', () => ({
  FieldDiffPanel: ({
    onApply,
  }: {
    movie: ExistingMovieData;
    tmdb: LookupMovieData;
    appliedFields: string[];
    isSaving: boolean;
    onApply: (fields: string[], force: boolean) => void;
  }) => (
    <div data-testid="field-diff-panel">
      <button onClick={() => onApply(['title'], false)} data-testid="apply-btn">
        Apply
      </button>
    </div>
  ),
}));

vi.mock('@/components/sync/syncHelpers', () => ({
  applyTmdbFields: (movie: ExistingMovieData) => ({ ...movie, title: 'Updated' }),
}));

vi.mock('lucide-react', () => ({
  ChevronRight: () => <span data-testid="chevron-right" />,
  ChevronDown: () => <span data-testid="chevron-down" />,
  Loader2: () => <span data-testid="loader" />,
  Film: () => <span data-testid="film-icon" />,
}));

const makeMovie = (overrides: Partial<ExistingMovieData> = {}): ExistingMovieData => ({
  id: 'uuid-1',
  tmdb_id: 101,
  title: 'Pushpa 2',
  synopsis: 'Action film',
  poster_url: 'https://example.com/poster.jpg',
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

const defaultProps = {
  movie: makeMovie(),
  justImported: false,
  prefetchedTmdb: null as LookupMovieData | null,
  onMovieUpdated: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockLookupData.current = undefined;
  mockLookupPending.current = false;
  mockLookupError.current = false;
  mockFillError.current = false;
  mockFillPending.current = false;
});

describe('ExistingMovieRow', () => {
  it('renders movie title', () => {
    render(<ExistingMovieRow {...defaultProps} />);
    expect(screen.getByText('Pushpa 2')).toBeInTheDocument();
  });

  it('renders dash when title is null', () => {
    render(<ExistingMovieRow {...defaultProps} movie={makeMovie({ title: null })} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders poster image when poster_url exists', () => {
    render(<ExistingMovieRow {...defaultProps} />);
    expect(screen.getByAltText('Pushpa 2')).toBeInTheDocument();
  });

  it('renders film icon when no poster_url', () => {
    render(<ExistingMovieRow {...defaultProps} movie={makeMovie({ poster_url: null })} />);
    expect(screen.getByTestId('film-icon')).toBeInTheDocument();
  });

  it('shows "Just imported" when justImported is true', () => {
    render(<ExistingMovieRow {...defaultProps} justImported />);
    expect(screen.getByText('Just imported')).toBeInTheDocument();
  });

  it('shows "Checking..." when no tmdb data and not just imported', () => {
    render(<ExistingMovieRow {...defaultProps} />);
    expect(screen.getByText('Checking...')).toBeInTheDocument();
  });

  it('shows chevron-right when closed', () => {
    render(<ExistingMovieRow {...defaultProps} />);
    expect(screen.getByTestId('chevron-right')).toBeInTheDocument();
  });

  it('opens panel on click (not justImported)', () => {
    render(<ExistingMovieRow {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('chevron-down')).toBeInTheDocument();
  });

  it('does not open when justImported', () => {
    render(<ExistingMovieRow {...defaultProps} justImported />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByTestId('chevron-down')).not.toBeInTheDocument();
  });

  it('shows loading state when lookup is pending', () => {
    mockLookupPending.current = true;
    render(<ExistingMovieRow {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('shows lookup error message when lookup fails', () => {
    mockLookupError.current = true;
    render(<ExistingMovieRow {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('TMDB error')).toBeInTheDocument();
  });

  it('shows fill error message when fill fails', () => {
    mockFillError.current = true;
    render(<ExistingMovieRow {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Apply failed')).toBeInTheDocument();
  });

  it('renders FieldDiffPanel when tmdb data is available via prefetch', () => {
    const tmdb = { tmdbId: 101, title: 'Pushpa 2' } as LookupMovieData;
    render(<ExistingMovieRow {...defaultProps} prefetchedTmdb={tmdb} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('field-diff-panel')).toBeInTheDocument();
  });

  it('shows "No gaps" when all fields match', () => {
    const tmdb = { tmdbId: 101, title: 'Pushpa 2' } as LookupMovieData;
    render(<ExistingMovieRow {...defaultProps} prefetchedTmdb={tmdb} />);
    expect(screen.getByText('No gaps')).toBeInTheDocument();
  });
});
